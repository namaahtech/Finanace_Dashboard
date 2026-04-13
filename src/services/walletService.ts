/**
 * DUMMY WALLET SERVICE
 * Returns static data for UI testing and approval.
 */

export async function getOrCreateWallet(employeeId: string) {
  return {
    id: "dummy-wallet-id",
    employee_id: employeeId,
    earned_total: 1250000.50,
    locked_amount: 450000.00,
    claimable_amount: 325000.00,
    held_amount: 250000.00,
    claimed_amount: 225000.50,
    updated_at: new Date().toISOString()
  };
}

export async function creditLockedIncentive(employeeId: string, amount: number) {
  return getOrCreateWallet(employeeId);
}

export async function vestIncentive(employeeId: string, amount: number) {
  return getOrCreateWallet(employeeId);
}

export async function holdIncentive(employeeId: string, amount: number) {
  return getOrCreateWallet(employeeId);
}

export async function processPayout(employeeId: string) {
  return getOrCreateWallet(employeeId);
}

export async function getWalletSummary(employeeId: string) {
  const wallet = await getOrCreateWallet(employeeId);
  const transactions = [
    {
      id: "tx-1",
      type: "incentive_earned",
      amount: 50000,
      balance_after: 325000,
      description: "Q1 Performance Bonus credited to locked vault",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "tx-2",
      type: "incentive_vested",
      amount: 25000,
      balance_after: 350000,
      description: "Monthly vesting cycle complete",
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: "tx-3",
      type: "incentive_claimed",
      amount: 100000,
      balance_after: 250000,
      description: "Payout processed — Transferred to payroll",
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    }
  ];

  return { wallet, transactions };
}
