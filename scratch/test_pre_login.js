const fs = require('fs');
const path = require('path');

async function testPreLogin(email) {
  try {
    const res = await fetch('http://localhost:3000/api/auth/pre-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const status = res.status;
    const data = await res.json();
    console.log(`[Test Input: ${email}] Status: ${status}, Response:`, data);
  } catch (e) {
    console.error(`[Test Input: ${email}] Fetch error:`, e.message);
  }
}

async function run() {
  console.log("=== RUNNING PRE-LOGIN API ROUTE CHECKS ===");
  
  // 1. Test case: Non-existent email
  await testPreLogin('nonexistent@example.com');

  // 2. Test case: Personal email for pending onboarding user (devu47362@gmail.com)
  // Should return success: true with the emailToAuth set to professional email
  await testPreLogin('devu47362@gmail.com');

  // 3. Test case: Professional email for pending onboarding user (kumar@mail.namaah.io)
  // Should block with: "First time login with personal mail and complete onboarding..."
  await testPreLogin('kumar@mail.namaah.io');
}

run();
