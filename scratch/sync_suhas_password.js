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
  // 1. Get Zoho config
  const { data: config } = await supabase
    .from("zoho_config")
    .select("*")
    .eq("is_connected", true)
    .maybeSingle();

  if (!config) {
    console.error("Zoho config not connected.");
    return;
  }

  // 2. Refresh token
  console.log("Refreshing Zoho access token...");
  const refreshed = await refreshAccessToken(config.client_id, config.client_secret, config.refresh_token);
  const token = refreshed.access_token;
  if (!token) {
    console.error("Failed to refresh token:", refreshed);
    return;
  }

  // 3. Update Zoho Password for suhas
  const zohoAccountId = "5347853000000002002"; // suhas's zoho_account_id
  const correctZuid = "60073717312"; // suhas's actual zuid from Zoho API
  const targetPassword = "Dmk11#11"; // The password suhas tried
  const orgId = config.org_id || config.zoid || "60071733785";
  
  const url = `https://mail.zoho.in/api/organization/${orgId}/accounts/${zohoAccountId}`;
  console.log(`Sending PUT to update password at URL: ${url}`);

  // Construct JSON body manually to avoid precision loss on 64-bit ZUID
  const rawBody = `{"zuid": ${correctZuid}, "password": "${targetPassword}", "mode": "resetPassword"}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: rawBody,
  });

  const status = res.status;
  const json = await res.json();
  console.log(`Response status: ${status}`);
  console.log("Response JSON:", JSON.stringify(json, null, 2));
}

run();
