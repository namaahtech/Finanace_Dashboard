import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireRole } from "@/middleware/auth";
import { submitClaim, processClaim, advanceCycle } from "@/services/payoutService";

// GET /api/claims — HR/Admin view all claims
export async function GET(req: NextRequest) {
  try {
    // await requireRole(req, "hr", "accounts", "super_admin");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // Dummy claims list
    const claims = [
      {
        id: "claim-1",
        employee: { name: "Alex Rivera", employeeId: "EMP005" },
        amount: 50000,
        status: "approved",
        requested_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "claim-2",
        employee: { name: "Priya Sharma", employeeId: "EMP009" },
        amount: 25000,
        status: status || "pending",
        requested_at: new Date(Date.now() - 86400000).toISOString(),
      }
    ];

    return NextResponse.json({ claims });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}

// POST /api/claims — employee submits a claim
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticate();
    const body = await req.json();

    if (body.action === "advance_cycle") {
      // await requireRole(req, "accounts", "super_admin");
      await advanceCycle();
      return NextResponse.json({ message: "Cycle advanced" });
    }

    const { incentiveId } = body;
    const result = await submitClaim(authUser.userId, incentiveId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}

// PATCH /api/claims — admin processes claim
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await authenticate();
    // await requireRole(req, "accounts", "super_admin");
    const body = await req.json();
    const { claimId } = body;

    await processClaim(claimId, authUser.userId);
    return NextResponse.json({ message: "Claim processed" });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}
