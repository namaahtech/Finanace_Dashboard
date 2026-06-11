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
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const testUserId = '7634d47c-d03e-4b2e-b6d0-7913d6bc9ed1'; // Sachin
  const testPassword = 'NewPassword123!';

  console.log("Fetching employee details for verification...");
  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("id, name, email, zoho_email, personal_email")
    .eq("id", testUserId)
    .maybeSingle();

  if (empErr || !emp) {
    console.error("Employee not found:", empErr);
    process.exit(1);
  }

  console.log(`Employee: ${emp.name}, Personal: ${emp.personal_email}, Zoho: ${emp.zoho_email}`);

  // Now, simulate the update-password logic:
  console.log(`Updating password in Supabase Auth to "${testPassword}" for user ID: ${testUserId}`);
  const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(testUserId, {
    password: testPassword,
  });
  if (authUpdateErr) {
    console.error("Auth update failed:", authUpdateErr);
    process.exit(1);
  }

  const emailsToSync = new Set([
    emp.email?.toLowerCase(),
    emp.zoho_email?.toLowerCase(),
    emp.personal_email?.toLowerCase()
  ].filter(Boolean));

  console.log("Searching for secondary auth records to sync...");
  const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = authUsersData?.users || [];
  for (const authUser of authUsers) {
    if (authUser.id !== testUserId && authUser.email && emailsToSync.has(authUser.email.toLowerCase())) {
      console.log(`Syncing password to secondary auth user: ${authUser.email} (ID: ${authUser.id})`);
      const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: testPassword,
      });
      if (error) {
        console.error(`Failed to sync password for ${authUser.email}:`, error);
      } else {
        console.log(`Synced password successfully for ${authUser.email}`);
      }
    }
  }

  console.log("Verifying logins...");
  // Test signing in using the Zoho email with the new password
  const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: emp.zoho_email,
    password: testPassword
  });

  if (loginErr) {
    console.error(`Login failed with Zoho email: ${loginErr.message}`);
  } else {
    console.log(`Login succeeded with Zoho email: ${loginData.user.email}`);
  }

  // Restore the password back if needed, or leave it as is for testing.
  console.log("Password sync test complete.");
}

run();
