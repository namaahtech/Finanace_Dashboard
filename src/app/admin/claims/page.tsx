"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge, statusBadgeVariant } from "@/components/ui/BadgeLegacy";
import { Button } from "@/components/ui/ButtonLegacy";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import axios from "axios";
import { useToast } from "@/components/ui/ToastLegacy";
import { usePermission } from "@/hooks/usePermission";
import {
  FileText,
  Clock,
  CheckCircle2,
  IndianRupee,
  RefreshCw,
  X,
  AlertCircle,
  ListOrdered,
} from "lucide-react";

interface Claim {
  _id: string;
  amount: number;
  status: string;
  cycle: number;
  queue_position?: number;
  requested_at: string;
  employee?: { name: string; employeeId: string; department: string };
  incentive?: { amount: number; month: number; year: number };
}

// Mock data for preview
const MOCK_CLAIMS: Claim[] = [];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

function monthLabel(m: number, y: number) {
  return new Date(y, m - 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
}

export default function AdminClaimsPage() {
  const { showToast } = useToast();
  const { canEdit, canCreate } = usePermission("claims");
  const [claims, setClaims] = useState<Claim[]>(MOCK_CLAIMS);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleConfirm, setCycleConfirm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const url = `/api/claims${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`;
      const res = await axios.get(url);
      if (res.data.claims?.length) setClaims(res.data.claims);
    } catch {
      // use mock data
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function processClaim(claimId: string) {
    setProcessing(claimId);
    try {
      await axios.post("/api/claims", { action: "process", claimId });
      showToast("Payout protocol executed. Funds dispatched to nodal queue.", "success");
      await load();
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Payout Sync Error", "error");
    } finally {
      setProcessing(null);
    }
  }

  async function advanceCycle() {
    setCycleConfirm(false);
    try {
      await axios.post("/api/claims", { action: "advance_cycle" });
      showToast("Global claim cycle advanced. Queues re-serialized.", "success");
      await load();
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Cycle Shift Error", "error");
    }
  }

  const filtered = statusFilter === "all"
    ? claims
    : claims.filter((c) => c.status === statusFilter);

  const pending  = claims.filter((c) => c.status === "pending").length;
  const approved = claims.filter((c) => c.status === "approved").length;
  const paid     = claims.filter((c) => c.status === "paid").length;
  const queued   = claims.filter((c) => c.status === "queued").length;
  const totalAmt = claims.reduce((s, c) => s + c.amount, 0);

  return (
    <DashboardShell
      moduleKey="claims"
      title="Claims"
      subtitle="Review and process employee incentive claim requests."
      actions={
        canEdit ? (
          <Button variant="secondary" size="sm" onClick={() => setCycleConfirm(true)}>
            <RefreshCw size={13} className="mr-1.5" /> Advance Cycle
          </Button>
        ) : null
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: "Total",    value: claims.length, icon: FileText,     color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Pending",  value: pending,       icon: Clock,        color: "text-amber-600",   bg: "bg-amber-500/10" },
            { label: "Approved", value: approved,      icon: CheckCircle2, color: "text-sky-600",     bg: "bg-sky-500/10" },
            { label: "Queued",   value: queued,        icon: ListOrdered,  color: "text-purple-600",  bg: "bg-purple-500/10" },
            { label: "Paid",     value: paid,          icon: IndianRupee,  color: "text-emerald-600", bg: "bg-emerald-500/10" },
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

        {/* Table */}
        <div className="page-card overflow-hidden p-0">
          {/* Header: tabs + total amount */}
          <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5 flex-wrap">
              {[
                { id: "all",      label: "All" },
                { id: "pending",  label: "Pending" },
                { id: "approved", label: "Approved" },
                { id: "queued",   label: "Queued" },
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
              Total pool: <span className="font-bold text-theme-fg">{formatCurrency(totalAmt)}</span>
            </span>
          </div>

          {/* Table body */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 font-semibold">Cycle</th>
                  <th className="px-5 py-3 font-semibold text-center">Queue</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Requested</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-5 py-3"><div className="h-3 animate-pulse rounded bg-theme-raised" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-theme-subtle">No claims found</td>
                  </tr>
                ) : filtered.map((c) => (
                  <tr key={c._id} className="group transition-colors hover:bg-theme-raised/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">
                          {getInitials(c.employee?.name ?? "?")}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-theme-fg">{c.employee?.name}</p>
                          <p className="text-[10px] text-theme-subtle">{c.employee?.department} · {c.employee?.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-emerald-600">{formatCurrency(c.amount)}</td>
                    <td className="px-5 py-3 text-xs text-theme-muted">
                      {c.incentive ? monthLabel(c.incentive.month, c.incentive.year) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-theme-raised px-2 py-0.5 text-xs font-semibold text-theme-muted">
                        #{c.cycle}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {c.queue_position ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/10 text-xs font-bold text-purple-600">
                          {c.queue_position}
                        </span>
                      ) : <span className="text-theme-subtle text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={statusBadgeVariant(c.status)}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-theme-muted">{formatDate(c.requested_at)}</td>
                    <td className="px-5 py-3 text-right">
                      {canEdit && c.status === "approved" && (
                        <Button
                          size="sm"
                          variant="success"
                          loading={processing === c._id}
                          onClick={() => processClaim(c._id)}
                        >
                          Process Payout
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
            <span className="text-xs text-theme-subtle">{filtered.length} claim{filtered.length !== 1 ? "s" : ""}</span>
            <span className="text-xs text-theme-subtle">
              {approved} ready to process
            </span>
          </div>
        </div>
      </div>

      {/* Advance cycle confirm modal */}
      {cycleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-theme-surface border border-theme-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle size={16} />
                <h3 className="text-sm font-bold">Advance Claim Cycle</h3>
              </div>
              <button onClick={() => setCycleConfirm(false)} className="rounded-lg p-1 text-theme-muted hover:bg-theme-raised transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-theme-muted">
                This will move all queued claims to the next cycle. Employees waiting in queue will be re-positioned. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 border-t border-theme-border px-6 py-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setCycleConfirm(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={advanceCycle}>
                <RefreshCw size={13} className="mr-1.5" /> Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
