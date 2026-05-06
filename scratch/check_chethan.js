const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ojepnycexumwpzcvlydb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZXBueWNleHVtd3B6Y3ZseWRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0MDkwOCwiZXhwIjoyMDkxMzE2OTA4fQ.WKAgJqAUoEbMfB8UA-QK6-kUDFAQiI-ks5sKqHqx0xM'
);

async function checkManager() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role, department, team_id')
    .ilike('name', '%Chethan%');
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('--- EMPLOYEES ---');
  console.log(JSON.stringify(data, null, 2));

  const { data: teams, error: tError } = await supabase
    .from('teams')
    .select('*');
  
  console.log('--- TEAMS ---');
  console.log(JSON.stringify(teams, null, 2));
}

checkManager();
