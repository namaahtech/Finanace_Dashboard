const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function printRecent() {
  const { data, error } = await supabase
    .from('onboarding_analysis_queue')
    .select('id, status, pdf_url, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

printRecent();
