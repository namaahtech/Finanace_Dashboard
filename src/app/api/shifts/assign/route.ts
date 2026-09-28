import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireModule } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

// POST /api/shifts/assign  { employee_id, shift_id | null }
//
// Shift assignment used to be written straight from the browser. Row-level
// security on `employees` only grants UPDATE to the `admin` role
// (migration 086 "employees_admin_all"), so when an HR user changed a shift the
// database silently updated ZERO rows and returned no error — the dropdown said
// "updated" and nothing was saved. The write now goes through the server, gated
// by the same shift_management permission that controls the page.
export async function POST(req: NextRequest) {
  const gate = await requireModule("shift_management", "can_edit");
  if (!gate.ok) return gate.response;
  const actor = gate.actor;

  const supabase = getSupabaseAdmin();

  const body = await req.json().catch(() => ({}));
  const employeeId: string | undefined = body?.employee_id;
  const shiftId: string | null = body?.shift_id ?? null;
  if (!employeeId) return NextResponse.json({ error: "employee_id is required." }, { status: 400 });

  if (shiftId) {
    const { data: shift } = await supabase.from("shifts").select("id, name").eq("id", shiftId).maybeSingle();
    if (!shift) return NextResponse.json({ error: "That shift no longer exists." }, { status: 404 });
  }

  // `.select()` returns the updated rows, so an update that matched nothing is
  // reported as a failure instead of a silent success.
  const { data: updated, error } = await supabase
    .from("employees")
    .update({ shift_id: shiftId })
    .eq("id", employeeId)
    .select("id, name, shift_id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  await logAudit({
    actorId: actor.userId,
    actorName: actor.name,
    actorRole: actor.role,
    action: shiftId ? "shift.assigned" : "shift.unassigned",
    section: "Shift Management",
    summary: shiftId
      ? `${actor.name} assigned a shift to ${updated[0].name}`
      : `${actor.name} removed ${updated[0].name}'s shift assignment`,
    targetType: "employee",
    targetId: employeeId,
  });

  return NextResponse.json({ ok: true, employee: updated[0] });
}
