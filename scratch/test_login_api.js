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
  const email = 'jagadisha@mail.namaah.io';
  const password = 'NewPassword123!';

  console.log("Calling login API endpoint as Jagadisha...");
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  console.log("Response Status:", res.status);
  const json = await res.json();
  console.log("Response JSON:", json);

  if (res.status === 200) {
    console.log("Login successful! Checking audit logs in database...");
    const { data: logs, error: logsErr } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", json.user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (logsErr) {
      console.error("Failed to fetch audit logs:", logsErr);
    } else {
      console.log("Recent audit logs for this user:");
      logs.forEach(log => {
        console.log(`- Action: ${log.action}, Target: ${log.target_type}, Metadata:`, log.metadata || log.new_values);
      });
    }
  } else {
    console.error("Login API request failed.");
  }
}

run();
