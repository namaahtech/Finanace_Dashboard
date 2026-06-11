const creatorId = '66d71714-c7b8-4614-8d42-d86a2b38e072'; // suhas

async function runTest() {
  // 1. Create a ticket
  const createRes = await fetch("http://localhost:3000/api/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creator_id: creatorId,
      subject: "Test Ticket for Role Tracking",
      description: "Testing if roles are tracked.",
      priority: "medium"
    })
  });
  
  const createData = await createRes.json();
  console.log("Create Status:", createRes.status);
  console.log("Created tracking log:", createData.ticket?.tracking_log);

  if (createData.ticket?.id) {
    // 2. Reject the ticket to test PATCH tracking log
    const patchRes = await fetch("http://localhost:3000/api/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_id: createData.ticket.id,
        actor_id: 'a58cd282-df7b-4549-af3a-e9452c353b8a', // Darshan (Admin)
        action: "reject",
        rejection_reason: "Testing reject role tracking"
      })
    });
    
    const patchData = await patchRes.json();
    console.log("Patch Status:", patchRes.status);
    console.log("Patched tracking log:", patchData.ticket?.tracking_log);
  }
}

runTest();
