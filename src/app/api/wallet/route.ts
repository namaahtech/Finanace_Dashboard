import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/middleware/auth";
import { getWalletSummary } from "@/services/walletService";

// GET /api/wallet — employee sees own wallet
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticate();

    const { searchParams } = new URL(req.url);
    const employeeId =
      authUser.role === "employee" ? authUser.userId : (searchParams.get("employeeId") ?? authUser.userId);

    const data = await getWalletSummary(employeeId);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
