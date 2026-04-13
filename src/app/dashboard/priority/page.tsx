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
import { Zap } from "lucide-react";

interface Incentive { _id: string; amount: number; base_amount: number; month: number; year: number; status: string; }
interface PriorityReq { _id: string; amount: number; reason: string; status: string; createdAt: string; }

export default function PriorityPage() {
 
 const { request } = useApi();
 const [claimable, setClaimable] = useState<Incentive[]>([]);
 const [requests, setRequests] = useState<PriorityReq[]>([]);
 const [showForm, setShowForm] = useState(false);
 const [form, setForm] = useState({ incentiveId: "", reason: "" });
 const [submitting, setSubmitting] = useState(false);
 const [loading, setLoading] = useState(true);

 async function load() {
 try {
 const [incRes, reqRes] = await Promise.all([
 request<{ incentives: Incentive[] }>({ url: "/api/incentives" }),
 request<{ requests: PriorityReq[] }>({ url: "/api/priority" }),
 ]);
 setClaimable((incRes.incentives ?? []).filter((i) => i.status === "claimable" || i.status === "held"));
 setRequests(reqRes.requests ?? []);
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => { load(); }, []);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setSubmitting(true);
 try {
 await axios.post("/api/priority", form);
 setShowForm(false);
 setForm({ incentiveId: "", reason: "" });
 await load();
 } catch (err: unknown) {
 alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
 } finally {
 setSubmitting(false);
 }
 }

 return (
 <DashboardShell title="Priority Payout Request">
 <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-900/20">
 <div className="flex items-start gap-3">
 <Zap size={18} className="mt-0.5 text-amber-600 shrink-0" />
 <div>
 <p className="font-medium text-amber-800 dark:text-amber-400">Priority Payout</p>
 <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">
 Request an urgent payout that bypasses the normal queue. Admin must approve before processing.
 </p>
 </div>
 </div>
 </div>

 <div className="mb-4 flex justify-end">
 <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "secondary" : "primary"}>
 {showForm ? "Cancel" : "+ New Priority Request"}
 </Button>
 </div>

 {showForm && (
 <Card className="mb-6">
 <CardHeader><CardTitle>Submit Priority Request</CardTitle></CardHeader>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="mb-1 block text-xs font-medium text-theme-fg dark:text-theme-subtle">
 Select Incentive
 </label>
 <select
 className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm"
 value={form.incentiveId}
 onChange={(e) => setForm({ ...form, incentiveId: e.target.value })}
 required
 >
 <option value="">-- Select --</option>
 {claimable.map((i) => (
 <option key={i._id} value={i._id}>
 {new Date(i.year, i.month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })} — {formatCurrency(i.amount)}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-theme-fg dark:text-theme-subtle">
 Reason (min 10 characters)
 </label>
 <textarea
 rows={3}
 minLength={10}
 required
 value={form.reason}
 onChange={(e) => setForm({ ...form, reason: e.target.value })}
 placeholder="Briefly explain why this payout is urgent..."
 className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm"
 />
 </div>
 <Button type="submit" loading={submitting}>Submit Request</Button>
 </form>
 </Card>
 )}

 <Card>
 <CardHeader><CardTitle>My Priority Requests</CardTitle></CardHeader>
 {loading ? (
 <div className="py-12 text-center text-sm text-theme-subtle">Loading...</div>
 ) : requests.length === 0 ? (
 <div className="py-12 text-center text-sm text-theme-subtle">No priority requests yet.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-theme-border dark:border-theme-border text-left text-xs text-theme-muted">
 <th className="pb-3 pr-4">Amount</th>
 <th className="pb-3 pr-4">Reason</th>
 <th className="pb-3 pr-4">Status</th>
 <th className="pb-3">Submitted</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
 {requests.map((r) => (
 <tr key={r._id}>
 <td className="py-3 pr-4 font-semibold">{formatCurrency(r.amount)}</td>
 <td className="py-3 pr-4 text-theme-muted max-w-xs truncate">{r.reason}</td>
 <td className="py-3 pr-4">
 <Badge variant={statusBadgeVariant(r.status)}>
 {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
 </Badge>
 </td>
 <td className="py-3 text-theme-muted">{formatDate(r.createdAt)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </Card>
 </DashboardShell>
 );
}
