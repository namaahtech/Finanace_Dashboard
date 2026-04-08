/**
 * DUMMY INCENTIVE SERVICE
 * Returns static data for UI testing and approval.
 */

export async function awardIncentive(...args: any[]) {
  return { id: "dummy-incentive", status: "locked", amount: 50000 };
}

export async function processVesting(...args: any[]) {
  return 2; // dummy count
}

export async function calculateHoldProjection(baseAmount: number) {
  return {
    immediate: baseAmount,
    hold_1m: parseFloat((baseAmount * 1.05).toFixed(2)),
    hold_2m: parseFloat((baseAmount * 1.10).toFixed(2)),
  };
}

export async function holdForBonus(...args: any[]) {
  return { _id: "dummy-incentive", status: "held", amount: 55000 };
}

export async function getIncentiveSummary(employeeId: string) {
  const incentives = [
    {
      _id: "inc-1",
      employee_id: employeeId,
      month: 3,
      year: 2024,
      fixed_amount: 30000,
      variable_amount: 20000,
      amount: 50000,
      base_amount: 50000,
      status: "locked",
      vesting_start: "2024-03-01",
      vesting_end: "2024-04-01",
      employee_multiplier: 1.2,
      company_multiplier: 1.1,
      notes: "Project Alpha Success"
    },
    {
      _id: "inc-2",
      employee_id: employeeId,
      month: 2,
      year: 2024,
      fixed_amount: 30000,
      variable_amount: 15000,
      amount: 45000,
      base_amount: 45000,
      status: "claimable",
      vesting_start: "2024-02-01",
      vesting_end: "2024-03-01",
      employee_multiplier: 1.0,
      company_multiplier: 1.0,
    },
    {
      _id: "inc-3",
      employee_id: employeeId,
      month: 1,
      year: 2024,
      fixed_amount: 30000,
      variable_amount: 25000,
      amount: 60500, // held with bonus
      base_amount: 55000,
      status: "held",
      vesting_start: "2024-01-01",
      vesting_end: "2024-02-01",
      hold_months: 2,
      bonus_applied: 10,
    }
  ];

  return {
    incentives,
    summary: {
      total_earned: 155000,
      locked: 50000,
      claimable: 45000,
      held: 60500,
      claimed: 0,
    },
  };
}
