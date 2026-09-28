import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireModule } from "@/lib/authz";
import { findEmployeeForCandidate } from "@/lib/onboarding/server";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/onboarding/[id]/link-employee
// Records which employee a completed onboarding was handed over to. Called right
// after "Add Employee" creates the record. The employee is found by the
// candidate's address rather than trusting an id from the client.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  // Same right that's needed to create the employee in the first place.
  const gate = await requireModule("employees", "can_create");
  if (!gate.ok) return gate.response;
  const actor = gate.actor;

  const supabase = getSupabaseAdmin();
  const { data: packet } = await supabase
    .from("onboarding_packets")
    .select("id, status, candidate_name, candidate_email")
    .eq("id", id)
    .maybeSingle();
  if (!packet) return NextResponse.json({ error: "Onboarding not found." }, { status: 404 });
  if (packet.status !== "completed") {
    return NextResponse.json({ error: "Only a completed onboarding can be handed over." }, { status: 400 });
  }

  const employee = await findEmployeeForCandidate(packet.candidate_email);
  if (!employee) {
    return NextResponse.json({ error: "No employee record found for this candidate yet." }, { status: 404 });
  }

  const { error } = await supabase
    .from("onboarding_packets")
    .update({ employee_id: employee.id, added_to_employees_at: new Date().toISOString() })
    .eq("id", packet.id);
  if (error) {
    // Almost always: migration 124 not applied yet. The employee itself was
    // created successfully, so this is reported but not fatal.
    console.error("[link-employee] could not record handoff — is migration 124 applied?", error.message);
    return NextResponse.json(
      { error: "The employee was created, but the handoff couldn't be recorded (database migration 124 pending).", employee },
      { status: 503 }
    );
  }

  await logAudit({
    actorId: actor.userId,
    actorName: actor.name,
    actorRole: actor.role,
    action: "onboarding.handed_off",
    section: "Onboarding",
    summary: `${actor.name} added ${packet.candidate_name} to Employees from onboarding`,
    targetType: "employee",
    targetId: employee.id,
  });

  return NextResponse.json({ ok: true, employee });
}
