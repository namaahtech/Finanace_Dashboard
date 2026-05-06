const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSmtp() {
  const { data, error } = await supabase
    .from('company_profile')
    .select('company_name, smtp_host, smtp_user, smtp_pass')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching company profile:', error);
    return;
  }

  console.log('--- SMTP SETTINGS AUDIT ---');
  console.log('Company:', data.company_name);
  console.log('SMTP Host:', data.smtp_host || 'MISSING');
  console.log('SMTP User:', data.smtp_user || 'MISSING');
  console.log('SMTP Password Set:', !!data.smtp_pass);
}

checkSmtp();
