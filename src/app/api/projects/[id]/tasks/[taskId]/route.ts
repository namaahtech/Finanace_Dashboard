import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const supabase = getSupabaseAdmin();
    const { taskId } = await params;
    const body = await req.json();

    const { title, description, status, priority, assigned_to, due_date } = body;

    const { data, error } = await supabase
      .from("project_tasks")
      .update({
        title,
        description,
        status,
        priority,
        assigned_to,
        due_date,
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const supabase = getSupabaseAdmin();
    const { taskId } = await params;

    const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
