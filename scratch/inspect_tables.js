const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const env = {};
envText.split(/\r?\n/).forEach(line => {
  const cleanLine = line.trim();
  if (!cleanLine || cleanLine.startsWith('#')) return;
  const parts = cleanLine.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Listing public tables...");
  // Let's run a select query on pg_tables
  // Since exec_sql is not available, let's try to query some standard tables or list schema cache tables
  // Wait, let's list some tables we know, or fetch schema information.
  // Can we run raw SQL? Let's check if there is a postgres connection we can open, or if we can inspect using supabase schema cache.
  // Wait, let's look at tsconfig.json or package.json. Let's see if we can query any table or if we can run a custom migration.
  // Let's just try to query a table `otps` or `otp_codes` and see if it fails.
  const { data, error } = await supabase.from("otp_codes").select("*").limit(1);
  if (error) {
    console.log("Table otp_codes does not exist or error:", error.message);
  } else {
    console.log("Table otp_codes exists!");
  }
}
run();
