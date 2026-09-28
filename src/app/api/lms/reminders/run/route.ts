import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireModule } from "@/lib/authz";
import { getMailContext, sendRecruitmentMail } from "@/lib/recruitment-mail";

// POST /api/lms/reminders/run
// Deadline reminder + escalation sweep for mandatory/department courses. Meant to
// run daily via cron (send header `x-cron-secret: $CRON_SECRET`) or on-demand by
// an L&D admin. For each incomplete assigned enrollment with a due_date it fires
// the 7/3/1-day reminders (once each) and an overdue escalation — email + in-app,
// logged in lms_reminders so nothing double-sends.
const THRESHOLDS: { kind: string; within: number }[] = [
  { kind: "due_7d", within: 7 },
  { kind: "due_3d", within: 3 },
  { kind: "due_1d", within: 1 },
];

function daysLeft(due: string): number {
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
}

function reminderHtml(name: string, course: string, d: number, company: string): string {
  const when = d < 0 ? `${Math.abs(d)} day(s) overdue` : d === 0 ? "due today" : `due in ${d} day(s)`;
  const urgent = d <= 1;
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="border-top:4px solid ${urgent ? "#e11d48" : "#f59e0b"};padding:20px 28px 16px"><p style="margin:0;font-size:16px;font-weight:700;color:#0f172a">${company} · Learning &amp; Development</p></div>
    <div style="padding:8px 28px 28px;color:#374151;font-size:14px;line-height:1.7">
      <p>Dear ${name},</p>
      <p>Your required course <strong>${course}</strong> is <strong>${when}</strong>.</p>
      <p>Please complete it to stay compliant. You can resume anytime from your Training Academy.</p>
      <p style="margin-top:20px;color:#6b7280;font-size:12px">This is an automated reminder from ${company}.</p>
    </div></div>`;
}

export async function POST(req: NextRequest) {
  // Auth: cron secret OR an authenticated L&D admin.
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!(secret && provided && provided === secret)) {
    const gate = await requireModule("lms_academy", "can_view");
    if (!gate.ok) return gate.response;
  }

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("lms_enrollments")
    .select("id, due_date, progress_percent, completed_at, employee:employee_id(id,name,email), course:course_id(title)")
    .not("due_date", "is", null)
    .is("completed_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const company = "Namaah";
  let mailCtx: Awaited<ReturnType<typeof getMailContext>> | null = null;
  try { mailCtx = await getMailContext(null); } catch { /* mail optional — still log in-app */ }

  let sent = 0;
  const results: any[] = [];

  for (const r of rows || []) {
    const emp: any = r.employee;
    const course: any = r.course;
    if (!emp?.id || (r.progress_percent || 0) >= 100) continue;
    const d = daysLeft(r.due_date as string);

    // Decide which single reminder (if any) is due now.
    let kind: string | null = null;
    if (d < 0) kind = "escalation";
    else { for (const t of THRESHOLDS) if (d <= t.within) { kind = t.kind; break; } }
    if (!kind) continue;

    // Already sent this kind for this enrollment?
    const { data: existing } = await supabase
      .from("lms_reminders").select("id").eq("enrollment_id", r.id).eq("kind", kind).maybeSingle();
    if (existing) continue;

    // In-app notification (always) + email (best-effort).
    await supabase.from("system_notifications").insert({
      user_id: emp.id,
      title: kind === "escalation" ? "Overdue course" : "Course deadline approaching",
      message: `"${course?.title || "A required course"}" is ${d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "due today" : `due in ${d}d`}.`,
      type: d <= 1 ? "danger" : "warning",
      link: "/dashboard/academy",
    }).select().maybeSingle();

    let emailed = false;
    if (mailCtx && emp.email) {
      try {
        await sendRecruitmentMail(mailCtx, {
          to: emp.email,
          subject: `${d < 0 ? "Overdue" : "Reminder"}: ${course?.title || "Required course"} — ${company} Academy`,
          html: reminderHtml(emp.name || "there", course?.title || "your course", d, company),
        });
        emailed = true;
      } catch { /* logged as in-app only */ }
    }

    await supabase.from("lms_reminders").insert({ enrollment_id: r.id, kind, channel: emailed ? "email" : "in_app" });
    sent++;
    results.push({ enrollment: r.id, kind, emailed });
  }

  return NextResponse.json({ ok: true, processed: (rows || []).length, sent, results });
}
