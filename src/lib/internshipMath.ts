/**
 * Internship stipend calculation rules:
 *   - Month is treated as a flat 30 days (NOT calendar days).
 *   - 6 paid holidays/month (4 weekly + 2 paid). Holidays are PAID — they
 *     don't reduce the gross.
 *   - Mid-month start: paid_days = 30 − (billing_date.day − 1)
 *   - Buffer (starting_date − joining_date) is informational only.
 *   - gross = (stipend / 30) × paid_days
 *   - net   = gross − deductions
 */

export interface InternForCalc {
  stipend_amount: number;
  starting_date: string; // YYYY-MM-DD
  billing_date: string;  // YYYY-MM-DD
}

export interface CalcInput {
  intern: InternForCalc;
  month: number; // 1-12
  year: number;
  // Overrides (used when admin manually adjusts a cycle)
  paid_days_override?: number;
  buffer_paid_days?: number; // Default 0 — buffer days credited as paid
  deductions?: number;
}

export interface CalcResult {
  paid_days: number;
  buffer_paid_days: number;
  gross_amount: number;
  net_amount: number;
  applies: boolean; // false if intern's billing date is after the selected month
}

/**
 * Compute default paid_days for a given month, accounting for mid-month start.
 * Returns 0 if the intern's billing_date is in a future month from the selected
 * month (intern hadn't started billing yet).
 */
export function defaultPaidDays(billing_date: string, month: number, year: number): number {
  const bd = new Date(billing_date + "T00:00:00Z");
  const bMonth = bd.getUTCMonth() + 1;
  const bYear  = bd.getUTCFullYear();

  // Billing date is AFTER the selected month → no stipend due yet
  if (bYear > year || (bYear === year && bMonth > month)) return 0;

  // Billing date is BEFORE the selected month → full 30 days
  if (bYear < year || (bYear === year && bMonth < month)) return 30;

  // Same month → prorate from billing day
  // paid_days = 30 − days_before = 30 − (billing_date.day − 1)
  const daysBefore = bd.getUTCDate() - 1;
  return Math.max(0, 30 - daysBefore);
}

export function computeCycle(input: CalcInput): CalcResult {
  const { intern, month, year, paid_days_override, buffer_paid_days, deductions = 0 } = input;
  const default_pd  = defaultPaidDays(intern.billing_date, month, year);
  const default_bpd = defaultBufferPaidDays(intern.starting_date, intern.billing_date, month, year);
  const paid_days   = paid_days_override !== undefined ? paid_days_override : default_pd;
  const buffer_pd   = buffer_paid_days !== undefined ? buffer_paid_days : default_bpd;
  const effective_days = paid_days + buffer_pd;
  const gross_amount = Math.round((Number(intern.stipend_amount) / 30) * effective_days);
  const net_amount   = Math.max(0, gross_amount - Number(deductions));
  return {
    paid_days,
    buffer_paid_days: buffer_pd,
    gross_amount,
    net_amount,
    applies: default_pd > 0 || default_bpd > 0,
  };
}

/**
 * Returns true if the (month, year) cycle should exist for this intern —
 * either because they have regular paid days due, OR pre-billing buffer days.
 */
export function cycleApplies(
  starting_date: string,
  billing_date: string,
  month: number,
  year: number,
): boolean {
  return defaultPaidDays(billing_date, month, year) > 0
    || defaultBufferPaidDays(starting_date, billing_date, month, year) > 0;
}

/** buffer_days for display = starting_date − joining_date (in days) */
export function bufferDays(joining_date: string, starting_date: string): number {
  const j = new Date(joining_date + "T00:00:00Z").getTime();
  const s = new Date(starting_date + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((s - j) / (1000 * 60 * 60 * 24)));
}

/**
 * Pre-billing buffer = days worked BEFORE the billing date.
 *   = billing_date − starting_date (in days)
 *
 * These days are paid at the same rate as regular days, and all land in the
 * "buffer month" = the month containing starting_date.
 */
export function preBillingBufferDays(starting_date: string, billing_date: string): number {
  const s = new Date(starting_date + "T00:00:00Z").getTime();
  const b = new Date(billing_date + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((b - s) / (1000 * 60 * 60 * 24)));
}

/** YYYY-MM from a date string */
function ymOf(dateStr: string): { y: number; m: number } {
  const d = new Date(dateStr + "T00:00:00Z");
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

/**
 * Returns true if (month, year) is the "buffer month" for this intern —
 * the month containing starting_date, BEFORE the billing_date month.
 */
export function isBufferMonth(
  starting_date: string,
  billing_date: string,
  month: number,
  year: number,
): boolean {
  const sd = ymOf(starting_date);
  const bd = ymOf(billing_date);
  // Buffer month requires the start to be strictly before billing
  if (sd.y > bd.y || (sd.y === bd.y && sd.m >= bd.m)) return false;
  return year === sd.y && month === sd.m;
}

/**
 * Default buffer_paid_days for a cycle in the given month:
 *   - if it's the buffer month → return total pre-billing buffer days
 *   - else → 0
 */
export function defaultBufferPaidDays(
  starting_date: string,
  billing_date: string,
  month: number,
  year: number,
): number {
  if (!isBufferMonth(starting_date, billing_date, month, year)) return 0;
  return preBillingBufferDays(starting_date, billing_date);
}
