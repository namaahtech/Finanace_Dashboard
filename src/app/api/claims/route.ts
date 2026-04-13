import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/middleware/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/claims — HR/Admin view all claims
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = supabase.from("claims").select(`
      id, amount, status, cycle, queue_position, requested_at,
      employee:employees(name, employee_id, department),
      incentive:incentives(amount, month, year)
    `);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: claims, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ claims });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/claims — employee submits a claim
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticate();
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    if (body.action === "advance_cycle") {
      // Logic for advancing cycle over claims
      await supabase.from("claims").update({ status: "approved" }).eq("status", "pending");
      return NextResponse.json({ message: "Cycle advanced" });
    }

    if (body.action === "process") {
       await supabase.from("claims").update({ status: "approved" }).eq("id", body.claimId);
       return NextResponse.json({ message: "Claim processed successfully" });
    }

    // Submit a claim
    const { incentiveId } = body;
    const { data: incentive } = await supabase.from("incentives").select("amount, employee").eq("id", incentiveId).single();
    if (!incentive) throw new Error("Incentive not found");

    const { data } = await supabase.from("claims").insert({
       employee_id: incentive.employee,
       incentive_id: incentiveId,
       amount: incentive.amount,
       status: "pending"
    }).select().single();

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/claims — admin processes claim
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await authenticate();
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { claimId } = body;

    await supabase.from("claims").update({ status: "processed" }).eq("id", claimId);
    return NextResponse.json({ message: "Claim processed" });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}
