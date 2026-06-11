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
  const testId = "00000000-0000-0000-0000-000000000000";
  // Delete first if exists
  await supabase.from("employees").delete().eq("id", testId);

  const insertData = {
    id: testId,
    name: "Test Accounts User",
    email: "test.accounts@mail.namaah.io",
    personal_email: "test.accounts@gmail.com",
    zoho_email: "test.accounts@mail.namaah.io",
    employee_id: "NP-TEST",
    role: "accounts", // This is the role we want to verify
    department: "FINANCE",
    designation: "Accountant",
    joining_date: new Date().toISOString(),
    employment_type: 'full_time',
    salary_structure: 'fixed_monthly',
    base_salary: 10000
  };

  console.log("Inserting test employee...");
  const { data, error } = await supabase.from("employees").insert(insertData).select();
  
  if (error) {
    console.error("Insertion failed:", error);
  } else {
    console.log("Insertion succeeded:", data);
    // Cleanup
    await supabase.from("employees").delete().eq("id", testId);
    console.log("Cleanup completed.");
  }
}
run();
