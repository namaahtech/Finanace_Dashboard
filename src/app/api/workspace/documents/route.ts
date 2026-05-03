import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status") || "active";
    const pinned = searchParams.get("pinned");
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ documents: [] });
    }

    // 1. Fetch documents owned by the user
    // 2. Fetch documents shared with the user
    // We'll use an OR query or a subquery. Since Supabase client filtering is easier:
    
    const { data: sharedIds, error: shareError } = await supabase
      .from("workspace_shares")
      .select("item_id")
      .eq("user_id", userId)
      .eq("item_type", "document");

    const sharedItemIds = (sharedIds || []).map(s => s.item_id);

    let query = supabase
      .from("workspace_documents")
      .select("id, title, icon, is_pinned, status, tags, last_edited_at, created_at, owner_id, owner:employees!workspace_documents_owner_id_fkey(id,name,employee_id)")
      .eq("status", status)
      .or(`owner_id.eq.${userId}${sharedItemIds.length > 0 ? `,id.in.(${sharedItemIds.join(',')})` : ''}`)
      .order("last_edited_at", { ascending: false });

    if (search) query = query.ilike("title", `%${search}%`);
    if (pinned === "true") query = query.eq("is_pinned", true);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ documents: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { title, content, owner_id, folder_id, project_id, icon, cover_color, tags } = body;

    const { data, error } = await supabase
      .from("workspace_documents")
      .insert({
        title: title || "Untitled Document",
        content: content || "",
        owner_id,
        folder_id: folder_id || null,
        project_id: project_id || null,
        icon: icon || "📄",
        cover_color: cover_color || null,
        tags: tags || [],
        last_edited_by: owner_id,
        last_edited_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabase.from("workspace_activity").insert({
      item_type: "document",
      item_id: data.id,
      item_title: data.title,
      employee_id: owner_id,
      action: "created",
    });

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
