import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireRole } from "@/middleware/auth";

// GET /api/priority — list priority requests
export async function GET(req: NextRequest) {
  try {
    // await requireRole(req, "accounts", "super_admin");
    const requests = [
      {
        id: "pri-1",
        employee: { name: "Sarah Jenkins", employeeId: "EMP002" },
        amount: 75000,
        reason: "Medical Emergency",
        status: "pending",
        created_at: new Date().toISOString()
      }
    ];
    return NextResponse.json({ requests });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}

// POST /api/priority — submit a priority request
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticate();
    const body = await req.json();
    return NextResponse.json({ ...body, status: "pending", id: "new-pri-uuid" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}
