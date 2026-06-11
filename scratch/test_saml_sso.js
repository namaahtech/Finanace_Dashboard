const fs = require('fs');
const path = require('path');

async function run() {
  const email = 'jagadisha@mail.namaah.io';
  const password = 'NewPassword123!';

  console.log("1. Logging in to get session cookie...");
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  console.log("Login Status:", loginRes.status);
  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log("Session Cookie:", cookieHeader);

  if (!cookieHeader) {
    console.error("No session cookie returned!");
    process.exit(1);
  }

  // Extract cookie name and value (e.g. session=...)
  const sessionCookie = cookieHeader.split(';')[0];

  console.log("\n2. Fetching SAML SSO endpoint...");
  const ssoRes = await fetch('http://localhost:3000/api/auth/saml/sso?RelayState=%2Fdashboard', {
    headers: {
      'Cookie': sessionCookie
    },
    redirect: 'manual' // Do not follow redirects so we can inspect the response headers/body
  });

  console.log("SSO Response Status:", ssoRes.status);
  console.log("SSO Response Headers:", Object.fromEntries(ssoRes.headers.entries()));

  const html = await ssoRes.text();
  console.log("\nSSO Response HTML/Body:");
  console.log(html);
}

run();
