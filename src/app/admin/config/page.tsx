"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatCurrency } from "@/lib/utils";
import axios from "axios";
import { Info, Settings, TrendingUp, IndianRupee, ChevronDown } from "lucide-react";

interface Config {
  company_revenue: number;
  profit_percentage: number;
  expense_percentage: number;
  company_stage: string;
  equity_min_percentage: number;
  equity_max_percentage: number;
  vesting_days: number;
  bonus_percentage_1m: number;
  bonus_percentage_2m: number;
  claim_limit: number;
  payout_pool_amount: number;
  payout_capacity: "HIGH" | "MODERATE" | "LOW";
  current_claim_cycle: number;
  cycle_reset_date: string;
}

export default function AdminConfigPage() {
  const { user } = useAuth();

  if (user && user.role !== "super_admin") {
    return (
      <DashboardShell title="System Configuration">
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-red-500">Access denied. Only Super Admin can view this page.</p>
        </div>
      </DashboardShell>
    );
  }
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState<Partial<Config>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await axios.get("/api/config");
      setConfig(res.data.config);
      setForm(res.data.config);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.patch("/api/config", form);
      setConfig(res.data.config);
      setForm(res.data.config);
      alert("System config saved!");
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  const n = (key: keyof Config) => form[key] as number;
  const profitAmount = ((n("company_revenue") || 0) * (n("profit_percentage") || 0)) / 100;
  const expenseAmount = ((n("company_revenue") || 0) * (n("expense_percentage") || 0)) / 100;

  return (
    <DashboardShell 
      title="System Archetype" 
      subtitle="Calibrate global financial parameters and authorize operational yield logic"
      actions={
        <div className="flex gap-3">
          <button 
             onClick={handleSave}
             disabled={saving}
             className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl disabled:opacity-50"
          >
             {saving ? "Synchronizing..." : "Authorize Archetype"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-10">
        <div className="flex items-center gap-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-6 py-5 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-600">
             <Info size={20} strokeWidth={2.5} />
          </div>
          <div className="text-sm">
             <p className="font-black text-foreground uppercase tracking-[0.2em] text-[10px] mb-0.5">Terminal Authority: SUPER_ADMIN</p>
             <p className="text-muted font-bold text-xs">Modifications to these parameters override organizational logic and affect all financial yields immediately.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="relative flex items-center justify-center">
               <div className="h-16 w-16 animate-spin rounded-full border-4 border-default border-t-sky-600" />
               <Settings size={20} className="absolute text-sky-600 animate-pulse" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-12">
            {/* Main Financial Architecture */}
            <div className="page-card !mb-0 p-10 shadow-2xl border border-default border-t-8 border-t-sky-600 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <TrendingUp size={160} strokeWidth={1} />
               </div>

               <div className="flex justify-between items-end mb-12 relative z-10">
                  <div>
                     <h3 className="text-sm font-black text-foreground uppercase tracking-[0.4em] mb-2">Core Financial Architecture</h3>
                     <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-60">High-Level yield & capitalization targets</p>
                  </div>
                  <div className="hidden md:flex gap-4">
                     <div className="px-4 py-2 rounded-xl bg-[hsl(var(--surface-raised))] border border-default text-[10px] font-black uppercase tracking-widest text-muted">
                        State: <span className="text-sky-600">{form.company_stage}</span>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 relative z-10">
                  <div className="lg:col-span-3 space-y-10">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Annual Yield Target (₹)</label>
                           <div className="relative group">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-black text-xs">₹</span>
                              <input
                                 type="number"
                                 min={0}
                                 value={n("company_revenue")}
                                 onChange={(e) => setForm({ ...form, company_revenue: parseFloat(e.target.value) || 0 })}
                                 className="w-full rounded-2xl border border-default bg-[hsl(var(--surface-raised))] pl-10 pr-4 py-4 text-base font-black text-foreground outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all"
                              />
                           </div>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Operational Epoch</label>
                           <input
                              type="text"
                              value={form.company_stage ?? ""}
                              onChange={(e) => setForm({ ...form, company_stage: e.target.value })}
                              className="w-full rounded-2xl border border-default bg-[hsl(var(--surface-raised))] px-6 py-4 text-base font-black text-foreground outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all uppercase tracking-widest"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Equity Baseline (%)</label>
                           <div className="relative">
                              <input
                                 type="number"
                                 step="0.1"
                                 value={form.equity_min_percentage ?? 0}
                                 onChange={(e) => setForm({ ...form, equity_min_percentage: parseFloat(e.target.value) || 0 })}
                                 className="w-full rounded-2xl border border-default bg-[hsl(var(--surface-raised))] px-6 py-4 text-base font-black text-foreground outline-none focus:border-sky-500 transition-all"
                              />
                              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-muted font-black text-xs">%</span>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Equity Ceiling (%)</label>
                           <div className="relative">
                              <input
                                 type="number"
                                 step="0.1"
                                 value={form.equity_max_percentage ?? 0}
                                 onChange={(e) => setForm({ ...form, equity_max_percentage: parseFloat(e.target.value) || 0 })}
                                 className="w-full rounded-2xl border border-default bg-[hsl(var(--surface-raised))] px-6 py-4 text-base font-black text-foreground outline-none focus:border-sky-500 transition-all"
                              />
                              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-muted font-black text-xs">%</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-2 p-10 rounded-3xl bg-[hsl(var(--surface-raised))] border border-default shadow-inner relative overflow-hidden group/pl">
                     <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/pl:rotate-12 transition-transform">
                        <IndianRupee size={100} strokeWidth={1} />
                     </div>
                     <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-10 text-center">Liquidity Projection Filter</h4>
                     
                     <div className="space-y-10 relative z-10">
                        <div className="space-y-5">
                           <div className="flex justify-between items-center px-2">
                              <span className="text-[11px] font-black text-foreground uppercase tracking-widest">Yield Captured</span>
                              <span className="text-xl font-black text-emerald-600 tracking-tighter">{n("profit_percentage")}%</span>
                           </div>
                           <div className="relative pt-2">
                              <input
                                 type="range"
                                 min={0}
                                 max={100}
                                 value={n("profit_percentage")}
                                 onChange={(e) => {
                                    const profit = parseInt(e.target.value);
                                    setForm({ ...form, profit_percentage: profit, expense_percentage: 100 - profit });
                                 }}
                                 className="w-full h-3 bg-default rounded-full appearance-none cursor-pointer accent-emerald-500"
                              />
                              <div className="flex justify-between text-[8px] font-black text-muted uppercase tracking-widest mt-3 px-1">
                                 <span>Conservative</span>
                                 <span>Aggressive</span>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-default/50">
                           <div className="space-y-1">
                              <p className="text-[9px] font-black text-muted uppercase tracking-widest">Projected Alpha</p>
                              <p className="text-lg font-black text-emerald-600 tracking-tight">{formatCurrency(profitAmount)}</p>
                           </div>
                           <div className="space-y-1 text-right">
                              <p className="text-[9px] font-black text-muted uppercase tracking-widest">OpEx Threshold</p>
                              <p className="text-lg font-black text-rose-600 tracking-tight">{formatCurrency(expenseAmount)}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               {/* Growth & Retention */}
               <div className="page-card !mb-0 p-10 shadow-xl border border-default hover:border-sky-500/30 transition-all flex flex-col">
                  <div className="flex items-center gap-4 mb-12">
                     <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                        <TrendingUp size={24} strokeWidth={2.5} />
                     </div>
                     <div>
                        <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em]">Yield Velocity</h3>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Retention & Vesting Parameters</p>
                     </div>
                  </div>
                  
                  <div className="space-y-10 flex-grow">
                     <div className="space-y-5">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                           <span className="text-muted">Capacitation Duration</span>
                           <span className="text-sky-600 bg-sky-500/10 px-3 py-1 rounded-full">{n("vesting_days")} Cycles</span>
                        </div>
                        <input type="range" min={1} max={365} value={n("vesting_days")} onChange={(e) => setForm({ ...form, vesting_days: parseInt(e.target.value) })} className="w-full h-2 bg-default rounded-full appearance-none cursor-pointer accent-sky-600" />
                     </div>

                     <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-5">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                              <span className="text-muted">B1 (30D)</span>
                              <span className="text-emerald-600">+{n("bonus_percentage_1m")}%</span>
                           </div>
                           <input type="range" min={0} max={50} value={n("bonus_percentage_1m")} onChange={(e) => setForm({ ...form, bonus_percentage_1m: parseInt(e.target.value) })} className="w-full h-1.5 bg-default rounded-full appearance-none cursor-pointer accent-emerald-500" />
                        </div>
                        <div className="space-y-5">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                              <span className="text-muted">B2 (60D)</span>
                              <span className="text-emerald-600">+{n("bonus_percentage_2m")}%</span>
                           </div>
                           <input type="range" min={0} max={50} value={n("bonus_percentage_2m")} onChange={(e) => setForm({ ...form, bonus_percentage_2m: parseInt(e.target.value) })} className="w-full h-1.5 bg-default rounded-full appearance-none cursor-pointer accent-emerald-500" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Payout Engine */}
               <div className="page-card !mb-0 p-10 shadow-xl border border-default hover:border-purple-500/30 transition-all flex flex-col">
                  <div className="flex items-center gap-4 mb-12">
                     <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                        <Settings size={24} strokeWidth={2.5} />
                     </div>
                     <div>
                        <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em]">Payout Reactor</h3>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Liquidity & Concurrency Control</p>
                     </div>
                  </div>

                  <div className="space-y-10 flex-grow">
                     <div className="space-y-5">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                           <span className="text-muted">Parallel Authorization Limit</span>
                           <span className="text-purple-600 bg-purple-500/10 px-3 py-1 rounded-full">{n("claim_limit")} Units</span>
                        </div>
                        <input type="range" min={1} max={200} value={n("claim_limit")} onChange={(e) => setForm({ ...form, claim_limit: parseInt(e.target.value) })} className="w-full h-2 bg-default rounded-full appearance-none cursor-pointer accent-purple-600" />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Live Payout Pool (₹)</label>
                           <input type="number" value={n("payout_pool_amount")} onChange={(e) => setForm({ ...form, payout_pool_amount: parseFloat(e.target.value) })} className="w-full rounded-2xl border border-default bg-[hsl(var(--surface-raised))] px-6 py-4 text-base font-black text-foreground outline-none focus:border-purple-500 transition-all tracking-tighter" />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Reactor Health Mode</label>
                           <div className="relative">
                              <select
                                 value={form.payout_capacity}
                                 onChange={(e) => setForm({ ...form, payout_capacity: e.target.value as Config["payout_capacity"] })}
                                 className="w-full appearance-none rounded-2xl border border-default bg-[hsl(var(--surface-raised))] px-6 py-4 text-[11px] font-black text-foreground outline-none focus:border-purple-500 transition-all cursor-pointer uppercase tracking-widest"
                              >
                                 <option value="HIGH">Optimal Flow — High</option>
                                 <option value="MODERATE">Standard State — Mid</option>
                                 <option value="LOW">Throttled — Critical</option>
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                                <ChevronDown size={14} strokeWidth={3} />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Global Live State Footer */}
            {config && (
              <div className="page-card !mb-0 p-10 bg-slate-900 dark:bg-slate-100 border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
                    <Settings size={120} strokeWidth={1} className="text-white dark:text-slate-900" />
                 </div>
                 
                 <div className="flex items-center gap-3 mb-10 relative z-10">
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <h3 className="text-[10px] font-black text-white dark:text-slate-900 uppercase tracking-[0.4em]">Aggregated Manifest — Live System State</h3>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10 relative z-10">
                    {[
                      { l: "Revenue Target", v: formatCurrency(config.company_revenue), c: "text-sky-400 dark:text-sky-600" },
                      { l: "Reactor Pool", v: formatCurrency(config.payout_pool_amount), c: "text-purple-400 dark:text-purple-600" },
                      { l: "Archetype Stage", v: config.company_stage, c: "text-white dark:text-slate-900" },
                      { l: "Yield Factor", v: `${config.profit_percentage}%`, c: "text-emerald-400 dark:text-emerald-600" },
                      { l: "Cycle Registry", v: `#${config.current_claim_cycle}`, c: "text-white dark:text-slate-900" },
                      { l: "Lockdown Epoch", v: `${config.vesting_days} Days`, c: "text-amber-400 dark:text-amber-600" },
                    ].map(st => (
                      <div key={st.l} className="space-y-2">
                         <p className="text-[8px] font-black text-white/40 dark:text-slate-900/40 uppercase tracking-[0.2em]">{st.l}</p>
                         <p className={`text-sm font-black tracking-widest ${st.c}`}>{st.v}</p>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
