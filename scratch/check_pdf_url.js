const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPdfUrl() {
  const { data, error } = await supabase
    .from('onboarding_analysis_queue')
    .select('*')
    .eq('id', 'a87791e2-ddb0-48b6-9910-047f3d41b606')
    .single();

  if (error) {
    console.error(error);
  } else {
    console.log('--- Task details ---');
    console.log('id:', data.id);
    console.log('pdf_url:', data.pdf_url);
    console.log('status:', data.status);
    console.log('analyzed_text preview:', data.analyzed_text ? data.analyzed_text.substring(0, 500) : 'null');
  }
}

checkPdfUrl();
