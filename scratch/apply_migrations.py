import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def apply_sql(file_path):
    print(f"Applying {file_path}...")
    with open(file_path, 'r') as f:
        sql = f.read()
    
    # Split by semicolon to run individual commands if needed, 
    # but Supabase RPC or direct SQL execution via postgres is preferred.
    # Since supabase-py doesn't have a direct 'query' method for raw SQL,
    # we usually have to use a custom function or do it via the dashboard.
    
    # However, I can try to use the REST API to execute SQL if configured, 
    # but usually, users just copy-paste to the SQL Editor.
    
    print("Please copy the content of the following files to your Supabase SQL Editor:")
    print(f"1. d:/Finanace_Dashboard/src/supabase/migrations/049_recruitment_system_restoration.sql")
    print(f"2. d:/Finanace_Dashboard/src/supabase/migrations/050_seed_recruitment_clusters.sql")

if __name__ == "__main__":
    apply_sql("src/supabase/migrations/049_recruitment_system_restoration.sql")
