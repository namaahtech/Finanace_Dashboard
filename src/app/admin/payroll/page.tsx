"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/BadgeLegacy";
import { Button } from "@/components/ui/ButtonLegacy";
import { formatCurrency, cn } from "@/lib/utils";
import {
  IndianRupee,
  Download,
  Play,
  CheckCircle2,
  Clock,
  Users,
  ChevronDown,
  FileText,
} from "lucide-react";
import { useState, useEffect } from "react";

import { useApi } from "@/hooks/useApi";
import { useToast } from "@/components/ui/ToastLegacy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermission } from "@/hooks/usePermission";

interface PayrollRecord {
  id: string;
  empId: string;
  empName: string;
  empCode: string;
  dept: string;
  empType: string;
  base: number;
  incentive: number;
  deductions: number;
  gross: number;
  net: number;
  status: "draft" | "processed" | "paid";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

const STATUS_BADGE: Record<string, "default" | "info" | "success" | "warning"> = {
  draft:     "warning",
  processed: "info",
  paid:      "success",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  draft:     Clock,
  processed: CheckCircle2,
  paid:      CheckCircle2,
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = [2026, 2025];

export default function PayrollPage() {
  const { request } = useApi();
  const { showToast } = useToast();
  const { canCreate, canEdit, canExport } = usePermission("payroll");
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filter, setFilter] = useState("all");
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);

  async function load() {
    setLoading(true);
    try {
       const res = await request<{ payrolls: PayrollRecord[] }>({ url: `/api/payroll?month=${month}&year=${year}` });
       setRecords(res.payrolls || []);
    } catch(err: any) {
       showToast(err.message, "error");
    } finally {
       setLoading(false);
    }
  }

  // Reload automatically when month/year changes
  useEffect(() => { load(); }, [month, year]);

  async function handleRunPayroll() {
    setActing(true);
    try {
      const drafts = records.filter(r => r.status === "draft");
      if (drafts.length === 0) return showToast("No drafted payrolls available to process.", "info");

      await request({ url: "/api/payroll", method: "POST", data: { action: "generate_drafts", payrolls: drafts, month, year } });
      showToast("Payroll dynamically processed successfully.", "success");
      load();
    } catch(e: any) {
      showToast(e.message, "error");
    } finally {
      setActing(false);
    }
  }

  async function handleDisburse(id: string) {
    try {
      await request({ url: "/api/payroll", method: "POST", data: { action: "disburse", employee_id: id } });
      showToast("Salary successfully disbursed.", "success");
      load();
    } catch(e: any) {
       showToast(e.message, "error");
    }
  }

