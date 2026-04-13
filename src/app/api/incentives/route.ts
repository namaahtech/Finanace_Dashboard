import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireRole } from "@/middleware/auth";
import { awardIncentive, getIncentiveSummary, processVesting } from "@/services/incentiveService";
import { z } from "zod";

const AwardSchema = z.object({
  employee: z.string(),
  amount: z.number().positive().optional(),
  fixed_amount: z.number().min(0).optional(),
  variable_amount: z.number().min(0).optional(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  const hasBreakdown = data.fixed_amount !== undefined || data.variable_amount !== undefined;
  if (!hasBreakdown && data.amount === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fixed_amount"],
      message: "Provide amount or fixed/variable split",
    });
  }
});

// GET /api/incentives — employee sees own, admin sees by employeeId
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticate();

    const { searchParams } = new URL(req.url);
    const employeeId =
      authUser.role === "employee" ? authUser.userId : searchParams.get("employeeId");

    if (!employeeId) return NextResponse.json({ error: "employeeId required" }, { status: 400 });

    const summary = await getIncentiveSummary(employeeId);
    return NextResponse.json(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/incentives — HR/Admin award incentive
export async function POST(req: NextRequest) {
  try {
    await requireRole(req, "hr", "super_admin");

    const body = await req.json();

    // Special action: process vesting
    if (body.action === "process_vesting") {
      const count = await processVesting();
      return NextResponse.json({ message: `${count} incentives vested` });
    }

    const data = AwardSchema.parse(body);
    const fixedAmount = data.fixed_amount ?? data.amount ?? 0;
    const variableAmount = data.variable_amount ?? 0;
    const incentive = await awardIncentive(
      data.employee,
      fixedAmount,
      variableAmount,
      data.month,
      data.year,
      data.notes
    );

    return NextResponse.json({ incentive }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
