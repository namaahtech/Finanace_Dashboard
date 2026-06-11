const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = {};
fs.readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l => {
  const p = l.split('=');
  if(p.length>=2) env[p[0].trim()] = p.slice(1).join('=').trim();
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Try inserting 'accounts' role to check if enum allows it
  const { data, error } = await sb
    .from('employees')
    .select('id, role')
    .limit(5);
  
  console.log('Sample data:', data);
  console.log('Error:', error);

  // Try querying pg_enum for user_role type
  const { data: enumData, error: enumErr } = await sb
    .rpc('get_role_enum_values');
  
  console.log('Enum data:', enumData, 'Enum err:', enumErr);
}

run();
