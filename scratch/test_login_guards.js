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

// Mock the login validation logic
async function validateLogin(email) {
  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Look up employee by email
  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("id, name, email, zoho_email, personal_email, status, is_active")
    .or(`email.ilike.${cleanEmail},personal_email.ilike.${cleanEmail},zoho_email.ilike.${cleanEmail}`)
    .maybeSingle();

  if (empErr) {
    return { success: false, error: "Database error: " + empErr.message };
  }
  if (!emp) {
    return { success: false, error: "You are not authorized in this company." };
  }

  if (emp.status === "disabled" || emp.is_active === false) {
    return { success: false, error: "Account has been deactivated. Please contact your administrator." };
  }

  // 2. Fetch onboarding status
  const { data: onboarding } = await supabase
    .from("user_onboarding")
    .select("status")
    .eq("user_id", emp.id)
    .maybeSingle();

  const onboardingCompleted = onboarding?.status === "completed";
  const isPersonalEmail = cleanEmail === emp.personal_email?.toLowerCase();

  // 3. If they enter their personal email and onboarding is completed, block them!
  if (isPersonalEmail && onboardingCompleted && emp.status !== "disabled") {
    return { success: false, error: "Please login with your company mail ID." };
  }

  // 3b. If they enter their professional email but onboarding is not completed, block them!
  const isProfessionalEmail = cleanEmail === emp.email?.toLowerCase() || (emp.zoho_email && cleanEmail === emp.zoho_email?.toLowerCase());
  const hasDistinctPersonalEmail = emp.personal_email && emp.personal_email.toLowerCase() !== emp.email?.toLowerCase();
  if (isProfessionalEmail && hasDistinctPersonalEmail && !onboardingCompleted) {
    return { success: false, error: "First time login with personal mail and complete onboarding, after login with professional mail." };
  }

  return { success: true, message: "Valid to proceed to authentication", employee: emp };
}

async function run() {
  // Fetch Yashwanth
  const { data: emp, error } = await supabase
    .from("employees")
    .select("*")
    .ilike("name", "%yashwanth%")
    .maybeSingle();

  if (error || !emp) {
    console.error("Yashwanth not found or error:", error);
    return;
  }

  // Get onboarding
  const { data: onboarding } = await supabase.from("user_onboarding").select("*").eq("user_id", emp.id).maybeSingle();
  const onboarded = onboarding?.status === "completed";
  console.log(`\nEmployee: ${emp.name} (Onboarding completed: ${onboarded})`);
  
  // Test professional email login
  if (emp.email) {
    const res = await validateLogin(emp.email);
    console.log(`- Login as Professional Email (${emp.email}):`, res.success ? "PASSED" : `BLOCKED (${res.error})`);
  }

  // Test personal email login
  if (emp.personal_email) {
    const res = await validateLogin(emp.personal_email);
    console.log(`- Login as Personal Email (${emp.personal_email}):`, res.success ? "PASSED" : `BLOCKED (${res.error})`);
  }
}
run();
