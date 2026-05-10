import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { exchangeCodeForTokens, zohoGet } from "@/lib/zoho-mail";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/admin/mail/config?error=${error || "no_code"}`);
  }

  const { data: config } = await supabase
    .from("zoho_config")
    .select("id, client_id, client_secret, redirect_uri")
    .maybeSingle();

  if (!config) {
    return NextResponse.redirect(`${appUrl}/admin/mail/config?error=no_config`);
  }

  const tokens = await exchangeCodeForTokens(
    config.client_id,
    config.client_secret,
    code,
    config.redirect_uri
  );

  if (!tokens?.access_token) {
    return NextResponse.redirect(`${appUrl}/admin/mail/config?error=token_failed`);
  }

  // Fetch admin account ID from Zoho
  let adminAccountId: string | null = null;
  try {
    const accounts = await zohoGet(tokens.access_token, "/accounts");
    adminAccountId = accounts?.data?.[0]?.accountId ?? null;
  } catch {}

  await supabase.from("zoho_config").update({
    access_token:     tokens.access_token,
    refresh_token:    tokens.refresh_token,
    token_expiry:     new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    admin_account_id: adminAccountId,
    is_connected:     true,
    connected_at:     new Date().toISOString(),
    updated_at:       new Date().toISOString(),
  }).eq("id", config.id);

  return NextResponse.redirect(`${appUrl}/admin/mail/config?success=connected`);
}
