import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import nodemailer from "nodemailer";

type Ctx = { params: Promise<{ id: string }> };

// ── Helper: get SMTP config ──
async function getSmtp() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("system_config")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass, company_name")
    .single();
  return data;
}

async function sendMail(to: string, subject: string, html: string) {
  const cfg = await getSmtp();
  if (!cfg?.smtp_host || !cfg?.smtp_user || !cfg?.smtp_pass) {
    throw new Error("SMTP not configured. Set it in System Config → Email Server.");
  }
  const transporter = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: cfg.smtp_port || 587,
    secure: cfg.smtp_port === 465,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
  });
  await transporter.sendMail({
    from: `"${cfg.company_name || "Namaah Nexus"}" <${cfg.smtp_user}>`,
    to,
    subject,
    html,
  });
}

// ── GET /api/users/[id] ───────────────────────────────────
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("employees").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ user: { ...data, employeeId: data.employee_id, joiningDate: data.joining_date } });
}

// ── PATCH /api/users/[id] — update profile ────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const body = await req.json();

  const updates: Record<string, any> = {};
  if (typeof body.isActive === "boolean") updates.is_active = body.isActive;
  if (body.name) updates.name = body.name;
  if (body.designation) updates.designation = body.designation;
  if (body.role) updates.role = body.role;
  if (body.department) updates.department = body.department;
  if (body.shift_id !== undefined) updates.shift_id = body.shift_id;
  if (body.team_id !== undefined) updates.team_id = body.team_id;
  if (body.monthly_leave_quota !== undefined) updates.monthly_leave_quota = body.monthly_leave_quota;
  if (body.employment_type !== undefined) updates.employment_type = body.employment_type;
  if (body.salary_structure !== undefined) updates.salary_structure = body.salary_structure;
  if (body.base_salary !== undefined) updates.base_salary = Number(body.base_salary);

  const { data, error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}

// ── DELETE /api/users/[id] — remove user ──────────────────
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error: dbErr } = await supabase.from("employees").delete().eq("id", id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  const { error: authErr } = await supabase.auth.admin.deleteUser(id);
  return NextResponse.json({ success: true });
}

// ── POST /api/users/[id] — action commands ────────────────
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const { action } = body;

  const { data: emp, error: empErr } = await supabase.from("employees").select("*").eq("id", id).single();
  const { data: config } = await supabase.from("system_config").select("company_name").single();
  if (empErr || !emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  if (action === "resend_credentials") {
    const newPass = `Namaah@1234`;
    const { error: authErr } = await supabase.auth.admin.updateUserById(id, { password: newPass });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

    try {
      await sendMail(emp.email, `Account Credentials Resent - ${config?.company_name || "Namaah Nexus"}`, `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 32px 20px; text-align: center;">
            <h1 style="margin:0; letter-spacing: 4px; font-size: 24px; font-weight: 800; text-transform: uppercase;">${config?.company_name || "NAMAAH PULSE"}</h1>
            <p style="margin-top: 8px; opacity: 0.8; font-size: 14px;">Credentials Recovery Service</p>
          </div>
          <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
            <p>Hi <b>${emp.name}</b>,</p>
            <p>As per your administrator's request, your login credentials for the portal have been reset to the standard temporary access key.</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px; margin: 24px 0;">
              <div style="margin-bottom: 12px; display: flex; align-items: center;">
                <strong style="width: 120px; color: #64748b; font-size: 12px; text-transform: uppercase;">Login Email</strong>
                <span style="color: #0f172a; font-weight: 600;">${emp.email}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <strong style="width: 120px; color: #64748b; font-size: 12px; text-transform: uppercase;">Temporary Pass</strong>
                <code style="background:#e2e8f0; color: #0f172a; padding:4px 8px; border-radius:4px; font-family: monospace; font-size: 14px; font-weight: 700;">${newPass}</code>
              </div>
            </div>

            <p style="font-size: 13px; color: #666;">If you did not request this, please contact your security officer immediately.</p>
            <div style="margin-top: 32px; border-top: 1px solid #f1f5f9; pt: 24px;">
              <p style="margin: 0; font-weight: 700; color: #0f172a;">Identity Management System</p>
            </div>
          </div>
        </div>
      `);
      return NextResponse.json({ success: true, message: "Credentials resent successfully." });
    } catch (e: any) {
      return NextResponse.json({ warning: "Account updated but email failed: " + e.message });
    }
  }

  if (action === "reset_password") {
    const { error } = await supabase.auth.resetPasswordForEmail(emp.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: "Official password reset link sent." });
  }

  if (action === "send_custom") {
    const { subject, message } = body;
    try {
      await sendMail(emp.email, subject, `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background:#0f172a; color:#fff; padding:20px; text-align:center"><h2>${config?.company_name || "Namaah Nexus"}</h2></div>
          <div style="padding:30px; background:#fbfbfa">
            <p>Hi <b>${emp.name}</b>,</p>
            ${message.split("\n").map((l: string) => `<p>${l}</p>`).join("")}
          </div>
        </div>
      `);
      return NextResponse.json({ success: true, message: "Custom email delivered." });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
}
