const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const selfsigned = require('selfsigned');

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
  console.log("Fetching zoho_config row...");
  const { data: config, error: fetchErr } = await supabase
    .from("zoho_config")
    .select("id, zoid")
    .maybeSingle();

  if (fetchErr || !config) {
    console.error("Error fetching zoho_config:", fetchErr);
    process.exit(1);
  }

  console.log("Generating SAML SSO keypair and self-signed certificate...");
  const attrs = [{ name: "commonName", value: "Namaah Nexus SAML IdP" }];
  const pems = await selfsigned.generate(attrs, { days: 3650, keySize: 2048 });

  const acsUrl = `https://accounts.zoho.in/samlresponse/${config.zoid || ''}`;
  console.log(`Setting ACS URL to: ${acsUrl}`);

  console.log("Updating zoho_config with SAML settings...");
  const { error: updateErr } = await supabase
    .from("zoho_config")
    .update({
      saml_enabled: true,
      saml_issuer: "namaah-nexus",
      saml_acs_url: acsUrl,
      saml_private_key: pems.private,
      saml_certificate: pems.cert,
      updated_at: new Date().toISOString()
    })
    .eq("id", config.id);

  if (updateErr) {
    console.error("Failed to update zoho_config:", updateErr);
    process.exit(1);
  }

  console.log("Successfully generated SAML keys and enabled SAML SSO in database!");
}

run();
