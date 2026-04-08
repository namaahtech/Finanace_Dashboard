"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatCurrency, cn } from "@/lib/utils";
import { calculateCompanyScore, calculateFinalIncentive, getCompanyMultiplier, getEmployeeMultiplier } from "@/lib/incentiveMath";
import { RadialGauge, MetricBar } from "@/components/viz/DataViz";
import {
  IndianRupee,
  Gift,
  TrendingDown,
  Activity,
  ArrowUpRight,
  Download,
  Settings,
  ShieldCheck,
  Zap
} from "lucide-react";

interface UserShape {
  _id: string;
  name: string;
}

interface ConfigShape {
  company_revenue: number;
  expense_percentage: number;
  revenue_achievement_percentage: number;
  collections_percentage: number;
  delivery_health_percentage: number;
  payout_pool_amount: number;
}

export default function AdminOverview() {
  const { request } = useApi();
  const [config, setConfig] = useState<ConfigShape | null>(null);
  const [employeeRows, setEmployeeRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [configRes, usersRes] = await Promise.all([
          request<{ config: ConfigShape }>({ url: "/api/config" }),
          request<{ users: UserShape[] }>({ url: "/api/users?role=employee&limit=4" }),
        ]);

        const cfg = configRes.config;
        if (!cfg) return;
        setConfig(cfg);

        const companyScore = calculateCompanyScore(
          cfg.revenue_achievement_percentage,
          cfg.collections_percentage,
          cfg.delivery_health_percentage
        );
        const companyMultiplier = getCompanyMultiplier(companyScore);

        const rows = await Promise.all(
          (usersRes.users ?? []).map(async (employee) => {
            const [kpiRes, incentiveRes] = await Promise.all([
              request<{ scores: any[] }>({ url: `/api/kpi?employeeId=${employee._id}` }),
              request<{ incentives: any[] }>({ url: `/api/incentives?employeeId=${employee._id}` }),
            ]);

            const score = kpiRes.scores?.[0]?.final_score ?? 80;
            const employeeMultiplier = getEmployeeMultiplier(score);
            const latestIncentive = incentiveRes.incentives?.[0];
            const baseIncentive = latestIncentive?.base_amount ?? 10000;
            
            return {
              id: employee._id,
              name: employee.name,
              score,
              baseIncentive,
              employeeMultiplier,
              finalIncentive: calculateFinalIncentive(0, baseIncentive, employeeMultiplier, companyMultiplier),
              status: latestIncentive?.status ?? "Locked",
            };
          })
        );
        setEmployeeRows(rows);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [request]);

  if (loading || !config) {
    return (
      <DashboardShell title="Strategic Command">
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        </div>
      </DashboardShell>
    );
  }

  const companyScore = calculateCompanyScore(
    config.revenue_achievement_percentage,
    config.collections_percentage,
    config.delivery_health_percentage
  );

  return (
    <DashboardShell 
      title="Strategic Command"
      subtitle="Overview of company earnings, work status, and payouts."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
             <Download size={14} className="mr-2" /> DATA EXPORT
          </Button>
          <Link href="/admin/config">
            <Button variant="primary" size="sm">
              <Settings size={14} className="mr-2" /> SETTINGS
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Row - Bold & Simple */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Earnings", val: formatCurrency(config.company_revenue), icon: <IndianRupee size={14} />, status: "84% Target" },
            { label: "Total Expenses", val: formatCurrency((config.company_revenue * config.expense_percentage / 100)), icon: <TrendingDown size={14} />, status: "Low Risk" },
            { label: "Payout Pool", val: formatCurrency(config.payout_pool_amount), icon: <Gift size={14} />, status: "Ready" },
            { label: "Work Velocity", val: `${companyScore}%`, icon: <Activity size={14} />, status: "Active" },
          ].map((s) => (
            <div key={s.label} className="enterprise-card p-5 flex flex-col justify-between h-28 border-slate-100 hover:border-slate-900 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.label}</span>
                <span className="text-slate-200 group-hover:text-slate-900 transition-colors uppercase font-black text-[8px]">Index</span>
              </div>
              <div className="flex items-end justify-between">
                 <p className="text-xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{s.val}</p>
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded text-[9px] font-bold text-slate-500 uppercase">
                    {s.status}
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* Improved Cards Section - Circular Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
           <div className="lg:col-span-3 enterprise-card p-6 flex flex-col items-center justify-center bg-white shadow-sm border-slate-100">
              <RadialGauge 
                value={Math.round(companyScore)} 
                label="Overall Health" 
                subLabel="Total Business Score"
              />
           </div>
           
           <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricBar label="Revenue Target" value={config.revenue_achievement_percentage} trend="up" />
              <MetricBar label="Cash Collection" value={config.collections_percentage} trend="up" />
              <MetricBar label="Project Success" value={config.delivery_health_percentage} trend="down" />
           </div>
        </div>

        {/* Master Table - High Density */}
        <div className="enterprise-card overflow-hidden shadow-sm border-slate-100">
           <div className="px-6 py-5 bg-white border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                 <Zap size={14} className="text-slate-900" />
                 <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Operational Ledger</h3>
              </div>
              <div className="flex items-center gap-1.5">
                 <ShieldCheck size={12} className="text-emerald-500" />
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Verified Security Cache</span>
              </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="data-table">
                <thead>
                  <tr>
                    <th className="pl-6">Team Identity</th>
                    <th>Magnitude</th>
                    <th>Nominal Stream</th>
                    <th>Active Multipliers</th>
                    <th>Realized Payout</th>
                    <th className="pr-6">Stream Access</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeRows.map((row) => (
                    <tr key={row.id} className="group hover:bg-slate-50/50">
                      <td className="pl-6 py-5 font-black text-slate-900 tracking-tight text-xs uppercase">{row.name}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-900 rounded-full" style={{ width: `${row.score}%` }} />
                          </div>
                          <span className="font-bold text-[10px] text-slate-500 tabular-nums">{row.score}%</span>
                        </div>
                      </td>
                      <td className="font-medium text-slate-400 text-[11px]">{formatCurrency(row.baseIncentive)}</td>
                      <td>
                         <div className="flex items-center gap-1 bg-slate-50 p-1 rounded inline-flex">
                            <span className="text-slate-500 font-bold text-[9px] uppercase">{row.employeeMultiplier.toFixed(1)}e</span>
                            <span className="text-slate-300 font-bold text-[9px]">×</span>
                            <span className="text-slate-900 font-black text-[9px] uppercase">{getCompanyMultiplier(companyScore).toFixed(1)}c</span>
                         </div>
                      </td>
                      <td className="font-black text-slate-900 tracking-tighter text-xs">{formatCurrency(row.finalIncentive)}</td>
                      <td className="pr-6">
                        <span className={cn(
                          "badge rounded text-[9px] font-black px-2 py-0.5 border-slate-100 uppercase",
                          row.status === "Paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm" : "bg-slate-50 text-slate-500"
                        )}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
           
           <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="italic">Session Audit: 2024-Q2 Intelligence Sync</span>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span>Live Feed Online</span>
              </div>
           </div>
        </div>
      </div>
    </DashboardShell>
  );
}
