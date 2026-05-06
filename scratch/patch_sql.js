const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function patchSchema() {
  console.log('--- Applying Surgical Schema Patch ---');
  
  // We can't run ALTER TABLE directly via the client, 
  // so I will provide the SQL to the user or try to use a specialized RPC if available.
  // Actually, since I have the service role key, I can try to use the SQL API if it exists or just instruct the user.
  
  // Since I don't have a direct SQL executor, I will check if I can use a migration-like approach.
  // Wait, I can use the 'run_sql' RPC if the user has it.
  
  const sql = `
    ALTER TABLE interviews 
    ADD COLUMN IF NOT EXISTS interviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS interview_type TEXT DEFAULT 'technical',
    ADD COLUMN IF NOT EXISTS unique_access_token TEXT UNIQUE DEFAULT ('ni_' || lower(substring(gen_random_uuid()::text from 1 for 12))),
    ADD COLUMN IF NOT EXISTS recording_url TEXT,
    ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS interviewer_notes TEXT;
  `;

  console.log('Please execute the following SQL in your Supabase SQL Editor:');
  console.log('------------------------------------------------------------');
  console.log(sql);
  console.log('------------------------------------------------------------');
}

patchSchema();
