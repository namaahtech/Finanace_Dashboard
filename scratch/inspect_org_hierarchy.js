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
  console.log("Fetching all teams/departments...");
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name, type, parent_id, lead_id, head_id");

  if (teamsErr) {
    console.error("Teams error:", teamsErr);
  } else {
    console.log("Teams count:", teams.length);
    console.log("Teams:", teams);
  }

  console.log("Fetching some employees with leads details...");
  const { data: emps, error: empsErr } = await supabase
    .from("employees")
    .select("id, name, role, department, team_id, is_dept_lead, is_team_lead, managed_department_id, managed_team_id")
    .limit(20);

  if (empsErr) {
    console.error("Employees error:", empsErr);
  } else {
    console.log("Employees sample:", emps);
  }
}
run();
