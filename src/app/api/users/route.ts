import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const { name, email, role, department, designation, matrix_role, team_id, shift_id, monthly_leave_quota, joining_date, employment_type, salary_structure, base_salary, salary_min, salary_max, kpi_weight, kra_weight, behavioral_weight, enable_salary_linkage, commission_enabled, monthly_sales_target, salary_slab_id } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Missing highly critical parameters (Name, Email, Role)" }, { status: 400 });
    }

    const VALID_ROLES = ["admin", "dept_lead", "team_lead", "employee", "intern"];
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role "${role}". Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
    }

    // 1. Generate an automated generic password (e.g. Namaah@1234)
    const generatedPassword = `Namaah@1234`;

    // 2. Map robust Auth user via Backend Service Role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { role, full_name: name, department }
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Active Auth Link Failed: " + (authError?.message || "Unknown Failure") }, { status: 500 });
    }

    const { user } = authData;

    // 3. Systematically link the created User ID structurally to employee DB table
    const employee_id_gen = `NP-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertData: any = {
      id: user.id,   // Mapped to strict auth.user (RLS)
      name,
      email,
      employee_id: body.employee_id || employee_id_gen,
      role,
      department,
      designation,
      matrix_role: matrix_role || null,
      team_id: team_id || null,
      shift_id: shift_id || null,
      monthly_leave_quota: monthly_leave_quota || 1.5,
      leave_balance: monthly_leave_quota || 1.5,
      joining_date: joining_date || new Date().toISOString(),
      employment_type: employment_type || 'full_time',
      salary_structure: salary_structure || 'fixed_monthly',
      base_salary: base_salary ? Number(base_salary) : 0
    };

    // Add salary fields only if they're provided (migration may not be applied yet)
    if (salary_min !== undefined) insertData.salary_min = salary_min ? Number(salary_min) : null;
    if (salary_max !== undefined) insertData.salary_max = salary_max ? Number(salary_max) : null;
    if (kpi_weight !== undefined) insertData.kpi_weight = kpi_weight ? Number(kpi_weight) : 40;
    if (kra_weight !== undefined) insertData.kra_weight = kra_weight ? Number(kra_weight) : 40;
    if (behavioral_weight !== undefined) insertData.behavioral_weight = behavioral_weight ? Number(behavioral_weight) : 20;
    if (enable_salary_linkage !== undefined) insertData.enable_salary_linkage = enable_salary_linkage || false;
    // Sales commission fields
    if (commission_enabled !== undefined) insertData.commission_enabled = commission_enabled || false;
    if (monthly_sales_target !== undefined) insertData.monthly_sales_target = monthly_sales_target ? Number(monthly_sales_target) : null;
    if (salary_slab_id !== undefined) insertData.salary_slab_id = salary_slab_id || null;

    const { error: dbError } = await supabase
      .from("employees")
      .insert(insertData);

    if (dbError) {
      // Revert if insertion failed
      await supabase.auth.admin.deleteUser(user.id);
      return NextResponse.json({ error: "Database Reference Matrix Failed: " + dbError.message }, { status: 500 });
    }

    // 4. Fetch the dynamic SMTP overrides from the active System Config node
    const { data: config } = await supabase.from("system_config").select("smtp_host, smtp_port, smtp_user, smtp_pass, company_name").single();

    if (config?.smtp_host && config?.smtp_user && config?.smtp_pass) {
      // 5. Fire Transport to absolute designated Employee Inbox
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port || 587,
        secure: config.smtp_port === 465, 
        auth: {
          user: config.smtp_user,
          pass: config.smtp_pass
        }
      });

      const mailOptions = {
        from: `"${config.company_name || "Namaah Nexus"}" <${config.smtp_user}>`,
        to: email,
        subject: `Welcome to ${config.company_name || "Namaah Nexus"} - Onboarding Initiated`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #0f172a; color: #ffffff; padding: 32px 20px; text-align: center;">
              <h1 style="margin:0; letter-spacing: 4px; font-size: 24px; font-weight: 800; text-transform: uppercase;">${config.company_name || "NAMAAH PULSE"}</h1>
              <p style="margin-top: 8px; opacity: 0.8; font-size: 14px;">Onboarding Portal & Identity Management</p>
            </div>
            <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
              <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">Welcome Onboard, ${name}!</h2>
              <p>Your professional account at <b>${config.company_name || "Namaah Nexus"}</b> has been successfully initialized. You now have access to the enterprise portal with the following credentials:</p>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px; margin: 24px 0;">
                <div style="margin-bottom: 12px; display: flex; align-items: center;">
                  <strong style="width: 120px; color: #64748b; font-size: 12px; text-transform: uppercase;">Portal Role</strong>
                  <span style="color: #0f172a; font-weight: 600; text-transform: capitalize;">${role}</span>
                </div>
                <div style="margin-bottom: 12px; display: flex; align-items: center;">
                  <strong style="width: 120px; color: #64748b; font-size: 12px; text-transform: uppercase;">Login Email</strong>
                  <span style="color: #0f172a; font-weight: 600;">${email}</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <strong style="width: 120px; color: #64748b; font-size: 12px; text-transform: uppercase;">Temporary Pass</strong>
                  <code style="background:#e2e8f0; color: #0f172a; padding:4px 8px; border-radius:4px; font-family: monospace; font-size: 14px; font-weight: 700;">${generatedPassword}</code>
                </div>
              </div>

              <p style="font-size: 13px; color: #fbbf24; background: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 6px;">
                <b>Security Action Required:</b> Please log in to the portal and update this generic password in your profile settings immediately to ensure account integrity.
              </p>
              
              <div style="margin-top: 32px; border-top: 1px solid #f1f5f9; pt: 24px;">
                <p style="margin: 0; font-weight: 700; color: #0f172a;">Identity Management System</p>
                <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Automated Onboarding Engine · ${config.company_name || "Namaah Nexus"}</p>
              </div>
            </div>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Successfully executed key handover to ${email}`);
      } catch (err) {
        console.error("[SMTP Error] Email Relay Failure:", err);
      }
    }

    return NextResponse.json({ success: true, id: user.id, message: "Employee registered & Auth linked successfully." }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal Relay Fault: " + error.message }, { status: 500 });
  }
}

