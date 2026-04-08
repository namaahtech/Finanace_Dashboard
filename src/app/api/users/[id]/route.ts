import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/middleware/auth";

// GET /api/users/[id] — get specific user
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // await requireRole(req, "hr", "lead", "super_admin");
    const user = {
      id: params.id,
      name: "Alex Rivera",
      email: "alex@namaah.co",
      role: "employee",
      employeeId: "EMP005",
      department: "Engineering",
      designation: "Senior Developer",
      joiningDate: "2023-01-15",
      isActive: true,
    };
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}

// PATCH /api/users/[id] — update user
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // await requireRole(req, "hr", "super_admin");
    const body = await req.json();
    return NextResponse.json({ user: { ...body, id: params.id } });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}
