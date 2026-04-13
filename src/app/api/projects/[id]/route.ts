import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const body = await req.json();

    const { name, description, budget, client_id, phase, due_date, team_ids, is_active } = body;

    // 1. Update Project
    const { error: pError } = await supabase
      .from("projects")
      .update({
        name,
        description,
        budget: budget !== undefined ? Number(budget) : undefined,
        client_id,
        phase,
        due_date,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (pError) throw pError;

    // 2. Update Teams (Full Refresh)
    if (team_ids) {
      // Clear existing
      await supabase.from("project_teams").delete().eq("project_id", id);
      
      // Insert new ones
      if (team_ids.length > 0) {
        const teamLinks = team_ids.map((tid: string) => ({
          project_id: id,
          team_id: tid
        }));
        await supabase.from("project_teams").insert(teamLinks);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
