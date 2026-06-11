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

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const targetEmail = "kumar.ban@mail.namaah.io";
  console.log(`Resetting password for ${targetEmail} using Admin Client...`);
  
  // Get user from auth.users
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error("List users error:", listError);
    return;
  }
  
  const targetUser = users.find(u => u.email === targetEmail);
  if (!targetUser) {
    console.error(`User ${targetEmail} not found in Auth!`);
    return;
  }
  
  // Update password to 'Password123!'
  const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
    targetUser.id,
    { password: "Password123!" }
  );
  
  if (updateError) {
    console.error("Update password error:", updateError);
    return;
  }
  console.log("Password updated successfully!");

  console.log(`Signing in as ${targetEmail}...`);
  const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
    email: targetEmail,
    password: "Password123!"
  });

  if (authError) {
    console.error("Authentication error:", authError);
    return;
  }
  console.log("Logged in successfully! Token UID:", authData.user.id);

  console.log("Deleting existing user_onboarding row using admin client...");
  await adminClient.from("user_onboarding").delete().eq("user_id", authData.user.id);

  console.log("Attempting to insert user_onboarding with User Client...");
  const { data: insertData, error: insertError } = await userClient
    .from("user_onboarding")
    .insert({
      user_id: authData.user.id,
      checklist_id: "d0f0d0f0-d0f0-d0f0-d0f0-d0f0d0f0d0f0",
      status: "not_started"
    })
    .select()
    .maybeSingle();

  if (insertError) {
    console.error("INSERT error details:", insertError);
  } else {
    console.log("INSERT success! Data:", insertData);
  }
}
run();