// Automatically resolve Dashboard Active Sync requirements for fetching mapped Accounts
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");

    let query = supabase.from("employees").select("*", { count: 'exact' });

    if (role) {
      query = query.eq("role", role);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`);
    }

    // Always sort by joined_at or created_at natively to display newest first
    query = query.order("created_at", { ascending: false });

    let { data, count, error } = await query;

    // If select(*) fails due to missing columns, try without them
    if (error && error.message?.includes("column")) {
      console.warn("Some columns not found, fetching available columns only");

      let fallbackQuery = supabase
        .from("employees")
        .select("id, name, email, employee_id, role, department, designation, team_id, joining_date, employment_type, salary_structure, base_salary, is_active, created_at, updated_at", { count: 'exact' });

      if (role) {
        fallbackQuery = fallbackQuery.eq("role", role);
      }

      if (search) {
        fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`);
      }

      const { data: fallbackData, count: fallbackCount, error: fallbackError } = await fallbackQuery.order("created_at", { ascending: false });

      if (!fallbackError) {
        data = fallbackData;
        count = fallbackCount;
        error = null;
      } else {
        throw fallbackError;
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mutate payloads correctly because original MongoDB schema mapped `employeeId` instead of `employee_id`
    const users = (data || []).map((u: any) => ({
      ...u,
      employeeId: u.employee_id,
      joiningDate: u.joining_date
    }));

    return NextResponse.json({ users, total: count || 0 }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Database Fetch Fault: " + error.message }, { status: 500 });
  }
}
