import os
import time
import json
import requests
from supabase import create_client, Client
from processor import RecruitmentProcessor
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env.local")

# Supabase Config
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
    try:
        # 1. Fetch pending applications
        response = supabase.table("applications").select("*").eq("processing_status", "pending").execute()
        pending_apps = response.data

        for app in pending_apps:
            app_id = app["application_id"]
            cluster_id = app["applied_cluster_id"]
            file_path = app["resume_file_path"]

            print(f"Processing application: {app_id}")
            
            # Helper to update progress
            def update_progress(progress, step):
                supabase.table("applications").update({
                    "processing_status": "processing",
                    "processing_progress": progress,
                    "processing_step": step
                }).eq("application_id", app_id).execute()

            # Update status to processing
            update_progress(10, "Initializing Engine...")

            # 2. Fetch Job Cluster details
            cluster_res = supabase.table("job_clusters").select("*").eq("cluster_id", cluster_id).single().execute()
            cluster_data = cluster_res.data
            
            # 3. Real OCR / Text Extraction
            update_progress(30, "Extracting Resume Text (OCR)...")
            storage_res = supabase.storage.from_("resumes").download(file_path)
            resume_text = processor.extract_text_from_pdf(storage_res)
            
            # 4. Neural Audit via Gemma 4
            update_progress(60, "Gemma 4 Neural Analysis...")
            jd_summary = f"Title: {cluster_data['job_title_variants'][0]} | Skills: {json.dumps(cluster_data['mandatory_skills'])}"
            start_time = time.time()
            analysis, metrics = processor.process_candidate(resume_text, jd_summary)
            total_process_time = round(time.time() - start_time, 2)

            # 5. Save Analysis Result — robust mapping
            update_progress(90, "Saving Intelligence Reports...")
            def get_nested_or_flat(d, nested_key, flat_key, default=None):
                val = d.get(nested_key)
                if isinstance(val, dict) and val:
                    return val
                # Try flat mapping
                return d.get(flat_key, default)

            # Extract scoring
            scoring_raw = analysis.get("scoring")
            if isinstance(scoring_raw, dict):
                scoring = scoring_raw
            else:
                # Handle flat format
                scoring = {
                    "match_score": analysis.get("match_score", analysis.get("score", 50)),
                    "decision": analysis.get("decision", "Hold"),
                    "breakdown": analysis.get("breakdown", {
                        "skills": analysis.get("skills_score", 0),
                        "experience": analysis.get("experience_score", 0),
                        "projects": analysis.get("projects_score", 0),
                        "education": analysis.get("education_score", 0)
                    }),
                }

            # Extract Profile & Analysis
            resume_profile = analysis.get("resume_profile")
            if not isinstance(resume_profile, dict):
                resume_profile = {
                    "summary": analysis.get("summary", "Analysis complete."),
                    "overview": analysis.get("overview", analysis.get("summary", "")),
                    "education": analysis.get("education", ""),
                    "projects": analysis.get("projects", ""),
                    "experience": analysis.get("experience", ""),
                    "achievements": analysis.get("achievements", "")
                }
            
            recommendations = analysis.get("recommendations")
            if not isinstance(recommendations, dict):
                recommendations = {
                    "pros": analysis.get("pros", []),
                    "matched_skills": analysis.get("matched_skills", analysis.get("skills", []))
                }

            gap_analysis = analysis.get("gap_analysis")
            if not isinstance(gap_analysis, dict):
                gap_analysis = {
                    "cons": analysis.get("cons", []),
                    "missing_skills": analysis.get("missing_skills", [])
                }

            talent_data = {
                "application_id": app_id,
                "cluster_id": cluster_id,
                "scoring": scoring,
                "resume_profile": resume_profile,
                "recommendations": recommendations,
                "gap_analysis": gap_analysis,
                "interview_questions": analysis.get("interview_questions", []),
                "gemma_raw_response": analysis,
                "gemma_processing_time_ms": metrics.get("total_duration_ms", 0),
            }
            
            # Use upsert to update if exists
            supabase.table("talent_analysis").upsert(talent_data, on_conflict="application_id").execute()

            # 6. Finalize Status
            supabase.table("applications").update({
                "processing_status": "completed",
                "processing_progress": 100,
                "processing_step": "Analysis Verified",
                "talent_analysis_ready_at": "now()"
            }).eq("application_id", app_id).execute()

            print(f"[AUDIT_SUCCESS] Candidate Audit Completed in {total_process_time}s")

    except Exception as e:
        print(f"Recruitment Polling Error: {e}")

def poll_onboarding_tasks():
    """
    Polls the onboarding_analysis_queue table for pending PDF scans.
    """
    try:
        response = supabase.table("onboarding_analysis_queue").select("*").eq("status", "pending").execute()
        pending_tasks = response.data

        for task in pending_tasks:
            task_id = task["id"]
            pdf_url = task["pdf_url"]

            print(f"Neural Compliance Audit: Processing Agreement ID {task_id}")
            supabase.table("onboarding_analysis_queue").update({"status": "processing"}).eq("id", task_id).execute()

            try:
                # 1. Download from storage
                path_part = pdf_url.split("/agreements/")[-1]
                full_path = f"agreements/{path_part}"
                storage_res = supabase.storage.from_("legal").download(full_path)
                
                # 2. OCR Extraction
                raw_text = processor.extract_text_from_pdf(storage_res)
                
                # 3. Gemma 4 Legal Refinement
                refined_text = processor.analyze_onboarding_agreement(raw_text)
                
                # 4. Update System Config
                config_res = supabase.table("system_config").select("id").limit(1).single().execute()
                if config_res.data:
                    supabase.table("system_config").update({
                        "consultant_agreement_text": refined_text,
                        "consultant_agreement_url": pdf_url
                    }).eq("id", config_res.data["id"]).execute()
                
                # 5. Finalize Task
                supabase.table("onboarding_analysis_queue").update({
                    "status": "completed",
                    "analyzed_text": refined_text,
                    "updated_at": "now()"
                }).eq("id", task_id).execute()
                
                print(f"Neural Compliance Audit: Success for Task {task_id}")

            except Exception as e:
                print(f"Compliance Audit Error: {e}")
                supabase.table("onboarding_analysis_queue").update({
                    "status": "failed",
                    "error_message": str(e),
                    "updated_at": "now()"
                }).eq("id", task_id).execute()

    except Exception as e:
        print(f"Onboarding Polling Error: {e}")

def main_loop():
    print("Intelligence Engine v2.0: Multi-Tasking Active (Recruitment + Compliance)")
    while True:
        poll_applications()
        poll_onboarding_tasks()
        time.sleep(10)

if __name__ == "__main__":
    main_loop()
