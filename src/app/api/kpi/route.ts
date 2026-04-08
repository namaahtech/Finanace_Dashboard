import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireRole } from "@/middleware/auth";

// GET /api/kpi — employee sees own KPI, admin sees list
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticate();
    const { searchParams } = new URL(req.url);
    const employeeId = authUser.role === "employee" ? authUser.userId : searchParams.get("employeeId");

    // Dummy KPI scores
    const scores = [
      {
        id: "kpi-1",
        employeeId: employeeId || "dummy-emp",
        month: 3,
        year: 2024,
        kra_score: 85,
        kpi_score: 90,
        behavioral_score: 88,
        final_score: 87.5,
        created_at: new Date().toISOString()
      }
    ];

    return NextResponse.json(scores);
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}

// POST /api/kpi — add KPI score (HR/Lead)
export async function POST(req: NextRequest) {
  try {
    // await requireRole(req, "hr", "lead", "super_admin");
    const body = await req.json();
    return NextResponse.json({ ...body, id: "new-kpi-id", final_score: 85 }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}
