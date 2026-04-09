"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
import { useState } from "react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = [2026, 2025];

const PAYROLL_DATA = [
  { id: 1,  emp: "Rahul Mehta",   empId: "NP001", dept: "Engineering", base: 85000, incentive: 12400, deductions: 8500, gross: 97400,  net: 88900,  status: "processed" },
  { id: 2,  emp: "Sneha Patel",   empId: "NP002", dept: "Engineering", base: 72000, incentive: 9800,  deductions: 7200, gross: 81800,  net: 74600,  status: "processed" },
  { id: 3,  emp: "Amit Verma",    empId: "NP003", dept: "Sales",       base: 65000, incentive: 18500, deductions: 6500, gross: 83500,  net: 77000,  status: "processed" },
  { id: 4,  emp: "Priya Sharma",  empId: "NP004", dept: "Product",     base: 78000, incentive: 11200, deductions: 7800, gross: 89200,  net: 81400,  status: "processed" },
  { id: 5,  emp: "Deepa Nair",    empId: "NP005", dept: "Sales",       base: 62000, incentive: 15600, deductions: 6200, gross: 77600,  net: 71400,  status: "draft" },
  { id: 6,  emp: "Arjun Singh",   empId: "NP006", dept: "Engineering", base: 90000, incentive: 13500, deductions: 9000, gross: 103500, net: 94500,  status: "draft" },
  { id: 7,  emp: "Neha Kapoor",   empId: "NP007", dept: "Marketing",   base: 58000, incentive: 7200,  deductions: 5800, gross: 65200,  net: 59400,  status: "draft" },
  { id: 8,  emp: "Vikram Joshi",  empId: "NP008", dept: "Operations",  base: 55000, incentive: 6800,  deductions: 5500, gross: 61800,  net: 56300,  status: "draft" },
  { id: 9,  emp: "Kiran Reddy",   empId: "NP009", dept: "Operations",  base: 60000, incentive: 8400,  deductions: 6000, gross: 68400,  net: 62400,  status: "paid" },
  { id: 10, emp: "Pooja Sharma",  empId: "NP010", dept: "People",      base: 68000, incentive: 9600,  deductions: 6800, gross: 77600,  net: 70800,  status: "paid" },
];

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

export default function PayrollPage() {
  const [month, setMonth] = useState(3);
  const [year, setYear] = useState(2026);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? PAYROLL_DATA : PAYROLL_DATA.filter((r) => r.status === filter);

  const totalGross      = filtered.reduce((s, r) => s + r.gross, 0);
  const totalNet        = filtered.reduce((s, r) => s + r.net, 0);
  const totalDeductions = filtered.reduce((s, r) => s + r.deductions, 0);
  const draft           = PAYROLL_DATA.filter((r) => r.status === "draft").length;
  const processed       = PAYROLL_DATA.filter((r) => r.status === "processed").length;

  return (
    <DashboardShell
      title="Payroll"
      subtitle={`Salary disbursement for ${MONTHS[month - 1]} ${year}`}
      actions={
        <div className="flex items-center gap-2">
          {/* Month selector */}
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-8 appearance-none rounded-lg border border-theme-border bg-theme-raised pl-3 pr-7 text-xs font-semibold text-theme-fg outline-none focus:border-theme-strong transition-all cursor-pointer"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted" />
          </div>
          {/* Year selector */}
          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-8 appearance-none rounded-lg border border-theme-border bg-theme-raised pl-3 pr-7 text-xs font-semibold text-theme-fg outline-none focus:border-theme-strong transition-all cursor-pointer"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted" />
          </div>
          <Button variant="secondary" size="sm">
            <Download size={13} className="mr-1.5" /> Export
          </Button>
          <Button variant="primary" size="sm">
            <Play size={12} className="mr-1.5" /> Run Payroll
          </Button>
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
                            {getInitials(row.emp)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-theme-fg">{row.emp}</p>
                            <p className="text-[10px] text-theme-subtle">{row.empId}</p>
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
                          {row.status === "processed" && (
                            <Button size="sm" variant="success">
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
            <span className="text-xs text-theme-subtle">{filtered.length} of {PAYROLL_DATA.length} employees</span>
            <span className="text-xs text-theme-subtle">
              Net total: <span className="font-bold text-theme-fg">{formatCurrency(totalNet)}</span>
            </span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
