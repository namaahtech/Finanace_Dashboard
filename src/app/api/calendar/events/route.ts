import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/calendar/events?userId=&department=&from=&to=&limit=
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const userId     = searchParams.get("userId");
    const department = searchParams.get("department");
    const from       = searchParams.get("from") || new Date().toISOString();
    const to         = searchParams.get("to")   || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const limit      = Number(searchParams.get("limit") || "50");

    if (!userId) return NextResponse.json({ events: [] });

    // Fetch employee role and department if not provided
    let empDept = department;
    let empRole = "";
    if (!empDept || !empRole) {
      const { data: emp } = await supabase
        .from("employees")
        .select("department, role")
        .eq("id", userId)
        .maybeSingle();
      empDept = empDept || emp?.department || null;
      empRole = emp?.role || "";
    }

    // Build query: personal events + dept events + statutory
    let query = supabase
      .from("calendar_events")
      .select("*")
      .gte("start_time", from)
      .lte("start_time", to)
      .order("start_time", { ascending: true })
      .limit(limit);

    // Show statutory to admin + dept_lead; personal + dept to others
    const isManager = ["admin", "dept_lead"].includes(empRole);
    if (!isManager) {
      const filters = [`calendar_type.eq.statutory`, `created_by.eq.${userId}`];
      if (empDept) filters.push(`and(calendar_type.eq.department,department.eq.${empDept})`);
      query = query.or(filters.join(","));
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ events: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/calendar/events
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body     = await req.json();
    const {
      title, description, start_time, end_time, all_day,
      location, calendar_type, department, created_by,
      color, attendees, reminder_mins, recurrence_rule,
    } = body;

    if (!title || !start_time || !end_time || !created_by) {
      return NextResponse.json({ error: "title, start_time, end_time, created_by are required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        title,
        description:   description || null,
        start_time,
        end_time,
        all_day:       all_day || false,
        location:      location || null,
        calendar_type: calendar_type || "personal",
        department:    department || null,
        created_by,
        color:         color || "#6366f1",
        attendees:     attendees || [],
        reminder_mins: reminder_mins ?? 15,
        recurrence_rule: recurrence_rule || null,
        is_recurring:  !!recurrence_rule,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ event: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
