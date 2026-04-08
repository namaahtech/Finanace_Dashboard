"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import axios from "axios";
import { formatCurrency, getYearRange } from "@/lib/utils";
import { calculateCompanyScore, calculateFinalIncentive, getCompanyMultiplier, getEmployeeMultiplier } from "@/lib/incentiveMath";
import { 
  Award, 
  ChevronDown, 
  TrendingUp, 
  Building2, 
  IndianRupee 
} from "lucide-react";

interface User { _id: string; name: string; employeeId: string; department: string; }
interface Incentive {
  _id: string;
  amount: number;
  base_amount: number;
  fixed_amount?: number;
  variable_amount?: number;
  employee_score?: number;
  employee_multiplier?: number;
  company_score?: number;
  company_multiplier?: number;
  status: string;
  month: number;
  year: number;
  createdAt?: string;
  employee: { name: string; employeeId: string };
}

interface ConfigState {
  revenue_achievement_percentage: number;
  collections_percentage: number;
  delivery_health_percentage: number;
}

interface KpiScore {
  final_score: number;
}

export default function AdminIncentivesPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [vestingLoading, setVestingLoading] = useState(false);
  const [savingPerformance, setSavingPerformance] = useState(false);
  const [employeeScore, setEmployeeScore] = useState<number | null>(null);
  const [config, setConfig] = useState<ConfigState>({
    revenue_achievement_percentage: 84,
    collections_percentage: 87,
    delivery_health_percentage: 75,
  });
  const [form, setForm] = useState({
    fixed_amount: "",
    variable_amount: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get("/api/users?limit=100")
      .then((res) => setUsers(res.data.users ?? []));
    axios.get("/api/config").then((res) => {
      const cfg = res.data.config ?? {};
      setConfig({
        revenue_achievement_percentage: cfg.revenue_achievement_percentage ?? 84,
        collections_percentage: cfg.collections_percentage ?? 87,
        delivery_health_percentage: cfg.delivery_health_percentage ?? 75,
      });
    });
  }, []);

  async function loadIncentives(empId?: string) {
    setLoading(true);
    try {
      const url = empId ? `/api/incentives?employeeId=${empId}` : "/api/incentives";
      const res = await axios.get(url);
      setIncentives(res.data.incentives ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedUser) return;
    loadIncentives(selectedUser);
    axios
      .get(`/api/kpi?employeeId=${selectedUser}`)
      .then((res) => {
        const scores = (res.data.scores ?? []) as KpiScore[];
        setEmployeeScore(scores[0]?.final_score ?? null);
      })
      .catch(() => setEmployeeScore(null));
  }, [selectedUser]);

  async function handleAward(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return alert("Select employee");
    setSubmitting(true);
    try {
      const fixedAmount = parseFloat(form.fixed_amount || "0");
      const variableAmount = parseFloat(form.variable_amount || "0");
      if (fixedAmount + variableAmount <= 0) {
        alert("Enter fixed or variable amount");
        return;
      }
      await axios.post(
        "/api/incentives",
        {
          employee: selectedUser,
          fixed_amount: fixedAmount,
          variable_amount: variableAmount,
          month: form.month,
          year: form.year,
          notes: form.notes,
        }
      );
      setForm({
        fixed_amount: "",
        variable_amount: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        notes: "",
      });
      await loadIncentives(selectedUser);
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function processVesting() {
    setVestingLoading(true);
    try {
      const res = await axios.post(
        "/api/incentives",
        { action: "process_vesting" }
      );
      alert(res.data.message);
      if (selectedUser) await loadIncentives(selectedUser);
    } finally {
      setVestingLoading(false);
    }
  }

  async function saveCompanyPerformance() {
    setSavingPerformance(true);
    try {
      await axios.patch("/api/config", config);
      alert("Company performance updated");
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
    } finally {
      setSavingPerformance(false);
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i).toLocaleString("en-IN", { month: "long" }) }));
  const fixedAmount = parseFloat(form.fixed_amount || "0") || 0;
  const variableAmount = parseFloat(form.variable_amount || "0") || 0;
  const companyScore = calculateCompanyScore(
    config.revenue_achievement_percentage,
    config.collections_percentage,
    config.delivery_health_percentage
  );
  const companyMultiplier = getCompanyMultiplier(companyScore);
  const employeeMultiplier = getEmployeeMultiplier(employeeScore);
  const totalAmount = calculateFinalIncentive(
    fixedAmount,
    variableAmount,
    employeeMultiplier,
    companyMultiplier
  );
  const selectedEmployeeName = users.find((u) => u._id === selectedUser)?.name;
  const canEditCompanyPerformance = user?.role === "super_admin";

  return (
    <DashboardShell 
      title="Incentive Architecture" 
      subtitle="Configure organizational yield parameters and authorize individual performance grants"
      actions={
        <div className="flex gap-3">
          {canEditCompanyPerformance && (
             <button 
                onClick={saveCompanyPerformance}
                disabled={savingPerformance}
                className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl disabled:opacity-50"
             >
                {savingPerformance ? "Synchronizing..." : "Authorize Config"}
             </button>
          )}
          <button 
             onClick={processVesting}
             disabled={vestingLoading}
             className="flex items-center gap-2 rounded-xl border border-default bg-[hsl(var(--surface-raised))] px-6 py-3 text-xs font-black text-foreground hover:bg-surface transition-all shadow-sm uppercase tracking-widest"
          >
             {vestingLoading ? "Vesting..." : "Execute Vesting Engine"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-10">
        {/* Company Performance Header Card */}
        <div className="page-card !mb-0 p-8 shadow-xl border border-default border-t-8 border-t-sky-600 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <TrendingUp size={120} strokeWidth={1} />
           </div>
           
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 relative z-10">
              <div>
                 <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em] mb-1">Global Performance Configuration</h3>
                 <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">Cycle Multipliers & Organizational Health</p>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 relative z-10">
              <div className="lg:col-span-2 space-y-8">
                 {[
                    { key: "revenue_achievement_percentage", label: "Revenue Trajectory", color: "sky", icon: <TrendingUp size={14} /> },
                    { key: "collections_percentage", label: "Capital Retrieval Health", color: "emerald", icon: <IndianRupee size={14} /> },
                    { key: "delivery_health_percentage", label: "Operational Velocity", color: "purple", icon: <Building2 size={14} /> },
                 ].map((item) => (
                    <div key={item.key} className="space-y-4">
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <span className={`p-1.5 rounded-lg bg-${item.color}-500/10 text-${item.color}-600`}>
                                {item.icon}
                             </span>
                             <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{item.label}</span>
                          </div>
                          <span className={`text-xs font-black text-${item.color}-600 bg-${item.color}-500/5 px-2 py-0.5 rounded-md`}>{config[item.key as keyof ConfigState]}%</span>
                       </div>
                       <div className="relative h-1.5 w-full bg-default rounded-full overflow-hidden">
                          <div 
                             className={`h-full bg-${item.color}-500 shadow-[0_0_10px_rgba(0,0,0,0.1)] transition-all duration-500`} 
                             style={{ width: `${config[item.key as keyof ConfigState]}%` }} 
                          />
                       </div>
                       <input
                          type="range"
                          min={0}
                          max={120}
                          value={config[item.key as keyof ConfigState]}
                          disabled={!canEditCompanyPerformance}
                          onChange={(e) => setConfig({ ...config, [item.key]: parseInt(e.target.value) })}
                          className="w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer accent-sky-600 disabled:opacity-50"
                       />
                    </div>
                 ))}
              </div>

              <div className="flex flex-col gap-6 lg:border-l lg:border-default lg:pl-10">
                 <div className="p-6 rounded-3xl bg-[hsl(var(--surface-raised))] border border-default shadow-sm group/gauge transition-all hover:border-sky-500/30 flex flex-col items-center text-center">
                    <div className="relative flex items-center justify-center h-28 w-28 mb-4">
                       <svg className="h-full w-full -rotate-90">
                          <circle cx="56" cy="56" r="50" fill="none" stroke="currentColor" strokeWidth="6" className="text-default" />
                          <circle cx="56" cy="56" r="50" fill="none" stroke="url(#company-gauge)" strokeWidth="8" 
                             strokeDasharray="314" strokeDashoffset={314 - (314 * companyScore) / 100}
                             strokeLinecap="round"
                             className="transition-all duration-1000" />
                          <defs>
                             <linearGradient id="company-gauge" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--sky-400)" />
                                <stop offset="100%" stopColor="var(--sky-600)" />
                             </linearGradient>
                          </defs>
                       </svg>
                       <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-black text-foreground tracking-tighter">{companyScore}</span>
                          <span className="text-[8px] font-black text-muted uppercase tracking-widest">Score</span>
                       </div>
                    </div>
                    <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Efficiency Index</h4>
                 </div>
              </div>

              <div className="p-8 rounded-3xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-800 dark:border-slate-200 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Award size={60} strokeWidth={1} />
                 </div>
                 <span className="text-5xl font-black tracking-tighter mb-2 relative z-10">{companyMultiplier.toFixed(1)}<span className="text-2xl opacity-50">x</span></span>
                 <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1 relative z-10">Yield Multiplier</h4>
                 <div className="mt-4 px-3 py-1 rounded-full bg-white/10 dark:bg-black/10 text-[9px] font-black uppercase tracking-widest relative z-10">
                    Global Status: {companyScore >= 80 ? 'EXCELLENT' : 'OPTIMAL'}
                 </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
           {/* Section: Award Form */}
           <div className="lg:col-span-2 space-y-8">
              <div className="page-card !mb-0 p-8 shadow-xl border border-default relative">
                 <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <Award size={18} className="text-sky-600" strokeWidth={3} /> Issue Incentive Grant
                 </h3>
                 <form onSubmit={handleAward} className="space-y-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Target Personnel</label>
                       <div className="relative group">
                          <select
                             value={selectedUser}
                             onChange={(e) => setSelectedUser(e.target.value)}
                             className="w-full appearance-none rounded-xl border border-default bg-[hsl(var(--surface-raised))] pl-4 pr-10 py-3 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all cursor-pointer"
                             required
                          >
                             <option value="">Select Personnel...</option>
                             {users.map((u) => <option key={u._id} value={u._id}>{u.name} — {u.employeeId}</option>)}
                          </select>
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none group-hover:text-sky-600 transition-colors">
                             <ChevronDown size={18} strokeWidth={3} />
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Fiscal Month</label>
                          <select value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })} className="w-full appearance-none rounded-xl border border-default bg-[hsl(var(--surface-raised))] px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all cursor-pointer">
                             {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Fiscal Year</label>
                          <select value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} className="w-full appearance-none rounded-xl border border-default bg-[hsl(var(--surface-raised))] px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all cursor-pointer">
                             {getYearRange().map((y) => <option key={y} value={y}>{y}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Fixed Grant (₹)</label>
                          <div className="relative">
                             <input type="number" min="0" placeholder="0.00" value={form.fixed_amount} onChange={(e) => setForm({ ...form, fixed_amount: e.target.value })} className="w-full rounded-xl border border-default bg-[hsl(var(--surface-raised))] pl-10 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all" />
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">₹</span>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Variable Base (₹)</label>
                          <div className="relative">
                             <input type="number" min="0" placeholder="0.00" value={form.variable_amount} onChange={(e) => setForm({ ...form, variable_amount: e.target.value })} className="w-full rounded-xl border border-default bg-[hsl(var(--surface-raised))] pl-10 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:border-sky-500 transition-all" />
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">₹</span>
                          </div>
                       </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-[hsl(var(--surface-raised))] border border-default shadow-inner space-y-6">
                       <div className="flex justify-between items-center text-[10px] font-black text-muted uppercase tracking-[0.2em]">
                          <span>Valuation Cascade</span>
                          <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600">Calculated Preview</span>
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center">
                             <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-foreground">Performance Cap</span>
                                <span className="text-[9px] text-muted font-black uppercase tracking-wider">Multi: {employeeMultiplier.toFixed(1)}x</span>
                             </div>
                             <span className="text-xs font-black text-sky-600">+{formatCurrency(variableAmount * (employeeMultiplier - 1))}</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-foreground">Global Yield Weight</span>
                                <span className="text-[9px] text-muted font-black uppercase tracking-wider">Multi: {companyMultiplier.toFixed(1)}x</span>
                             </div>
                             <span className={`text-xs font-black ${companyMultiplier >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {companyMultiplier >= 1 ? '+' : '-'}{formatCurrency(Math.abs(variableAmount * employeeMultiplier * (companyMultiplier - 1)))}
                             </span>
                          </div>
                          <div className="pt-6 border-t border-default flex justify-between items-end">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-1">Final Authorization</span>
                                <span className="text-3xl font-black text-emerald-600 tracking-tighter">{formatCurrency(totalAmount)}</span>
                             </div>
                             <Award size={32} strokeWidth={2.5} className="text-emerald-600 opacity-20" />
                          </div>
                       </div>
                    </div>

                    <button
                       type="submit"
                       disabled={submitting || !selectedUser}
                       className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-2xl disabled:opacity-50 disabled:scale-100"
                    >
                       {submitting ? "Processing Grant Authorization..." : "Authorize Incentive Grant"}
                    </button>
                 </form>
              </div>
           </div>

           {/* Section: History List */}
           <div className="lg:col-span-3 space-y-8">
              <div className="page-card !mb-0 p-8 shadow-xl border border-default overflow-hidden relative">
                 <div className="flex justify-between items-center mb-10">
                    <div>
                       <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em] mb-1">Historical Grant Ledger</h3>
                       <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">
                          {selectedUser ? `Filtered for ${selectedEmployeeName}` : "Aggregated Organizational Registry"}
                       </p>
                    </div>
                    {selectedUser && (
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Personnel Context Locked</span>
                       </div>
                    )}
                 </div>

                 {!selectedUser ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-[hsl(var(--surface-raised))] rounded-3xl border border-default group/empty hover:border-sky-500/30 transition-all">
                       <div className="w-16 h-16 rounded-full bg-default flex items-center justify-center mb-6 group-hover/empty:scale-110 transition-transform">
                          <Building2 size={32} strokeWidth={1} className="text-muted" />
                       </div>
                       <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] text-center max-w-[200px] leading-relaxed">Identity definition required to retrieve historical registry logs</p>
                    </div>
                 ) : loading ? (
                    <div className="space-y-6 animate-pulse">
                       {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-[hsl(var(--surface-raised))] rounded-2xl border border-default" />)}
                    </div>
                 ) : incentives.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-[hsl(var(--surface-raised))] rounded-3xl border border-default group/empty hover:border-emerald-500/30 transition-all">
                       <Award size={48} strokeWidth={1} className="text-muted mb-4 opacity-20" />
                       <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">No historical performance grants recorded</p>
                    </div>
                 ) : (
                    <div className="space-y-4">
                       {incentives.map((i) => (
                          <div key={i._id} className="group p-6 rounded-2xl border border-default bg-[hsl(var(--surface-raised))] hover:border-sky-500/50 hover:bg-surface transition-all shadow-sm flex items-center justify-between">
                             <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                   <span className="text-[11px] font-black text-foreground uppercase tracking-widest">
                                      {new Date(i.year, i.month - 1).toLocaleString("en-IN", { month: "short", year: "numeric" })}
                                   </span>
                                   <span className="text-[9px] text-muted font-black uppercase tracking-tighter">Authorized: {i.createdAt ? new Date(i.createdAt).toLocaleDateString("en-IN") : "Cycle Lock"}</span>
                                </div>
                                <div className="hidden md:flex gap-4 border-l border-default pl-6">
                                   <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Base</span>
                                      <span className="text-xs font-bold text-foreground">{formatCurrency(i.fixed_amount || i.base_amount)}</span>
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Variable</span>
                                      <span className="text-xs font-bold text-foreground">{formatCurrency(i.variable_amount || 0)}</span>
                                   </div>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-8">
                                <div className="text-right">
                                   <span className="text-[9px] font-black text-muted uppercase tracking-widest block mb-1">Net Valuation</span>
                                   <span className="text-xl font-black text-emerald-600 tracking-tighter group-hover:scale-105 transition-transform block">{formatCurrency(i.amount)}</span>
                                </div>
                                <div className="w-24 text-right">
                                   <Badge variant={statusBadgeVariant(i.status)} className="px-2 py-1 uppercase text-[8px] font-black tracking-widest">
                                      {i.status}
                                   </Badge>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </DashboardShell>
  );
}
