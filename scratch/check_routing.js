const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTeamLead(teamId, excludeId) {
  if (!teamId) return null;
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, role, department, team_id, is_team_lead, is_dept_lead")
    .eq("team_id", teamId)
    .eq("is_team_lead", true)
    .eq("is_active", true)
    .neq("id", excludeId || "")
    .limit(1);
  console.log("findTeamLead error:", error);
  return (data && data.length > 0) ? data[0] : null;
}

async function findDeptLead(department, excludeId) {
  if (!department) return null;
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, role, department, team_id, is_team_lead, is_dept_lead")
    .eq("department", department)
    .eq("is_dept_lead", true)
    .eq("is_active", true)
    .neq("id", excludeId || "")
    .limit(1);
  console.log("findDeptLead error:", error);
  return (data && data.length > 0) ? data[0] : null;
}

async function findAdmin() {
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, role, department")
    .eq("role", "admin")
    .eq("is_active", true)
    .limit(1);
  console.log("findAdmin error:", error);
  return (data && data.length > 0) ? data[0] : null;
}

async function test() {
  const creatorId = '66d71714-c7b8-4614-8d42-d86a2b38e072';
  
  const { data: creator } = await supabase
    .from("employees")
    .select("id, name, role, department, team_id, is_team_lead, is_dept_lead")
    .eq("id", creatorId)
    .single();

  console.log("Creator:", creator);
  
  const tl = await findTeamLead(creator.team_id, creator.id);
  const dl = await findDeptLead(creator.department, creator.id);
  const admin = await findAdmin();
  
  console.log("TL:", tl);
  console.log("DL:", dl);
  console.log("Admin:", admin);
}

test();
