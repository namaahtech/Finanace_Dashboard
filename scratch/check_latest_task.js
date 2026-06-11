const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestTask() {
  const { data, error } = await supabase
    .from('onboarding_analysis_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error(error);
  } else {
    console.log('--- Latest Task ---');
    console.log('id:', data.id);
    console.log('status:', data.status);
    console.log('error_message:', data.error_message);
    console.log('analyzed_text length:', data.analyzed_text ? data.analyzed_text.length : 0);
    console.log('analyzed_text preview:', data.analyzed_text ? data.analyzed_text.substring(0, 300) : 'null');
  }
}

checkLatestTask();
