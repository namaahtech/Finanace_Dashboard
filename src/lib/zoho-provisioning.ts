import { getSupabaseAdmin } from "@/lib/supabase";
import { getActiveToken, zohoPost, zohoPatch } from "@/lib/zoho-mail";

const ZOHO_MAIL_API_URL = process.env.ZOHO_MAIL_API_URL || "https://mail.zoho.in/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrgConfig() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("zoho_config")
    .select("org_id, zoid, org_domain, client_id, client_secret")
    .maybeSingle();
  return data;
}

function buildZohoEmail(name: string, domain: string): string {
  const parts = name.trim().toLowerCase().split(/\s+/);
  const local =
    parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  return `${local}@${domain}`;
}

// ── Provision a new Zoho mailbox for an employee ──────────────────────────────

export async function provisionZohoMailbox(params: {
  employeeId: string;  // employees.id (UUID)
  name: string;
  designation?: string;
  department?: string;
  tempPassword: string;
}): Promise<{ zoho_email: string; zoho_user_id: string | null; zoho_account_id: string | null; error?: string }> {
  const supabase = getSupabaseAdmin();
  const org = await getOrgConfig();
  const domain = org?.org_domain || process.env.ZOHO_MAIL_DOMAIN || "namaah.in";

  let zohoEmail = buildZohoEmail(params.name, domain);
  let zohoUserId: string | null = null;
  let zohoAccountId: string | null = null;

  const token = await getActiveToken();
  const orgId  = org?.org_id || org?.zoid;

  if (token && orgId) {
    try {
      const res = await fetch(`${ZOHO_MAIL_API_URL}/organization/${orgId}/accounts`, {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primaryEmailAddress: zohoEmail,
          displayName: params.name,
          password: params.tempPassword,
          role: "member",
        }),
      });

      const json = await res.json();

      // Handle email collision — append a number suffix
      if (json?.data?.errorCode === "MAILBOX_ALREADY_EXISTS" || res.status === 409) {
        const suffix = Math.floor(Math.random() * 900) + 100;
        const parts  = zohoEmail.split("@");
        zohoEmail    = `${parts[0]}${suffix}@${parts[1]}`;

        const retry = await fetch(`${ZOHO_MAIL_API_URL}/organization/${orgId}/accounts`, {
          method: "POST",
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            primaryEmailAddress: zohoEmail,
            displayName: params.name,
            password: params.tempPassword,
            role: "member",
          }),
        });
        const retryJson = await retry.json();
        zohoUserId    = retryJson?.data?.mailboxId || retryJson?.data?.accountId || null;
        zohoAccountId = retryJson?.data?.accountId || null;
      } else {
        zohoUserId    = json?.data?.mailboxId || json?.data?.accountId || null;
        zohoAccountId = json?.data?.accountId || null;
      }

      // Apply default signature
      if (zohoAccountId) {
        await applyDefaultSignature(token, zohoAccountId, {
          name:        params.name,
          designation: params.designation || "",
          department:  params.department  || "",
        }).catch(() => {});
      }
    } catch (e: any) {
      console.error("[Zoho provision] API error:", e.message);
    }
  }

  // Persist zoho fields on the employee row
  await supabase
    .from("employees")
    .update({
      zoho_email:      zohoEmail,
      zoho_user_id:    zohoUserId,
      zoho_account_id: zohoAccountId,
    })
    .eq("id", params.employeeId);

  // Insert into account_access
  if (zohoAccountId) {
    await supabase.from("account_access").upsert({
      user_id:         params.employeeId,
      zoho_account_id: zohoAccountId,
      email_address:   zohoEmail,
      display_name:    params.name,
      access_type:     "owner",
    }, { onConflict: "user_id,zoho_account_id" });
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id:     params.employeeId,
    action:      "mailbox_provisioned",
    target_type: "mailbox",
    target_id:   zohoEmail,
    metadata:    { zoho_user_id: zohoUserId, zoho_account_id: zohoAccountId },
  });

  return { zoho_email: zohoEmail, zoho_user_id: zohoUserId, zoho_account_id: zohoAccountId };
}

// ── Apply a Zoho email signature to an account ────────────────────────────────

export async function applyDefaultSignature(
  token: string,
  accountId: string,
  info: { name: string; designation: string; department: string }
) {
  const html = `<div style="font-family:sans-serif;font-size:13px;color:#374151">
<strong>${info.name}</strong><br/>
${info.designation}${info.department ? ` | ${info.department}` : ""}<br/>
Namaah | namaah.in
</div>`;

  await fetch(`${ZOHO_MAIL_API_URL}/accounts/${accountId}/signatures`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      signatureName: "Default",
      signature:     html,
      isDefault:     true,
    }),
  });
}

// ── Disable a Zoho mailbox (offboarding) ──────────────────────────────────────

export async function disableZohoMailbox(zohoUserId: string): Promise<void> {
  const org   = await getOrgConfig();
  const token = await getActiveToken();
  const orgId = org?.org_id || org?.zoid;

  if (!token || !orgId || !zohoUserId) return;

  await fetch(`${ZOHO_MAIL_API_URL}/organization/${orgId}/accounts/${zohoUserId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accountEnabled: false }),
  });
}

// ── Grant a user access to a shared mailbox ───────────────────────────────────

export async function grantSharedMailboxAccess(params: {
  userId: string;
  zohoAccountId: string;
  emailAddress: string;
  displayName: string;
  accessType: "shared_read" | "shared_send";
}) {
  const supabase = getSupabaseAdmin();
  await supabase.from("account_access").upsert({
    user_id:         params.userId,
    zoho_account_id: params.zohoAccountId,
    email_address:   params.emailAddress,
    display_name:    params.displayName,
    access_type:     params.accessType,
  }, { onConflict: "user_id,zoho_account_id" });
}

// ── Generate a random temp password ──────────────────────────────────────────

export function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}
