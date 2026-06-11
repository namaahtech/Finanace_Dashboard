const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  const { data, error } = await supabase
    .from('mail_messages')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching messages:", error);
  } else {
    console.log("Last 5 messages in DB:");
    data.forEach((msg) => {
      console.log({
        id: msg.id,
        zoho_message_id: msg.zoho_message_id,
        folder: msg.folder,
        subject: msg.subject,
        from_address: msg.from_address,
        to_address: msg.to_address,
        received_at: msg.received_at,
        has_attachment: msg.has_attachment
      });
    });
  }
}

checkMessages();
