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
  const detailId = "161eb863-ae9f-40a6-9da6-90ba43ddbf2a";

  const { data: cachedMsg } = await supabase
    .from("mail_messages")
    .select("*")
    .eq("id", detailId)
    .maybeSingle();

  if (!cachedMsg) {
    console.error("Cached message not found.");
    return;
  }

  console.log("Cached Message:", {
    zoho_message_id: cachedMsg.zoho_message_id,
    zoho_account_id: cachedMsg.zoho_account_id,
    subject: cachedMsg.subject,
    folder: cachedMsg.folder
  });

  const accountId = "4180125000000002002"; // Fallback to admin account ID
  const originalMessageId = cachedMsg.zoho_message_id.split("_")[1];

  // Get folders
  const foldersRes = await fetch(`${env.ZOHO_MAIL_API_URL}/accounts/${accountId}/folders`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  const folders = (await foldersRes.json()).data;

  const tryFetchForFolder = async (folderName) => {
    const matched = folders.find(f => f.folderName?.toLowerCase() === folderName.toLowerCase());
    const fId = matched?.folderId;
    if (!fId) return null;

    try {
      const detailsUrl = `${env.ZOHO_MAIL_API_URL}/accounts/${accountId}/folders/${fId}/messages/${originalMessageId}/details`;
      console.log("Fetching details from:", detailsUrl);
      const res = await fetch(detailsUrl, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });
      if (res.ok) {
        return { details: await res.json(), folderId: fId };
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  // Try folders
  let result = await tryFetchForFolder("Inbox");
  if (!result) result = await tryFetchForFolder("Sent");

  console.log("Result:", JSON.stringify(result, null, 2));
}
run();
