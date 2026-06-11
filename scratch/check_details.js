const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDetails() {
  const { data: allEmployees, error } = await supabase
    .from('employees')
    .select('id, name, email, role, department, team_id, is_team_lead, is_dept_lead, is_active');
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("All Employees:", allEmployees);
  }
}

checkDetails();
