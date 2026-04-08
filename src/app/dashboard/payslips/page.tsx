"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  Download, 
  FileText, 
  Search, 
  IndianRupee, 
  Calendar, 
  ShieldCheck, 
  ArrowUpRight, 
  Eye, 
  Lock 
} from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const PAYSLIPS_DATA = [
  { id: 1, month: "March", year: 2026, gross: 97400, deductions: 8500, net: 88900, status: "generated", date: "Apr 01, 2026" },
  { id: 2, month: "February", year: 2026, gross: 81800, deductions: 7200, net: 74600, status: "generated", date: "Mar 01, 2026" },
  { id: 3, month: "January", year: 2026, gross: 83500, deductions: 6500, net: 77000, status: "generated", date: "Feb 01, 2026" },
  { id: 4, month: "December", year: 2025, gross: 89200, deductions: 7800, net: 81400, status: "generated", date: "Jan 01, 2026" },
  { id: 5, month: "November", year: 2025, gross: 77600, deductions: 6200, net: 71400, status: "generated", date: "Dec 01, 2025" },
  { id: 6, month: "October", year: 2025, gross: 103500, deductions: 9000, net: 94500, status: "generated", date: "Nov 01, 2025" },
];

export default function EmployeePayslipsPage() {
  const [search, setSearch] = useState("");

  const filtered = PAYSLIPS_DATA.filter(
    (p) => p.month.toLowerCase().includes(search.toLowerCase()) || p.year.toString().includes(search)
  );

  return (
    <DashboardShell
      title="Yield Manifests"
      subtitle="Authorized access to your monthly fiscal distribution and net-pay registry"
      actions={
        <button className="flex items-center gap-2 rounded-xl bg-card border border-default px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:border-sky-500/30 transition-all text-muted hover:text-foreground shadow-sm">
          <Calendar size={16} />
          Tax Projections
        </button>
      }
    >
      <div className="flex flex-col gap-10">
        {/* Metric Pulse Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Last Cycle Net", value: `₹88,900`, color: "emerald", icon: ArrowUpRight },
            { label: "Aggregate YTD Yield", value: `₹2,40,600`, color: "sky", icon: FileText },
            { label: "Locked Deductions", value: `₹45,000`, color: "rose", icon: Lock },
            { label: "Next Distribution", value: "May 01", color: "amber", icon: ShieldCheck },
          ].map((s, i) => (
            <div key={i} className="page-card !mb-0 p-6 flex flex-col justify-between group hover:border-sky-500/20 transition-all cursor-default relative overflow-hidden">
               <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform text-${s.color}-600`}>
                  <s.icon size={60} strokeWidth={1} />
               </div>
               <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-4">{s.label}</p>
               <p className={`text-2xl font-black tracking-tighter text-foreground group-hover:text-${s.color}-600 transition-colors`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Payslip History Terminal */}
        <div className="page-card !p-0 overflow-hidden border border-default shadow-2xl bg-[hsl(var(--surface-raised))]">
          <div className="p-8 border-b border-default flex flex-col md:row-row justify-between items-start md:items-center gap-6">
            <div>
               <h2 className="text-sm font-black text-foreground uppercase tracking-[0.4em] mb-1">Manifest Registry</h2>
               <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Historical record of performance-based distributions</p>
            </div>
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-sky-600 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search Epochs..."
                className="w-full bg-background border border-default rounded-2xl pl-12 pr-4 py-4 text-xs font-black uppercase tracking-widest text-foreground outline-none focus:border-sky-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background/50 border-b border-default">
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">Temporal Period</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">Release Epoch</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">Gross Quantum</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">Yield Deductions</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">Net Liquidity</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">State</th>
                  <th className="px-8 py-5 text-right text-[9px] font-black text-muted uppercase tracking-[0.3em]">Registry Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default/10">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-sky-500/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                          <FileText size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground uppercase tracking-tight leading-tight">{row.month} {row.year}</p>
                          <p className="text-[10px] font-black text-muted uppercase tracking-[0.4em]">REG-0{row.id}26</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-[10px] font-black text-muted uppercase tracking-widest">{row.date}</span>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-sm font-black text-foreground tracking-tight">{formatCurrency(row.gross)}</p>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-sm font-black text-rose-600 tracking-tight">-{formatCurrency(row.deductions)}</p>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-lg font-black text-emerald-600 tracking-tighter">{formatCurrency(row.net)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2">
                          <button className="p-3 rounded-xl border border-default bg-background hover:border-sky-500/30 text-muted hover:text-sky-600 transition-all shadow-sm">
                             <Eye size={16} />
                          </button>
                          <button className="flex items-center gap-2 rounded-xl border border-default bg-background hover:bg-slate-900 dark:hover:bg-slate-100 hover:text-white dark:hover:text-slate-900 transition-all px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground shadow-sm">
                             <Download size={14} /> Download
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
