import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireModule } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { disableZohoMailbox } from "@/lib/zoho-provisioning";
import { getMailContext, getMailActor, sendRecruitmentMail, employeeRemovedHtml, getCompanyName } from "@/lib/recruitment-mail";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/employees/[id]/delete — preview: what the permanent delete will affect
// (so the UI can show the company-mailbox warning before confirming).
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireModule("employee_delete", "can_delete");
  if (!gate.ok) return gate.response;

  const supabase = getSupabaseAdmin();
  const { data: emp } = await supabase
    .from("employees")
    .select("id, name, email, zoho_email, zoho_user_id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!emp) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  return NextResponse.json({
    name: emp.name,
    email: emp.email,
    companyMail: emp.zoho_email || null,
    hasCompanyMail: !!(emp.zoho_user_id || emp.zoho_email),
    alreadyDeleted: !!emp.deleted_at,
  });
}

// POST /api/employees/[id]/delete  { reason?: string, confirm: true }
// Permanently removes (archives) a joined employee: disables their company
// mailbox + panel login, records the archive trail, and emails a notice.
// The record is soft-archived (deleted_at) — recoverable by IT, mailbox disabled.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireModule("employee_delete", "can_delete");
  if (!gate.ok) return gate.response;
  const actor = gate.actor;

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== true) {
    return NextResponse.json({ error: "Confirmation required." }, { status: 400 });
  }
  const reason: string | null = body?.reason ?? null;

  const supabase = getSupabaseAdmin();
  const { data: emp } = await supabase
    .from("employees")
    .select("id, name, email, zoho_user_id, zoho_email, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!emp) return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  if (emp.deleted_at) return NextResponse.json({ error: "This employee is already deleted." }, { status: 400 });

  // Disable the company (Zoho) mailbox — recoverable by IT, not destroyed.
  if (emp.zoho_user_id) {
    await disableZohoMailbox(emp.zoho_user_id).catch((e) =>
      console.error("[Delete] Zoho disable failed:", e?.message),
    );
  }
  // Lock the panel login.
  await supabase.auth.admin.updateUserById(id, { ban_duration: "876600h" }).catch(() => {});

  const { error: updErr } = await supabase
    .from("employees")
    .update({
      status: "disabled",
      is_active: false,
      deleted_at: new Date().toISOString(),
      deleted_by: actor.userId,
      delete_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Notice to the employee's personal email (their company mailbox is now off).
  let mailSent = false;
  let mailError: string | null = null;
  try {
    if (emp.email) {
      const ctx = await getMailContext(await getMailActor(actor.userId));
      const companyName = ctx.companyName || (await getCompanyName());
      await sendRecruitmentMail(ctx, {
        to: emp.email,
        subject: `Access deactivated — ${companyName}`,
        html: employeeRemovedHtml(emp.name || "there", companyName, reason),
      });
      mailSent = true;
    }
  } catch (e: any) {
    mailError = e?.message || "Mail could not be sent.";
  }

  await logAudit({
    actorId: actor.userId,
    action: "employee.delete",
    section: "Employees",
    summary: `Permanently deleted ${emp.name || "an employee"} (company mailbox disabled)`,
    targetType: "employee",
    targetId: id,
  });

  return NextResponse.json({ ok: true, mailSent, mailError });
}
