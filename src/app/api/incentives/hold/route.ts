import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/middleware/auth";
import { holdForBonus } from "@/services/incentiveService";

export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticate();
    const body = await req.json();
    const { incentiveId, holdMonths } = body;

    const result = await holdForBonus(incentiveId, authUser.userId, holdMonths);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
