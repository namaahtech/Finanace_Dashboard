import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Anon client for signInWithPassword — service role key rejects user auth calls
const getAnonClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = LoginSchema.parse(body);

    const supabase = getSupabaseAdmin();

    // ── 1. Try Supabase Auth (primary path) ───────────────────────────────────
    const anonClient = getAnonClient();
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authData?.user && !authError) {
      // Auth succeeded — fetch employee profile
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name, email, zoho_email, role, employee_id, department, designation, status")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (emp) {
        if (emp.status === "disabled") {
          return NextResponse.json({ error: "Account has been disabled. Please contact your administrator." }, { status: 403 });
        }

        const session = await getSession();
        session.userId = emp.id;
        session.email  = emp.email;
        session.role   = emp.role as any;
        await session.save();

        await supabase.from("audit_logs").insert({
          user_id:     emp.id,
          action:      "login_success",
          target_type: "login",
          metadata:    { email, method: "supabase_auth" },
        });

        return NextResponse.json({
          user: {
            id:          emp.id,
            name:        emp.name,
            email:       emp.email,
            zoho_email:  emp.zoho_email,
            role:        emp.role,
            employeeId:  emp.employee_id,
            department:  emp.department,
            designation: emp.designation,
          },
        });
      }
    }

    // ── 2. Try zoho_email login (user enters firstname.lastname@namaah.in) ────
    // Look up the employee by zoho_email, then sign in with their personal_email
    if (authError) {
      const { data: empByZoho } = await supabase
        .from("employees")
        .select("id, name, email, zoho_email, personal_email, role, employee_id, department, designation, status")
        .eq("zoho_email", email)
        .maybeSingle();

      if (empByZoho?.personal_email || empByZoho?.email) {
        const loginEmail = empByZoho.personal_email || empByZoho.email;
        const { data: retryAuth, error: retryError } = await anonClient.auth.signInWithPassword({
          email:    loginEmail,
          password,
        });

        if (retryAuth?.user && !retryError) {
          if (empByZoho.status === "disabled") {
            return NextResponse.json({ error: "Account has been disabled." }, { status: 403 });
          }

          const session = await getSession();
          session.userId = empByZoho.id;
          session.email  = empByZoho.email;
          session.role   = empByZoho.role as any;
          await session.save();

          await supabase.from("audit_logs").insert({
            user_id:     empByZoho.id,
            action:      "login_success",
            target_type: "login",
            metadata:    { email, method: "zoho_email_alias" },
          });

          return NextResponse.json({
            user: {
              id:          empByZoho.id,
              name:        empByZoho.name,
              email:       empByZoho.email,
              zoho_email:  empByZoho.zoho_email,
              role:        empByZoho.role,
              employeeId:  empByZoho.employee_id,
              department:  empByZoho.department,
              designation: empByZoho.designation,
            },
          });
        }
      }
    }

    // ── 3. Dev fallback — demo credentials (remove in production) ────────────
    if (process.env.NODE_ENV === "development" && password === "demo") {
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name, email, zoho_email, role, employee_id, department, designation, status")
        .or(`email.eq.${email},zoho_email.eq.${email}`)
        .maybeSingle();

      if (emp) {
        const session = await getSession();
        session.userId = emp.id;
        session.email  = emp.email;
        session.role   = emp.role as any;
        await session.save();
        return NextResponse.json({
          user: {
            id: emp.id, name: emp.name, email: emp.email,
            zoho_email: emp.zoho_email, role: emp.role,
            employeeId: emp.employee_id, department: emp.department,
            designation: emp.designation,
          },
        });
      }

      // Absolute fallback demo user
      const demoUser = { id: "uuid-demo", name: "Demo User", email, role: "employee", employeeId: "EMP-DEMO", department: "General", designation: "Tester" };
      const session = await getSession();
      session.userId = demoUser.id;
      session.email  = demoUser.email;
      session.role   = demoUser.role as any;
      await session.save();
      return NextResponse.json({ user: demoUser });
    }

    // ── Log failed attempt ────────────────────────────────────────────────────
    try {
      await supabase.from("audit_logs").insert({
        action:      "login_failed",
        target_type: "login",
        metadata:    { email },
      });
    } catch (_) {}

    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[LOGIN]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
