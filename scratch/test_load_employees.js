const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
  const { data: empData, error: empErr } = await supabase
    .from("employees")
    .select("id, name, role, department, team_id, is_team_lead, is_dept_lead, is_active")
    .eq("is_active", true);
  
  console.log("Employees Count:", empData ? empData.length : 0);
  console.log("Employees Error:", empErr);

  const { data: deptData, error: deptErr } = await supabase
    .from("teams")
    .select("name")
    .eq("type", "department")
    .eq("is_active", true)
    .order("name", { ascending: true });
    
  console.log("Departments Count:", deptData ? deptData.length : 0);
  console.log("Departments Error:", deptErr);
  
  let deptsList = [];
  if (deptData) {
    deptsList = deptData.map((d) => d.name).filter(Boolean);
  }
  
  if (empData) {
    const empDepts = empData.map((e) => e.department).filter(Boolean);
    empDepts.forEach((d) => {
      if (!deptsList.includes(d)) {
        deptsList.push(d);
      }
    });
  }
  
  deptsList.sort();
  console.log("Final deptsList:", deptsList);
}

testQueries();
