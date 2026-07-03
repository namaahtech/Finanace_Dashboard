import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActor, isAdmin } from "@/lib/onboarding/server";
import { PAYROLL_INTERN_EMAILS } from "@/lib/payroll-access";

// GET /api/interns/activity
//
// Admin-only. Returns the full audit trail of the scoped payroll-intern
// account(s) — every stipend/holiday/payment action they performed — so an
// admin can see exactly what the intern helper has done. Powers the realtime
// "Intern Activity" page.
export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const supabase = getSupabaseAdmin();

  // Resolve the scoped account(s) → employee ids.
  const emails = PAYROLL_INTERN_EMAILS.map((e) => e.toLowerCase());
  const { data: accounts } = await supabase
    .from("employees")
    .select("id, name, email, employee_id")
    .in("email", emails);

  const ids = (accounts ?? []).map((a) => a.id);
  if (ids.length === 0) {
    return NextResponse.json({ account: null, events: [], stats: { total: 0, payments: 0, holidays: 0 } });
  }

  const { data: events, error } = await supabase
    .from("audit_logs")
    .select("id, action, section, summary, target_type, target_id, actor_name, created_at")
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = events ?? [];
  const stats = {
    total: list.length,
    payments: list.filter((e) => e.action?.includes("payment")).length,
    holidays: list.filter((e) => e.action === "internship.cycle.update" && /holiday/i.test(e.summary || "")).length,
  };

  return NextResponse.json({
    account: accounts?.[0] ?? null,
    events: list,
    stats,
  });
}
