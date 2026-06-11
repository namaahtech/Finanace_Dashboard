const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, email, zoho_email, zoho_account_id');

  if (error) {
    console.error("Error fetching employees:", error);
  } else {
    console.log("Employees in DB:", data);
  }
}

checkEmployees();
