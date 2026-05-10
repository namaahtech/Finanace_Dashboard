import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename LIKE 'lms_%';
    `
  });
  
  if (error) {
    console.log("RPC exec_sql failed, trying standard query...");
    // Fallback: If exec_sql doesn't exist, we can't easily check pg_tables via JS client 
    // unless there's another RPC.
  } else {
    console.log("RLS Status:", data);
  }
}

checkRLS();
