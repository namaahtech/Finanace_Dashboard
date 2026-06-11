const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTask() {
  const { data, error } = await supabase
    .from('onboarding_analysis_queue')
    .select('*')
    .eq('id', 'deb59ffa-121e-4d9a-9769-db6a4dee7592')
    .single();

  if (error) {
    console.error(error);
  } else {
    console.log('--- Task deb59ffa-121e-4d9a-9769-db6a4dee7592 ---');
    console.log('status:', data.status);
    console.log('created_at:', data.created_at);
    console.log('updated_at:', data.updated_at);
    console.log('pdf_url:', data.pdf_url);
    console.log('error_message:', data.error_message);
  }
}

checkTask();
