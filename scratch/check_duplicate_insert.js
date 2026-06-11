const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const duplicateId = '4180125000000002002_1780920523312119300';
  
  const { data, error } = await supabase
    .from('mail_messages')
    .insert({
      zoho_message_id: duplicateId,
      zoho_account_id: '4180125000000002002',
      employee_id: 'a58cd282-df7b-4549-af3a-e9452c353b8a', // Darshan
      folder: 'Inbox',
      subject: 'Test Duplicate',
      from_address: 'devu.darshan@mail.namaah.io',
      from_name: 'Devu Darshan',
      to_address: ['admin@mail.namaah.io'],
      preview: 'Test',
      body: 'Test',
      received_at: new Date().toISOString(),
      is_read: false
    });

  if (error) {
    console.log("Insert failed as expected! Error details:", error);
  } else {
    console.log("Insert succeeded?! Data:", data);
  }
}

testInsert();
