import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireModule } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getMailContext, getMailActor, sendRecruitmentMail, offerRevokedHtml, getCompanyName } from "@/lib/recruitment-mail";

type Ctx = { params: Promise<{ id: string }> };

// Statuses where an offer has actually been mailed to the candidate. Revoke is
// only meaningful for these — anything earlier is just a draft to delete.
const MAILED = new Set(["sent", "viewed", "signed", "completed"]);
const WINDOW_MS = 48 * 60 * 60 * 1000;

// POST /api/onboarding/[id]/revoke  { reason?: string }
// Revoke a mailed offer for a candidate who did not join. Archives the packet
// (status='revoked'), emails a professional withdrawal notice, and logs it.
// Allowed within 48h of the offer-mail date (sent_at); admin may override.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireModule("candidate_revoke", "can_delete");
  if (!gate.ok) return gate.response;
  const actor = gate.actor;
  const isAdmin = actor.role === "admin";

  const reason: string | null = await req.json().then((b) => b?.reason ?? null).catch(() => null);
  const supabase = getSupabaseAdmin();

  const { data: packet } = await supabase
    .from("onboarding_packets")
    .select("id, status, candidate_name, candidate_email, sent_at, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!packet) return NextResponse.json({ error: "Onboarding record not found." }, { status: 404 });

  if (packet.status === "revoked") {
    return NextResponse.json({ error: "This offer has already been revoked." }, { status: 400 });
  }
  if (!MAILED.has(packet.status)) {
    return NextResponse.json(
      { error: "This offer hasn't been mailed yet — delete the draft instead of revoking." },
      { status: 400 },
    );
  }

  // 48-hour window from the offer-mail date. Admin can override a lapsed window.
  const sentAt = packet.sent_at ? new Date(packet.sent_at).getTime() : null;
  const withinWindow = sentAt !== null && Date.now() - sentAt <= WINDOW_MS;
  if (!withinWindow && !isAdmin) {
    return NextResponse.json(
      { error: "The 48-hour revoke window has passed. Ask an admin to revoke this record." },
      { status: 403, headers: { "x-revoke-window": "expired" } },
    );
  }

  const { error: updErr } = await supabase
    .from("onboarding_packets")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: actor.userId,
      revoke_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Send the professional withdrawal notice from the record owner's mailbox.
  let mailSent = false;
  let mailError: string | null = null;
  try {
    if (packet.candidate_email) {
      const mailActor = await getMailActor(packet.created_by);
      const ctx = await getMailContext(mailActor);
      const companyName = ctx.companyName || (await getCompanyName());
      await sendRecruitmentMail(ctx, {
        to: packet.candidate_email,
        subject: `Update on your offer — ${companyName}`,
        html: offerRevokedHtml(packet.candidate_name || "Candidate", companyName, reason),
      });
      mailSent = true;
    }
  } catch (e: any) {
    mailError = e?.message || "Mail could not be sent.";
  }

  await logAudit({
    actorId: actor.userId,
    action: "onboarding.revoke",
    section: "Onboarding",
    summary: `Revoked ${packet.candidate_name || "a candidate"}'s offer (did not join)${!withinWindow ? " — admin override, window lapsed" : ""}`,
    targetType: "onboarding_packet",
    targetId: id,
  });

  return NextResponse.json({ ok: true, mailSent, mailError });
}
