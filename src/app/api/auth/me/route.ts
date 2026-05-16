import { NextResponse } from "next/server";
import { authenticate } from "@/middleware/auth";

export async function GET() {
  try {
    const payload = await authenticate();
    
    // Return dummy user info based on session role/email
    return NextResponse.json({
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.email.split('@')[0].toUpperCase(),
        employee_id: "EMP-" + payload.userId.slice(0, 4).toUpperCase(),
        department: "Operations",
        designation: payload.role === "admin" ? "Founder" : "Specialist"
      }
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
