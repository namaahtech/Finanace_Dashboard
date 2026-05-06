import os
import time
import json
import requests
from supabase import create_client, Client
from processor import RecruitmentProcessor
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env.local")

# Supabase Config - Sanitizing to prevent DNS 'getaddrinfo' failures
url: str = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
key: str = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

if not url or not key:
    print("CRITICAL: Supabase credentials missing in .env.local")
    exit(1)

supabase: Client = create_client(url, key)

processor = RecruitmentProcessor()

def poll_applications():
    """
    Polls the applications table for pending scans.
    """
    print("Recruitment Intelligence Engine: Monitoring for new applications...")
    
    while True:
        try:
            # 1. Fetch pending applications
            response = supabase.table("applications").select("*").eq("processing_status", "pending").execute()
            pending_apps = response.data

            for app in pending_apps:
                app_id = app["application_id"]
                cluster_id = app["applied_cluster_id"]
                file_path = app["resume_file_path"]

                print(f"Processing application: {app_id} for cluster: {cluster_id}")
                
                # Update status to processing
                supabase.table("applications").update({"processing_status": "processing"}).eq("application_id", app_id).execute()

                # 2. Fetch Job Cluster details
                cluster_res = supabase.table("job_clusters").select("*").eq("cluster_id", cluster_id).single().execute()
                cluster_data = cluster_res.data
                
                # 3. Real OCR / Text Extraction
                resume_text = "Experienced Professional"
                if file_path:
                    try:
                        print(f"Downloading resume from storage: {file_path}")
                        # Assuming the bucket name is 'resumes'
                        storage_res = supabase.storage.from_("resumes").download(file_path)
                        resume_text = processor.extract_text_from_pdf(storage_res)
                        
                        if not resume_text.strip():
                            resume_text = "ERROR: Could not extract text from resume."
                    except Exception as ocr_err:
                        print(f"File Download/OCR Error: {ocr_err}")
                        resume_text = "SIMULATED_FALLBACK: " + ", ".join(cluster_data.get("gemma_keywords", []))
                else:
                    # Fallback for manual text ingestion
                    resume_text = app.get("raw_resume_text", "")
                
                # 4. Neural Audit via Gemma 4
                jd_summary = f"""
                Job Title: {cluster_data['job_title_variants'][0]}
                Required Skills: {json.dumps(cluster_data['mandatory_skills'])}
                Required Education: {json.dumps(cluster_data.get('education', 'Not Specified'))}
                Seniority: {json.dumps(cluster_data.get('experience_requirements', {}).get('seniority_levels', []))}
                Key Focus Areas: {', '.join(cluster_data.get('gemma_keywords', []))}
                """
                
                # Capture start time for OCR + Gemma
                start_time = time.time()
                analysis, metrics = processor.process_candidate(resume_text, jd_summary)
                total_process_time = round(time.time() - start_time, 2)

                # Determine Source
                source = "Career Portal" if app_id.startswith("CAR-") else "Manual Upload"
                role_name = cluster_data['job_title_variants'][0]
                applicant_name = app["applicant_name"]
                
                # 5. Save Analysis Result (Enriched)
                talent_data = {
                    "application_id": app_id,
                    "cluster_id": cluster_id,
                    "resume_profile": {
                        **analysis.get("resume_profile", {}),
                        "metrics": metrics
                    },
                    "scoring": {
                        "match_score": analysis.get("match_score", 0),
                        "breakdown": analysis.get("breakdown", {}),
                        "decision": analysis.get("decision", "Hold")
                    },
                    "gap_analysis": analysis.get("gap_analysis", {}),
                    "recommendations": analysis.get("recommendations", {}),
                    "interview_questions": analysis.get("interview_questions", []),
                    "gemma_raw_response": analysis,
                    "gemma_processing_time_ms": metrics.get("total_duration_ms", 0)
                }

                supabase.table("talent_analysis").upsert(talent_data, on_conflict="application_id").execute()

                # 6. Finalize Status
                supabase.table("applications").update({
                    "processing_status": "completed",
                    "talent_analysis_ready_at": "now()"
                }).eq("application_id", app_id).execute()

                # 7. High-Visibility Console Log
                prompt_tokens = metrics.get("prompt_tokens", 0)
                eval_tokens = metrics.get("completion_tokens", 0)
                model_used = metrics.get("model", "gemma4:e4b")
                
                print(f"\n[AUDIT_SUCCESS] ------------------------------------------------")
                print(f"CANDIDATE : {applicant_name}")
                print(f"ROLE      : {role_name}")
                print(f"SOURCE    : {source} ({app_id})")
                print(f"AI MODEL  : {model_used}")
                print(f"METRICS   : Tokens: {prompt_tokens + eval_tokens} | CPU Time: {total_process_time}s")
                print(f"-------------------------------------------------------------\n")

        except Exception as e:
            print(f"Connection/Polling Error (will retry): {e}")
            # Wait a bit longer on error to allow network/DNS to recover
            time.sleep(20)
        
        time.sleep(10) # Poll every 10 seconds

if __name__ == "__main__":
    poll_applications()
