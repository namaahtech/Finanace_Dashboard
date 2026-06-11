import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const PreLoginSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = PreLoginSchema.parse(body);

    const supabase = getSupabaseAdmin();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Look up the employee profile in database by email (personal, professional or zoho)
    const { data: emp, error: dbErr } = await supabase
      .from("employees")
      .select("id, name, email, zoho_email, zoho_user_id, personal_email, status, is_active, role, employee_id, department, designation")
      .or(`email.ilike.${cleanEmail},personal_email.ilike.${cleanEmail},zoho_email.ilike.${cleanEmail}`)
      .maybeSingle();

    if (dbErr) {
      return NextResponse.json({ error: "Database lookup failed: " + dbErr.message }, { status: 500 });
    }

    if (!emp) {
      return NextResponse.json({ error: "You are not authorized in this company." }, { status: 403 });
    }

    if (emp.status === "disabled" || emp.is_active === false) {
      return NextResponse.json({ error: "Account has been deactivated. Please contact your administrator." }, { status: 403 });
    }

    // 2. Fetch onboarding status
    const { data: onboarding } = await supabase
      .from("user_onboarding")
      .select("status")
      .eq("user_id", emp.id)
      .maybeSingle();

    const onboardingCompleted = onboarding?.status === "completed";
    const isPersonalEmail = cleanEmail === emp.personal_email?.toLowerCase();

    // 3. If they enter their personal email and onboarding is completed, block them!
    if (isPersonalEmail && onboardingCompleted && emp.status !== "disabled") {
      return NextResponse.json({ error: "Please login with your company mail ID." }, { status: 403 });
    }

    // 3b. If they enter their professional email but onboarding is not completed, block them!
    const isProfessionalEmail = cleanEmail === emp.email?.toLowerCase() || (emp.zoho_email && cleanEmail === emp.zoho_email?.toLowerCase());
    const hasDistinctPersonalEmail = emp.personal_email && emp.personal_email.toLowerCase() !== emp.email?.toLowerCase();
    if (isProfessionalEmail && hasDistinctPersonalEmail && !onboardingCompleted) {
      return NextResponse.json({ error: "1st time login with personal mail and complete onboarding, after login with professional mail." }, { status: 403 });
    }

    // 4. Return success along with the email that is registered in Supabase Auth
    // Also return zoho info so client can trigger SAML SSO for Zoho lastSignIn update
    return NextResponse.json({
      success: true,
      emailToAuth: emp.email,
      empId: emp.id,
      empRole: emp.role,
      zoho_email: emp.zoho_email || null,
      zoho_user_id: emp.zoho_user_id || null,
      isProfessionalLogin: isProfessionalEmail,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }
    console.error("[PRE-LOGIN]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
