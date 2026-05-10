import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { buildOAuthUrl } from "@/lib/zoho-mail";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { clientId, clientSecret, mailDomain, redirectUri } = await req.json();

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Client ID and Secret are required." }, { status: 400 });
  }

  const redirect = redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/mail/auth/callback`;

  const { error } = await supabase.from("zoho_config").upsert(
    {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      mail_domain: mailDomain || process.env.ZOHO_MAIL_DOMAIN || "namaah.in",
      is_connected: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authUrl = buildOAuthUrl(clientId, redirect);
  return NextResponse.json({ authUrl });
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("zoho_config")
    .select("is_connected, mail_domain, admin_account_id, connected_at, token_expiry")
    .maybeSingle();

  return NextResponse.json({ config: data });
}
