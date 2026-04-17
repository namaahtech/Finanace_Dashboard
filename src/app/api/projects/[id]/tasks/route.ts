import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;

    const { data, error } = await supabase
      .from("project_tasks")
      .select(`
        *,
        assigned_to_employee:employees!assigned_to (id, name, employee_id)
      `)
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ tasks: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const body = await req.json();

    const { title, description, status, priority, assigned_to, due_date } = body;

    const { data, error } = await supabase
      .from("project_tasks")
      .insert([{
        project_id: id,
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'Medium',
        assigned_to: assigned_to || null,
        due_date: due_date || null
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
