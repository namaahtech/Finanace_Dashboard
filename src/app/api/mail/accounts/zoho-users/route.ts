import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActiveToken } from "@/lib/zoho-mail";

const ZOHO_MAIL_API = process.env.ZOHO_MAIL_API_URL || "https://mail.zoho.in/api";

// Fetch all users from Zoho Admin Console (live)
export async function GET() {
  const supabase = getSupabaseAdmin();
  const token    = await getActiveToken();

  const { data: config } = await supabase
    .from("zoho_config")
    .select("org_id, zoid, org_domain")
    .maybeSingle();

  const orgId = config?.org_id || config?.zoid;

  if (!token || !orgId) {
    return NextResponse.json({ users: [], domain: config?.org_domain || null, is_connected: false });
  }

  try {
    const res  = await fetch(`${ZOHO_MAIL_API}/organization/${orgId}/accounts`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const json = await res.json();

    const users = (json?.data || []).map((u: any) => ({
      accountId:  u.accountId   || u.mailboxId || null,
      name:       u.displayName || u.name      || "—",
      email:      u.primaryEmailAddress || u.emailAddress || "—",
      role:       u.role        || "member",
      isActive:   u.accountEnabled !== false,
      domain:     (u.primaryEmailAddress || u.emailAddress || "").split("@")[1] || "",
    }));

    return NextResponse.json({
      users,
      domain:       config?.org_domain || null,
      is_connected: true,
    });
  } catch (e: any) {
    console.error("[Zoho users]", e.message);
    return NextResponse.json({ users: [], domain: config?.org_domain || null, is_connected: true, error: e.message });
  }
}
