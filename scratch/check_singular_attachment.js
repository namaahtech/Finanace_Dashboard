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

  const token = config.access_token;
  const accountId = "4180125000000002002";
  const folderId = "4180125000000002012"; // Sent folder
  const messageId = "1780911621123119300";

  const url = `${env.ZOHO_MAIL_API_URL}/accounts/${accountId}/folders/${folderId}/messages/${messageId}/attachment`;
  console.log(`\n--- Fetching: ${url} ---`);
  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  console.log(`Status: ${res.status}`);
  if (res.ok) {
    const json = await res.json();
    console.log("Response JSON:", JSON.stringify(json, null, 2));
  } else {
    console.log("Error:", await res.text());
  }
}
run();
