import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActiveToken, zohoPost } from "@/lib/zoho-mail";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { employee_id, name, domain } = await req.json();

  if (!employee_id || !name) {
    return NextResponse.json({ error: "employee_id and name are required." }, { status: 400 });
  }

  // Build email address: firstname.lastname@domain
  const parts      = name.trim().toLowerCase().split(/\s+/);
  const localPart  = parts.length >= 2
    ? `${parts[0]}.${parts[parts.length - 1]}`
    : parts[0];
  const mailDomain = domain || process.env.ZOHO_MAIL_DOMAIN || "namaah.in";
  const emailAddress = `${localPart}@${mailDomain}`;

  // Check if already provisioned
  const { data: existing } = await supabase
    .from("zoho_mail_accounts")
    .select("email_address")
    .eq("employee_id", employee_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ email_address: existing.email_address, already_exists: true });
  }

  // Try to create via Zoho API
  const token = await getActiveToken();
  let zohoAccountId: string | null = null;

  if (token) {
    const { data: config } = await supabase
      .from("zoho_config")
      .select("org_id")
      .maybeSingle();

    if (config?.org_id) {
      try {
        const zohoRes = await zohoPost(token, `/organization/${config.org_id}/accounts`, {
          emailAddress,
          displayName: name,
          password:    `Namaah@${Math.random().toString(36).slice(-8)}`,
        });
        zohoAccountId = zohoRes?.data?.mailboxId || zohoRes?.data?.accountId || null;
      } catch (e: any) {
        console.error("Zoho account create error:", e.message);
        // Continue — store mapping even if Zoho API fails, can be retried
      }
    }
  }

  // Store mapping in DB
  const { data, error } = await supabase
    .from("zoho_mail_accounts")
    .insert({
      employee_id,
      zoho_account_id: zohoAccountId,
      email_address:   emailAddress,
      display_name:    name,
      is_active:       true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ email_address: emailAddress, zoho_account_id: zohoAccountId, data });
}

export async function GET(req: NextRequest) {
  const supabase   = getSupabaseAdmin();
  const employeeId = req.nextUrl.searchParams.get("employee_id");

  let query = supabase
    .from("zoho_mail_accounts")
    .select("*, employee:employees(id,name,email,designation)");

  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
