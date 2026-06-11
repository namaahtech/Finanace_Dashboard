import os
import time
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.env.local"))
load_dotenv(dotenv_path=env_path)

# Import RecruitmentProcessor
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../python_service")))
from processor import RecruitmentProcessor

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)
processor = RecruitmentProcessor()

def run():
    # Get the latest task
    res = supabase.table("onboarding_analysis_queue").select("*").order("created_at", desc=True).limit(1).single().execute()
    task = res.data
    if not task:
        print("No task found!")
        return
    
    print(f"Task ID: {task['id']}")
    pdf_url = task['pdf_url']
    print(f"PDF URL: {pdf_url}")
    
    # 1. Download
    path_part = pdf_url.split("/agreements/")[-1]
    full_path = f"agreements/{path_part}"
    print("Downloading from storage...")
    storage_res = supabase.storage.from_("legal").download(full_path)
    
    # 2. OCR Extraction
    print("Extracting text...")
    start_ocr = time.time()
    raw_text = processor.extract_text_from_pdf(storage_res)
    print(f"OCR finished in {time.time() - start_ocr:.2f}s. Character count: {len(raw_text)}")
    print("Preview of raw text:")
    print(raw_text[:200])
    
    # 3. Test models with a 60 second timeout
    test_models = [
        "nvidia/nemotron-3-super-120b-a12b:free",
        "openai/gpt-oss-120b:free",
        "google/gemma-4-31b-it:free",
        "openai/gpt-oss-20b:free"
    ]
    
    for model in test_models:
        print(f"\n--- Testing model: {model} ---")
        start_model = time.time()
        try:
            res_text = processor.analyze_onboarding_agreement(raw_text)
            print(f"Model {model} completed in {time.time() - start_model:.2f}s.")
            print(f"Result length: {len(res_text)}")
            print("Preview of result:")
            print(res_text[:300])
            break # Stop after the first successful model
        except Exception as e:
            print(f"Model {model} failed after {time.time() - start_model:.2f}s: {e}")

if __name__ == "__main__":
    run()
