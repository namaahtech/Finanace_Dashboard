
import { getSupabaseAdmin } from "../src/lib/supabase";

async function checkGetJoin() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("support_tickets")
    .select(`
      *,
      linked_ticket:support_tickets!linked_ticket_id(
        id, subject, status, priority, created_at,
        creator:employees!support_tickets_creator_id_fkey(id, name, role, department)
      )
    `)
    .not("linked_ticket_id", "is", null)
    .limit(1);
  
  if (error) {
    console.error("Error fetching ticket:", error);
  } else {
    console.log("Ticket with linked_ticket:");
    console.log(JSON.stringify(data, null, 2));
  }
}

checkGetJoin();
