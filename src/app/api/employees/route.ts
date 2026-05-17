import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { provisionZohoMailbox, generateTempPassword } from "@/lib/zoho-provisioning";

export async function GET() {
  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_id, name, email, zoho_email, department, designation, matrix_role, team_id, role, joining_date, is_active, status, monthly_leave_quota, leave_balance, teams:team_id(name)")
      .order("name");
    if (error) throw error;
    return NextResponse.json({ employees: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const body = await req.json();
    const {
      name, email, role, department, team_id, designation,
      joining_date, employment_type, salary_structure, base_salary,
      monthly_leave_quota, created_by,
    } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: "name, email, and role are required." }, { status: 400 });
    }

    // ── 1. Generate employee_id ───────────────────────────────────────────────
    const prefix  = role === "intern" ? "IN" : "NP";
    const { count } = await supabase.from("employees").select("*", { count: "exact", head: true });
    const nextNum = String((count || 0) + 1).padStart(4, "0");
    const employee_id = `${prefix}-${nextNum}`;

    // ── 2. Create Supabase Auth user ──────────────────────────────────────────
    const tempPassword = generateTempPassword();
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password:       tempPassword,
      email_confirm:  true,
    });

    if (authError && !authError.message.includes("already been registered")) {
      return NextResponse.json({ error: `Auth creation failed: ${authError.message}` }, { status: 400 });
    }

    const userId = authUser?.user?.id;

    // ── 3. Insert employee record ─────────────────────────────────────────────
    const { data: emp, error: empError } = await supabase
      .from("employees")
      .insert({
        ...(userId ? { id: userId } : {}),
        name,
        email,
        personal_email:      email,
        employee_id,
        role,
        department:          department || null,
        team_id:             team_id    || null,
        designation:         designation || null,
        joining_date:        joining_date || new Date().toISOString().split("T")[0],
        employment_type:     employment_type || (role === "intern" ? "internship" : "full_time"),
        salary_structure:    salary_structure || (role === "intern" ? "stipend" : "fixed_monthly"),
        base_salary:         base_salary || 0,
        monthly_leave_quota: monthly_leave_quota || (role === "intern" ? 1 : 1.5),
        leave_balance:       monthly_leave_quota || (role === "intern" ? 1 : 1.5),
        is_active:           true,
        status:              "active",
      })
      .select()
      .single();

    if (empError) throw empError;

    // ── 4. Auto-provision Zoho mailbox ────────────────────────────────────────
    let zohoResult: any = null;
    try {
      zohoResult = await provisionZohoMailbox({
        employeeId:  emp.id,
        name,
        designation: designation || "",
        department:  department  || "",
        tempPassword,
      });
    } catch (zohoErr: any) {
      console.error("[Zoho provision] non-fatal:", zohoErr.message);
    }

    // ── 5. Audit log ──────────────────────────────────────────────────────────
    await supabase.from("audit_logs").insert({
      user_id:     created_by || null,
      action:      "employee_created",
      target_type: "employee",
      target_id:   emp.id,
      metadata:    { name, email, role, zoho_email: zohoResult?.zoho_email },
    });

    return NextResponse.json({
      employee:    emp,
      zoho_email:  zohoResult?.zoho_email || null,
      temp_password: tempPassword,
      message: "Employee created. Welcome email should be sent with temp credentials.",
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
