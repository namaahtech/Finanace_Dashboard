const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSyncUpsert() {
  const rows = [{
    zoho_message_id: '4180125000000002002_1780920523312119300',
    zoho_account_id: '4180125000000002002',
    employee_id: '7a47d2a4-c4a1-494c-88c8-0d2bbeb352cb', // Devu Darshan
    folder: 'Sent',
    subject: 'Re: Update Regarding Your Application (Reference: 192883783)',
    from_address: 'devu.darshan@mail.namaah.io',
    from_name: 'Devu Darshan',
    to_address: ['admin@mail.namaah.io'],
    preview: 'Test',
    body: 'Test',
    received_at: new Date().toISOString()
  }];

  const { data, error } = await supabase
    .from('mail_messages')
    .upsert(rows, { onConflict: 'zoho_message_id' });

  if (error) {
    console.log("Upsert failed! Error details:", error);
  } else {
    console.log("Upsert succeeded! Data:", data);
  }
}

testSyncUpsert();