  async function saveManualOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await request({ url: "/api/payroll", method: "POST", data: { action: "manual_override", record: editingRecord, month, year } });
      showToast("Manual override applied successfully.", "success");
      setEditingRecord(null);
      load();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  }

  const filtered = filter === "all" ? records : records.filter((r) => r.status === filter);

  const totalGross      = filtered.reduce((s, r) => s + r.gross, 0);
  const totalNet        = filtered.reduce((s, r) => s + r.net, 0);
  const totalDeductions = filtered.reduce((s, r) => s + r.deductions, 0);
  const draft           = records.filter((r) => r.status === "draft").length;
  const processed       = records.filter((r) => r.status === "processed").length;

  return (
    <DashboardShell
      moduleKey="payroll"
      title="Payroll"
      subtitle={`Salary disbursement for ${MONTHS[month - 1]} ${year}`}
      actions={
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-8 w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          {canExport && (
            <Button variant="secondary" size="sm">
              <Download size={13} className="mr-1.5" /> Export
            </Button>
          )}
          {canCreate && (
            <Button variant="primary" size="sm" onClick={handleRunPayroll} loading={acting} disabled={draft === 0}>
              <Play size={12} className="mr-1.5" /> Run Payroll
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Gross Payout",  value: formatCurrency(totalGross),      icon: IndianRupee, color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Net Payout",    value: formatCurrency(totalNet),         icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Deductions",    value: formatCurrency(totalDeductions),  icon: IndianRupee, color: "text-red-500",     bg: "bg-red-500/10" },
            { label: "Employees",     value: filtered.length,                  icon: Users,       color: "text-sky-600",     bg: "bg-sky-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={15} className={color} />
              </div>
              <div>
                <p className="text-[11px] text-theme-muted">{label}</p>
                <p className={cn("text-lg font-black leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="page-card overflow-hidden p-0">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
              {[
                { id: "all",       label: "All" },
                { id: "draft",     label: "Draft" },
                { id: "processed", label: "Processed" },
                { id: "paid",      label: "Paid" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    filter === t.id
                      ? "bg-theme-surface text-theme-fg shadow-sm"
                      : "text-theme-muted hover:text-theme-fg"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-theme-muted flex-shrink-0">
              {draft} draft · {processed} ready to disburse
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Base Salary</th>
                  <th className="px-5 py-3 font-semibold text-emerald-600">Incentive (+)</th>
                  <th className="px-5 py-3 font-semibold text-red-500">Deductions (−)</th>
                  <th className="px-5 py-3 font-semibold">Gross</th>
                  <th className="px-5 py-3 font-semibold">Net Pay</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-theme-subtle">No payroll records found</td>
                  </tr>
                ) : filtered.map((row) => {
                  const StatusIcon = STATUS_ICON[row.status];
                  return (
                    <tr key={row.id} className="group transition-colors hover:bg-theme-raised/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">
                            {getInitials(row.empName)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-theme-fg">{row.empName}</p>
                            <p className="text-[10px] text-theme-subtle">{row.empCode} • {row.empType.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-theme-muted">{row.dept}</td>
                      <td className="px-5 py-3 text-xs text-theme-muted">{formatCurrency(row.base)}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-emerald-600">+{formatCurrency(row.incentive)}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-red-500">−{formatCurrency(row.deductions)}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-theme-fg">{formatCurrency(row.gross)}</td>
                      <td className="px-5 py-3 text-sm font-black text-theme-fg">{formatCurrency(row.net)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={STATUS_BADGE[row.status]}>
                          <StatusIcon size={10} className="mr-1" />
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="flex items-center gap-1 rounded-lg border border-theme-border bg-theme-raised px-2.5 py-1 text-[11px] font-semibold text-theme-muted hover:text-theme-fg transition-colors">
                            <FileText size={11} /> Payslip
                          </button>
                          {canEdit && row.status === "draft" && (
                            <Button size="sm" variant="secondary" onClick={() => setEditingRecord(row)}>
                              Edit
                            </Button>
                          )}
                          {canEdit && row.status === "processed" && (
                            <Button size="sm" variant="success" onClick={() => handleDisburse(row.id)}>
                              Disburse
                            </Button>
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
            <span className="text-xs text-theme-subtle">{filtered.length} of {records.length} employees</span>
            <span className="text-xs text-theme-subtle">
              Net total: <span className="font-bold text-theme-fg">{formatCurrency(totalNet)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Manual Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-theme-fg">Manual Payroll Override</h3>
                <p className="text-xs text-theme-muted">{editingRecord.empName} ({editingRecord.empCode})</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="rounded-full p-2 text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={saveManualOverride} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-theme-muted">Base Salary (₹)</label>
                  <input type="number" required value={editingRecord.base} onChange={(e) => setEditingRecord({ ...editingRecord, base: Number(e.target.value), gross: Number(e.target.value) + editingRecord.incentive, net: (Number(e.target.value) + editingRecord.incentive) - editingRecord.deductions })} className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm outline-none focus:border-theme-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-emerald-600">Incentive (+)</label>
                  <input type="number" required value={editingRecord.incentive} onChange={(e) => setEditingRecord({ ...editingRecord, incentive: Number(e.target.value), gross: editingRecord.base + Number(e.target.value), net: (editingRecord.base + Number(e.target.value)) - editingRecord.deductions })} className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm outline-none focus:border-theme-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-red-500">Deductions (−)</label>
                  <input type="number" required value={editingRecord.deductions} onChange={(e) => setEditingRecord({ ...editingRecord, deductions: Number(e.target.value), net: editingRecord.gross - Number(e.target.value) })} className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm outline-none focus:border-theme-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-theme-fg">Net Pay</label>
                  <input type="number" readOnly value={editingRecord.net} className="w-full rounded-lg border border-transparent bg-theme-raised px-3 py-2 text-sm font-bold opacity-70" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" className="w-full">Apply Adjustments</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
