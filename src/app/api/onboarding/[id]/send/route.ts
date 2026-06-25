import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActor, isAdmin } from "@/lib/onboarding/server";
import { dispatchOnboarding } from "@/lib/onboarding/dispatch";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/onboarding/[id]/send — (re)dispatch the onboarding email. Admin only.
// Used to retry delivery after an approval that failed to send.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data: packet } = await supabase
    .from("onboarding_packets")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["approved", "sent", "viewed"].includes(packet.status)) {
    return NextResponse.json({ error: "Approve the onboarding before sending." }, { status: 400 });
  }

  try {
    const result = await dispatchOnboarding(id);
    return NextResponse.json({ ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to send" }, { status: 502 });
  }
}
