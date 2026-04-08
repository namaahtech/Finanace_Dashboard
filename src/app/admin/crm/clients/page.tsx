"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  Building2, 
  Search, 
  Mail, 
  Phone, 
  IndianRupee, 
  Calendar, 
  Plus, 
  Filter, 
  ArrowUpRight,
  ChevronRight,
  BadgeCheck,
  MoreHorizontal
} from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const CLIENTS_DATA = [
  { id: "CL-001", company: "Zomato Private Limited", contact: "Rahul Jain", email: "rahul@zomato.com", phone: "+91 98XXX XXXXX", revenue: 4500000, activeDeals: 2, lastActivity: "2 hours ago", status: "Key Account" },
  { id: "CL-002", company: "Rivian Automotive", contact: "Sarah M.", email: "sarah@rivian.com", phone: "+1 415 XXX XXXX", revenue: 1250000, activeDeals: 1, lastActivity: "1 day ago", status: "Strategic" },
  { id: "CL-003", company: "Paytm Payments Bank", contact: "Vivek Goyal", email: "vivek@paytm.com", phone: "+91 97XXX XXXXX", revenue: 850000, activeDeals: 0, lastActivity: "3 days ago", status: "Standard" },
  { id: "CL-004", company: "BYJU'S Learning", contact: "Sneha R.", email: "sneha@byjus.com", phone: "+91 96XXX XXXXX", revenue: 3200000, activeDeals: 1, lastActivity: "5 hours ago", status: "Key Account" },
  { id: "CL-005", company: "Tesla Energy India", contact: "Elon M.", email: "elon@tesla.com", phone: "+1 650 XXX XXXX", revenue: 45000000, activeDeals: 1, lastActivity: "10 mins ago", status: "Strategic" },
  { id: "CL-006", company: "Swiggy Limited", contact: "Sriharsha M.", email: "sriharsha@swiggy.in", phone: "+91 95XXX XXXXX", revenue: 1500000, activeDeals: 0, lastActivity: "1 week ago", status: "Standard" },
];

export default function CRMClientsPage() {
  const [search, setSearch] = useState("");

  const filtered = CLIENTS_DATA.filter(c => 
    c.company.toLowerCase().includes(search.toLowerCase()) || 
    c.contact.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell 
      title="Global Client Registry" 
      subtitle="Comprehensive architectural manifest of organizational partnerships and revenue contributions"
      actions={
        <button className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
          <Plus size={16} strokeWidth={3} />
          Onboard Entity
        </button>
      }
    >
      <div className="flex flex-col gap-10">
        {/* Header Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[
             { label: "Total Asset Base", value: formatCurrency(56300000), icon: IndianRupee, color: "sky" },
             { label: "Strategic Partners", value: "18", icon: BadgeCheck, color: "emerald" },
             { label: "Retention Rate", value: "98.2%", icon: ArrowUpRight, color: "purple" },
             { label: "Pending Renewals", value: "05", icon: Calendar, color: "amber" },
           ].map((stat, i) => (
             <div key={i} className="page-card !mb-0 p-6 flex items-center justify-between group hover:-translate-y-1 transition-all border border-default">
                <div>
                   <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                   <p className="text-xl font-black text-foreground tracking-tight">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center`} style={{ color: `var(--${stat.color}-600)` }}>
                   <stat.icon size={24} strokeWidth={2.5} />
                </div>
             </div>
           ))}
        </div>

        {/* Workspace Controls */}
        <div className="flex flex-col md:row-row justify-between items-center gap-6">
           <div className="relative w-full md:w-96 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-sky-600 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Locate client entity by name or contact..."
                className="w-full bg-card border border-default rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           <div className="flex gap-4">
              <button className="flex items-center gap-2 p-4 rounded-2xl bg-card border border-default text-muted hover:text-foreground transition-all">
                 <Filter size={18} />
                 <span className="text-[10px] font-black uppercase tracking-widest hidden md:block text-muted">Filter Parameters</span>
              </button>
           </div>
        </div>

        {/* Client Registry Table */}
        <div className="page-card !p-0 overflow-hidden border border-default shadow-2xl">
           <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                 <thead>
                    <tr className="bg-[hsl(var(--surface-raised))] border-b border-default">
                       <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">Entity Identity</th>
                       <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">Functional Liaison</th>
                       <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">Revenue Contribution</th>
                       <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">Temporal Delta</th>
                       <th className="px-8 py-5 text-left text-[9px] font-black text-muted uppercase tracking-[0.3em]">Tier Classification</th>
                       <th className="px-8 py-5 text-right text-[9px] font-black text-muted uppercase tracking-[0.3em]">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-default/10">
                    {filtered.map((client) => (
                      <tr key={client.id} className="hover:bg-sky-500/[0.02] transition-all group">
                         <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                                  <Building2 size={20} strokeWidth={2.5} />
                               </div>
                               <div>
                                  <p className="text-sm font-black text-foreground uppercase tracking-tight leading-tight">{client.company}</p>
                                  <p className="text-[10px] font-black text-muted uppercase tracking-widest">{client.id}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex flex-col gap-1">
                               <p className="text-xs font-bold text-foreground">{client.contact}</p>
                               <div className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest">
                                  <Mail size={12} />
                                  <span>{client.email}</span>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex flex-col">
                               <p className="text-sm font-black text-emerald-600 tracking-tight">{formatCurrency(client.revenue)}</p>
                               <p className="text-[10px] font-black text-muted uppercase tracking-widest">{client.activeDeals} Active Cycles</p>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest bg-default/10 w-fit px-3 py-1 rounded-full">
                               <Calendar size={12} />
                               {client.lastActivity}
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                               client.status === 'Strategic' ? 'bg-purple-500/10 text-purple-600' :
                               client.status === 'Key Account' ? 'bg-sky-500/10 text-sky-600' : 'bg-slate-500/10 text-slate-500'
                            }`}>
                               {client.status}
                            </span>
                         </td>
                         <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2">
                               <button className="p-2 rounded-xl border border-default hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-all text-muted">
                                  <ChevronRight size={16} strokeWidth={3} />
                               </button>
                               <button className="p-2 rounded-xl text-muted hover:text-foreground">
                                  <MoreHorizontal size={16} />
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
