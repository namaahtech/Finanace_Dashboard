"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Activity, 
  Users, 
  DollarSign, 
  Download, 
  Calendar,
  Layers,
  Zap,
  Layout,
  ExternalLink
} from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState("Last 6 Months");

  return (
    <DashboardShell 
      title="Architecture Intelligence" 
      subtitle="Comprehensive data visualization and heuristic analysis of organizational yield parameters"
      actions={
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-card border border-default p-3 hover:border-sky-500/30 transition-all font-black uppercase text-[10px] tracking-widest text-muted hover:text-foreground">
            <Calendar size={14} />
            {timeframe}
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
             <Download size={15} /> Export Registry
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-10">
        {/* Core Yield Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[
             { label: "Net Operational Yield", value: "₹4.82 Cr", delta: "+18.4%", icon: TrendingUp, color: "emerald" },
             { label: "Aggregate Opex", value: "₹1.15 Cr", delta: "-4.2%", icon: TrendingDown, color: "sky" },
             { label: "Resource Efficiency", value: "94.2%", delta: "+2.1%", icon: Activity, color: "purple" },
             { label: "Strategic Growth", value: "+22.5%", delta: "+5.0%", icon: Zap, color: "amber" },
           ].map((stat, i) => (
             <div key={i} className="page-card !mb-0 p-8 border border-default hover:border-sky-500/20 shadow-xl group transition-all cursor-crosshair">
                <div className="flex justify-between items-start mb-6">
                   <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center`} style={{ color: `var(--${stat.color}-600)` }}>
                      <stat.icon size={24} strokeWidth={2.5} />
                   </div>
                   <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
                      stat.delta.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                   }`}>
                      {stat.delta}
                   </div>
                </div>
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-foreground tracking-tighter">{stat.value}</p>
             </div>
           ))}
        </div>

        {/* Central Visualization Engine */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 page-card !mb-0 p-10 border border-default shadow-2xl relative overflow-hidden group/chart">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/chart:opacity-10 transition-opacity">
                 <BarChart3 size={200} strokeWidth={1} />
              </div>
              <div className="flex justify-between items-end mb-12">
                 <div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-[0.4em] mb-2">Yield Architecture Graph</h3>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Revenue vs Expenditure Correlation</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-sky-500" />
                       <span className="text-[8px] font-black uppercase tracking-widest text-muted">Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-rose-500" />
                       <span className="text-[8px] font-black uppercase tracking-widest text-muted">Expense</span>
                    </div>
                 </div>
              </div>

              {/* Mock Chart Visualization */}
              <div className="h-64 flex items-end justify-between gap-4 pt-10">
                 {[40, 65, 45, 85, 55, 95, 75, 80, 65, 90, 85, 100].map((h, i) => (
                   <div key={i} className="flex-grow flex flex-col items-center gap-2 group/bar">
                      <div className="w-full flex justify-center items-end gap-1 h-full">
                         <div 
                           className="w-full bg-sky-500/20 group-hover/bar:bg-sky-500 transition-all cursor-pointer rounded-t-lg" 
                           style={{ height: `${h}%` }}
                         />
                         <div 
                           className="w-full bg-rose-500/20 group-hover/bar:bg-rose-500 transition-all cursor-pointer rounded-t-lg" 
                           style={{ height: `${h * 0.4}%` }}
                         />
                      </div>
                      <span className="text-[8px] font-black text-muted uppercase opacity-40">M{i+1}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="page-card !mb-0 p-10 border border-default shadow-2xl flex flex-col">
              <div className="flex items-center gap-4 mb-12">
                 <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                    <Layers size={24} strokeWidth={2.5} />
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em]">Resource Logic</h3>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Team Cost Distribution</p>
                 </div>
              </div>

              <div className="space-y-8 flex-grow">
                 {[
                   { t: "Engineering", v: "42%", c: "sky" },
                   { t: "Operations", v: "28%", c: "emerald" },
                   { t: "Growth/Sales", v: "15%", c: "rose" },
                   { t: "Leadership", v: "10%", c: "purple" },
                   { t: "Marketing", v: "5%", c: "amber" },
                 ].map((team) => (
                   <div key={team.t} className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                         <span className="text-muted">{team.t}</span>
                         <span className={`text-${team.c}-600`}>{team.v}</span>
                      </div>
                      <div className="h-1.5 w-full bg-default rounded-full overflow-hidden">
                         <div className={`h-full bg-current rounded-full`} style={{ width: team.v, color: `var(--${team.c}-600)` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Power BI Intelligence Terminal */}
        <div className="page-card !mb-0 p-0 border-none shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] bg-slate-900 rounded-[2.5rem] overflow-hidden group">
           <div className="p-10 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                    <Layout size={24} strokeWidth={2.5} />
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Power BI Intelligence Node</h3>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Integrated Advanced Analytical Dashboard</p>
                 </div>
              </div>
              <button className="flex items-center gap-2 text-[10px] font-black text-white/60 hover:text-sky-400 uppercase tracking-widest transition-colors">
                 Full Horizon Access <ExternalLink size={14} />
              </button>
           </div>
           
           <div className="aspect-video w-full bg-white/[0.02] flex items-center justify-center relative group-hover:bg-white/[0.04] transition-colors">
              <div className="flex flex-col items-center gap-6 animate-pulse">
                <div className="w-20 h-20 rounded-3xl border-2 border-white/20 flex items-center justify-center">
                   <BarChart3 size={40} className="text-white/20" />
                </div>
                <div className="text-center">
                   <p className="text-sm font-black text-white/40 uppercase tracking-[0.4em]">Establishing Remote Logic Connection</p>
                   <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2">Authenticating Analytics Endpoint...</p>
                </div>
              </div>
              
              {/* Decorative Scan Line */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-500/5 to-transparent h-1/2 w-full animate-scroll-vertical pointer-events-none" />
           </div>
        </div>
      </div>
      
      <style>{`
         @keyframes scroll-vertical {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(200%); }
         }
         .animate-scroll-vertical {
            animation: scroll-vertical 4s linear infinite;
         }
      `}</style>
    </DashboardShell>
  );
}
