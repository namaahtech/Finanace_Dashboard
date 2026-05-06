require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Checking applications...');
  const { data: apps, error: appErr } = await supabase.from('applications').select('*').limit(1);
  if (appErr) console.error(appErr);
  else console.log('Applications row:', apps[0]);

  console.log('\nChecking talent_analysis...');
  const { data: analysis, error: analysisErr } = await supabase.from('talent_analysis').select('*').limit(1);
  if (analysisErr) console.error(analysisErr);
  else console.log('Talent analysis row:', analysis[0]);
}
main();
