const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ojepnycexumwpzcvlydb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZXBueWNleHVtd3B6Y3ZseWRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0MDkwOCwiZXhwIjoyMDkxMzE2OTA4fQ.WKAgJqAUoEbMfB8UA-QK6-kUDFAQiI-ks5sKqHqx0xM'
);

async function checkTeams() {
  const { data, error } = await supabase.from('teams').select('*').limit(5);
  console.log('--- TEAMS SAMPLE ---');
  console.log(JSON.stringify(data, null, 2));
}

checkTeams();
