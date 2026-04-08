"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  BarChart3, 
  Search, 
  Plus, 
  MoreVertical, 
  Target, 
  PhoneCall, 
  FileText, 
  Briefcase,
  Trophy,
  Filter,
  Users,
  Clock
} from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const PIPELINE_DATA = {
  "NEW": [
    { id: "L-101", company: "Zomato India", value: 1250000, contact: "Rahul Jain", priority: "High", age: "2 days" },
    { id: "L-102", company: "Rivian Automotive", value: 4500000, contact: "Sarah M.", priority: "Critical", age: "5 hours" },
  ],
  "CONTACTED": [
    { id: "L-103", company: "Paytm Payments", value: 850000, contact: "Vivek Goyal", priority: "Medium", age: "1 week" },
  ],
  "PROPOSAL": [
    { id: "L-104", company: "BYJU'S Learning", value: 3200000, contact: "Sneha R.", priority: "High", age: "4 days" },
    { id: "L-105", company: "Ola Electric", value: 950000, contact: "Bhavish A.", priority: "Medium", age: "3 days" },
  ],
  "NEGOTIATION": [
    { id: "L-106", company: "Tesla Energy", value: 45000000, contact: "Elon M.", priority: "Critical", age: "1 day" },
  ],
  "WON/LOST": [
    { id: "L-107", company: "Swiggy Limited", value: 1500000, contact: "Sriharsha M.", priority: "High", age: "Won", status: "WON" },
  ]
};

const STAGES = [
  { key: "NEW", label: "Acquisition", icon: Target, color: "sky" },
  { key: "CONTACTED", label: "Engagement", icon: PhoneCall, color: "purple" },
  { key: "PROPOSAL", label: "Architecture", icon: FileText, color: "amber" },
  { key: "NEGOTIATION", label: "Synergy", icon: Clock, color: "rose" },
  { key: "WON/LOST", label: "Convergence", icon: Trophy, color: "emerald" },
];

export default function CRMPipelinePage() {
  const [search, setSearch] = useState("");

  return (
    <DashboardShell 
      title="Strategic Deal Pipeline" 
      subtitle="Visual deal architecture and revenue acquisition trajectory monitor"
      actions={
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-card border border-default p-3 hover:border-sky-500/30 transition-all font-black uppercase text-[10px] tracking-widest text-muted hover:text-foreground">
            <Filter size={14} /> Analytics View
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
             <Plus size={16} strokeWidth={3} />
             New Opportunity
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-10 h-full">
         {/* Pipeline Search */}
         <div className="relative group max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-sky-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Locate strategic opportunities or entity contacts..."
              className="w-full bg-card border border-default rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>

         {/* Kanban Board */}
         <div className="flex gap-6 overflow-x-auto pb-10 min-h-[600px] scrollbar-hide">
            {STAGES.map((stage) => {
               const deals = PIPELINE_DATA[stage.key as keyof typeof PIPELINE_DATA] || [];
               const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
               
               return (
                 <div key={stage.key} className="flex-shrink-0 w-80 flex flex-col gap-6">
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-${stage.color}-500/10 flex items-center justify-center`} style={{ color: `var(--${stage.color}-600)` }}>
                             <stage.icon size={16} strokeWidth={2.5} />
                          </div>
                          <div>
                             <h4 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">{stage.label}</h4>
                             <p className="text-[8px] font-black text-muted uppercase tracking-widest">{deals.length} Opportunities</p>
                          </div>
                       </div>
                       <p className="text-[10px] font-black text-muted tracking-tight">{formatCurrency(totalValue)}</p>
                    </div>

                    {/* Column Body */}
                    <div className="flex-grow space-y-4 p-2 rounded-3xl bg-default/10 border border-default/30 border-dashed min-h-[500px]">
                       {deals.map((deal) => (
                         <div key={deal.id} className="page-card !mb-0 p-5 border border-default hover:border-sky-500/30 shadow-lg cursor-pointer group active:scale-95 transition-all">
                            <div className="flex justify-between items-start mb-4">
                               <div className="px-2 py-0.5 rounded-full bg-default text-[8px] font-black uppercase tracking-widest text-muted">
                                  {deal.id}
                               </div>
                               <button className="text-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical size={14} />
                               </button>
                            </div>

                            <h5 className="text-sm font-black text-foreground uppercase tracking-tight mb-1 group-hover:text-sky-600 transition-colors uppercase leading-tight">
                               {deal.company}
                            </h5>
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest leading-none mb-6">
                               {deal.contact}
                            </p>

                            <div className="flex justify-between items-end">
                               <div>
                                  <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Deal Quantum</p>
                                  <p className="text-sm font-black text-foreground tracking-tight">{formatCurrency(deal.value)}</p>
                                </div>
                                <div className="text-right">
                                   <div className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest mb-1 ${
                                      deal.priority === 'Critical' ? 'text-rose-600' : 'text-muted'
                                   }`}>
                                      <Clock size={10} />
                                      {deal.age}
                                   </div>
                                   <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                      deal.priority === 'Critical' ? 'bg-rose-500/10 text-rose-600' : 
                                      deal.priority === 'High' ? 'bg-amber-500/10 text-amber-600' : 'bg-sky-500/10 text-sky-600'
                                   }`}>
                                      {deal.priority}
                                   </div>
                                </div>
                            </div>
                         </div>
                       ))}
                       
                       <button className="w-full py-4 rounded-2xl border border-default/50 border-dashed text-muted hover:text-sky-600 hover:border-sky-500/30 transition-all flex items-center justify-center gap-2 group">
                          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Inject Lead</span>
                       </button>
                    </div>
                 </div>
               );
            })}
         </div>
      </div>
    </DashboardShell>
  );
}
