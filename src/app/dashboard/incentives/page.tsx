"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { formatCurrency, formatDate } from "@/lib/utils";
import axios from "axios";
import { Info, TrendingUp } from "lucide-react";

interface Incentive {
 _id: string;
 amount: number;
 base_amount: number;
 fixed_amount?: number;
 variable_amount?: number;
 status: string;
 month: number;
 year: number;
 vesting_end: string;
 hold_months: number;
 bonus_applied: number;
 claimed_at?: string;
}

interface Summary {
 total_earned: number;
 locked: number;
 claimable: number;
 held: number;
 claimed: number;
}

export default function IncentivesPage() {
 const { user } = useAuth();
 const { request } = useApi();
 const [incentives, setIncentives] = useState<Incentive[]>([]);
 const [summary, setSummary] = useState<Summary | null>(null);
 const [projection, setProjection] = useState<{ immediate: number; hold_1m: number; hold_2m: number } | null>(null);
 const [selectedIncentive, setSelectedIncentive] = useState<Incentive | null>(null);
 const [loading, setLoading] = useState(true);
 const [actionLoading, setActionLoading] = useState(false);

 async function load() {
 try {
 const data = await request<{ incentives: Incentive[]; summary: Summary }>({ url: "/api/incentives" });
 setIncentives(data.incentives ?? []);
 setSummary(data.summary ?? null);
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => { load(); }, []);

 async function fetchProjection(amount: number) {
 const res = await request<{ projection: typeof projection }>({
 url: `/api/incentives/hold?amount=${amount}`,
 });
 setProjection(res.projection);
 }

 async function handleClaim(incentiveId: string) {
 setActionLoading(true);
 try {
 await axios.post("/api/claims", { incentiveId });
 await load();
 alert("Claim submitted successfully!");
 } catch (e: unknown) {
 alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error submitting claim");
 } finally {
 setActionLoading(false);
 }
 }

 async function handleHold(incentiveId: string, months: 1 | 2) {
 setActionLoading(true);
 try {
 await axios.post(
 "/api/incentives/hold",
 { incentiveId, holdMonths: months }
 );
 await load();
 setSelectedIncentive(null);
 setProjection(null);
 } catch (e: unknown) {
 alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
 } finally {
 setActionLoading(false);
 }
 }

 const monthName = (m: number, y: number) =>
 new Date(y, m - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });

 return (
 <DashboardShell title="My Incentives">
 {/* Summary cards */}
 {summary && (
 <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
 {[
 { label: "Total Earned", value: summary.total_earned, color: "text-theme-fg dark:text-theme-subtle" },
 { label: "Locked", value: summary.locked, color: "text-amber-600" },
 { label: "Claimable", value: summary.claimable, color: "text-emerald-600" },
 { label: "Held", value: summary.held, color: "text-purple-600" },
 { label: "Claimed", value: summary.claimed, color: "text-sky-600" },
 ].map(({ label, value, color }) => (
 <Card key={label} className="text-center">
 <p className="mb-1 text-xs text-theme-muted">{label}</p>
 <p className={`text-lg font-bold ${color}`}>{formatCurrency(value)}</p>
 </Card>
 ))}
 </div>
 )}

 {/* Incentive list */}
 <Card>
 <CardHeader>
 <CardTitle>Incentive History</CardTitle>
 </CardHeader>
 {loading ? (
 <div className="py-12 text-center text-sm text-theme-subtle">Loading...</div>
 ) : incentives.length === 0 ? (
 <div className="py-12 text-center text-sm text-theme-subtle">No incentives yet</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-theme-border dark:border-theme-border text-left text-xs text-theme-muted dark:text-theme-subtle">
 <th className="pb-3 pr-4">Period</th>
 <th className="pb-3 pr-4">Base Amount</th>
 <th className="pb-3 pr-4">Final Amount</th>
 <th className="pb-3 pr-4">Status</th>
 <th className="pb-3 pr-4">Vests On</th>
 <th className="pb-3">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
 {incentives.map((inc) => (
 <tr key={inc._id}>
 <td className="py-3 pr-4 font-medium">{monthName(inc.month, inc.year)}</td>
 <td className="py-3 pr-4">{formatCurrency(inc.base_amount)}</td>
 <td className="py-3 pr-4">
 <div className="font-semibold">{formatCurrency(inc.amount)}</div>
 <div className="text-xs text-theme-muted">
 Fixed: {formatCurrency(inc.fixed_amount ?? inc.base_amount)} · Variable: {formatCurrency(inc.variable_amount ?? 0)}
 </div>
 {inc.bonus_applied > 0 && (
 <span className="ml-1 text-xs text-emerald-600">+{inc.bonus_applied}%</span>
 )}
 </td>
 <td className="py-3 pr-4">
 <Badge variant={statusBadgeVariant(inc.status)}>
 {inc.status.charAt(0).toUpperCase() + inc.status.slice(1)}
 </Badge>
 </td>
 <td className="py-3 pr-4 text-theme-muted">
 {inc.status === "locked" ? formatDate(inc.vesting_end) : "—"}
 </td>
 <td className="py-3">
 {inc.status === "claimable" && (
 <div className="flex gap-2">
 <Button
 size="sm"
 variant="success"
 loading={actionLoading}
 onClick={() => handleClaim(inc._id)}
 >
 Claim Now
 </Button>
 <Button
 size="sm"
 variant="secondary"
 onClick={() => {
 setSelectedIncentive(inc);
 fetchProjection(inc.amount);
 }}
 >
 Hold for Bonus
 </Button>
 </div>
 )}
 {inc.status === "held" && (
 <span className="text-xs text-purple-600">Earning bonus ({inc.hold_months}m hold)</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </Card>

 {/* Hold bonus modal */}
 {selectedIncentive && projection && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="w-full max-w-md rounded-2xl bg-theme-surface p-6 shadow-2xl
 <div className="mb-4 flex items-center gap-2">
 <TrendingUp className="text-sky-500" size={20} />
 <h3 className="font-bold text-theme-fg">Hold Bonus Calculator</h3>
 </div>

 <div className="mb-4 rounded-xl bg-sky-50 p-4 dark:bg-sky-900/20">
 <div className="flex items-start gap-2 text-xs text-sky-700 dark:text-sky-400">
 <Info size={14} className="mt-0.5 shrink-0" />
 <p>Holding your incentive longer earns you more. All calculations are transparent and deterministic.</p>
 </div>
 </div>

 <div className="space-y-3 mb-6">
 {[
 { label: "Claim Now (0% bonus)", value: projection.immediate, highlight: false },
 { label: "Hold 1 Month (+bonus)", value: projection.hold_1m, highlight: false },
 { label: "Hold 2 Months (+max bonus)", value: projection.hold_2m, highlight: true },
 ].map(({ label, value, highlight }) => (
 <div
 key={label}
 className={`flex items-center justify-between rounded-lg px-4 py-3 ${
 highlight ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-theme-page
 }`}
 >
 <span className="text-sm text-theme-fg dark:text-theme-subtle">{label}</span>
 <span className={`font-bold ${highlight ? "text-emerald-600" : "text-theme-fg dark:text-theme-subtle"}`}>
 {formatCurrency(value)}
 </span>
 </div>
 ))}
 </div>

 <p className="mb-4 text-xs text-theme-subtle">If you wait 2 months, your incentive becomes{" "}
 <span className="font-bold text-emerald-600">{formatCurrency(projection.hold_2m)}</span>
 </p>

 <div className="flex gap-3">
 <Button size="sm" variant="secondary" className="flex-1" onClick={() => { setSelectedIncentive(null); setProjection(null); }}>
 Cancel
 </Button>
 <Button size="sm" className="flex-1" loading={actionLoading} onClick={() => handleHold(selectedIncentive._id, 1)}>
 Hold 1 Month
 </Button>
 <Button size="sm" variant="success" className="flex-1" loading={actionLoading} onClick={() => handleHold(selectedIncentive._id, 2)}>
 Hold 2 Months
 </Button>
 </div>
 </div>
 </div>
 )}
 </DashboardShell>
 );
}
