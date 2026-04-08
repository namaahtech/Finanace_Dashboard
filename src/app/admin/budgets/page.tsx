"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  BarChart3, 
  Search, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  ArrowUpRight,
  Filter,
  DollarSign,
  PieChart
} from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const TEAM_BUDGETS = [
  { team: "Engineering Delta", budget: 1200000, spent: 850000, color: "sky" },
  { team: "Growth Ops (Sales)", budget: 450000, spent: 485000, color: "rose" },
  { team: "Finance Alpha", budget: 250000, spent: 95000, color: "emerald" },
  { team: "Human Capital (HR)", budget: 180000, spent: 172000, color: "amber" },
  { team: "Marketing & PR", budget: 620000, spent: 590000, color: "purple" },
  { team: "Customer Success", budget: 300000, spent: 120000, color: "blue" },
  { team: "Product Strategy", budget: 550000, spent: 540000, color: "slate" },
  { team: "Legal & Compliance", budget: 150000, spent: 45000, color: "indigo" },
];

export default function TeamBudgetsPage() {
  const [month, setMonth] = useState("April");
  const [search, setSearch] = useState("");

  const filtered = TEAM_BUDGETS.filter(b => b.team.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardShell 
      title="Strategic Budget Allocation" 
      subtitle="Calibrate team-wise operational margins and track real-time liquidity consumption"
      actions={
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-card border border-default p-3 hover:border-sky-500/30 transition-all font-black uppercase text-[10px] tracking-widest text-muted hover:text-foreground">
            <Calendar size={14} />
            {month} 2026
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
             Update Targets
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-10">
        {/* Global Consumption Overview */}
        <div className="page-card !mb-0 p-10 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
              <PieChart size={180} strokeWidth={1} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 dark:text-slate-900/40 mb-4">Total Liquidity Reservoir</p>
                 <h2 className="text-4xl font-black tracking-tighter">₹37,00,000</h2>
                 <p className="text-xs font-bold text-emerald-400 dark:text-emerald-600 mt-2 flex items-center gap-2">
                    <TrendingUp size={14} /> +12% vs last cycle
                 </p>
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 dark:text-slate-900/40 mb-4">Aggregated Consumption</p>
                 <h2 className="text-4xl font-black tracking-tighter text-sky-400 dark:text-sky-600">₹28,92,000</h2>
                 <p className="text-xs font-bold text-sky-400/60 dark:text-sky-600/60 mt-2 italic">78.1% Capacity Utilized</p>
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 dark:text-slate-900/40 mb-4">Critical Threshold Alerts</p>
                 <h2 className="text-4xl font-black tracking-tighter text-rose-400 dark:text-rose-600">01 <span className="text-sm font-bold opacity-40 uppercase tracking-widest">Team</span></h2>
                 <p className="text-xs font-bold text-rose-400/60 dark:text-rose-600/60 mt-2">Immediate variance audit required</p>
              </div>
           </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:row-row justify-between items-center gap-6">
           <div className="relative w-full md:w-96 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-sky-600 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Find budget by team archetype..."
                className="w-full bg-card border border-default rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted hover:text-sky-600 transition-colors">
              <Filter size={14} /> Filter Logic
           </button>
        </div>

        {/* Teams Budget Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {filtered.map((b) => {
              const percent = Math.min((b.spent / b.budget) * 100, 100);
              const isOver = b.spent > b.budget;
              const colorClass = isOver ? 'var(--rose-600)' : `var(--${b.color}-600)`;
              
              return (
                <div key={b.team} className="page-card !mb-0 p-8 border border-default hover:border-sky-500/20 shadow-xl group transition-all">
                   <div className="flex justify-between items-start mb-10">
                      <div>
                         <h3 className="text-base font-black text-foreground uppercase tracking-tight leading-tight mb-1">{b.team}</h3>
                         <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] opacity-40">Monthly Strategic Allocation</p>
                      </div>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-card border border-default group-hover:bg-sky-500 transition-all duration-500`}>
                         <BarChart3 size={18} className="text-muted group-hover:text-white transition-colors" />
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex justify-between items-end">
                         <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted uppercase tracking-widest">Consumption</p>
                            <p className={`text-xl font-black tracking-tighter ${isOver ? 'text-rose-600' : 'text-foreground'}`}>{formatCurrency(b.spent)}</p>
                         </div>
                         <div className="text-right space-y-1">
                            <p className="text-[9px] font-black text-muted uppercase tracking-widest text-right">Horizon Target</p>
                            <p className="text-xl font-black text-foreground tracking-tighter opacity-40">{formatCurrency(b.budget)}</p>
                         </div>
                      </div>

                      {/* Progress DNA */}
                      <div className="space-y-3">
                         <div className="h-4 w-full bg-default rounded-full overflow-hidden p-0.5 border border-default shadow-inner">
                            <div 
                              className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" 
                              style={{ 
                                 width: `${percent}%`, 
                                 backgroundColor: colorClass,
                                 boxShadow: `0 0 20px -5px ${colorClass}`
                              }}
                            >
                               <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </div>
                         </div>
                         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className={isOver ? 'text-rose-600 animate-pulse' : 'text-muted'}>
                               {isOver ? <AlertCircle size={10} className="inline mr-1" /> : null}
                               {isOver ? 'Exhausted Authority' : `${(100-percent).toFixed(1)}% Yield Remaining`}
                            </span>
                            <span className="text-foreground">{percent.toFixed(0)}% Utilized</span>
                         </div>
                      </div>
                   </div>

                   <div className="mt-8 pt-6 border-t border-default flex justify-between items-center">
                      <button className="text-[9px] font-black uppercase tracking-widest text-sky-600 hover:text-sky-700 transition-all flex items-center gap-2">
                         Detailed Consumption Audit <ArrowUpRight size={12} />
                      </button>
                      <div className="flex gap-1">
                         {[1,2,3].map(i => (
                            <div key={i} className="w-6 h-6 rounded-full bg-card border border-default shadow-sm hover:-translate-y-1 transition-transform cursor-pointer" />
                         ))}
                      </div>
                   </div>
                </div>
              );
           })}
        </div>
      </div>
    </DashboardShell>
  );
}
