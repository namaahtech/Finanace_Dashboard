import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActor, isAdmin } from "@/lib/onboarding/server";
import { dispatchOnboarding } from "@/lib/onboarding/dispatch";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/onboarding/[id]/approve — admin approves, then generates PDFs and
// emails the candidate (from the form creator's Zoho mailbox) with a magic link.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin approval only" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data: packet } = await supabase
    .from("onboarding_packets")
    .select("id, status, candidate_email")
    .eq("id", id)
    .maybeSingle();
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["pending_approval", "approved"].includes(packet.status)) {
    return NextResponse.json({ error: "Only pending submissions can be approved." }, { status: 400 });
  }
  if (!packet.candidate_email) {
    return NextResponse.json({ error: "Candidate email is missing." }, { status: 400 });
  }

  // Mark approved first (so the record reflects the decision even if dispatch is retried).
  await supabase
    .from("onboarding_packets")
    .update({ status: "approved", approver_id: actor.userId, approved_at: new Date().toISOString(), rejection_note: null })
    .eq("id", id);

  try {
    const result = await dispatchOnboarding(id);
    return NextResponse.json({ status: "sent", ...result });
  } catch (e: any) {
    // Approved but delivery failed — admin can retry via the send endpoint.
    return NextResponse.json(
      { error: `Approved, but sending failed: ${e.message}. You can retry sending.`, status: "approved" },
      { status: 502 }
    );
  }
}
