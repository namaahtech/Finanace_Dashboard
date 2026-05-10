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
        Role: Senior Executive Technical Recruitment Intelligence Auditor (powered by Gemma 4:e4b)
        [CONTEXT]
        JD: {jd_context}
        Resume: {resume_text}
        Return ONLY a perfectly formatted JSON object with match_score, decision, and breakdown.
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
            metrics = {
                "total_duration_ms": res_json.get("total_duration", 0) // 1_000_000,
                "model": self.model
            }
            return json.loads(ai_output), metrics
        except Exception as e:
            print(f"AI Engine Error: {e}")
            return {"match_score": 50, "decision": "Hold"}, {}

    def analyze_onboarding_agreement(self, pdf_text: str) -> str:
        """
        Uses Gemma 4:e4b to clean up OCR text and format it into a professional Consultant Agreement.
        """
        prompt = f"""
        Role: Legal Compliance AI (powered by Gemma 4:e4b)
        Task: Clean and format this OCR text into a professional Consultant Agreement.
        [OCR RAW TEXT]
        {pdf_text}
        Output ONLY the cleaned agreement text.
        """
        
        try:
            response = requests.post(
                self.endpoint,
                headers={"Authorization": f"Bearer {self.bridge_key}", "Content-Type": "application/json"},
                json={"model": self.model, "prompt": prompt, "stream": False},
                timeout=300
            )
            response.raise_for_status()
            return response.json().get("response", "").strip()
        except Exception as e:
            print(f"Agreement Analysis Error: {e}")
            return pdf_text

    def cluster_jobs(self, job_titles: List[str]) -> List[Dict]:
        return [{"cluster": "General", "roles": job_titles}]

if __name__ == "__main__":
    processor = RecruitmentProcessor()
    print("Recruitment Intelligence Engine Active.")
