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

async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  const res = await fetch("https://accounts.zoho.in/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

async function run() {
  const { data: config } = await supabase
    .from("zoho_config")
    .select("*")
    .eq("is_connected", true)
    .maybeSingle();

  if (!config) {
    console.error("Zoho config not connected.");
    return;
  }

  console.log("Refreshing token...");
  const refreshed = await refreshAccessToken(config.client_id, config.client_secret, config.refresh_token);
  const token = refreshed.access_token;
  if (!token) {
    console.error("Token refresh failed:", refreshed);
    return;
  }

  const orgId = config.org_id || config.zoid || "60071733785";
  const url = `https://mail.zoho.in/api/organization/${orgId}/accounts`;
  console.log(`Fetching Zoho accounts from: ${url}`);

  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });

  const json = await res.json();
  console.log("Status:", res.status);
  const suhas = json?.data?.find(a => a.primaryEmailAddress === "suhas@mail.namaah.io");
  console.log("Suhas Account details:", JSON.stringify(suhas, null, 2));
}

run();
