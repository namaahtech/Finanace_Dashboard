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
  const accountId = config.admin_account_id;

  const uploadUrl = `https://mail.zoho.in/api/accounts/${accountId}/messages/attachments?uploadType=multipart`;
  const formData = new FormData();
  const blob = new Blob([Buffer.from("Hello Zoho attachment test")], { type: "text/plain" });
  formData.append("attach", blob, "test_attachment_response.txt");

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
    },
    body: formData,
  });
  console.log("Status:", res.status);
  const json = await res.json();
  console.log("JSON:", JSON.stringify(json, null, 2));
}
run();
