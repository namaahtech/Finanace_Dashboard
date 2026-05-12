import { createClient } from '@supabase/supabase-js';

const NEXT_PUBLIC_SUPABASE_URL = "https://ojepnycexumwpzcvlydb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZXBueWNleHVtd3B6Y3ZseWRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0MDkwOCwiZXhwIjoyMDkxMzE2OTA4fQ.WKAgJqAUoEbMfB8UA-QK6-kUDFAQiI-ks5sKqHqx0xM";

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyTickets() {
  console.log("--- Support Ticket Verification ---");
  
  const { data, error, count } = await supabase
    .from('support_tickets')
    .select('*, creator:employees!support_tickets_creator_id_fkey(name, role)', { count: 'exact' });

  if (error) {
    console.error("Error fetching tickets:", error);
    return;
  }

  console.log(`Total Tickets Stored: ${count}`);
  
  if (data && data.length > 0) {
    console.log("\nRecent Ticket Log:");
    data.slice(0, 10).forEach(t => {
      console.log(`[${t.created_at}] ID: ${t.id.slice(0,8)} | Subject: ${t.subject} | Status: ${t.status} | Creator: ${t.creator?.name || 'Unknown'} (${t.creator?.role || 'N/A'})`);
    });
  } else {
    console.log("No tickets found in the database.");
  }
}

verifyTickets();
