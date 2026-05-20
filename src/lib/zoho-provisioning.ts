import { getSupabaseAdmin } from "@/lib/supabase";
import { getActiveToken } from "@/lib/zoho-mail";

const ZOHO_MAIL_API = process.env.ZOHO_MAIL_API_URL || "https://mail.zoho.in/api";

// ── Load org config from DB ───────────────────────────────────────────────────
async function getOrgConfig() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("zoho_config")
    .select("org_id, zoid, org_domain, client_id, client_secret")
    .maybeSingle();
  return data;
}

// ── Fetch verified primary domain from Zoho Mail API and persist it ───────────
export async function syncDomainFromZoho(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const token = await getActiveToken();
  const org   = await getOrgConfig();
  const orgId = org?.org_id || org?.zoid;

  if (!token || !orgId) return org?.org_domain || null;

  try {
    const res  = await fetch(`${ZOHO_MAIL_API}/organization/${orgId}/domains`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const json = await res.json();

    // Zoho returns array of domains; pick the primary/verified one
    const domains: any[] = json?.data || [];
    const primary = domains.find(
      (d: any) => d.isPrimary === true || d.isVerified === true || d.status === "verified",
    ) || domains[0];

    if (primary?.domainName) {
      const domain = primary.domainName.toLowerCase();
      await supabase
        .from("zoho_config")
        .update({ org_domain: domain, domain_synced_at: new Date().toISOString() })
        .eq("org_id", orgId)
        .or(`zoid.eq.${orgId}`);
      return domain;
    }
  } catch (e: any) {
    console.error("[Zoho domain sync]", e.message);
  }
  return org?.org_domain || null;
}

// ── Build email address from full name + domain ───────────────────────────────
function buildEmail(name: string, domain: string): string {
  const parts = name.trim().toLowerCase().split(/\s+/);
  const local =
    parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  // Sanitize: remove non alphanumeric except . and -
  const clean = local.replace(/[^a-z0-9.\-]/g, "");
  return `${clean}@${domain}`;
}

// ── Create a Zoho account via Admin API ──────────────────────────────────────
async function createZohoAccount(
  token: string,
  orgId: string,
  primaryEmailAddress: string,
  displayName: string,
  password: string,
): Promise<{ zohoUserId: string | null; zohoAccountId: string | null; finalEmail: string }> {
  const payload = {
    primaryEmailAddress,
    displayName,
    password,
    role: "member",
  };

  const res  = await fetch(`${ZOHO_MAIL_API}/organization/${orgId}/accounts`, {
    method:  "POST",
    headers: {
      Authorization:  `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();

  // Handle mailbox collision — append 3-digit suffix and retry
  if (
    json?.data?.errorCode === "MAILBOX_ALREADY_EXISTS" ||
    json?.status?.code === 409 ||
    res.status === 409
  ) {
    const suffix   = Math.floor(Math.random() * 900) + 100;
    const [loc, dm] = primaryEmailAddress.split("@");
    const newEmail  = `${loc}${suffix}@${dm}`;

    const retry = await fetch(`${ZOHO_MAIL_API}/organization/${orgId}/accounts`, {
      method:  "POST",
      headers: {
        Authorization:  `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, primaryEmailAddress: newEmail }),
    });
    const retryJson = await retry.json();
    return {
      zohoUserId:    retryJson?.data?.mailboxId   || retryJson?.data?.accountId || null,
      zohoAccountId: retryJson?.data?.accountId   || null,
      finalEmail:    newEmail,
    };
  }

  return {
    zohoUserId:    json?.data?.mailboxId   || json?.data?.accountId || null,
    zohoAccountId: json?.data?.accountId   || null,
    finalEmail:    primaryEmailAddress,
  };
}

