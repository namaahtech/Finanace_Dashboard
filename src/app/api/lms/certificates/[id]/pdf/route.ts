import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActor } from "@/lib/onboarding/server";
import { generateCertificatePdf } from "@/lib/lms/certificate";
import { getCompanyName } from "@/lib/recruitment-mail";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/lms/certificates/[id]/pdf[?download=1]
// Renders the certificate PDF on demand. Viewable by the owning employee or any
// admin/LMS manager. `download=1` forces a Save-As; otherwise it opens inline.
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: cert } = await supabase
    .from("lms_certifications")
    .select("id, certificate_number, issue_date, issued_at, employee_id, employee:employee_id(name), course:course_id(title, category)")
    .eq("id", id)
    .maybeSingle();
  if (!cert) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  // Owner or an admin/LMS role may render it.
  const isOwner = cert.employee_id === actor.userId;
  if (!isOwner && actor.role !== "admin") {
    const { data: rp } = await supabase
      .from("role_permissions").select("can_view").eq("role", actor.role).eq("module_key", "lms_certifications").maybeSingle();
    if (!rp?.can_view) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: settings } = await supabase
    .from("onboarding_settings").select("signatory_name, signatory_designation, company_name").maybeSingle();

  const emp: any = cert.employee; const course: any = cert.course;
  const when = new Date((cert as any).issued_at || cert.issue_date);
  const pdf = await generateCertificatePdf({
    name: emp?.name || "Employee",
    courseTitle: course?.title || "Course",
    category: course?.category || null,
    certNumber: cert.certificate_number,
    issueDate: when.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    issueTime: when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    companyName: settings?.company_name || (await getCompanyName()),
    signatoryName: settings?.signatory_name || null,
    signatoryTitle: settings?.signatory_designation || null,
  });

  const download = req.nextUrl.searchParams.get("download") === "1";
  const filename = `Certificate - ${(course?.title || "Course").replace(/[^a-z0-9]+/gi, " ").trim()}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
