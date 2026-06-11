const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const cleanLine = line.trim();
  if (!cleanLine || cleanLine.startsWith('#')) return;
  const parts = cleanLine.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: config } = await supabase
    .from('zoho_config')
    .select('*')
    .eq('is_connected', true)
    .maybeSingle();

  if (!config?.access_token) {
    console.log("No connected Zoho configuration found.");
    return;
  }

  const token = config.access_token;
  const adminAccountId = "4180125000000002002";
  const url = `${env.ZOHO_MAIL_API_URL || "https://mail.zoho.in/api"}/accounts/${adminAccountId}/messages`;

  // Try sending as admin@mail.namaah.io with replyToAddress set to devu.darshan@mail.namaah.io
  const payload = {
    fromAddress: "admin@mail.namaah.io",
    toAddress: "devu.darshan@mail.namaah.io",
    replyToAddress: "devu.darshan@mail.namaah.io",
    subject: "Test 3: Reply-To employee",
    content: "This is a test of replyToAddress setting.",
    mailFormat: "html"
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  console.log(`Test 3 status: ${res.status}`);
  const text = await res.text();
  console.log(`Test 3 response: ${text}`);
}

run().catch(console.error);
