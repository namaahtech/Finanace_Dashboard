const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '.env.local');
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

async function uploadToZoho(token, accountId, filename, buffer, contentType) {
  const uploadUrl = `https://mail.zoho.in/api/accounts/${accountId}/messages/attachments?uploadType=multipart`;
  const formData = new FormData();
  const blob = new Blob([buffer], { type: contentType });
  formData.append("attach", blob, filename);

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
    },
    body: formData,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function run() {
  const { data: config } = await supabase
    .from('zoho_config')
    .select('*')
    .maybeSingle();

  const token = config.access_token;
  const accountId = config.admin_account_id;

  // Test 1: Upload a 100KB .txt file
  console.log("Test 1: Uploading text file...");
  const txtResult = await uploadToZoho(token, accountId, "test.txt", Buffer.alloc(100 * 1024, 'a'), "text/plain");
  console.log("Text File Status:", txtResult.status, "JSON:", JSON.stringify(txtResult.json));

  // Test 2: Upload a 100KB .exe file
  console.log("Test 2: Uploading exe file...");
  const exeResult = await uploadToZoho(token, accountId, "test.exe", Buffer.alloc(100 * 1024, 'a'), "application/octet-stream");
  console.log("Exe File Status:", exeResult.status, "JSON:", JSON.stringify(exeResult.json));
}
run();
