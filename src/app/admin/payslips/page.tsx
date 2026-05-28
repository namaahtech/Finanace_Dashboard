"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/ButtonLegacy";
import { Badge } from "@/components/ui/BadgeLegacy";
import { useAuth } from "@/components/layout/AuthProvider";
import { useToast } from "@/components/ui/ToastLegacy";
import { formatCurrency, getYearRange, cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  Send,
  IndianRupee,
  Users,
  TrendingUp,
  Zap,
  Lock,
} from "lucide-react";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString("en-IN", { month: "long" }),
}));

function monthLabel(m: number, y: number) {
  return new Date(y, m - 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface Employee { id: string; _id?: string; name: string; employeeId: string; department: string; }

interface Payslip {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  hra: number;
  special_allowance: number;
  incentive_amount: number;
  sales_commission: number;
  gross_pay: number;
  pf_deduction: number;
  professional_tax: number;
  tds_deduction: number;
  total_deductions: number;
  net_pay: number;
  status: "draft" | "approved" | "released";
  generated_by?: string;
  approved_at?: string;
  released_at?: string;
  created_at: string;
  employee?: { name: string; employee_id: string; department: string; designation: string };
}

const STATUS_CONFIG = {
  draft:    { label: "Draft",    color: "text-amber-600",   bg: "bg-amber-500/10",   dot: "bg-amber-500"  },
  approved: { label: "Approved", color: "text-sky-600",     bg: "bg-sky-500/10",     dot: "bg-sky-500"    },
  released: { label: "Released", color: "text-emerald-600", bg: "bg-emerald-500/10", dot: "bg-emerald-500"},
};

export default function AdminPayslipsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payslips,  setPayslips]  = useState<Payslip[]>([]);

  const [selectedEmp,  setSelectedEmp]  = useState("");
  const [genMonth,     setGenMonth]     = useState(new Date().getMonth() + 1);
  const [genYear,      setGenYear]      = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState("all");

  const [generating, setGenerating]   = useState(false);
  const [loadingPayslips, setLoading] = useState(false);
  const [updatingId, setUpdatingId]   = useState<string | null>(null);

  useEffect(() => {
    axios.get("/api/users?limit=200").then((r) => {
      if (r.data.users?.length) setEmployees(r.data.users);
    }).catch(() => {});
  }, []);

  const loadPayslips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEmp) params.set("employeeId", selectedEmp);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await axios.get(`/api/payslips?${params}`);
      setPayslips(r.data.payslips ?? []);
    } catch { setPayslips([]); }
    finally  { setLoading(false); }
  }, [selectedEmp, statusFilter]);

  useEffect(() => { loadPayslips(); }, [loadPayslips]);

  async function handleGenerate() {
    if (!selectedEmp) { showToast("Select an employee first", "warning"); return; }
    setGenerating(true);
    try {
      await axios.post("/api/payslips/generate", {
        employee_id:  selectedEmp,
        month:        genMonth,
        year:         genYear,
        generated_by: user?.id,
      });
      showToast("Payslip generated successfully", "success");
      await loadPayslips();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Generation failed", "error");
    } finally { setGenerating(false); }
  }

  async function updateStatus(payslip: Payslip, newStatus: "approved" | "released") {
    setUpdatingId(payslip.id);
    try {
      await axios.post("/api/payslips", {
        employee_id: payslip.employee_id,
        month:       payslip.month,
        year:        payslip.year,
        status:      newStatus,
        approved_by: user?.id,
      });
      showToast(`Payslip ${newStatus}`, "success");
      await loadPayslips();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Update failed", "error");
    } finally { setUpdatingId(null); }
  }

  const filtered = statusFilter === "all" ? payslips : payslips.filter(p => p.status === statusFilter);

  const totalReleased = payslips.filter(p => p.status === "released").reduce((s, p) => s + p.net_pay, 0);
  const totalApproved = payslips.filter(p => p.status === "approved").length;
  const totalDraft    = payslips.filter(p => p.status === "draft").length;

  return (
    <DashboardShell
      moduleKey="payroll"
      title="Payroll & Payslips"
      subtitle="Generate, approve, and release employee payslips with auto-linked earnings."
      actions={
        <Button variant="secondary" size="sm" onClick={loadPayslips} loading={loadingPayslips}>
          <RefreshCw size={13} className="mr-1.5" /> Refresh
        </Button>
      }
    >
      <div className="space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Payslips", value: payslips.length,    icon: FileText,     color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Drafts",         value: totalDraft,          icon: Lock,         color: "text-amber-600",   bg: "bg-amber-500/10" },
            { label: "Approved",       value: totalApproved,       icon: CheckCircle2, color: "text-sky-600",     bg: "bg-sky-500/10"   },
            { label: "Released Total", value: formatCurrency(totalReleased), icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
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

        <div className="grid gap-5 lg:grid-cols-5">

          {/* Generator panel */}
          <div className="lg:col-span-2">
            <div className="page-card">
              <div className="mb-4 flex items-center gap-2">
                <Zap size={15} className="text-amber-500" />
                <span className="text-sm font-semibold text-theme-fg">Generate Payslip</span>
              </div>
              <p className="mb-4 text-[11px] text-theme-muted leading-relaxed">
                Auto-calculates from base salary, incentive grants, and sales commission for the selected period.
              </p>

              <div className="space-y-3">
                {/* Employee */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Employee</label>
                  <Select value={selectedEmp || "all"} onValueChange={(v) => setSelectedEmp(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="All employees" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All employees</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id || e._id} value={e.id || e._id || ""}>{e.name} — {e.employeeId}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month / Year */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Month</label>
                    <Select value={String(genMonth)} onValueChange={(v) => setGenMonth(Number(v))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Year</label>
                    <Select value={String(genYear)} onValueChange={(v) => setGenYear(Number(v))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {getYearRange().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Breakdown preview */}
                {selectedEmp && (
                  <div className="rounded-xl border border-theme-border bg-theme-raised px-4 py-3 space-y-1.5 text-xs">
                    <p className="font-semibold text-theme-muted uppercase tracking-wide text-[10px] mb-2">Auto-linked sources</p>
                    {[
                      { label: "Base salary",       icon: IndianRupee, color: "text-theme-muted" },
                      { label: "HRA (40% of basic)", icon: TrendingUp,  color: "text-sky-500"    },
                      { label: "Incentive grants",   icon: Zap,         color: "text-amber-500"  },
                      { label: "Sales commission",   icon: TrendingUp,  color: "text-emerald-500"},
                    ].map(({ label, icon: Icon, color }) => (
                      <div key={label} className="flex items-center gap-2 text-theme-muted">
                        <Icon size={11} className={color} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="primary"
                  className="w-full"
                  loading={generating}
                  disabled={!selectedEmp}
                  onClick={handleGenerate}
                >
                  <Zap size={13} className="mr-1.5" />
                  Generate Payslip
                </Button>
              </div>
            </div>
          </div>

          {/* Payslips table */}
          <div className="lg:col-span-3">
            <div className="page-card overflow-hidden p-0">
              {/* Header + tabs */}
              <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-theme-muted" />
                  <span className="text-sm font-semibold text-theme-fg">
                    Payslip Records
                    {selectedEmp && (
                      <span className="ml-2 text-xs font-normal text-theme-muted">
                        — {employees.find(e => (e.id || e._id) === selectedEmp)?.name}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
                  {[
                    { id: "all",      label: "All"      },
                    { id: "draft",    label: "Drafts"   },
                    { id: "approved", label: "Approved" },
                    { id: "released", label: "Released" },
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
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                      <th className="px-5 py-3 font-semibold">Employee</th>
                      <th className="px-5 py-3 font-semibold">Period</th>
                      <th className="px-5 py-3 font-semibold">Gross</th>
                      <th className="px-5 py-3 font-semibold text-red-500">Deductions</th>
                      <th className="px-5 py-3 font-semibold text-emerald-600">Net Pay</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {loadingPayslips ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j} className="px-5 py-3">
                              <div className="h-3 animate-pulse rounded bg-theme-raised" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-theme-subtle">
                          No payslips found. Generate one to get started.
                        </td>
                      </tr>
                    ) : filtered.map((p) => {
                      const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft;
                      const empName = p.employee?.name ?? "—";
                      const empId   = p.employee?.employee_id ?? "";
                      const isUpdating = updatingId === p.id;
                      return (
                        <tr key={p.id} className="group transition-colors hover:bg-theme-raised/40">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">
                                {getInitials(empName)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-theme-fg">{empName}</p>
                                <p className="text-[10px] text-theme-subtle">{empId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-theme-muted">{monthLabel(p.month, p.year)}</td>
                          <td className="px-5 py-3 text-xs font-semibold text-theme-fg">{formatCurrency(p.gross_pay)}</td>
                          <td className="px-5 py-3 text-xs font-semibold text-red-500">−{formatCurrency(p.total_deductions)}</td>
                          <td className="px-5 py-3 text-sm font-black text-emerald-600">{formatCurrency(p.net_pay)}</td>
                          <td className="px-5 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold", sc.bg, sc.color)}>
                              <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {p.status === "draft" && (
                                <button
                                  onClick={() => updateStatus(p, "approved")}
                                  disabled={isUpdating}
                                  className="flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-600 hover:bg-sky-500/20 transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle2 size={11} /> Approve
                                </button>
                              )}
                              {p.status === "approved" && (
                                <button
                                  onClick={() => updateStatus(p, "released")}
                                  disabled={isUpdating}
                                  className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                >
                                  <Send size={11} /> Release
                                </button>
                              )}
                              {p.status === "released" && (
                                <span className="text-[11px] text-emerald-600 font-semibold">✓ Released</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
                <span className="text-xs text-theme-subtle">{filtered.length} payslip{filtered.length !== 1 ? "s" : ""}</span>
                <span className="text-xs text-theme-subtle">
                  Net total: <span className="font-bold text-theme-fg">
                    {formatCurrency(filtered.reduce((s, p) => s + p.net_pay, 0))}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
