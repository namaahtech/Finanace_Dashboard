import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    let query = supabase
      .from("projects")
      .select(`
        *,
        clients (id, name, lead_name),
        project_teams (team_id, teams (id, name))
      `, { count: 'exact' });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, count, error } = await query;

    if (error) throw error;

    // Format data to match frontend expectations
    const projects = (data || []).map((p: any) => ({
      ...p,
      clientId: p.client_id,
      dueDate: p.due_date,
      client: p.clients,
      teams: p.project_teams?.map((pt: any) => pt.teams) || [],
      teamIds: p.project_teams?.map((pt: any) => pt.team_id) || []
    }));

    return NextResponse.json({ projects, total: count || 0 }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { name, description, budget, client_id, phase, due_date, team_ids } = body;

    if (!name || !client_id) {
      return NextResponse.json({ error: "Name and Client are required" }, { status: 400 });
    }

    // 1. Insert Project
    const { data: project, error: pError } = await supabase
      .from("projects")
      .insert({
        name,
        description,
        budget: Number(budget) || 0,
        client_id,
        phase: phase || "SCOPING",
        due_date,
        is_active: true
      })
      .select()
      .single();

    if (pError) throw pError;

    // 2. Insert Teams
    if (team_ids && team_ids.length > 0) {
      const teamLinks = team_ids.map((tid: string) => ({
        project_id: project.id,
        team_id: tid
      }));
      const { error: tError } = await supabase.from("project_teams").insert(teamLinks);
      if (tError) throw tError;
    }

    return NextResponse.json({ success: true, project }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
