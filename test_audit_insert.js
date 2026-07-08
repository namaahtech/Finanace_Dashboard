const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
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
  const { data, error } = await supabase
    .rpc("inspect_table_columns", { table_name: "audit_logs" });
    
  if (error) {
    // If RPC doesn't exist, query from information_schema
    const { data: cols, error: err2 } = await supabase
      .from("audit_logs")
      .select("*")
      .limit(1);
      
    if (err2) {
      console.error("Select failed:", err2);
    } else {
      console.log("Columns present in select:", Object.keys(cols[0] || {}));
    }
  } else {
    console.log("Table columns:", data);
  }
}
run();
