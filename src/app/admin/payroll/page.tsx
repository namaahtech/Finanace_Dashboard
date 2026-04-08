"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { IndianRupee, Download, Play, CheckCircle2, Clock, AlertCircle, ChevronDown } from "lucide-react";
import { useState } from "react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = [2026, 2025];

const PAYROLL_DATA = [
 { id: 1, emp: "Rahul Mehta", empId: "NP001", dept: "Engineering", base: 85000, incentive: 12400, deductions: 8500, gross: 97400, net: 88900, status: "processed" },
 { id: 2, emp: "Sneha Patel", empId: "NP002", dept: "Engineering", base: 72000, incentive: 9800, deductions: 7200, gross: 81800, net: 74600, status: "processed" },
 { id: 3, emp: "Amit Verma", empId: "NP003", dept: "Sales", base: 65000, incentive: 18500, deductions: 6500, gross: 83500, net: 77000, status: "processed" },
 { id: 4, emp: "Priya Sharma", empId: "NP004", dept: "Product", base: 78000, incentive: 11200, deductions: 7800, gross: 89200, net: 81400, status: "processed" },
 { id: 5, emp: "Deepa Nair", empId: "NP005", dept: "Sales", base: 62000, incentive: 15600, deductions: 6200, gross: 77600, net: 71400, status: "draft" },
 { id: 6, emp: "Arjun Singh", empId: "NP006", dept: "Engineering", base: 90000, incentive: 13500, deductions: 9000, gross: 103500, net: 94500, status: "draft" },
 { id: 7, emp: "Neha Kapoor", empId: "NP007", dept: "Marketing", base: 58000, incentive: 7200, deductions: 5800, gross: 65200, net: 59400, status: "draft" },
 { id: 8, emp: "Vikram Joshi", empId: "NP008", dept: "Operations", base: 55000, incentive: 6800, deductions: 5500, gross: 61800, net: 56300, status: "draft" },
 { id: 9, emp: "Kiran Reddy", empId: "NP009", dept: "Operations", base: 60000, incentive: 8400, deductions: 6000, gross: 68400, net: 62400, status: "paid" },
 { id: 10, emp: "Pooja Sharma", empId: "NP010", dept: "People", base: 68000, incentive: 9600, deductions: 6800, gross: 77600, net: 70800, status: "paid" },
];

const STATUS_STYLES: Record<string, string> = {
 draft: "bg-[hsl(var(--warning-bg))] text-amber-600 dark:text-amber-400",
 processed: "bg-[hsl(var(--info-bg))] text-sky-600 dark:text-sky-400",
 paid: "bg-[hsl(var(--success-bg))] text-emerald-600 dark:text-emerald-400",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
 draft: Clock,
 processed: CheckCircle2,
 paid: CheckCircle2,
};

