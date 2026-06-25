import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getActor, isAdmin, canEditSchema, loadSettings, resolveSchema } from "@/lib/onboarding/server";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/onboarding/[id] — packet + effective schema + signatory settings.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: packet, error } = await supabase
    .from("onboarding_packets")
    .select("*, creator:created_by(name,email), approver:approver_id(name,email)")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access: creator, assigned approver, or any admin.
  if (!isAdmin(actor) && packet.created_by !== actor.userId && packet.approver_id !== actor.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await loadSettings();
  const schema = resolveSchema(settings);

  return NextResponse.json({
    packet,
    schema,
    // camelCase to match TemplateData.signatory consumed by the document templates
    settings: {
      name: settings?.signatory_name ?? "Rahul Bharath",
      designation: settings?.signatory_designation ?? "Founder, Executive Chairman & Managing Director",
      companyName: settings?.company_name ?? "Namaah Private Limited",
    },
    isAdmin: isAdmin(actor),
    isOwner: packet.created_by === actor.userId,
    canEditSchema: await canEditSchema(actor),
    requireApproval: settings?.require_approval ?? true,
  });
}

// PATCH /api/onboarding/[id] — update candidate details / config of a draft.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: packet } = await supabase
    .from("onboarding_packets")
    .select("id, status, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = isAdmin(actor) || packet.created_by === actor.userId;
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Only editable while draft or after changes were requested (admin may also edit during review).
  const editableStates = ["draft", "changes_requested", "pending_approval"];
  if (!editableStates.includes(packet.status) && !isAdmin(actor)) {
    return NextResponse.json({ error: "This onboarding can no longer be edited." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, any> = {};
  for (const k of ["candidate_name", "candidate_email", "candidate_phone", "candidate_address", "config"]) {
    if (k in body) patch[k] = body[k];
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("onboarding_packets").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/onboarding/[id] — remove a draft (creator or admin).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: packet } = await supabase
    .from("onboarding_packets")
    .select("id, status, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isAdmin(actor) && packet.created_by !== actor.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["draft", "changes_requested"].includes(packet.status) && !isAdmin(actor)) {
    return NextResponse.json({ error: "Only drafts can be deleted." }, { status: 400 });
  }

  const { error } = await supabase.from("onboarding_packets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
