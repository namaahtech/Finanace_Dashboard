import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActor } from "@/lib/onboarding/server";
import { getMailContext, sendRecruitmentMail, fullTimeConversionHtml } from "@/lib/recruitment-mail";
import { logAudit } from "@/lib/audit";

// POST /api/onboarding/convert-fulltime
// Converts an intern who has completed their onboarding into a full-time employee:
// flips employment_type on their employee record, applies the new role/department/
// salary, and emails them a professional conversion offer FROM the acting HR user's
// own mailbox.
//
// Matching is by email — the candidate becomes an employee via "Add Employee" after
// signing, so the employee row already exists in the normal flow. If it doesn't yet,
// we say so plainly rather than silently creating a half-populated record.
export async function POST(req: NextRequest) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only HR and admins may change someone's employment type.
    const role = String(actor.role || "").toLowerCase();
    if (!["admin", "hr", "dept_lead"].includes(role)) {
      return NextResponse.json({ error: "You don't have permission to convert employees." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const packetId: string | undefined = body?.packet_id;
    const designation: string | null = body?.designation?.trim() || null;
    const department: string | null = body?.department?.trim() || null;
    const effectiveDate: string | null = body?.effective_date || null;
    const annualCtc: number | null = Number(body?.annual_ctc) > 0 ? Number(body.annual_ctc) : null;
    const message: string | null = body?.message?.trim() || null;
    const notify: boolean = body?.notify !== false;

    if (!packetId) return NextResponse.json({ error: "packet_id is required." }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: packet, error: packetErr } = await supabase
      .from("onboarding_packets")
      .select("id, candidate_name, candidate_email, status, converted_to_fulltime_at, employment_type")
      .eq("id", packetId)
      .maybeSingle();

    // These columns ship with migrations 120/121; say so plainly instead of
    // surfacing a raw PostgREST error to HR.
    if (packetErr && /converted_to_fulltime_at|employment_type/.test(packetErr.message || "")) {
      return NextResponse.json(
        { error: "Full-time conversion isn't enabled yet — database migrations 120 and 121 still need to be applied." },
        { status: 503 }
      );
    }
    if (!packet) return NextResponse.json({ error: "Onboarding record not found." }, { status: 404 });
    // Someone hired directly as full-time was never an intern — there is nothing
    // to convert. The button is hidden for them, this is the server-side guard.
    if (packet.employment_type === "full_time") {
      return NextResponse.json({ error: "This person was hired directly as full-time." }, { status: 409 });
    }
    if (packet.status !== "completed" && packet.status !== "signed") {
      return NextResponse.json(
        { error: "Only a completed onboarding can be converted to full-time." },
        { status: 400 }
      );
    }
    if (packet.converted_to_fulltime_at) {
      return NextResponse.json({ error: "This person has already been converted to full-time." }, { status: 409 });
    }

    // Locate their employee record by email (case-insensitive).
    const { data: employee } = await supabase
      .from("employees")
      .select("id, name, email, employment_type, designation, department")
      .ilike("email", packet.candidate_email)
      .maybeSingle();

    if (!employee) {
      return NextResponse.json(
        {
          error:
            "No employee record found for this candidate. Add them as an employee first (the “Add Employee” action on the onboarding), then convert.",
        },
        { status: 409 }
      );
    }

    // NOTE: `employees.employment_type` uses full_time / internship / part_time,
    // which is a different vocabulary from `onboarding_packets.employment_type`
    // (intern / full_time). Write the employees value here.
    const update: Record<string, unknown> = {
      employment_type: "full_time",
      // Interns are on a stipend; a full-time employee is on a monthly salary.
      salary_structure: "fixed_monthly",
      updated_at: new Date().toISOString(),
    };
    if (designation) update.designation = designation;
    if (department) update.department = department;
    if (annualCtc) update.base_salary = Math.round(annualCtc / 12);
    if (effectiveDate) update.joining_date = effectiveDate;

    const { error: empErr } = await supabase.from("employees").update(update).eq("id", employee.id);
    if (empErr) {
      console.error("[convert-fulltime] employee update failed:", empErr.message);
      return NextResponse.json({ error: "Could not update the employee record." }, { status: 500 });
    }

    await supabase
      .from("onboarding_packets")
      .update({
        converted_to_fulltime_at: new Date().toISOString(),
        converted_to_fulltime_by: actor.userId,
      })
      .eq("id", packet.id);

    // Email the offer from the acting user's own mailbox (not admin@).
    let emailed = false;
    let emailError: string | null = null;
    if (notify) {
      try {
        const ctx = await getMailContext(actor);
        await sendRecruitmentMail(ctx, {
          to: packet.candidate_email,
          subject: `Your Full-Time Offer — ${ctx.companyName}`,
          html: fullTimeConversionHtml({
            name: packet.candidate_name,
            companyName: ctx.companyName,
            designation: designation || employee.designation,
            department: department || employee.department,
            effectiveDate,
            annualCtc,
            message,
          }),
        });
        emailed = true;
      } catch (e: any) {
        // The conversion itself already succeeded — surface the mail failure
        // without rolling back a completed HR action.
        emailError = e?.message || "Email could not be sent.";
        console.error("[convert-fulltime] email failed:", emailError);
      }
    }

    await logAudit({
      actorId: actor.userId,
      actorName: actor.name,
      actorRole: actor.role,
      action: "onboarding.convert_fulltime",
      section: "Onboarding",
      summary: `${actor.name} converted ${packet.candidate_name} from intern to full-time${designation ? ` as ${designation}` : ""}`,
      targetType: "employee",
      targetId: employee.id,
    });

    return NextResponse.json({ ok: true, emailed, emailError, employeeId: employee.id });
  } catch (e: any) {
    console.error("[convert-fulltime]", e);
    return NextResponse.json({ error: e?.message || "Conversion failed." }, { status: 500 });
  }
}