export default function PayrollPage() {
 const [month, setMonth] = useState(3);
 const [year, setYear] = useState(2026);
 const [filter, setFilter] = useState("all");

 const filtered = filter === "all" ? PAYROLL_DATA : PAYROLL_DATA.filter((r) => r.status === filter);

 const totalGross = filtered.reduce((s, r) => s + r.gross, 0);
 const totalNet = filtered.reduce((s, r) => s + r.net, 0);
 const totalDeductions = filtered.reduce((s, r) => s + r.deductions, 0);

 return (
 <DashboardShell
 title="Disbursement Engine"
 subtitle="Comprehensive financial reconciliation and salary distribution for Namaah Personnel"
 actions={
 <div className="flex gap-3">
 <div className="relative group">
 <select
 value={month}
 onChange={(e) => setMonth(Number(e.target.value))}
 className="w-40 appearance-none rounded-xl border border-default bg-[hsl(var(--surface-raised))] pl-10 pr-10 py-3 text-xs font-black uppercase tracking-widest text-foreground outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-sm"
 >
 {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
 </select>
 <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 group-hover:scale-110 transition-transform">
 <Clock size={16} strokeWidth={3} />
 </div>
 </div>
 <button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
 <Play size={18} strokeWidth={3} /> Trigger Payroll
 </button>
 <button className="hidden md:flex items-center justify-center w-12 h-12 rounded-xl border border-default bg-[hsl(var(--surface-raised))] text-muted hover:text-foreground transition-all">
 <Download size={18} strokeWidth={2.5} />
 </button>
 </div>
 }
 >
 <div className="flex flex-col gap-10">
 {/* Payroll Analytics */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 { label: "Aggregate Disbursement", value: `₹${(totalGross/100000).toFixed(2)}L`, color: "sky", trend: "GROSS" },
 { label: "Realized Net Liquidity", value: `₹${(totalNet/100000).toFixed(2)}L`, color: "emerald", trend: "NET" },
 { label: "Regulatory Retentions", value: `₹${(totalDeductions/1000).toFixed(0)}K`, color: "rose", trend: "TAX/PF" },
 { label: "Active Personnel", value: filtered.length, color: "purple", trend: "COUNT" },
 ].map((s) => (
 <div key={s.label} className="page-card !mb-0 p-6 flex flex-col justify-between group hover:border-emerald-500/30 transition-all border-b-4" style={{ borderBottomColor: `var(--${s.color}-500)` }}>
 <div className="flex justify-between items-start mb-4">
 <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{s.label}</p>
 <span className="text-[10px] font-black text-muted bg-[hsl(var(--surface-raised))] px-2 py-0.5 rounded-full border border-default">{s.trend}</span>
 </div>
 <p className={`text-4xl font-black text-foreground group-hover:text-emerald-600 transition-colors tracking-tighter`}>{s.value}</p>
 </div>
 ))}
 </div>

 <div className="page-card !mb-0 shadow-2xl overflow-hidden">
 {/* State Navigation */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12 border-b border-default pb-8">
 <div className="flex flex-wrap gap-2.5 p-1.5 bg-[hsl(var(--surface-raised))] rounded-2xl border border-default">
 {["all", "draft", "processed", "paid"].map((s) => (
 <button
 key={s}
 onClick={() => setFilter(s)}
 className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
 filter === s 
 ? "bg-theme-surface dark:bg-zinc-800 text-emerald-600 shadow-xl border border-default" 
 : "text-muted hover:text-foreground"
 }`}
 >
 {s === "all" ? "Organization Wide" : s}
 </button>
 ))}
 </div>
 <div className="text-right">
 <span className="text-[10px] font-black text-muted uppercase tracking-widest block mb-1">Current Fiscal Cycle</span>
 <span className="text-xl font-black text-foreground uppercase tracking-tight">{MONTHS[month-1]} {year}</span>
 </div>
 </div>

 <div className="data-table-container">
 <table className="data-table">
 <thead>
 <tr>
 <th>Talent Identity</th>
 <th>Functional Unit</th>
 <th>Base Yield</th>
 <th>Incentives (+)</th>
 <th>Retentions (-)</th>
 <th>Total Provision</th>
 <th>Net Yield</th>
 <th>Lifecycle State</th>
 <th className="text-right pr-4">Execution</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((row) => {
 const Icon = STATUS_ICONS[row.status];
 return (
 <tr key={row.id} className="group hover:bg-[hsl(var(--surface-raised))] transition-colors border-l-4 border-l-transparent hover:border-l-emerald-500">
 <td className="py-6">
 <div className="flex flex-col">
 <span className="font-bold text-foreground group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{row.emp}</span>
 <span className="text-[10px] text-muted font-black tracking-widest uppercase">ID: {row.empId}</span>
 </div>
 </td>
 <td className="text-[11px] font-black text-muted uppercase">{row.dept}</td>
 <td className="text-sm font-bold opacity-60">₹{row.base.toLocaleString()}</td>
 <td><span className="text-sm font-black text-emerald-600">+₹{row.incentive.toLocaleString()}</span></td>
 <td><span className="text-sm font-black text-rose-500">-₹{row.deductions.toLocaleString()}</span></td>
 <td className="text-sm font-bold">₹{row.gross.toLocaleString()}</td>
 <td><span className="text-base font-black text-foreground">₹{row.net.toLocaleString()}</span></td>
 <td>
 <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 ${STATUS_STYLES[row.status]} bg-opacity-10 border-opacity-20`}>
 <Icon size={14} strokeWidth={3} />
 {row.status}
 </div>
 </td>
 <td className="text-right pr-4">
 <div className="flex justify-end gap-2">
 <button className="px-4 py-2 rounded-lg bg-[hsl(var(--surface-raised))] border border-default text-[10px] font-black text-muted uppercase tracking-widest hover:text-emerald-600 transition-all">
 Payslip
 </button>
 {row.status === "processed" && (
 <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
 Authorize
 </button>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </DashboardShell>
 );
}
