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
  const selfsigned = require('selfsigned');
  console.log("Generating selfsigned cert...");
  const attrs = [{ name: "commonName", value: "Namaah Nexus SAML IdP" }];
  const pems = selfsigned.generate(attrs, { days: 3650, keySize: 2048 });
  console.log("pems keys:", Object.keys(pems));
  console.log("private starts with:", pems.private ? pems.private.slice(0, 30) : null);
  console.log("cert starts with:", pems.cert ? pems.cert.slice(0, 30) : null);
}
run();
