import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceKey) {
  console.error("Missing URL or Service Key!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function diagnose() {
  console.log("Starting Database Diagnostics...\n");

  // 1. Query all triggers on auth.users and public.employees
  console.log("--- Querying DB Triggers ---");
  const { data: triggers, error: trigErr } = await supabase.rpc('diagnose_triggers');
  
  if (trigErr) {
    console.log("Direct RPC diagnose_triggers failed. Trying standard SQL query via raw select...");
    // Fallback: Query via information_schema or standard tables if we have custom endpoints or sql executor
    // Wait, let's see if we can query pg_trigger using standard select on a view or table.
    // If not, let's try running a direct query or checking if there are other errors.
  }

  // Let's run a query on pg_catalog or public views if available
  // Wait, let's select from information_schema.triggers if accessible:
  try {
    const { data: infoTrigs, error: infoErr } = await supabase
      .from("information_schema.triggers" as any)
      .select("*")
      .limit(10);
    
    if (infoErr) {
      console.log("Could not query information_schema directly (standard client RLS). Code:", infoErr.code);
    } else {
      console.log("Triggers:", infoTrigs);
    }
  } catch (err: any) {
    console.log("Error querying information_schema:", err.message);
  }

  // Let's check the size and content of public.employees
  console.log("\n--- Checking employees Count ---");
  const { count, error: countErr } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true });
  
  if (countErr) {
    console.error("Error reading employees count:", countErr);
  } else {
    console.log(`Total employees in public.employees: ${count}`);
  }

  // Let's do a test query to find if we can access the pg_catalog schema
  console.log("\n--- Testing pg_catalog.pg_trigger ---");
  const { data: pgTrigs, error: pgErr } = await supabase
    .from("pg_trigger" as any)
    .select("tgname")
    .limit(5);
  
  if (pgErr) {
    console.log("Could not query pg_trigger directly. Code:", pgErr.code);
  } else {
    console.log("pg_trigger samples:", pgTrigs);
  }
}

diagnose();
