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
  const { data: emp, error } = await supabase
    .from("employees")
    .select("*")
    .ilike("name", "%yashwanth%")
    .maybeSingle();

  if (error) {
    console.error("DB error:", error);
    return;
  }
  if (!emp) {
    console.log("No employee found with name Yashwanth.");
    return;
  }

  console.log("Yashwanth Employee Record:", JSON.stringify(emp, null, 2));

  // Get onboarding
  const { data: onboarding } = await supabase
    .from("user_onboarding")
    .select("*")
    .eq("user_id", emp.id)
    .maybeSingle();
  console.log("Onboarding record:", onboarding);
}
run();
