"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  ArrowUpRight, 
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const INVOICES = [
  { id: "INV-2026-001", client: "Google Cloud India", amount: 450000, date: "Apr 05, 2026", dueDate: "May 05, 2026", status: "paid", type: "receivable" },
  { id: "INV-2026-002", client: "Amazon Web Services", amount: 125000, date: "Apr 02, 2026", dueDate: "May 02, 2026", status: "sent", type: "payable" },
  { id: "INV-2026-003", client: "Microsoft Azure", amount: 890000, date: "Mar 28, 2026", dueDate: "Apr 28, 2026", status: "overdue", type: "receivable" },
  { id: "INV-2026-004", client: "HackerRank Enterprise", amount: 65000, date: "Mar 25, 2026", dueDate: "Apr 25, 2026", status: "paid", type: "receivable" },
  { id: "INV-2026-005", client: "Zoom Video Comms", amount: 12000, date: "Mar 20, 2026", dueDate: "Apr 20, 2026", status: "draft", type: "payable" },
  { id: "INV-2026-006", client: "Slack Technologies", amount: 45000, date: "Mar 15, 2026", dueDate: "Apr 15, 2026", status: "paid", type: "payable" },
];

export default function InvoicingPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredInvoices = INVOICES.filter(inv => {
    const matchesSearch = inv.id.toLowerCase().includes(search.toLowerCase()) || 
                         inv.client.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || inv.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardShell 
      title="Invoicing Ledger" 
      subtitle="Comprehensive accounts receivable and payable management system"
      actions={
        <button className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
          <Plus size={16} strokeWidth={3} />
          Create Invoice
        </button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Receivables", value: "₹1,405,000", icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Total Payables", value: "₹182,000", icon: ArrowDownLeft, color: "text-rose-600", bg: "bg-rose-500/10" },
            { label: "Outstanding", value: "₹890,000", icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
            { label: "Draft Invoices", value: "1", icon: FileText, color: "text-sky-600", bg: "bg-sky-500/10" },
          ].map((stat, i) => (
            <div key={i} className="page-card !mb-0 p-6 flex items-center justify-between group hover:border-sky-500/20 transition-all">
              <div>
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className={`text-xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} strokeWidth={2.5} />
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="page-card !p-0 overflow-hidden border border-default shadow-2xl">
          <div className="p-8 border-b border-default flex flex-col lg:row-row justify-between items-start lg:items-center gap-6 bg-[hsl(var(--surface-raised))]">
            <div className="flex items-center gap-4 w-full lg:w-auto">
               <div className="relative flex-grow lg:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by ID or Client..."
                    className="w-full bg-background/50 border border-default rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
               </div>
               <div className="relative">
                  <select 
                    className="appearance-none bg-background/50 border border-default rounded-2xl pl-4 pr-10 py-3 text-[10px] font-black uppercase tracking-widest text-foreground outline-none focus:border-sky-500 transition-all cursor-pointer"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Global Filter</option>
                    <option value="paid">Authorized - Paid</option>
                    <option value="sent">Dispatched - Sent</option>
                    <option value="overdue">Critical - Overdue</option>
                    <option value="draft">Prototype - Draft</option>
                  </select>
                  <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
               </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background/30 border-b border-default">
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.2em]">Transaction ID</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.2em]">Client / Entity</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.2em]">Quantum (₹)</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.2em]">Epoch Logic</th>
                  <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.2em]">Registry State</th>
                  <th className="px-8 py-5 text-right text-[9px] font-black text-muted uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default/10">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-sky-500/[0.02] transition-colors group">
                    <td className="px-8 py-6 font-black text-xs text-foreground tracking-widest">{inv.id}</td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl ${inv.type === 'receivable' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'} flex items-center justify-center`}>
                             {inv.type === 'receivable' ? <ArrowUpRight size={18} strokeWidth={2.5} /> : <ArrowDownLeft size={18} strokeWidth={2.5} />}
                          </div>
                          <div>
                             <p className="text-sm font-black text-foreground">{inv.client}</p>
                             <p className="text-[10px] font-black text-muted uppercase tracking-widest leading-none">{inv.type}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-sm font-black text-foreground">{formatCurrency(inv.amount)}</p>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-muted uppercase tracking-widest">Due: {inv.dueDate}</span>
                          <span className="text-[9px] font-bold text-muted/60">Issued: {inv.date}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                             inv.status === 'paid' ? 'bg-emerald-500' : 
                             inv.status === 'sent' ? 'bg-sky-500' : 
                             inv.status === 'overdue' ? 'bg-rose-500' : 'bg-slate-400'
                          }`} />
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                             inv.status === 'paid' ? 'text-emerald-600' : 
                             inv.status === 'sent' ? 'text-sky-600' : 
                             inv.status === 'overdue' ? 'text-rose-600' : 'text-muted'
                          }`}>
                             {inv.status}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2">
                          <button className="p-2 rounded-xl border border-default hover:bg-[hsl(var(--surface-raised))] transition-all text-muted hover:text-foreground">
                             <Download size={14} />
                          </button>
                          <button className="p-2 rounded-xl border border-default hover:bg-[hsl(var(--surface-raised))] transition-all text-muted hover:text-foreground">
                             <MoreVertical size={14} />
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
