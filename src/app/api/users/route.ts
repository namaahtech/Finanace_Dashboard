import { NextRequest, NextResponse } from "next/server";

// DUMMY USERS DATA - Using _id to match frontend expectations
const MOCK_USERS = [
  {
    _id: "uuid-1",
    name: "Alex Rivera",
    email: "alex@namaah.co",
    role: "employee",
    employeeId: "EMP005",
    department: "Engineering",
    designation: "Senior Developer",
    joiningDate: "2023-01-15",
    isActive: true,
  },
  {
    _id: "uuid-2",
    name: "Sarah Jenkins",
    email: "sarah@namaah.co",
    role: "hr",
    employeeId: "EMP002",
    department: "HR",
    designation: "Generalist",
    joiningDate: "2022-11-01",
    isActive: true,
  },
  {
    _id: "uuid-3",
    name: "Michael Chen",
    email: "michael@namaah.co",
    role: "lead",
    employeeId: "EMP003",
    department: "Engineering",
    designation: "Tech Lead",
    joiningDate: "2022-05-10",
    isActive: true,
  },
  {
    _id: "uuid-4",
    name: "Priya Sharma",
    email: "priya@namaah.co",
    role: "employee",
    employeeId: "EMP009",
    department: "Marketing",
    designation: "SEO Specialist",
    joiningDate: "2023-06-20",
    isActive: true,
  }
];

// GET /api/users — HR/Admin: list all users
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ 
      users: MOCK_USERS, 
      total: MOCK_USERS.length, 
      page: 1, 
      limit: 20 
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/users — HR/Admin: create user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ 
      user: { ...body, _id: "new-dummy-uuid", isActive: true }, 
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}
