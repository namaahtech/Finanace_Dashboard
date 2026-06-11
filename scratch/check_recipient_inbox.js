const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInbox() {
  const { data, error } = await supabase
    .from('mail_messages')
    .select('*')
    .eq('employee_id', 'a58cd282-df7b-4549-af3a-e9452c353b8a')
    .order('received_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching inbox:", error);
  } else {
    console.log("Recipient (Darshan) Inbox messages in DB:", data);
  }
}

checkInbox();
