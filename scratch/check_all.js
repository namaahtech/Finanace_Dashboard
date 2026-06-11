const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAll() {
  const { data: emps, error } = await supabase
    .from('employees')
    .select('id, name, email, role, matrix_role, is_active');
  
  if (error) {
    console.error(error);
    return;
  }
  console.log("All Employees:");
  console.log(JSON.stringify(emps, null, 2));
}

checkAll();
