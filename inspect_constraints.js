const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
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

async function zohoGet(token, path) {
  for (const domain of ["zoho.in", "zoho.com"]) {
    try {
      const url = `https://mail.${domain}/api/v1${path}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error(`Fetch error for ${domain}:`, e);
    }
  }
  return null;
}

async function run() {
  const { data, error } = await supabase
    .from("zoho_config")
    .select("*");
  
  if (error) {
    console.error("Supabase Error:", error);
    return;
  }

  console.log("Zoho Config Rows:", data);

  if (!data || data.length === 0) {
    console.error("No Zoho config rows found in database.");
    return;
  }

  const config = data[0];
  const accounts = await zohoGet(config.access_token, "/accounts");
  console.log("Zoho Accounts response:", JSON.stringify(accounts, null, 2));
}
run();
