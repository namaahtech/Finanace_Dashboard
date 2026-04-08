import { NextRequest, NextResponse } from "next/server";

// GET /api/config — get system configuration
export async function GET() {
  try {
    // Return dummy system configuration aligned with AdminOverview expectations
    const config = {
      company_revenue: 145000000,
      revenue_achievement_percentage: 84,
      collections_percentage: 87,
      delivery_health_percentage: 92,
      profit_percentage: 85,
      expense_percentage: 15,
      company_stage: "Early Growth",
      vesting_days: 30,
      bonus_percentage_1m: 5,
      bonus_percentage_2m: 10,
      claim_limit: 25,
      payout_pool_amount: 1250000,
      payout_capacity: "HIGH",
      current_claim_cycle: 4,
      updated_at: new Date().toISOString()
    };
    
    // Wrap in 'config' key as expected by AdminDashboard
    return NextResponse.json({ config });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}

// POST /api/config — update system configuration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ config: { ...body, updated_at: new Date().toISOString() } });
  } catch (err) {
    return NextResponse.json({ error: "Dummy error" }, { status: 500 });
  }
}
