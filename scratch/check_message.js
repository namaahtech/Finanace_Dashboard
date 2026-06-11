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
  const messageId = "1780911621123119300";

  // Get folders
  const foldersRes = await fetch(`${env.ZOHO_MAIL_API_URL}/accounts/${accountId}/folders`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  const folders = (await foldersRes.json()).data;
  console.log("Found Folders:", folders.map(f => ({ name: f.folderName, id: f.folderId })));

  // Try to find the message details in each folder
  for (const f of folders) {
    const detailUrl = `${env.ZOHO_MAIL_API_URL}/accounts/${accountId}/folders/${f.folderId}/messages/${messageId}/details`;
    const res = await fetch(detailUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    if (res.ok) {
      const details = await res.json();
      console.log(`Response in folder ${f.folderName} (${f.folderId}):`, JSON.stringify(details, null, 2));
    } else {
      console.log(`Failed in folder ${f.folderName}:`, res.status, await res.text());
    }
  }
}
run();
