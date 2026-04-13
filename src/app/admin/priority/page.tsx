"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import axios from "axios";
import {
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  X,
  AlertCircle,
} from "lucide-react";

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

const MOCK_PRIORITY: PriorityReq[] = [];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

function monthLabel(m: number, y: number) {
  return new Date(y, m - 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
}

export default function AdminPriorityPage() {
  const [requests, setRequests] = useState<PriorityReq[]>(MOCK_PRIORITY);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const url = `/api/priority${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`;
      const res = await axios.get(url);
      if (res.data.requests?.length) setRequests(res.data.requests);
    } catch {
      // use mock data
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function handleReview(requestId: string, decision: "approved" | "rejected", rejectReason?: string) {
    setProcessing(requestId);
    try {
      await axios.post("/api/priority", { action: "review", requestId, decision, rejectReason });
      await load();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
    } finally {
      setProcessing(null);
    }
  }

  async function confirmReject() {
    if (!rejectModal) return;
    const modal = rejectModal;
    setRejectModal(null);
    await handleReview(modal.id, "rejected", rejectReason);
  }

  const filtered = statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter);

  const pending  = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;
  const totalAmt = requests.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);

  return (
    <DashboardShell
      title="Priority Payout"
      subtitle="Review and action urgent incentive payout requests from employees."
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total",    value: requests.length, icon: Zap,          color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Pending",  value: pending,         icon: Clock,        color: "text-amber-600",   bg: "bg-amber-500/10" },
            { label: "Approved", value: approved,        icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Rejected", value: rejected,        icon: XCircle,      color: "text-red-500",     bg: "bg-red-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={15} className={color} />
              </div>
              <div>
                <p className="text-[11px] text-theme-muted">{label}</p>
                <p className={cn("text-xl font-black leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="page-card overflow-hidden p-0">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5 flex-wrap">
              {[
                { id: "all",      label: "All" },
                { id: "pending",  label: "Pending" },
                { id: "approved", label: "Approved" },
                { id: "rejected", label: "Rejected" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setStatusFilter(t.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    statusFilter === t.id
                      ? "bg-theme-surface text-theme-fg shadow-sm"
                      : "text-theme-muted hover:text-theme-fg"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-theme-muted flex-shrink-0">
              Pending pool: <span className="font-bold text-theme-fg">{formatCurrency(totalAmt)}</span>
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-3"><div className="h-3 animate-pulse rounded bg-theme-raised" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-theme-subtle">No requests found</td>
                  </tr>
                ) : filtered.map((req) => (
                  <tr key={req._id} className="group transition-colors hover:bg-theme-raised/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">
                          {getInitials(req.employee?.name ?? "?")}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-theme-fg">{req.employee?.name}</p>
                          <p className="text-[10px] text-theme-subtle">{req.employee?.department} Â· {req.employee?.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-emerald-600">{formatCurrency(req.amount)}</td>
                    <td className="px-5 py-3 text-xs text-theme-muted">
                      {req.incentive ? monthLabel(req.incentive.month, req.incentive.year) : "â€”"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-1.5">
                        <Zap size={12} className="mt-0.5 flex-shrink-0 text-amber-500" />
                        <p className="text-xs text-theme-muted max-w-[180px] leading-relaxed">{req.reason}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={statusBadgeVariant(req.status)}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </Badge>
                      {req.reviewed_by && (
                        <p className="mt-0.5 text-[10px] text-theme-subtle">by {req.reviewed_by.name}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-theme-muted">{formatDate(req.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      {req.status === "pending" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="success" loading={processing === req._id} onClick={() => handleReview(req._id, "approved")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" loading={processing === req._id} onClick={() => { setRejectReason(""); setRejectModal({ id: req._id, name: req.employee?.name ?? "Employee" }); }}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
            <span className="text-xs text-theme-subtle">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</span>
            <span className="text-xs text-theme-subtle">{pending} awaiting decision</span>
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-theme-surface border border-theme-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle size={16} />
                <h3 className="text-sm font-bold">Reject Priority Request</h3>
              </div>
              <button onClick={() => setRejectModal(null)} className="rounded-lg p-1 text-theme-muted hover:bg-theme-raised transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-theme-muted">
                Rejecting request from <span className="font-semibold text-theme-fg">{rejectModal.name}</span>. Please provide a reason.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reasonâ€¦"
                rows={3}
                className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all resize-none"
              />
            </div>
            <div className="flex gap-3 border-t border-theme-border px-6 py-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setRejectModal(null)}>Cancel</Button>
              <Button size="sm" variant="danger" className="flex-1" disabled={!rejectReason.trim()} onClick={confirmReject}>
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
