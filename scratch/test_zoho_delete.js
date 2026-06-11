const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const env = {};
envText.split(/\r?\n/).forEach(line => {
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
  const { data: config } = await supabase.from("zoho_config").select("*").single();
  const token = config.access_token;
  const zoid = config.zoid || process.env.ZOHO_ORG_ID;
  const url = `https://mail.zoho.in/api/organization/${zoid}/accounts`;

  console.log("Calling Zoho DELETE accounts API:", url);

  const payload = {
    // Let's test with a non-existent email to see if it responds with "invalid email" or a permission error.
    emailList: ["nonexistent.test.user@mail.namaah.io"]
  };

  console.log("Payload:", payload);

  const res = await fetch(url, {
    method: "DELETE",
    headers: { 
      "Authorization": `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  console.log("Status code:", res.status);
  const data = await res.json();
  console.log("Response body:", JSON.stringify(data, null, 2));
}
run();
