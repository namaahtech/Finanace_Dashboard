"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import axios from "axios";
import {
  FileText,
  Clock,
  CheckCircle2,
  IndianRupee,
  X,
  AlertCircle,
  Tag,
  Banknote,
} from "lucide-react";

interface Reimbursement {
  _id: string;
  title: string;
  category: string;
  amount: number;
  description?: string;
  status: string;
  reject_reason?: string;
  createdAt: string;
  employee?: { name: string; employeeId: string; department: string };
}

const MOCK_REIMBURSEMENTS: Reimbursement[] = [
  { _id: "1", title: "Client Dinner",     category: "Meals",    amount: 3200,  status: "pending",  createdAt: "2026-04-01", employee: { name: "Priya Sharma",  employeeId: "NM001", department: "Product" } },
  { _id: "2", title: "Travel to Mumbai",  category: "Travel",   amount: 8700,  status: "pending",  createdAt: "2026-04-02", employee: { name: "Amit Verma",    employeeId: "NM002", department: "Sales" } },
  { _id: "3", title: "Team Offsite",      category: "Events",   amount: 15000, status: "approved", createdAt: "2026-03-20", employee: { name: "Divya Menon",   employeeId: "NM003", department: "Executive" } },
  { _id: "4", title: "Office Supplies",   category: "Supplies", amount: 1850,  status: "paid",     createdAt: "2026-03-15", employee: { name: "Rohan Gupta",   employeeId: "NM006", department: "HR" } },
  { _id: "5", title: "Conference Pass",   category: "Training", amount: 12000, status: "pending",  createdAt: "2026-04-05", employee: { name: "Ananya Pillai", employeeId: "NM007", department: "Engineering" } },
  { _id: "6", title: "Cab Reimbursement", category: "Travel",   amount: 2400,  status: "rejected", reject_reason: "Missing receipts", createdAt: "2026-04-03", employee: { name: "Dev Mehta", employeeId: "NM008", department: "Sales" } },
];

const CATEGORY_COLORS: Record<string, string> = {
  Meals:    "bg-orange-500/10 text-orange-600",
  Travel:   "bg-sky-500/10 text-sky-600",
  Events:   "bg-purple-500/10 text-purple-600",
  Supplies: "bg-theme-raised text-theme-muted",
  Training: "bg-emerald-500/10 text-emerald-600",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

export default function AdminReimbursementsPage() {
  const [items, setItems] = useState<Reimbursement[]>(MOCK_REIMBURSEMENTS);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const url = `/api/reimbursements${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`;
      const res = await axios.get(url);
      if (res.data.reimbursements?.length) setItems(res.data.reimbursements);
    } catch {
      // use mock data
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function handleAction(id: string, action: "approve" | "reject" | "pay", reason?: string) {
    setProcessing(id);
    try {
      await axios.post("/api/reimbursements", { action, reimbursementId: id, reason });
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
    await handleAction(modal.id, "reject", rejectReason);
  }

  const filtered = statusFilter === "all" ? items : items.filter((i) => i.status === statusFilter);

  const pending  = items.filter((i) => i.status === "pending").length;
  const approved = items.filter((i) => i.status === "approved").length;
  const paid     = items.filter((i) => i.status === "paid").length;
  const totalAmt = items.reduce((s, i) => s + i.amount, 0);

  return (
    <DashboardShell
      title="Reimbursements"
      subtitle="Review and process employee expense reimbursement requests."
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total",    value: items.length, icon: FileText,     color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Pending",  value: pending,      icon: Clock,        color: "text-amber-600",   bg: "bg-amber-500/10" },
            { label: "Approved", value: approved,     icon: CheckCircle2, color: "text-sky-600",     bg: "bg-sky-500/10" },
            { label: "Paid",     value: paid,         icon: IndianRupee,  color: "text-emerald-600", bg: "bg-emerald-500/10" },
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
                { id: "paid",     label: "Paid" },
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
              Total requested: <span className="font-bold text-theme-fg">{formatCurrency(totalAmt)}</span>
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
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
                    <td colSpan={7} className="py-12 text-center text-sm text-theme-subtle">No reimbursements found</td>
                  </tr>
                ) : filtered.map((r) => (
                  <tr key={r._id} className="group transition-colors hover:bg-theme-raised/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">
                          {getInitials(r.employee?.name ?? "?")}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-theme-fg">{r.employee?.name}</p>
                          <p className="text-[10px] text-theme-subtle">{r.employee?.department} · {r.employee?.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs font-semibold text-theme-fg">{r.title}</p>
                      {r.description && <p className="text-[10px] text-theme-subtle truncate max-w-[140px]">{r.description}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold", CATEGORY_COLORS[r.category] ?? "bg-theme-raised text-theme-muted")}>
                        <Tag size={10} />
                        {r.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-emerald-600">{formatCurrency(r.amount)}</td>
                    <td className="px-5 py-3">
                      <div>
                        <Badge variant={statusBadgeVariant(r.status)}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </Badge>
                        {r.reject_reason && (
                          <p className="mt-0.5 text-[10px] text-red-500 max-w-[120px] truncate">{r.reject_reason}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-theme-muted">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" variant="success" loading={processing === r._id} onClick={() => handleAction(r._id, "approve")}>
                              Approve
                            </Button>
                            <Button size="sm" variant="danger" loading={processing === r._id} onClick={() => { setRejectReason(""); setRejectModal({ id: r._id, name: r.employee?.name ?? "Employee" }); }}>
                              Reject
                            </Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button size="sm" variant="primary" loading={processing === r._id} onClick={() => handleAction(r._id, "pay")}>
                            <Banknote size={12} className="mr-1" /> Mark Paid
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
            <span className="text-xs text-theme-subtle">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</span>
            <span className="text-xs text-theme-subtle">{pending} awaiting review</span>
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-theme-surface border border-theme-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle size={16} />
                <h3 className="text-sm font-bold">Reject Reimbursement</h3>
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
                placeholder="Enter rejection reason…"
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
