import os
import requests
import pytesseract
import pdfplumber
from PIL import Image
from typing import List, Dict
import io
import json

class RecruitmentProcessor:
    """
    Recruitment Intelligence Processor (Gemma 4 integration).
    Handles Job Clusters, Resume Analysis, and Decision Support.
    """
    
    def __init__(self):
        self.endpoint = (os.getenv("LOCAL_AI_ENDPOINT") or "").strip()
        self.model = (os.getenv("LOCAL_AI_MODEL", "gemma4:e4b") or "").strip()
        self.bridge_key = (os.getenv("LOCAL_AI_BRIDGE_KEY") or os.getenv("AI_BRIDGE_KEY") or "").strip()
        # Point to the Tesseract executable installed by the user
        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """
        Extract text from PDF using pdfplumber (for text) and Tesseract (for images/scanned).
        """
        full_text = ""
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        full_text += text + "\n"
                    else:
                        # Fallback to OCR if no text found (scanned PDF)
                        img = page.to_image(resolution=300).original
                        full_text += pytesseract.image_to_string(img) + "\n"
        except Exception as e:
            print(f"OCR/Extraction Error: {e}")
        return full_text

    def process_candidate(self, resume_text: str, jd_context: str) -> tuple:
        """
        Sends the resume and JD to Gemma 4:e4b on Mac Mini for a cognitive audit.
        """
        prompt = f"""
You are a talent analyst. Perform a deep analysis for this candidate.

Job Description:
{jd_context}

Candidate Resume:
{resume_text}

Return ONLY a JSON object with these exact keys (no markdown, no extra text):
{{
  "scoring": {{
    "match_score": <integer 0-100>,
    "decision": "<Accepted|Rejected|Hold>",
    "breakdown": {{ "skills": <integer 0-100>, "experience": <integer 0-100>, "projects": <integer 0-100>, "education": <integer 0-100> }}
  }},
  "recommendations": {{ "pros": ["<strength1>", "<strength2>"], "matched_skills": ["<skill1>", "<skill2>"] }},
  "gap_analysis": {{ "cons": ["<gap1>", "<gap2>"], "missing_skills": ["<missing_skill1>", "<missing_skill2>"] }},
  "resume_profile": {{
    "summary": "<2-3 sentence executive summary of the candidate>",
    "overview": "<detailed professional profile paragraph>",
    "education": "<audit of academic background and qualifications>",
    "projects": "<analysis of key projects and technologies used>",
    "experience": "<work experience and role progression analysis>",
    "achievements": "<quantifiable results and key accomplishments>"
  }},
  "interview_questions": [
    {{ "question": "<challenging interview question>", "reason": "<why this question probes a key concern>" }},
    {{ "question": "<challenging interview question>", "reason": "<why this question probes a key concern>" }},
    {{ "question": "<challenging interview question>", "reason": "<why this question probes a key concern>" }}
  ]
}}
"""
        
        try:
            response = requests.post(
                self.endpoint,
                headers={"Authorization": f"Bearer {self.bridge_key}", "Content-Type": "application/json"},
                json={"model": self.model, "prompt": prompt, "stream": False, "format": "json"},
                timeout=180
            )
            response.raise_for_status()
            res_json = response.json()
            ai_output = res_json.get("response", "{}")
            
            # Cleanup: sometimes Gemma wraps JSON in ```json blocks
            if "```json" in ai_output:
                ai_output = ai_output.split("```json")[1].split("```")[0].strip()
            elif "```" in ai_output:
                ai_output = ai_output.split("```")[1].split("```")[0].strip()
            
            metrics = {
                "total_duration_ms": res_json.get("total_duration", 0) // 1_000_000,
                "model": self.model
            }
            
            try:
                parsed = json.loads(ai_output)
            except json.JSONDecodeError:
                # If it's still not valid JSON, try to find the first { and last }
                start = ai_output.find('{')
                end = ai_output.rfind('}')
                if start != -1 and end != -1:
                    ai_output = ai_output[start:end+1]
                    parsed = json.loads(ai_output)
                else:
                    raise

            return parsed, metrics
        except Exception as e:
            print(f"AI Engine Error: {e}")
            return {"match_score": 50, "decision": "Hold"}, {}

    def analyze_onboarding_agreement(self, pdf_text: str) -> str:
        """
        Cleans OCR text and formats it into a professional HTML-formatted Consultant Agreement.
        First tries OpenRouter with Kimi (as requested), falling back to other free models,
        and finally to the local Gemma model on the Mac Mini if necessary.
        """
        prompt = f"""You are a professional Legal Document Typographer and Compliance Specialist AI.
Your task is to analyze the following raw OCR text of a Consultant Agreement and reconstruct it into an extremely premium, beautifully structured HTML document.

STRICT DESIGN & FORMATTING DIRECTIVES:
1. **Remove OCR Glitches:** Replace bad characters, broken lines, and artifacts (like '(cid:127)' or weird bullets) with clean, standard bullet points or ordered list items.
2. **Headings:** Designate major headings (e.g. TITLE, SECTIONS) with `<h2>` or `<h3>` using bold, styled elements.
3. **Typography & Styling:**
   - Use `<strong>` for key terms, defined words, and section numbers to make them stand out.
   - Use `<em>` for recitals, introductions, and note-boxes to add elegant italicized details.
   - Ensure the structure looks professional, using proper paragraphs `<p>`, neat margins, and clean spacing.
4. **HTML Tables for Parties & Signatures:**
   - For parties (Party 1 vs Party 2) or any signing blocks, format them as elegant side-by-side or stacked HTML tables (`<table>`, `<tr>`, `<th>`, `<td>`).
   - Style tables with inline styles for a clean corporate look (e.g. `<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">`, cell borders, and header backgrounds).
5. **No Outer Tags:** Output ONLY the raw HTML content within the container. Do NOT include `<html>`, `<head>`, or `<body>` tags.
6. **No Markdown Fences:** Do NOT wrap the output in markdown block wrappers (like ```html or ```). Respond ONLY with the raw HTML text.

[OCR RAW TEXT]
{pdf_text}
"""

        openrouter_key = os.getenv("MY_OPENROUTER_API_KEY") or os.getenv("OPENROUTER_API_KEY")
        if openrouter_key:
            # Models to try (preferring Kimi as requested by the user)
            models = [
                "nvidia/nemotron-3-ultra-550b-a55b:free",
                "qwen/qwen3-coder:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "qwen/qwen3-next-80b-a3b-instruct:free",
                "nvidia/nemotron-3-super-120b-a12b:free",
                "openai/gpt-oss-120b:free",
                "poolside/laguna-m.1:free",
                "google/gemma-4-31b-it:free",
                "google/gemma-4-26b-a4b-it:free",
                "moonshotai/kimi-k2.6:free",
                "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
                "openai/gpt-oss-20b:free",
                "poolside/laguna-xs.2:free",
                "nex-agi/nex-n2-pro:free",
                "nvidia/nemotron-3-nano-30b-a3b:free",
                "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
                "meta-llama/llama-3.2-3b-instruct:free"
            ]
            for model in models:
                try:
                    print(f"[OpenRouter AI] Attempting legal audit using model: {model}")
                    res = requests.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {openrouter_key}",
                            "HTTP-Referer": "http://localhost:3000",
                            "X-Title": "Namaah Nexus"
                        },
                        json={
                            "model": model,
                            "temperature": 0.2,
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are a professional legal AI assistant that outputs clean, compliant, and beautifully designed HTML. Never include markdown fences."
                                },
                                {
                                    "role": "user",
                                    "content": prompt
                                }
                            ],
                            "stream": True
                        },
                        stream=True,
                        timeout=(8, 12) # Connect timeout: 8s, read timeout (to first byte): 12s
                    )
                    
                    if res.ok:
                        full_content = []
                        for line in res.iter_lines():
                            if line:
                                line_str = line.decode('utf-8', errors='ignore').strip()
                                if line_str.startswith("data: "):
                                    data_json = line_str[6:]
                                    if data_json == "[DONE]":
                                        break
                                    try:
                                        data = json.loads(data_json)
                                        choice = data.get("choices", [{}])[0]
                                        delta = choice.get("delta", {})
                                        content = delta.get("content", "")
                                        if content:
                                            full_content.append(content)
                                    except Exception:
                                        pass
                        
                        full_text = "".join(full_content).strip()
                        if full_text:
                            # Clean up markdown code fences if LLM included them
                            if full_text.startswith("```html"):
                                full_text = full_text.split("```html")[1].split("```")[0].strip()
                            elif full_text.startswith("```"):
                                full_text = full_text.split("```")[1].split("```")[0].strip()
                            print(f"[OpenRouter AI] Compliance audit succeeded with {model}")
                            return full_text
                        else:
                            print(f"[OpenRouter AI] Model {model} returned empty stream response")
                    else:
                        print(f"[OpenRouter AI] Model {model} failed with status {res.status_code}: {res.text}")
                except Exception as e:
                    print(f"[OpenRouter AI] Error on model {model}: {e}")

        # Fallback to local Gemma model if OpenRouter fails or key is missing
        print("[Local AI] Falling back to local Gemma 4:e4b on Mac Mini for legal refinement.")
        try:
            response = requests.post(
                self.endpoint,
                headers={"Authorization": f"Bearer {self.bridge_key}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "prompt": f"Convert this text to clean HTML format agreement with headings and lists. No markdown fences. Text:\n\n{pdf_text}",
                    "stream": False
                },
                timeout=180
            )
            response.raise_for_status()
            content = response.json().get("response", "").strip()
            if content.startswith("```html"):
                content = content.split("```html")[1].split("```")[0].strip()
            elif content.startswith("```"):
                content = content.split("```")[1].split("```")[0].strip()
            return content
        except Exception as e:
            print(f"[Local AI] Agreement Analysis Error: {e}")
            return self.clean_ocr_fallback(pdf_text)

    def clean_ocr_fallback(self, text: str) -> str:
        """
        Formats raw OCR text into basic styled HTML as a backup when AI fails.
        """
        import re
        # Escape HTML
        html = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        
        # Replace OCR bullet points (e.g. (cid:127), bullets)
        html = re.sub(r'\(cid:\d+\)', '•', html)
        
        # Split by newlines and wrap paragraphs
        lines = html.split("\n")
        formatted_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Make headings bold
            if re.match(r'^(Section|Article|\d+(\.\d+)*)\b', line, re.IGNORECASE) or (line.isupper() and len(line) < 100):
                formatted_lines.append(f"<h3 style='font-weight: 800; font-size: 1.15rem; margin-top: 20px; margin-bottom: 8px; color: #1e293b;'>{line}</h3>")
            # Bullet items
            elif line.startswith("•") or line.startswith("-") or line.startswith("*") or line.startswith("·"):
                content = line.lstrip("•-*· ").strip()
                formatted_lines.append(f"<li style='margin-left: 20px; list-style-type: disc; margin-bottom: 6px; font-weight: 500;'>{content}</li>")
            else:
                # Bold key phrases like Party 1, Party 2, Recitals, etc.
                line = re.sub(r'\b(Party 1|Party 2|Company|Consultant|Effective Date|Confidential Information|Work Product|Dispute Resolution|Governing Law)\b', r'<strong>\1</strong>', line)
                # Italicize recitals or descriptive quotes
                if line.startswith("WHEREAS") or line.startswith("WHEREAS,"):
                    formatted_lines.append(f"<p style='margin-bottom: 10px; line-height: 1.6; font-style: italic; color: #475569;'>{line}</p>")
                else:
                    formatted_lines.append(f"<p style='margin-bottom: 10px; line-height: 1.6; font-weight: 500;'>{line}</p>")
                
        return f"<div style='font-family: sans-serif; color: #334155; padding: 15px;'>{''.join(formatted_lines)}</div>"


    def cluster_jobs(self, job_titles: List[str]) -> List[Dict]:
        return [{"cluster": "General", "roles": job_titles}]

if __name__ == "__main__":
    processor = RecruitmentProcessor()
    print("Recruitment Intelligence Engine Active.")
