import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActiveToken, zohoPost } from "@/lib/zoho-mail";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body     = await req.json();
  const { to, cc, bcc, subject, content, fromName, employeeId, draftId } = body;

  if (!to?.length || !subject || !content) {
    return NextResponse.json({ error: "To, subject, and content are required." }, { status: 400 });
  }

  const token = await getActiveToken();
  if (!token) {
    return NextResponse.json({ error: "Zoho Mail not connected. Please configure in Mail Config." }, { status: 503 });
  }

  const { data: config } = await supabase
    .from("zoho_config")
    .select("admin_account_id")
    .maybeSingle();

  if (!config?.admin_account_id) {
    return NextResponse.json({ error: "Zoho account not configured." }, { status: 503 });
  }

  const payload: Record<string, unknown> = {
    fromAddress: `${fromName || "Namaah"}`,
    toAddress:   Array.isArray(to) ? to.join(",") : to,
    subject,
    content,
    mailFormat: "html",
  };
  if (cc?.length)  payload.ccAddress  = Array.isArray(cc)  ? cc.join(",")  : cc;
  if (bcc?.length) payload.bccAddress = Array.isArray(bcc) ? bcc.join(",") : bcc;

  const zohoRes = await zohoPost(token, `/accounts/${config.admin_account_id}/messages`, payload);

  if (zohoRes?.status?.code !== 200 && zohoRes?.status?.code !== 201) {
    return NextResponse.json({ error: "Failed to send via Zoho", details: zohoRes }, { status: 500 });
  }

  // Log in audit
  await supabase.from("mail_audit_log").insert({
    actor_id: employeeId || null,
    action:   "send",
    metadata: { to, subject },
  });

  // Delete draft if it was sent from one
  if (draftId) {
    await supabase.from("mail_drafts").delete().eq("id", draftId);
  }

  return NextResponse.json({ success: true, messageId: zohoRes?.data?.messageId });
}
