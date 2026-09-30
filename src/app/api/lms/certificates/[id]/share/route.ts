import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireModule } from "@/lib/authz";
import { getMailContext, getMailActor, sendRecruitmentMail, getCompanyName } from "@/lib/recruitment-mail";
import { generateCertificatePdf } from "@/lib/lms/certificate";

type Ctx = { params: Promise<{ id: string }> };

function shareHtml(name: string, course: string, company: string, date: string): string {
  const first = name.split(" ")[0] || name;
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="border-top:4px solid #0f172a;padding:22px 32px 16px"><p style="margin:0;font-size:17px;font-weight:700;color:#0f172a">${company}</p>
      <p style="margin:4px 0 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#c8a24a;font-weight:700">Learning &amp; Development</p></div>
    <div style="padding:24px 32px;color:#374151;font-size:14px;line-height:1.75">
      <p style="margin:0 0 16px">Dear ${first},</p>
      <p style="margin:0 0 16px">Congratulations on successfully completing <strong>${course}</strong>. It is with great pleasure that we recognise your dedication and the effort you have invested in your professional development at ${company}.</p>
      <p style="margin:0 0 16px">Please find your official <strong>Certificate of Completion</strong> attached to this email as a PDF document, issued on ${date}. This credential is a formal acknowledgement of the skills and knowledge you have demonstrated, and it forms part of your learning record with us.</p>
      <p style="margin:0 0 16px">We encourage you to retain this certificate for your records and to continue building on this achievement through the many learning opportunities available on the Namaah Nexus Academy.</p>
      <p style="margin:0 0 4px">With warm regards and continued best wishes,</p>
      <p style="margin:0;font-weight:600;color:#0f172a">Learning &amp; Development Team</p>
      <p style="margin:0;color:#6b7280">${company}</p>
    </div>
    <div style="background:#fafbfc;padding:14px 32px;border-top:1px solid #eef0f2"><p style="margin:0;font-size:11px;color:#9aa3af">This is an official communication from ${company}. The attached certificate is issued to the named recipient.</p></div>
  </div>`;
}

// POST /api/lms/certificates/[id]/share  { target?: "company" | "personal", to?: string }
// Emails the certificate PDF to the recipient with a formal message.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireModule("lms_certifications", "can_view");
  if (!gate.ok) return gate.response;
  const actor = gate.actor;

  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();

  const { data: cert } = await supabase
    .from("lms_certifications")
    .select("id, certificate_number, issue_date, issued_at, employee:employee_id(name, email, zoho_email), course:course_id(title, category)")
    .eq("id", id)
    .maybeSingle();
  if (!cert) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  const emp: any = cert.employee; const course: any = cert.course;
  const target = body?.target === "company" ? "company" : "personal";
  const to: string = body?.to || (target === "company" ? (emp?.zoho_email || emp?.email) : (emp?.email || emp?.zoho_email));
  if (!to) return NextResponse.json({ error: "No email address on file for this recipient." }, { status: 400 });

  const { data: settings } = await supabase
    .from("onboarding_settings").select("signatory_name, signatory_designation, company_name").maybeSingle();
  const companyName = settings?.company_name || (await getCompanyName());
  const when = new Date((cert as any).issued_at || cert.issue_date);
  const dateStr = when.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  try {
    const pdf = await generateCertificatePdf({
      name: emp?.name || "Employee", courseTitle: course?.title || "Course", category: course?.category || null,
      certNumber: cert.certificate_number, issueDate: dateStr, issueTime: timeStr, companyName,
      signatoryName: settings?.signatory_name || null, signatoryTitle: settings?.signatory_designation || null,
    });
    const ctx = await getMailContext(await getMailActor(actor.userId));
    await sendRecruitmentMail(ctx, {
      to,
      subject: `Your Certificate of Completion — ${course?.title || "Course"} · ${companyName}`,
      html: shareHtml(emp?.name || "there", course?.title || "your course", companyName, dateStr),
      attachments: [{ filename: `Certificate - ${(course?.title || "Course").replace(/[^a-z0-9]+/gi, " ").trim()}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
    return NextResponse.json({ ok: true, to });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to share certificate" }, { status: 500 });
  }
}
