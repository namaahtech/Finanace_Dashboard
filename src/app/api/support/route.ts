import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET — Fetch tickets (filtered by role context)
export async function GET(req: NextRequest) {
  const userId    = req.nextUrl.searchParams.get("userId");
  const userRole  = req.nextUrl.searchParams.get("userRole");
  const view      = req.nextUrl.searchParams.get("view") ?? "all"; // "raised" | "assigned" | "all"
  const status    = req.nextUrl.searchParams.get("status");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("support_tickets")
      .select(`
        *,
        creator:employees!support_tickets_creator_id_fkey(id, name, email, role, department, designation, employee_id),
        assignee:employees!support_tickets_assignee_id_fkey(id, name, email, role, department, designation, employee_id),
        resolver:employees!support_tickets_resolved_by_fkey(id, name, email, role),
        linked_ticket:support_tickets!linked_ticket_id(
          id, subject, status, priority, created_at,
          creator:employees!support_tickets_creator_id_fkey(id, name, email, role, department)
        )
      `)
      .order("created_at", { ascending: false });

    // Filter by view context
    if (view === "raised") {
      query = query.eq("creator_id", userId);
    } else if (view === "assigned") {
      query = query.eq("assignee_id", userId);
    } else if (userRole !== "admin") {
      // Non-admin: show only tickets related to them
      query = query.or(`creator_id.eq.${userId},assignee_id.eq.${userId}`);
    }

    // Filter by status
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ tickets: data ?? [] });
  } catch (err: any) {
    console.error("[GET /api/support]", err);
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}

// POST — Create a new ticket
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creator_id, target_role, assignee_id, subject, description, category, priority, linked_ticket_id } = body;

    if (!creator_id || !target_role || !assignee_id || !subject) {
      return NextResponse.json({ error: "creator_id, target_role, assignee_id, subject are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        creator_id,
        target_role,
        assignee_id,
        subject,
        description: description ?? "",
        category: category ?? "General",
        priority: priority ?? "medium",
        status: "open",
        linked_ticket_id: linked_ticket_id || null,
      })
      .select(`
        *,
        creator:employees!support_tickets_creator_id_fkey(id, name, email, role, department, designation, employee_id),
        assignee:employees!support_tickets_assignee_id_fkey(id, name, email, role, department, designation, employee_id),
        linked_ticket:support_tickets!linked_ticket_id(
          id, subject, status, priority, created_at,
          creator:employees!support_tickets_creator_id_fkey(id, name, email, role, department)
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ ticket: data });
  } catch (err: any) {
    console.error("[POST /api/support]", err);
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}

// PATCH — Update ticket status / resolve
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket_id, status, resolution_notes, resolved_by } = body;

    if (!ticket_id || !status) {
      return NextResponse.json({ error: "ticket_id and status are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const updateData: any = { status };

    if (status === "resolved" || status === "closed") {
      updateData.resolution_notes = resolution_notes ?? null;
      updateData.resolved_by = resolved_by ?? null;
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .update(updateData)
      .eq("id", ticket_id)
      .select(`
        *,
        creator:employees!support_tickets_creator_id_fkey(id, name, email, role, department),
        assignee:employees!support_tickets_assignee_id_fkey(id, name, email, role, department),
        linked_ticket:support_tickets!linked_ticket_id(
          id, subject, status, priority, created_at,
          creator:employees!support_tickets_creator_id_fkey(id, name, email, role, department)
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ ticket: data });
  } catch (err: any) {
    console.error("[PATCH /api/support]", err);
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
