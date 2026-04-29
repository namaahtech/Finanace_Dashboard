import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_id, name, email, department, designation, team_id, role, joining_date, is_active, monthly_leave_quota, leave_balance, teams:team_id(name)")
      .order("name");
    if (error) throw error;
    return NextResponse.json({ employees: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
