import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMailContext, sendRecruitmentMail, reminderDocsHtml } from "@/lib/recruitment-mail";

const baseUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

// Send a reminder email for a pending document request, with an optional custom note.
export async function POST(req: Request) {
  try {
    const { request_id, message } = await req.json();
    if (!request_id) return NextResponse.json({ error: "request_id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: r } = await supabase
      .from("candidate_document_requests")
      .select("*")
      .eq("id", request_id)
      .maybeSingle();

    if (!r) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (r.status === "submitted") {
      return NextResponse.json({ error: "Candidate has already uploaded their documents." }, { status: 400 });
    }

    const ctx = await getMailContext();
    const link = `${baseUrl()}/documents/${r.token}`;
    await sendRecruitmentMail(ctx, {
      to: r.candidate_email,
      subject: `Reminder: Document Submission — ${ctx.companyName}`,
      html: reminderDocsHtml(r.candidate_name, ctx.companyName, link, r.required_docs || [], (message || "").trim() || null),
    });

    await supabase
      .from("candidate_document_requests")
      .update({ last_reminded_at: new Date().toISOString(), reminder_count: (r.reminder_count || 0) + 1 })
      .eq("id", r.id);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[remind-documents]", e);
    return NextResponse.json({ error: e.message || "Failed to send reminder" }, { status: 500 });
  }
}
