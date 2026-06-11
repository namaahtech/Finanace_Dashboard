const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const env = {};
envText.split('\n').forEach(line => {
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
  const cleanEmail = 'devu47362@gmail.com';
  const { data: emp, error } = await supabase
    .from("employees")
    .select("id, name, email, zoho_email, personal_email, status, is_active, role, employee_id, department, designation")
    .or(`email.ilike.${cleanEmail},personal_email.ilike.${cleanEmail},zoho_email.ilike.${cleanEmail}`)
    .maybeSingle();

  console.log("Query Error:", error);
  console.log("Query Data:", emp);
}
run();
