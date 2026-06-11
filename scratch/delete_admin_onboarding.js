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
  const userId = 'a58cd282-df7b-4549-af3a-e9452c353b8a';
  console.log(`Deleting user_onboarding row for user_id: ${userId}...`);
  const { data, error } = await supabase
    .from("user_onboarding")
    .delete()
    .eq("user_id", userId);
  
  if (error) {
    console.error("Delete failed:", error);
  } else {
    console.log("Delete successful!");
  }
}
run();
