"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatCurrency, formatDate } from "@/lib/utils";
import axios from "axios";

interface Reimbursement {
 _id: string;
 title: string;
 category: string;
 amount: number;
 description: string;
 status: string;
 reject_reason?: string;
 createdAt: string;
 employee?: { name: string; employeeId: string; department: string };
}

export default function AdminReimbursementsPage() {
 
 const [items, setItems] = useState<Reimbursement[]>([]);
 const [statusFilter, setStatusFilter] = useState("pending");
 const [loading, setLoading] = useState(true);
 const [processing, setProcessing] = useState<string | null>(null);

 async function load() {
 setLoading(true);
 try {
 const url = `/api/reimbursements${statusFilter ? `?status=${statusFilter}` : ""}`;
 const res = await axios.get(url);
 setItems(res.data.reimbursements ?? []);
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => { load(); }, [statusFilter]);

 async function handleAction(id: string, action: "approve" | "reject" | "pay", reason?: string) {
 setProcessing(id);
 try {
 await axios.post(
 "/api/reimbursements",
 { action, reimbursementId: id, reason }
 );
 await load();
 } catch (err: unknown) {
 alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
 } finally {
 setProcessing(null);
 }
 }

 return (
 <DashboardShell title="Reimbursements">
 <div className="mb-4 flex gap-2">
 {["pending", "approved", "rejected", "paid", ""].map((s) => (
 <button
 key={s}
 onClick={() => setStatusFilter(s)}
 className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
 statusFilter === s
 ? "bg-sky-600 text-white"
 : "bg-theme-raised text-theme-muted hover:bg-theme-overlay dark:text-theme-subtle"
 }`}
 >
 {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
 </button>
 ))}
 </div>

 <Card>
 <CardHeader><CardTitle>Reimbursement Requests</CardTitle></CardHeader>
 {loading ? (
 <div className="py-12 text-center text-sm text-theme-subtle">Loading...</div>
 ) : items.length === 0 ? (
 <div className="py-12 text-center text-sm text-theme-subtle">No requests found.</div>
 ) : (
 <div className="space-y-3">
 {items.map((item) => (
 <div key={item._id} className="rounded-xl border border-theme-border p-4 dark:border-theme-border">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <p className="font-medium text-theme-fg">{item.title}</p>
 <Badge variant={statusBadgeVariant(item.status)}>
 {item.status}
 </Badge>
 </div>
 <p className="text-xs text-theme-muted mb-1">
 {item.employee?.name} ({item.employee?.employeeId}) · {item.employee?.department}
 </p>
 <p className="text-xs text-theme-muted">
 Category: {item.category} · Amount: <strong>{formatCurrency(item.amount)}</strong> · Submitted: {formatDate(item.createdAt)}
 </p>
 <p className="mt-1 text-xs text-theme-subtle">{item.description}</p>
 {item.reject_reason && <p className="mt-1 text-xs text-red-500">Rejected: {item.reject_reason}</p>}
 </div>

 {/* Actions */}
 <div className="flex flex-col gap-2 shrink-0">
 {item.status === "pending" && (
 <>
 <Button
 size="sm"
 variant="success"
 loading={processing === item._id}
 onClick={() => handleAction(item._id, "approve")}
 >
 Approve
 </Button>
 <Button
 size="sm"
 variant="danger"
 loading={processing === item._id}
 onClick={() => {
 const reason = prompt("Rejection reason:");
 if (reason) handleAction(item._id, "reject", reason);
 }}
 >
 Reject
 </Button>
 </>
 )}
 {item.status === "approved" && (
 <Button
 size="sm"
 loading={processing === item._id}
 onClick={() => handleAction(item._id, "pay")}
 >
 Mark Paid
 </Button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>
 </DashboardShell>
 );
}
