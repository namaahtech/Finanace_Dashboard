import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// DUMMY USERS FOR TESTING
const DUMMY_USERS = [
  {
    id: "uuid-admin-1",
    name: "System Administrator",
    email: "admin@namaah.co",
    role: "super_admin",
    employee_id: "EMP001",
    department: "Executive",
    designation: "CTO",
  },
  {
    id: "uuid-hr-1",
    name: "Sarah Jenkins",
    email: "hr@namaah.co",
    role: "hr",
    employee_id: "EMP002",
    department: "Human Resources",
    designation: "HR Manager",
  },
  {
    id: "uuid-emp-1",
    name: "Alex Rivera",
    email: "alex@namaah.co",
    role: "employee",
    employee_id: "EMP005",
    department: "Engineering",
    designation: "Senior Developer",
  },
  {
    id: "uuid-accounts-1",
    name: "Michael Chen",
    email: "finance@namaah.co",
    role: "accounts",
    employee_id: "EMP003",
    department: "Finance",
    designation: "Head of Accounts",
  }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = LoginSchema.parse(body);

    // Dummy authentication logic: any password works for dummy emails
    const user = DUMMY_USERS.find(u => u.email === email);

    if (!user) {
      // Fallback: allow any email with "demo" as password
      if (password === "demo") {
        const demoUser = {
          id: "uuid-demo",
          name: "Demo User",
          email: email,
          role: "employee",
          employee_id: "EMP-DEMO",
          department: "General",
          designation: "Tester",
        };
        const session = await getSession();
        session.userId = demoUser.id;
        session.email = demoUser.email;
        session.role = demoUser.role as any;
        await session.save();
        return NextResponse.json({ user: demoUser });
      }
      return NextResponse.json({ error: "Invalid dummy credentials. Use admin@namaah.co or any email with password 'demo'" }, { status: 401 });
    }

    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.role = user.role as any;
    await session.save();

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        department: user.department,
        designation: user.designation,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[DUMMY LOGIN]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
