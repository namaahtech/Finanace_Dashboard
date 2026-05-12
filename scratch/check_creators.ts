import { createClient } from '@supabase/supabase-js';

const NEXT_PUBLIC_SUPABASE_URL = "https://ojepnycexumwpzcvlydb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZXBueWNleHVtd3B6Y3ZseWRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0MDkwOCwiZXhwIjoyMDkxMzE2OTA4fQ.WKAgJqAUoEbMfB8UA-QK6-kUDFAQiI-ks5sKqHqx0xM";

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTicketCreators() {
  console.log("--- Ticket Creator Audit ---");
  const { data, error } = await supabase.from('support_tickets').select('id, subject, creator_id');
  if (error) {
    console.error(error);
    return;
  }
  data.forEach(t => {
    console.log(`Ticket: ${t.subject} | Creator ID: ${t.creator_id}`);
  });
}

checkTicketCreators();
