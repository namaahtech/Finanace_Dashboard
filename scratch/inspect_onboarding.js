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
  console.log("Checking user_onboarding records...");
  const { data: onboarding, error: obError } = await supabase
    .from("user_onboarding")
    .select("*")
    .limit(5);

  if (obError) {
    console.error("Error fetching user_onboarding:", obError);
  } else {
    console.log("user_onboarding sample rows:", onboarding);
  }

  console.log("Checking onboarding_checklists or checklists...");
  // Let's check table names or query some possible checklists tables
  const { data: checklists, error: clError } = await supabase
    .from("checklists")
    .select("*")
    .limit(5);
  
  if (clError) {
    console.log("Error fetching checklists:", clError.message);
    const { data: checklists2, error: clError2 } = await supabase
      .from("onboarding_checklists")
      .select("*")
      .limit(5);
    if (clError2) {
      console.log("Error fetching onboarding_checklists:", clError2.message);
    } else {
      console.log("onboarding_checklists sample rows:", checklists2);
    }
  } else {
    console.log("checklists sample rows:", checklists);
  }
}
run();
