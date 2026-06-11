const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
  const { data, error } = await supabase.from('system_config').select('*').limit(1).single();
  if (error) {
    console.error(error);
  } else {
    console.log('--- system_config ---');
    console.log('id:', data.id);
    console.log('consultant_agreement_url:', data.consultant_agreement_url);
    console.log('consultant_agreement_text exists:', !!data.consultant_agreement_text);
    console.log('consultant_agreement_text length:', data.consultant_agreement_text ? data.consultant_agreement_text.length : 0);
    console.log('consultant_agreement_text preview:', data.consultant_agreement_text ? data.consultant_agreement_text.substring(0, 200) : 'null');
  }
}

checkConfig();
