const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkKeys() {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('module_key')
    .eq('role', 'admin');
  
  if (error) {
    console.error(error);
    return;
  }
  console.log("Keys present in role_permissions for admin:");
  console.log(data.map(d => d.module_key).sort());
}

checkKeys();
