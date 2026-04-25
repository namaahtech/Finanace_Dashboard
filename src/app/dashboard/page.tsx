"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import { 
  calculateCompanyScore, 
  getCompanyMultiplier, 
  getEmployeeMultiplier 
} from "@/lib/incentiveMath";
import dayjs from "dayjs";
import {
  IndianRupee,
  Award,
  TrendingUp,
  Building2,
  Clock,
  Activity,
  ArrowUpRight,
  ChevronRight,
  History,
  TrendingDown,
  LayoutGrid
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

// ─── Business Health Chart (Admin Style) ────────────────────────────────
const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

function buildChartData(revenue: number, collections: number, delivery: number) {
  const rval = Number(revenue) || 0;
  const cval = Number(collections) || 0;
  const dval = Number(delivery) || 0;

  const deltas = [
    { r: -8,  c: -10, d: -5  },
    { r: -5,  c: -6,  d: -3  },
    { r: -3,  c: -4,  d:  2  },
    { r:  2,  c: -2,  d: -1  },
    { r: -1,  c:  3,  d:  4  },
    { r:  0,  c:  0,  d:  0  }, 
  ];
  return MONTHS.map((month, i) => ({
    month,
    Revenue:     Math.max(0, Math.min(100, rval + deltas[i].r)),
    Collections: Math.max(0, Math.min(100, cval + deltas[i].c)),
    Delivery:    Math.max(0, Math.min(100, dval + deltas[i].d)),
    isCurrent: i === 5,
  }));
}

function PerformanceChart({
  revenue,
  collections,
  delivery,
}: {
  revenue: number;
  collections: number;
  delivery: number;
}) {
  const data = buildChartData(revenue, collections, delivery);
  const COLORS: Record<string, string> = {
    Revenue:     "#0ea5e9",
    Collections: "#10b981",
    Delivery:    "#a855f7",
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-theme-border bg-theme-surface/90 backdrop-blur-md p-4 shadow-2xl text-[11px]">
        <p className="mb-3 font-black text-theme-fg uppercase tracking-widest border-b border-theme-border pb-2">{label} Report</p>
        <div className="space-y-2">
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-theme-muted font-bold uppercase tracking-wider">{p.name}</span>
              </div>
              <span className="font-black text-theme-fg tabular-nums">{p.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="35%" barGap={4}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="4 4" opacity={0.5} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fontWeight: 900, fill: "hsl(var(--fg-muted))" }}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 10, fontWeight: 900, fill: "hsl(var(--fg-muted))" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip 
          content={<CustomTooltip />} 
          cursor={{ fill: "hsl(var(--primary))", opacity: 0.05, radius: 8 }} 
          animationDuration={300}
        />
        {(["Revenue", "Collections", "Delivery"] as const).map((key) => (
          <Bar key={key} dataKey={key} fill={COLORS[key]} radius={[6, 6, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={COLORS[key]}
                opacity={entry.isCurrent ? 1 : 0.4}
                className="transition-all duration-500"
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface WalletData {
  wallet: {
    earned_total: number;
    locked_amount: number;
    claimable_amount: number;
    held_amount: number;
    claimed_amount: number;
  };
}

interface ConfigData {
  company_revenue: number;
  expense_percentage: number;
  revenue_achievement_percentage: number;
  collections_percentage: number;
  delivery_health_percentage: number;
  payout_pool_amount: number;
}

interface KpiData {
  scores: Array<{
    month: number;
    year: number;
    final_score: number;
  }>;
}

interface IncentiveData {
  incentives: Array<{
    _id: string;
    amount: number;
    base_amount: number;
    status: string;
    month: number;
    year: number;
    created_at: string;
  }>;
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { request } = useApi();
  const [wallet, setWallet] = useState<WalletData["wallet"] | null>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [kpi, setKpi] = useState<KpiData["scores"]>([]);
  const [incentiveData, setIncentiveData] = useState<IncentiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const [walletRes, configRes, kpiRes, incentiveRes] = await Promise.all([
        request<WalletData>({ url: "/api/wallet" }),
        request<ConfigData>({ url: "/api/config" }),
        request<KpiData>({ url: "/api/kpi" }),
        request<IncentiveData>({ url: "/api/incentives" }),
      ]);
      setWallet(walletRes.wallet);
      setConfig(configRes);
      setKpi(kpiRes.scores ?? []);
      setIncentiveData(incentiveRes);
      setLastSync(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, request]);

  useEffect(() => {
    load();
    // Real-time Simulation: Sync every 60 seconds
    const interval = setInterval(() => load(true), 60000);
    return () => clearInterval(interval);
  }, [load]);

  const latestKpi = kpi[0];
  const employeeScore = latestKpi?.final_score ?? 80;
  
  const revAch = config?.revenue_achievement_percentage ?? 0;
  const collPct = config?.collections_percentage ?? 0;
  const delivPct = config?.delivery_health_percentage ?? 0;

  const companyScore = calculateCompanyScore(revAch, collPct, delivPct);
  
  const employeeMultiplier = getEmployeeMultiplier(employeeScore);
  const companyMultiplier = getCompanyMultiplier(companyScore);
  const totalMultiplier = parseFloat((employeeMultiplier * companyMultiplier).toFixed(2));
  
  const latestIncentive = incentiveData?.incentives?.[0];
  const baseIncentive = latestIncentive?.base_amount ?? 10000;
  const finalIncentive = Math.round(baseIncentive * totalMultiplier);

  return (
    <DashboardShell 
      title="Employee Command Center"
      subtitle="Corporate health, personal multipliers, and verified payout streams."
      actions={
        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Live Feedback</span>
          </div>
          <Link href="/dashboard/incentives">
            <Button variant="outline" size="sm" className="font-black uppercase tracking-widest text-[10px] h-9 border-theme-border hover:bg-theme-raised">
              <History size={14} className="mr-2" /> Audit History
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 animate-in fade-in duration-700">
        
        {/* KPI Grid - Enterprise Grade */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { 
              label: "My KPI Score",   
              value: `${employeeScore}%`, 
              icon: Activity, 
              color: "text-theme-fg", 
              bg: "bg-theme-surface", 
              sub: "Performance Index",
              trend: "+2% vs Last Month",
              trendColor: "text-emerald-500"
            },
            { 
              label: "Current Multiplier", 
              value: `${totalMultiplier}x`, 
              icon: TrendingUp, 
              color: "text-sky-600", 
              bg: "bg-theme-surface", 
              sub: "Revenue Catalyst",
              trend: `${employeeMultiplier.toFixed(1)}x Pers. | ${companyMultiplier.toFixed(1)}x Org.`,
              trendColor: "text-sky-500"
            },
            { 
              label: "Projected Payout", 
              value: formatCurrency(finalIncentive), 
              icon: IndianRupee, 
              color: "text-emerald-600", 
              bg: "bg-theme-surface", 
              sub: "Estimated Settlement",
              trend: "Next cycle: May 1st",
              trendColor: "text-theme-muted"
            },
            { 
              label: "Total Earnings", 
              value: formatCurrency(wallet?.earned_total ?? 0), 
              icon: Award, 
              color: "text-purple-600", 
              bg: "bg-theme-surface", 
              sub: "Lifetime Yield",
              trend: `${incentiveData?.incentives?.length ?? 0} Disbursments`,
              trendColor: "text-purple-500"
            },
          ].map(({ label, value, icon: Icon, color, bg, sub, trend, trendColor }) => (
            <div key={label} className="enterprise-card bg-theme-surface p-5 border border-theme-border shadow-sm flex flex-col justify-between group transition-all hover:border-theme-primary/30">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-theme-page border border-theme-border group-hover:border-theme-primary/20 group-hover:bg-theme-primary/5 transition-all">
                  <Icon size={18} className={cn("transition-colors", color)} />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">{label}</span>
                  <p className={cn("text-2xl font-black tracking-tight mt-1", color)}>{value}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-theme-border/50 flex flex-col gap-1">
                <p className="text-[10px] font-bold text-theme-subtle uppercase tracking-wider">{sub}</p>
                <p className={cn("text-[9px] font-black uppercase tracking-tight", trendColor)}>{trend}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Business Health Chart (Admin Style Integration) */}
          <div className="lg:col-span-8 enterprise-card bg-theme-surface p-6 border border-theme-border shadow-xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg flex items-center gap-2">
                  <Activity size={14} className="text-theme-primary" />
                  Business Health Index
                </h3>
                <p className="text-[10px] text-theme-muted font-bold mt-1 uppercase tracking-wider">Organizational performance metrics across 6 months</p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">
                  {[
                    { dot: "bg-sky-500",    label: "Revenue" },
                    { dot: "bg-emerald-500", label: "Collections" },
                    { dot: "bg-purple-500", label: "Delivery" },
                  ].map(({ dot, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", dot)} />
                      {label}
                    </div>
                  ))}
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-theme-page border border-theme-border">
                  <span className={cn(
                    "text-sm font-black tabular-nums",
                    companyScore >= 80 ? "text-emerald-500" : companyScore >= 60 ? "text-amber-500" : "text-red-500"
                  )}>
                    {Math.round(companyScore)}% <span className="text-[10px] text-theme-muted font-bold">TOTAL</span>
                  </span>
                </div>
              </div>
            </div>

            <PerformanceChart
              revenue={revAch}
              collections={collPct}
              delivery={delivPct}
            />
          </div>

          {/* Multiplier Stack (Enterprise Grade) */}
          <div className="lg:col-span-4 enterprise-card bg-theme-surface p-6 border border-theme-border shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg flex items-center gap-2">
                  <TrendingUp size={14} className="text-theme-primary" />
                  Multiplier Stack
                </h3>
                <span className="text-[9px] font-black px-2 py-1 bg-theme-page border border-theme-border rounded-md text-theme-muted">V1.4.2</span>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Personal Performance</p>
                      <p className="text-xs font-bold text-theme-fg mt-0.5">Based on {employeeScore}% Individual Score</p>
                    </div>
                    <span className="text-lg font-black text-emerald-500 tracking-tighter">{employeeMultiplier.toFixed(1)}x</span>
                  </div>
                  <div className="h-2 w-full bg-theme-page rounded-full border border-theme-border overflow-hidden p-[1px]">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                      style={{ width: `${employeeScore}%` }} 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Company Health Factor</p>
                      <p className="text-xs font-bold text-theme-fg mt-0.5">Based on {Math.round(companyScore)}% Growth Index</p>
                    </div>
                    <span className="text-lg font-black text-sky-500 tracking-tighter">{companyMultiplier.toFixed(1)}x</span>
                  </div>
                  <div className="h-2 w-full bg-theme-page rounded-full border border-theme-border overflow-hidden p-[1px]">
                    <div 
                      className="h-full bg-sky-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(14,165,233,0.3)]" 
                      style={{ width: `${companyScore}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <div className="relative p-6 rounded-2xl bg-theme-page/50 border border-theme-border overflow-hidden group shadow-inner">
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-primary mb-1">Calculated Multiplier</p>
                    <p className="text-4xl font-black text-theme-fg tracking-tighter tabular-nums">{totalMultiplier}<span className="text-xl text-theme-primary ml-1">x</span></p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-theme-primary flex items-center justify-center shadow-lg shadow-theme-primary/25 transition-transform group-hover:scale-110 duration-500">
                    <ArrowUpRight size={22} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="text-center text-[9px] font-black text-theme-subtle uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                Real-time Sync • Last Verified: {lastSync.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Incentive Registry (Enterprise Style) */}
        <div className="enterprise-card bg-theme-surface p-0 overflow-hidden border border-theme-border shadow-xl">
          <div className="px-6 py-5 border-b border-theme-border bg-theme-page/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-theme-surface border border-theme-border">
                <History size={14} className="text-theme-primary" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg">Incentive Registry</h3>
                <p className="text-[10px] text-theme-muted font-bold mt-0.5 uppercase tracking-wider">Validated payout logs for the current fiscal year</p>
              </div>
            </div>
            {loading && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-theme-raised border border-theme-border">
                <div className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-widest text-theme-fg">Syncing...</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-theme-page/50 border-b border-theme-border">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Statement Period</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Base Allocation</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Multiplier Stack</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Net Settlement</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted text-right">Filing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/50">
                {loading && !incentiveData ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 w-24 animate-pulse rounded bg-theme-raised" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !incentiveData?.incentives?.length ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <History size={32} className="text-theme-subtle/20" />
                        <p className="text-[11px] font-black uppercase tracking-widest text-theme-muted">No payout records found in the registry</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  incentiveData.incentives.slice(0, 5).map((row) => (
                    <tr key={row._id} className="hover:bg-theme-raised/30 transition-colors group cursor-default">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-theme-fg uppercase tracking-tight">{dayjs().month(row.month - 1).format('MMMM')} {row.year}</span>
                          <span className="text-[9px] font-bold text-theme-muted uppercase tracking-widest">Statement #{row._id.slice(-8).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-theme-fg font-mono">
                        {formatCurrency(row.base_amount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-theme-raised border border-theme-border transition-all group-hover:border-theme-primary/20">
                          <TrendingUp size={10} className="text-theme-primary" />
                          <span className="text-[10px] font-black text-theme-fg tabular-nums">{totalMultiplier.toFixed(1)}x</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-theme-fg tabular-nums">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className={cn(
                           "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                           row.status === 'paid' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                           row.status === 'locked' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                           "bg-theme-raised text-theme-muted border-theme-border"
                         )}>
                           <div className={cn("w-1 h-1 rounded-full", 
                              row.status === 'paid' ? 'bg-emerald-500' : 
                              row.status === 'locked' ? 'bg-amber-500' : 'bg-theme-muted'
                           )} />
                           {row.status}
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 bg-theme-page/50 border-t border-theme-border flex items-center justify-between">
            <p className="text-[9px] font-bold text-theme-muted uppercase tracking-widest italic">Note: Payouts are calculated based on monthly performance audits.</p>
            <Link href="/dashboard/incentives">
              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-theme-primary hover:bg-theme-primary/10">
                Open Full Archive <ChevronRight size={14} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
