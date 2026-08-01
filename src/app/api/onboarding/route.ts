import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActor, isAdmin } from "@/lib/onboarding/server";

// GET /api/onboarding — list packets. Admin sees all; others see their own + ones they approve.
export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const BASE_COLS =
    "id, application_id, candidate_name, candidate_email, candidate_phone, status, created_by, approver_id, created_at, updated_at, submitted_at, approved_at, sent_at, viewed_at, signed_at, config, creator:created_by(name,email), approver:approver_id(name,email)";
  // `converted_to_fulltime_at` (migration 120) and `employment_type` (121) may not
  // exist yet. Selecting a column that doesn't exist makes PostgREST fail the whole
  // query, which would blank the onboarding list — so we ask for them, then fall
  // back progressively if they aren't there.
  const run = (cols: string) => {
    let q = supabase.from("onboarding_packets").select(cols).order("created_at", { ascending: false });
    if (!isAdmin(actor)) q = q.eq("created_by", actor.userId);
    return q;
  };
  const missing = (e: { message?: string } | null, col: string) => !!e && new RegExp(col).test(e.message || "");

  let { data, error } = await run(`${BASE_COLS}, converted_to_fulltime_at, employment_type`);
  if (missing(error, "employment_type")) {
    console.warn("[onboarding] employment_type missing — apply migration 121 to enable direct full-time hiring.");
    ({ data, error } = await run(`${BASE_COLS}, converted_to_fulltime_at`));
  }
  if (missing(error, "converted_to_fulltime_at")) {
    console.warn("[onboarding] converted_to_fulltime_at missing — apply migration 120 to enable full-time conversion.");
    ({ data, error } = await run(BASE_COLS));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ packets: data ?? [], isAdmin: isAdmin(actor) });
}
