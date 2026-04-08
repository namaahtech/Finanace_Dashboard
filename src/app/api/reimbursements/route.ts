import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireRole } from "@/middleware/auth";

// GET /api/reimbursements
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticate();
    const { searchParams } = new URL(req.url);
    const employeeId = authUser.role === "employee" ? authUser.userId : searchParams.get("employeeId");

    const reimbursements = [
      {
        id: "rem-1",
        employee: { name: "Alex Rivera", employeeId: "EMP005" },
        amount: 4500.00,
        description: "AWS Training Certification",
        category: "Learning",
        status: "approved",
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: "rem-2",
        employee: { name: "Alex Rivera", employeeId: "EMP005" },
        amount: 1200.00,
        description: "Office Ergonomic Mouse",
        category: "Equipment",
        status: "pending",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      }
    ];

    return NextResponse.json({ reimbursements });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}

// POST /api/reimbursements
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticate();
    const body = await req.json();
    return NextResponse.json({ ...body, status: "pending", id: "new-rem-uuid" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}
