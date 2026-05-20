import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActiveToken, zohoPost } from "@/lib/zoho-mail";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { employee_id, name, domain } = await req.json();

  if (!employee_id || !name) {
    return NextResponse.json({ error: "employee_id and name are required." }, { status: 400 });
  }

  // Build professional email address: firstname.lastname@domain
  const parts        = name.trim().toLowerCase().split(/\s+/);
  const localPart    = parts.length >= 2
    ? `${parts[0]}.${parts[parts.length - 1]}`
    : parts[0];
  // Prefer client-passed domain, then DB org_domain, then env var
  let mailDomain = domain || process.env.ZOHO_MAIL_DOMAIN || "mail.namaah.io";
  if (!domain) {
    const { data: orgCfg } = await supabase.from("zoho_config").select("org_domain").maybeSingle();
    if (orgCfg?.org_domain) mailDomain = orgCfg.org_domain;
  }
  const emailAddress = `${localPart}@${mailDomain}`;

  // Check if already provisioned
  const { data: emp } = await supabase
    .from("employees")
    .select("zoho_email, email, name")
    .eq("id", employee_id)
    .maybeSingle();

  if (emp?.zoho_email) {
    return NextResponse.json({ email_address: emp.zoho_email, already_exists: true });
  }

  // Try to create via Zoho Mail Admin API
  const token = await getActiveToken();
  let zohoAccountId: string | null = null;
  let zohoApiSuccess = false;
  const tempPassword = `Namaah@1234`;

  if (token) {
    const { data: config } = await supabase
      .from("zoho_config")
      .select("zoid")
      .limit(1)
      .maybeSingle();

    if (config?.zoid) {
      try {
        const zohoRes = await zohoPost(token, `/organization/${config.zoid}/accounts`, {
          primaryEmailAddress: emailAddress,
          displayName:         name,
          password:            tempPassword,
          role:                "member",
        });
        zohoAccountId  = zohoRes?.data?.mailboxId || zohoRes?.data?.accountId || null;
        zohoApiSuccess = true;
      } catch (e: any) {
        console.error("[Zoho] account create error:", e.message);
      }
    } else {
      console.warn("[Zoho] org ID (zoid) not set in zoho_config — skipping API call.");
    }
  }

  // Save zoho_email on employee record regardless of API result
  await supabase
    .from("employees")
    .update({
      zoho_email:      emailAddress,
      zoho_account_id: zohoAccountId ?? undefined,
    })
    .eq("id", employee_id);

  // Track in account_access if Zoho API succeeded
  if (zohoApiSuccess && zohoAccountId) {
    await supabase.from("account_access").insert({
      user_id:         employee_id,
      zoho_account_id: zohoAccountId,
      email_address:   emailAddress,
      display_name:    name,
      access_type:     "owner",
    });
  }

  // Send professional email notification to employee's personal Gmail
  const personalEmail = emp?.email;
  if (personalEmail) {
    try {
      const { data: smtpConfig } = await supabase
        .from("system_config")
        .select("smtp_host, smtp_port, smtp_user, smtp_pass, company_name")
        .single();

      if (smtpConfig?.smtp_host && smtpConfig?.smtp_user && smtpConfig?.smtp_pass) {
        const transporter = nodemailer.createTransport({
          host:   smtpConfig.smtp_host,
          port:   smtpConfig.smtp_port || 587,
          secure: smtpConfig.smtp_port === 465,
          auth: { user: smtpConfig.smtp_user, pass: smtpConfig.smtp_pass },
        });

        const company = smtpConfig.company_name || "Namaah";

        await transporter.sendMail({
          from:    `"${company}" <${smtpConfig.smtp_user}>`,
          to:      personalEmail,
          subject: `Your Professional Email is Ready — ${emailAddress}`,
          html: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;">
  <div style="background:#0f172a;color:#ffffff;padding:32px 20px;text-align:center;">
    <h1 style="margin:0;letter-spacing:4px;font-size:24px;font-weight:800;text-transform:uppercase;">${company}</h1>
    <p style="margin-top:8px;opacity:0.8;font-size:14px;">Professional Identity Management</p>
  </div>
  <div style="padding:40px;color:#1e293b;line-height:1.6;">
    <h2 style="margin-top:0;font-size:20px;font-weight:700;">Your Professional Email is Ready, ${emp?.name || name}!</h2>
    <p>Your official <b>${company}</b> email account has been created. Use this email for all professional communications, client interactions, and internal collaboration.</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:24px;border-radius:8px;margin:24px 0;">
      <div style="margin-bottom:16px;">
        <p style="margin:0;font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:1px;">Professional Email</p>
        <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#6366f1;">${emailAddress}</p>
      </div>
      <div style="margin-bottom:16px;">
        <p style="margin:0;font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:1px;">Temporary Password</p>
        <code style="display:inline-block;margin:6px 0 0;background:#e2e8f0;color:#0f172a;padding:6px 12px;border-radius:4px;font-size:14px;font-weight:700;">${tempPassword}</code>
      </div>
      <div style="margin-bottom:16px;">
        <p style="margin:0;font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:1px;">Zoho Mail Login</p>
        <a href="https://mail.zoho.in" style="display:inline-block;margin:6px 0 0;color:#6366f1;font-weight:600;text-decoration:none;">https://mail.zoho.in</a>
      </div>
      <div>
        <p style="margin:0;font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:1px;">Namaah Portal Login</p>
        <p style="margin:6px 0 0;color:#0f172a;font-weight:600;">${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login</p>
      </div>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#166534;font-weight:600;">
        ✓ Both your professional email (<b>${emailAddress}</b>) and personal email work with the same password.<br/>
        Please change your password after first login.
      </p>
    </div>

    <p style="font-size:13px;color:#64748b;">Use <b>${emailAddress}</b> for all professional communication. Your personal email also works to log in to the Namaah Nexus portal.</p>

    <div style="margin-top:32px;border-top:1px solid #f1f5f9;padding-top:24px;">
      <p style="margin:0;font-weight:700;color:#0f172a;">Identity Management System</p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Automated Provisioning Engine · ${company}</p>
    </div>
  </div>
</div>`,
        });
      }
    } catch (err) {
      console.error("[SMTP] Professional mail notification failed:", err);
    }
  }

  return NextResponse.json({
    email_address:    emailAddress,
    zoho_account_id:  zohoAccountId,
    zoho_api_created: zohoApiSuccess,
  });
}

export async function GET(req: NextRequest) {
  const supabase   = getSupabaseAdmin();
  const employeeId = req.nextUrl.searchParams.get("employee_id");

  let query = supabase
    .from("account_access")
    .select("*, employee:employees(id,name,email,designation)");

  if (employeeId) query = query.eq("user_id", employeeId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
