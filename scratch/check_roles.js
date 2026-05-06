const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ojepnycexumwpzcvlydb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZXBueWNleHVtd3B6Y3ZseWRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0MDkwOCwiZXhwIjoyMDkxMzE2OTA4fQ.WKAgJqAUoEbMfB8UA-QK6-kUDFAQiI-ks5sKqHqx0xM'
);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_my_role');
  console.log('Role from RPC:', data, error);

  const { data: emps, error: eError } = await supabase.from('employees').select('role').limit(10);
  console.log('Roles in DB:', emps?.map(e => e.role));
}

checkSchema();
