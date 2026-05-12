
import { getSupabaseAdmin } from "../src/lib/supabase";

async function testPostJoin() {
  const supabase = getSupabaseAdmin();
  
  // 1. Get a random ticket to link to
  const { data: existing } = await supabase.from("support_tickets").select("id").limit(1).single();
  if (!existing) {
    console.log("No existing tickets found to link to.");
    return;
  }

  console.log(`Linking to existing ticket: ${existing.id}`);

  // 2. Try to insert a new ticket and select with joins
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      creator_id: "8a2788c1-1157-4b1b-8082-d2e2f740274c", // Use a valid employee ID from your DB
      target_role: "manager",
      assignee_id: "8a2788c1-1157-4b1b-8082-d2e2f740274c",
      subject: "Test Link Join",
      description: "Testing if insert().select() returns joined linked_ticket",
      category: "Technical",
      priority: "low",
      status: "open",
      linked_ticket_id: existing.id
    })
    .select(`
      *,
      linked_ticket:support_tickets!linked_ticket_id(
        id, subject, status, priority, created_at,
        creator:employees!support_tickets_creator_id_fkey(id, name, role, department)
      )
    `)
    .single();

  if (error) {
    console.error("Error during test insert:", error);
  } else {
    console.log("Insert result with join:");
    console.log(JSON.stringify(data, null, 2));
    
    if (data.linked_ticket) {
      console.log("SUCCESS: linked_ticket join populated.");
    } else {
      console.log("FAILURE: linked_ticket join is NULL.");
    }
  }
}

testPostJoin();
