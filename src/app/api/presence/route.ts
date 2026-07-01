import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActor } from "@/lib/onboarding/server";

// POST /api/presence — heartbeat: marks the current user active + their location.
// Optional `status` field: when provided, stored in user_presence.status (used for
// rich 7-state presence: available / online / idle / break / interview / busy / offline).
// Heartbeats from DashboardShell do NOT send status, so existing status is preserved.
export async function POST(req: Request) {
  try {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ ok: false });
    const { path, status } = await req.json().catch(() => ({}));
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();

    // Only include status in the upsert payload when explicitly provided —
    // otherwise the heartbeat would overwrite check-in / break state on every ping.
    const payload: Record<string, unknown> = {
      user_id: actor.userId,
      last_seen: now,
      current_path: path || null,
      updated_at: now,
    };
    if (status !== undefined && status !== null) payload.status = status;

    await supabase
      .from("user_presence")
      .upsert(payload, { onConflict: "user_id" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
