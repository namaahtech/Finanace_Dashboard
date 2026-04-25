import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/kpi — fetch KPI metrics (real-time)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const allEmployees = searchParams.get("allEmployees") === "true";

    // Use explicit relationship names to disambiguate foreign keys
    let query = supabase
      .from("kpi_metrics")
      .select(`
        id,
        employee_id,
        month,
        year,
        kpi_score,
        kpi_entries,
        kra_score,
        kra_metrics,
        behavioral_score,
        behavioral_metrics,
        final_score,
        rating_label,
        remarks,
        entered_at,
        updated_at,
        employee:employees!kpi_metrics_employee_id_fkey(id, name, employee_id, department, designation),
        entered_by:employees!kpi_metrics_entered_by_fkey(id, name)
      `);

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    if (month && year) {
      query = query
        .eq("month", parseInt(month))
        .eq("year", parseInt(year));
    }

    if (!allEmployees) {
      query = query.order("updated_at", { ascending: false }).limit(1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (err: any) {
    console.error("KPI fetch error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch KPI" },
      { status: 500 }
    );
  }
}

// POST /api/kpi — create/update KPI score (HR/Lead/Admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      employee_id,
      month,
      year,
      kpi_score,
      kpi_entries,
      kra_score,
      kra_metrics,
      behavioral_score,
      behavioral_metrics,
      final_score,
      rating_label,
      remarks
    } = body;

    if (!employee_id || month === undefined || !year) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: employee_id, month, year" },
        { status: 400 }
      );
    }

    // Insert or update KPI with explicit relationship select
    const { data, error } = await supabase
      .from("kpi_metrics")
      .upsert(
        {
          id: id || undefined,
          employee_id,
          month,
          year,
          kpi_score: kpi_score || 0,
          kpi_entries: kpi_entries || [],
          kra_score: kra_score || 0,
          kra_metrics: kra_metrics || {},
          behavioral_score: behavioral_score || 0,
          behavioral_metrics: behavioral_metrics || {},
          final_score: final_score || 0,
          rating_label: rating_label || "Meets",
          remarks,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      )
      .select(`
        id,
        employee_id,
        month,
        year,
        kpi_score,
        kpi_entries,
        kra_score,
        kra_metrics,
        behavioral_score,
        behavioral_metrics,
        final_score,
        rating_label,
        remarks,
        entered_at,
        updated_at,
        employee:employees!kpi_metrics_employee_id_fkey(id, name, employee_id, department)
      `);

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: data?.[0] },
      { status: id ? 200 : 201 }
    );
  } catch (err: any) {
    console.error("KPI save error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save KPI" },
      { status: 500 }
    );
  }
}

// GET /api/kpi/summary — fetch performance summaries
export async function GET_SUMMARY(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    let query = supabase
      .from("kpi_summary")
      .select("*, employee:employees(id, name, employeeId, department)");

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("KPI summary error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// DELETE /api/kpi — delete KPI record (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kpiId = searchParams.get("id");

    if (!kpiId) {
      return NextResponse.json(
        { success: false, error: "Missing KPI ID" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("kpi_metrics")
      .delete()
      .eq("id", kpiId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "KPI deleted" });
  } catch (err: any) {
    console.error("KPI delete error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
