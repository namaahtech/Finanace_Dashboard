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

  if (!config) {
    console.error("No active Zoho config found.");
    return;
  }

  let token = config.access_token;
  console.log("Initial Token:", token?.slice(0, 10) + "...");

  const zohoAccountsUrl = env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in';
  
  console.log("Refreshing token...");
  const refreshRes = await fetch(`${zohoAccountsUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: config.refresh_token,
      client_id: config.client_id,
      client_secret: config.client_secret,
      grant_type: "refresh_token",
    }),
  });
  const refreshed = await refreshRes.json();
  if (refreshed.access_token) {
    token = refreshed.access_token;
    console.log("Token refreshed successfully:", token.slice(0, 10) + "...");
    await supabase.from("zoho_config").update({
      access_token: token,
      token_expiry: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", config.id);
  } else {
    console.error("Refresh failed:", refreshed);
    return;
  }

  const res = await fetch(`${env.ZOHO_MAIL_API_URL || 'https://mail.zoho.in/api'}/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  if (!res.ok) {
    console.error("Zoho Accounts Fetch Failed:", res.status, await res.text());
    return;
  }
  const accounts = await res.json();
  console.log("Authorized Accounts:", JSON.stringify(accounts, null, 2));
}
run();
