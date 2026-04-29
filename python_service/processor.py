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
        Role: Recruitment Intelligence Auditor
        Mission: Perform a 360-degree cognitive audit of the candidate's profile against the Job Description.
        
        [JOB DESCRIPTION CONTEXT]
        {jd_context}
        
        [CANDIDATE RESUME DATA]
        {resume_text}
        
        [INSTRUCTIONS]
        1. ANALYZE projects: Identify specific projects the candidate has done.
        2. MATCH Education: Check if candidate's degree matches the required education in the JD.
        3. GENERATE Pros: Why is this candidate a top choice?
        4. GENERATE Cons: What are the critical gaps or concerns?
        5. GENERATE Tricky Interview Questions: Create 3 HARD, technical, and tricky questions that specifically test the claims made in their projects.
        6. SCORE: Provide a match score (0-100).

        Return ONLY a JSON object with this structure:
        {{
            "score": number,
            "decision": "Proceed" | "Hold" | "Rejected",
            "education_match": "string explaining degree alignment",
            "pros": ["string", "string"],
            "cons": ["string", "string"],
            "tricky_questions": [
                {{ "question": "string", "reason": "why this is tricky based on their project" }}
            ],
            "summary": "High-level cognitive profile summary"
        }}
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
                timeout=60
            )
            response.raise_for_status()
            ai_output = response.json().get("response", "{}")
            return json.loads(ai_output)
        except Exception as e:
            print(f"AI Engine Error: {e}")
            return {
                "score": 50,
                "decision": "Hold",
                "summary": f"Audit failed: {str(e)}"
            }

    def cluster_jobs(self, job_titles: List[str]) -> List[Dict]:
        """
        Group similar jobs into strategic clusters.
        """
        # Implementation for clustering logic
        return [{"cluster": "Engineering", "roles": job_titles}]

if __name__ == "__main__":
    processor = RecruitmentProcessor()
    print("Recruitment Intelligence Engine Active.")
