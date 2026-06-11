const creatorId = '66d71714-c7b8-4614-8d42-d86a2b38e072'; // suhas

async function testPost() {
  const payload = {
    creator_id: creatorId,
    subject: "Test Ticket: Salary Issue",
    description: "I need urgent salary for my medical emergency of may month still...",
    priority: "critical",
    attachments: []
  };

  try {
    const res = await fetch("http://localhost:3000/api/support", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

testPost();
