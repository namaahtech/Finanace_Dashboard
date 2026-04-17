import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const search    = searchParams.get("search")     || "";
  const scopeType = searchParams.get("scope_type") || "";
  const year      = searchParams.get("year")       || "";
  const status    = searchParams.get("status")     || "";

  try {
    let query = supabase
      .from("budgets")
      .select(`
        *,
        teams ( name ),
        budget_allocations (
          id, category, label, allocated, sort_order, linked_sub_id,
          subscriptions ( name, sub_number, category )
        )
      `)
      .order("created_at", { ascending: false });

    if (search)    query = query.ilike("name", `%${search}%`);
    if (scopeType) query = query.eq("scope_type", scopeType);
    if (status)    query = query.eq("status", status);
    if (year)      query = query.eq("fiscal_year", parseInt(year));

    const { data: budgets, error } = await query;
    if (error) throw error;

    // Compute actual_spent per budget from purchases + subscription costs
    const allBudgetIds = (budgets || []).map(b => b.id);
    if (allBudgetIds.length === 0) return NextResponse.json({ budgets: [] });

    // Fetch purchase spends grouped by department + year + month
    const { data: purchaseSpend } = await supabase
      .from("purchases")
      .select("amount, filed_by_dept, date")
      .neq("status", "cancelled");

    // Fetch subscription costs by department
    const { data: subAssignments } = await supabase
      .from("subscription_assignments")
      .select("seats_allocated, department_name, team_id, subscriptions ( cost_per_seat, status, billing_cycle )");

    const enriched = (budgets || []).map(budget => {
      // Purchase spend for this budget scope
      let purchaseTotal = 0;
      for (const p of purchaseSpend || []) {
        if (!p.date) continue;
        const pYear  = new Date(p.date).getFullYear();
        const pMonth = new Date(p.date).getMonth() + 1;
        const yearMatch  = pYear === budget.fiscal_year;
        const monthMatch = !budget.fiscal_month || pMonth === budget.fiscal_month;
        if (!yearMatch || !monthMatch) continue;

        if (budget.scope_type === "department" && p.filed_by_dept === budget.department_name) {
          purchaseTotal += Number(p.amount);
        } else if (budget.scope_type === "company") {
          purchaseTotal += Number(p.amount);
        }
      }

      // Subscription costs for this budget scope
      let subTotal = 0;
      for (const sa of subAssignments || []) {
        const sub = (sa as unknown as { subscriptions?: { cost_per_seat: number; status: string; billing_cycle: string } }).subscriptions;
        if (!sub || !["active", "expiring"].includes(sub.status)) continue;
        const monthlyCost = sub.billing_cycle === "Annual"    ? sub.cost_per_seat / 12
                          : sub.billing_cycle === "Quarterly" ? sub.cost_per_seat / 3
                          : sub.billing_cycle === "One-time"  ? 0
                          : sub.cost_per_seat;

        const saAny = sa as unknown as { department_name?: string; team_id?: string };
        if (budget.scope_type === "department" && saAny.department_name === budget.department_name) {
          subTotal += monthlyCost * (sa.seats_allocated || 1) * (budget.fiscal_month ? 1 : 12);
        } else if (budget.scope_type === "team" && saAny.team_id === budget.team_id) {
          subTotal += monthlyCost * (sa.seats_allocated || 1) * (budget.fiscal_month ? 1 : 12);
        } else if (budget.scope_type === "company") {
          subTotal += monthlyCost * (sa.seats_allocated || 1) * (budget.fiscal_month ? 1 : 12);
        }
      }

      return {
        ...budget,
        actual_spent:  Math.round((purchaseTotal + subTotal) * 100) / 100,
        purchase_spent: Math.round(purchaseTotal * 100) / 100,
        sub_spent:      Math.round(subTotal * 100) / 100,
      };
    });

    return NextResponse.json({ budgets: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  try {
    const body = await req.json();
    const {
      name, scope_type, department_name, team_id, fiscal_year, fiscal_month,
      total_amount, category, notes, status, created_by_name, created_by_emp_id,
      allocations,
    } = body;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const { data: budget, error } = await supabase
      .from("budgets")
      .insert({
        budget_number:     "",
        name,
        scope_type:        scope_type       || "department",
        department_name:   department_name  || null,
        team_id:           team_id          || null,
        fiscal_year:       fiscal_year      || new Date().getFullYear(),
        fiscal_month:      fiscal_month     || null,
        total_amount:      total_amount     ?? 0,
        category:          category         || "General",
        notes:             notes            || null,
        status:            status           || "active",
        created_by_name:   created_by_name  || null,
        created_by_emp_id: created_by_emp_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert line-item allocations if provided
    if (allocations?.length && budget) {
      const rows = allocations.map((a: { category: string; label?: string; allocated: number; linked_sub_id?: string }, i: number) => ({
        budget_id:     budget.id,
        category:      a.category,
        label:         a.label         || null,
        allocated:     a.allocated     ?? 0,
        linked_sub_id: a.linked_sub_id || null,
        sort_order:    i,
      }));
      await supabase.from("budget_allocations").insert(rows);
    }

    return NextResponse.json({ budget }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
