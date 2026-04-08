"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatCurrency, formatDate } from "@/lib/utils";
import axios from "axios";
import { Zap } from "lucide-react";

interface PriorityReq {
 _id: string;
 amount: number;
 reason: string;
 status: string;
 createdAt: string;
 employee?: { name: string; employeeId: string; department: string };
 incentive?: { amount: number; month: number; year: number };
 reviewed_by?: { name: string };
}

export default function AdminPriorityPage() {
 
 const [requests, setRequests] = useState<PriorityReq[]>([]);
 const [loading, setLoading] = useState(true);
 const [processing, setProcessing] = useState<string | null>(null);
 const [statusFilter, setStatusFilter] = useState("pending");

 async function load() {
 setLoading(true);
 try {
 const url = `/api/priority${statusFilter ? `?status=${statusFilter}` : ""}`;
 const res = await axios.get(url);
 setRequests(res.data.requests ?? []);
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => { load(); }, [statusFilter]);

 async function handleReview(requestId: string, decision: "approved" | "rejected") {
 let rejectReason: string | undefined;
 if (decision === "rejected") {
 const r = prompt("Rejection reason:");
 if (!r) return;
 rejectReason = r;
 }
 setProcessing(requestId);
 try {
 await axios.post(
 "/api/priority",
 { action: "review", requestId, decision, rejectReason }
 );
 await load();
 } catch (err: unknown) {
 alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
 } finally {
 setProcessing(null);
 }
 }

 return (
 <DashboardShell title="Priority Payout Requests">
 <div className="mb-4 flex gap-2">
 {["pending", "approved", "rejected", "paid", ""].map((s) => (
 <button
 key={s}
 onClick={() => setStatusFilter(s)}
 className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
 statusFilter === s ? "bg-sky-600 text-white" : "bg-theme-raised text-theme-muted hover:bg-theme-overlay dark:text-theme-subtle"
 }`}
 >
 {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
 </button>
 ))}
 </div>

 <Card>
 <CardHeader><CardTitle><span className="flex items-center gap-2"><Zap size={16} className="text-amber-500" /> Priority Requests</span></CardTitle></CardHeader>
 {loading ? (
 <div className="py-12 text-center text-sm text-theme-subtle">Loading...</div>
 ) : requests.length === 0 ? (
 <div className="py-12 text-center text-sm text-theme-subtle">No requests found.</div>
 ) : (
 <div className="space-y-3">
 {requests.map((req) => (
 <div key={req._id} className="rounded-xl border border-theme-border p-4 dark:border-theme-border">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <p className="font-bold text-theme-fg">{formatCurrency(req.amount)}</p>
 <Badge variant={statusBadgeVariant(req.status)}>{req.status}</Badge>
 </div>
 <p className="text-xs text-theme-muted mb-1">
 {req.employee?.name} ({req.employee?.employeeId}) · {req.employee?.department}
 </p>
 {req.incentive && (
 <p className="text-xs text-theme-muted mb-1">
 Incentive: {new Date(req.incentive.year, req.incentive.month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
 </p>
 )}
 <p className="text-xs text-theme-muted dark:text-theme-subtle mt-1"><span className="font-medium">Reason:</span> {req.reason}</p>
 <p className="text-xs text-theme-subtle mt-1">Submitted: {formatDate(req.createdAt)}</p>
 </div>

 {req.status === "pending" && (
 <div className="flex gap-2 shrink-0">
 <Button
 size="sm"
 variant="success"
 loading={processing === req._id}
 onClick={() => handleReview(req._id, "approved")}
 >
 Approve
 </Button>
 <Button
 size="sm"
 variant="danger"
 loading={processing === req._id}
 onClick={() => handleReview(req._id, "rejected")}
 >
 Reject
 </Button>
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>
 </DashboardShell>
 );
}
