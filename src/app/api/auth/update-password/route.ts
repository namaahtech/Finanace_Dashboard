import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { updateZohoPassword } from "@/lib/zoho-provisioning";

// Zoho password requirements: At least 8 characters, uppercase, lowercase, number, and symbol.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json({ error: "Missing required parameters (userId, newPassword)" }, { status: 400 });
    }

    // 1. Validate password policy
    if (!PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json({ 
        error: "Password does not meet Zoho security requirements: Must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character/symbol." 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 2. Fetch employee details (to check for zoho_account_id)
    const { data: emp, error: empErr } = await supabase
      .from("employees")
      .select("id, name, zoho_account_id, email, zoho_email, personal_email")
      .eq("id", userId)
      .maybeSingle();

    if (empErr || !emp) {
      return NextResponse.json({ error: "Employee profile not found." }, { status: 404 });
    }

    // 3. Update Supabase Auth password to match newPassword for primary user
    console.log(`[Update Password] Updating Supabase Auth password for user ID: ${userId}`);
    const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (authUpdateErr) {
      console.error("[Update Password] Supabase Auth password update failed for primary user:", authUpdateErr.message);
      return NextResponse.json({ error: "Failed to update login password: " + authUpdateErr.message }, { status: 500 });
    }

    // 3b. Sync other matching auth accounts (like personal email if it exists as a separate auth user)
    const emailsToSync = new Set([
      emp.email?.toLowerCase(),
      emp.zoho_email?.toLowerCase(),
      emp.personal_email?.toLowerCase()
    ].filter(Boolean));

    try {
      const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const authUsers = authUsersData?.users || [];
      for (const authUser of authUsers) {
        if (authUser.id !== userId && authUser.email && emailsToSync.has(authUser.email.toLowerCase())) {
          console.log(`[Update Password] Syncing password to secondary auth user: ${authUser.email} (ID: ${authUser.id})`);
          await supabase.auth.admin.updateUserById(authUser.id, {
            password: newPassword,
          });
        }
      }
    } catch (listErr: any) {
      console.warn("[Update Password] Failed to sync secondary auth accounts:", listErr.message || listErr);
    }

    // 4. Sync password change with Zoho Mail if account is provisioned
    const zohoAccountId = emp.zoho_account_id;
    if (zohoAccountId) {
      console.log(`[Update Password] Syncing new password to Zoho for account ID: ${zohoAccountId}`);
      const zohoSuccess = await updateZohoPassword(zohoAccountId, newPassword);
      if (!zohoSuccess) {
        console.warn(`[Update Password] Zoho password sync failed for employee: ${emp.name}`);
        // We log a warning, but do not block onboarding if Zoho sync fails temporarily
      }
    }

    // 5. Update onboarding database status to in_progress if it is currently not_started
    const { data: onboarding, error: fetchErr } = await supabase
      .from("user_onboarding")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (!fetchErr && (!onboarding || onboarding.status === "not_started")) {
      await supabase
        .from("user_onboarding")
        .update({ status: "in_progress" })
        .eq("user_id", userId);
    }

    // 6. Audit Log entry
    await supabase.from("audit_logs").insert({
      actor_id: userId,
      action: "PASSWORD_CHANGED",
      table_name: "employees",
      record_id: userId,
      new_values: { message: "First-time password updated successfully and synced with Zoho" }
    });

    return NextResponse.json({ success: true, message: "Password updated and synchronized successfully." });
  } catch (err: any) {
    console.error("[UPDATE-PASSWORD] Error:", err);
    return NextResponse.json({ error: "Internal server error: " + err.message }, { status: 500 });
  }
}
