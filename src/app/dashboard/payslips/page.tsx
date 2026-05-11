"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { formatCurrency, cn } from "@/lib/utils";
import { useState } from "react";
import {
  Download,
  FileText,
  Search,
  IndianRupee,
  Lock,
  Eye,
  TrendingUp,
} from "lucide-react";

const PAYSLIPS_DATA = [
  { id: 1, month: "March",    year: 2026, gross: 97400,  deductions: 8500, net: 88900, status: "generated", date: "Apr 01, 2026" },
  { id: 2, month: "February", year: 2026, gross: 81800,  deductions: 7200, net: 74600, status: "generated", date: "Mar 01, 2026" },
  { id: 3, month: "January",  year: 2026, gross: 83500,  deductions: 6500, net: 77000, status: "generated", date: "Feb 01, 2026" },
  { id: 4, month: "December", year: 2025, gross: 89200,  deductions: 7800, net: 81400, status: "generated", date: "Jan 01, 2026" },
  { id: 5, month: "November", year: 2025, gross: 77600,  deductions: 6200, net: 71400, status: "generated", date: "Dec 01, 2025" },
  { id: 6, month: "October",  year: 2025, gross: 103500, deductions: 9000, net: 94500, status: "generated", date: "Nov 01, 2025" },
];

export default function EmployeePayslipsPage() {
  const [search, setSearch] = useState("");

  const filtered = PAYSLIPS_DATA.filter(
    (p) => p.month.toLowerCase().includes(search.toLowerCase()) || p.year.toString().includes(search)
  );

  const ytdNet = PAYSLIPS_DATA.reduce((s, p) => s + p.net, 0);
  const ytdDeductions = PAYSLIPS_DATA.reduce((s, p) => s + p.deductions, 0);

  return (
    <DashboardShell
      moduleKey="my_payslips"
      title="Payslips"
      subtitle="Your monthly salary distribution and net-pay history."
    >
      <div className="space-y-5">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Last Net Pay",    value: formatCurrency(PAYSLIPS_DATA[0].net), icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10", sub: "March 2026" },
            { label: "YTD Gross",       value: formatCurrency(PAYSLIPS_DATA.reduce((s,p)=>s+p.gross,0)), icon: TrendingUp, color: "text-theme-fg", bg: "bg-theme-raised", sub: "6 months" },
            { label: "Total Deductions", value: formatCurrency(ytdDeductions), icon: Lock, color: "text-red-500", bg: "bg-red-500/10", sub: "YTD" },
            { label: "YTD Net Pay",     value: formatCurrency(ytdNet), icon: IndianRupee, color: "text-sky-600", bg: "bg-sky-500/10", sub: "Take-home total" },
          ].map(({ label, value, icon: Icon, color, bg, sub }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={17} className={color} />
              </div>
              <div>
                <p className="text-xs text-theme-muted">{label}</p>
                <p className={cn("text-xl font-black leading-tight", color)}>{value}</p>
                <p className="text-[10px] text-theme-subtle">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Payslip Table */}
        <div className="page-card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-theme-muted" />
              <h3 className="text-sm font-semibold text-theme-fg">Payslip History</h3>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-subtle" size={13} />
              <input
                type="text"
                placeholder="Search by month or year..."
                className="w-full rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 py-1.5 text-xs text-theme-fg outline-none focus:border-theme-primary transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 font-semibold">Release Date</th>
                  <th className="px-5 py-3 font-semibold">Gross Pay</th>
                  <th className="px-5 py-3 font-semibold text-red-500">Deductions (−)</th>
                  <th className="px-5 py-3 font-semibold text-emerald-600">Net Pay</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-theme-raised/40 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 text-[10px] font-black">
                          {row.month.slice(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-theme-fg">{row.month} {row.year}</p>
                          <p className="text-[10px] text-theme-subtle">REG-0{row.id}26</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-theme-muted">{row.date}</td>
                    <td className="px-5 py-3 text-xs font-semibold text-theme-fg">{formatCurrency(row.gross)}</td>
                    <td className="px-5 py-3 text-xs font-semibold text-red-500">−{formatCurrency(row.deductions)}</td>
                    <td className="px-5 py-3 text-sm font-black text-emerald-600">{formatCurrency(row.net)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                        <span className="h-1 w-1 rounded-full bg-emerald-500" />
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className="flex items-center gap-1 rounded-lg border border-theme-border bg-theme-raised px-2.5 py-1 text-[11px] font-semibold text-theme-muted hover:text-theme-fg transition-colors">
                          <Eye size={11} /> View
                        </button>
                        <button className="flex items-center gap-1 rounded-lg border border-theme-border bg-theme-raised px-2.5 py-1 text-[11px] font-semibold text-theme-muted hover:text-theme-fg transition-colors">
                          <Download size={11} /> Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
            <span className="text-xs text-theme-subtle">{filtered.length} payslips</span>
            <span className="text-xs text-theme-subtle">
              YTD net: <span className="font-bold text-theme-fg">{formatCurrency(ytdNet)}</span>
            </span>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
