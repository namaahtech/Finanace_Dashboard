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

  // List messages from Sent folder (folderId 4180125000000002012)
  const url = `${env.ZOHO_MAIL_API_URL}/accounts/${accountId}/messages/view?folderId=4180125000000002012&limit=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  if (!res.ok) {
    console.error("List failed:", res.status, await res.text());
    return;
  }
  const messages = (await res.json()).data;
  console.log(`Found ${messages?.length || 0} messages in Sent.`);

  const messagesWithAtt = messages.filter(m => m.hasAttachment === "1");
  console.log(`Messages with attachments:`, messagesWithAtt.map(m => ({ id: m.messageId, subject: m.subject, folderId: m.folderId })));

  for (const m of messagesWithAtt) {
    const detailUrl = `${env.ZOHO_MAIL_API_URL}/accounts/${accountId}/folders/${m.folderId}/messages/${m.messageId}/details`;
    const detailRes = await fetch(detailUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    if (detailRes.ok) {
      const details = await detailRes.json();
      console.log(`Details for subject "${m.subject}" (${m.messageId}):`, JSON.stringify(details.data, null, 2));
    }
  }
}
run();