// ── Apply default signature ───────────────────────────────────────────────────
export async function applyDefaultSignature(
  token: string,
  accountId: string,
  info: { name: string; designation: string; department: string },
) {
  const html = `<div style="font-family:sans-serif;font-size:13px;color:#374151">
<strong>${info.name}</strong><br/>
${info.designation}${info.department ? ` | ${info.department}` : ""}<br/>
Namaah | namaah.io
</div>`;

  await fetch(`${ZOHO_MAIL_API}/accounts/${accountId}/signatures`, {
    method:  "POST",
    headers: {
      Authorization:  `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ signatureName: "Default", signature: html, isDefault: true }),
  }).catch(() => {});
}

// ── Main: provision a Zoho mailbox for a new employee ────────────────────────
export async function provisionZohoMailbox(params: {
  employeeId:  string;
  name:        string;
  designation?: string;
  department?:  string;
  tempPassword: string;
}): Promise<{
  zoho_email:      string;
  zoho_user_id:    string | null;
  zoho_account_id: string | null;
  error?:          string;
}> {
  const supabase = getSupabaseAdmin();
  const org      = await getOrgConfig();
  const token    = await getActiveToken();
  const orgId    = org?.org_id || org?.zoid;

  // ── Always use domain from DB (set via Zoho Admin Console sync) ─────────────
  // If org_domain not set yet, try to sync from Zoho, else fail clearly
  let domain = org?.org_domain;
  if (!domain && token && orgId) {
    domain = await syncDomainFromZoho() ?? undefined;
  }
  if (!domain) {
    console.warn("[Zoho provision] org_domain not configured. Go to /admin/mail/config and set your domain.");
    domain = "mail.namaah.io"; // safe fallback — admin should fix via config page
  }

  let zohoEmail      = buildEmail(params.name, domain);
  let zohoUserId:    string | null = null;
  let zohoAccountId: string | null = null;

  // ── Call Zoho Admin API to create the account ────────────────────────────────
  if (token && orgId) {
    try {
      const result = await createZohoAccount(
        token, orgId, zohoEmail, params.name, params.tempPassword,
      );
      zohoUserId    = result.zohoUserId;
      zohoAccountId = result.zohoAccountId;
      zohoEmail     = result.finalEmail; // may have suffix if collision

      if (zohoAccountId) {
        await applyDefaultSignature(token, zohoAccountId, {
          name:        params.name,
          designation: params.designation || "",
          department:  params.department  || "",
        });
      }
    } catch (e: any) {
      console.error("[Zoho provision] API error:", e.message);
    }
  } else {
    console.warn("[Zoho provision] No token or orgId — skipping Zoho API call. Email stored locally only.");
  }

  // ── Persist on employee record ───────────────────────────────────────────────
  await supabase
    .from("employees")
    .update({
      zoho_email:      zohoEmail,
      zoho_user_id:    zohoUserId,
      zoho_account_id: zohoAccountId,
    })
    .eq("id", params.employeeId);

  // ── Track in account_access ──────────────────────────────────────────────────
  if (zohoAccountId) {
    await supabase.from("account_access").upsert(
      {
        user_id:         params.employeeId,
        zoho_account_id: zohoAccountId,
        email_address:   zohoEmail,
        display_name:    params.name,
        access_type:     "owner",
      },
      { onConflict: "user_id,zoho_account_id" },
    );
  }

  // ── Audit log ────────────────────────────────────────────────────────────────
  await supabase.from("audit_logs").insert({
    user_id:     params.employeeId,
    action:      "mailbox_provisioned",
    target_type: "mailbox",
    target_id:   zohoEmail,
    metadata:    { zoho_user_id: zohoUserId, zoho_account_id: zohoAccountId, domain },
  }).catch(() => {});

  return { zoho_email: zohoEmail, zoho_user_id: zohoUserId, zoho_account_id: zohoAccountId };
}

// ── Disable a Zoho mailbox (offboarding) ─────────────────────────────────────
export async function disableZohoMailbox(zohoUserId: string): Promise<void> {
  const org   = await getOrgConfig();
  const token = await getActiveToken();
  const orgId = org?.org_id || org?.zoid;

  if (!token || !orgId || !zohoUserId) return;

  await fetch(`${ZOHO_MAIL_API}/organization/${orgId}/accounts/${zohoUserId}`, {
    method:  "PATCH",
    headers: {
      Authorization:  `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accountEnabled: false }),
  }).catch(() => {});
}

// ── Grant a user access to a shared mailbox ───────────────────────────────────
export async function grantSharedMailboxAccess(params: {
  userId:        string;
  zohoAccountId: string;
  emailAddress:  string;
  displayName:   string;
  accessType:    "shared_read" | "shared_send";
}) {
  const supabase = getSupabaseAdmin();
  await supabase.from("account_access").upsert(
    {
      user_id:         params.userId,
      zoho_account_id: params.zohoAccountId,
      email_address:   params.emailAddress,
      display_name:    params.displayName,
      access_type:     params.accessType,
    },
    { onConflict: "user_id,zoho_account_id" },
  );
}

// ── Generate a random temporary password ─────────────────────────────────────
export function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}
