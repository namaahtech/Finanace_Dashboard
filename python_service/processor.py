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


    def process_candidate(self, resume_text: str, jd_context: str) -> Dict:
        """
        Sends the resume and JD to Gemma 4:e4b on Mac Mini for a cognitive audit.
        """
        prompt = f"""
        Role: Senior Executive Technical Recruitment Intelligence Auditor (powered by Gemma 4:e4b)
        Mission: Perform an exhaustive 360-degree cognitive and technical audit of the candidate's resume against the Target Job Cluster.
        
        [JOB CLUSTER CONTEXT]
        {jd_context}
        
        [CANDIDATE RESUME TEXT (OCR EXTRACTED)]
        {resume_text}
        
        [AUDIT REQUIREMENTS]
        1.  OVERVIEW: Provide a high-level technical summary of the candidate's fit.
        2.  EDUCATION: Analyze degree relevance, institution prestige, and academic achievements.
        3.  PROJECTS: Deep-dive into technical complexity, role, and impact of listed projects.
        4.  EXPERIENCE & WORKS: Evaluate professional tenure, role progression, and industry alignment.
        5.  ACHIEVEMENTS: Identify quantified impacts, awards, or unique milestones.
        6.  SKILLS ANALYSIS:
            - SKILLS USED: List mandatory job skills found in the resume.
            - SKILLS NOT USED: List mandatory job skills missing from the resume.
        7.  MATCH PERCENTAGE BREAKDOWN (IMPORTANT: Return each as a 0-100 percentage):
            - Technical Skills (40% Weight): How well do they match the skill matrix (0-100).
            - Experience (30% Weight): How well does their tenure match (0-100).
            - Projects (20% Weight): How well do their projects align (0-100).
            - Education (10% Weight): How well does their education align (0-100).
        8.  INTERVIEW STRATEGY: Generate 5 to 10 EXTREMELY TRICKY, technical, and scenario-based interview questions.
        9.  DECISION: Proceed, Hold, or Rejected.

        Return ONLY a perfectly formatted JSON object (no markdown, no backticks):
        {
            "match_score": number, (Weighted total score from 0-100)
            "decision": "Accepted" | "Hold" | "Rejected",
            "breakdown": {
                "skills": number, (0-100 percentage)
                "experience": number, (0-100 percentage)
                "projects": number, (0-100 percentage)
                "education": number (0-100 percentage)
            },
            "resume_profile": {
                "summary": "Executive summary string",
                "overview": "Detailed professional profile string",
                "education": "Academic audit string",
                "projects": "Project analysis string",
                "experience": "Tenure audit string",
                "achievements": "Key results string"
            },
            "recommendations": {
                "pros": ["string"],
                "matched_skills": ["string"]
            },
            "gap_analysis": {
                "cons": ["string"],
                "missing_skills": ["string"]
            },
            "interview_questions": [
                { "question": "string", "reason": "rationale for this question" }
            ]
        }
        """
        
        try:
            response = requests.post(
                self.endpoint,
                headers={
                    "Authorization": f"Bearer {self.bridge_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                },
                timeout=180
            )
            response.raise_for_status()
            res_json = response.json()
            ai_output = res_json.get("response", "{}")
            
            # Extract metrics
            metrics = {
                "prompt_tokens": res_json.get("prompt_eval_count", 0),
                "completion_tokens": res_json.get("eval_count", 0),
                "total_duration_ms": res_json.get("total_duration", 0) // 1_000_000, # convert ns to ms
                "model": self.model
            }
            
            return json.loads(ai_output), metrics
        except Exception as e:
            print(f"AI Engine Error: {e}")
            return {
                "score": 50,
                "decision": "Hold",
                "summary": f"Audit failed: {str(e)}"
            }, {}

    def cluster_jobs(self, job_titles: List[str]) -> List[Dict]:
        """
        Group similar jobs into strategic clusters.
        """
        # Implementation for clustering logic
        return [{"cluster": "Engineering", "roles": job_titles}]

if __name__ == "__main__":
    processor = RecruitmentProcessor()
    print("Recruitment Intelligence Engine Active.")
