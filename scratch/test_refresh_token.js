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

async function refreshAccessToken(clientId, clientSecret, refreshToken, accountsUrl) {
  const res = await fetch(`${accountsUrl}/oauth/v2/token`, {
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
  const { data: config } = await supabase.from("zoho_config").select("*").single();
  console.log("Refreshing token using URL:", config.zoho_accounts_url);
  try {
    const refreshed = await refreshAccessToken(config.client_id, config.client_secret, config.refresh_token, config.zoho_accounts_url);
    console.log("Response:", refreshed);
    if (refreshed.access_token) {
      const { data, error } = await supabase.from("zoho_config").update({
        access_token: refreshed.access_token,
        token_expiry: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", config.id).select();
      console.log("Database updated successfully:", data);
    }
  } catch (e) {
    console.error("Refresh error:", e);
  }
}
run();
