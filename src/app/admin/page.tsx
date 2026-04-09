"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useApi } from "@/hooks/useApi";
import { formatCurrency, cn } from "@/lib/utils";
import {
  calculateCompanyScore,
  calculateFinalIncentive,
  getCompanyMultiplier,
  getEmployeeMultiplier,
} from "@/lib/incentiveMath";
import {
  IndianRupee,
  Gift,
  TrendingDown,
  Activity,
  Download,
  Settings,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  ChevronRight,
} from "lucide-react";

interface UserShape  { _id: string; name: string; }
interface ConfigShape {
  company_revenue: number;
  expense_percentage: number;
  revenue_achievement_percentage: number;
  collections_percentage: number;
  delivery_health_percentage: number;
  payout_pool_amount: number;
}

// ─── Mock fallback data (shown when API is not wired) ─────
const MOCK_CONFIG: ConfigShape = {
  company_revenue: 4800000,
  expense_percentage: 38,
  revenue_achievement_percentage: 84,
  collections_percentage: 76,
  delivery_health_percentage: 91,
  payout_pool_amount: 650000,
};

export default function AdminOverview() {
  const { request } = useApi();
  const [config, setConfig] = useState<ConfigShape>(MOCK_CONFIG);
  const [employeeRows, setEmployeeRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [configRes, usersRes] = await Promise.all([
          request<{ config: ConfigShape }>({ url: "/api/config" }),
          request<{ users: UserShape[] }>({ url: "/api/users?role=employee&limit=6" }),
        ]);
        if (configRes.config) setConfig(configRes.config);

        const cfg = configRes.config ?? MOCK_CONFIG;
        const companyScore = calculateCompanyScore(
          cfg.revenue_achievement_percentage,
          cfg.collections_percentage,
          cfg.delivery_health_percentage
        );
        const companyMultiplier = getCompanyMultiplier(companyScore);

        const rows = await Promise.all(
          (usersRes.users ?? []).map(async (emp) => {
            const [kpiRes, incRes] = await Promise.all([
              request<{ scores: any[] }>({ url: `/api/kpi?employeeId=${emp._id}` }),
              request<{ incentives: any[] }>({ url: `/api/incentives?employeeId=${emp._id}` }),
            ]);
            const score = kpiRes.scores?.[0]?.final_score ?? 80;
            const employeeMultiplier = getEmployeeMultiplier(score);
            const latestIncentive = incRes.incentives?.[0];
            const baseIncentive = latestIncentive?.base_amount ?? 10000;
            return {
              id: emp._id,
              name: emp.name,
              score,
              baseIncentive,
              employeeMultiplier,
              finalIncentive: calculateFinalIncentive(0, baseIncentive, employeeMultiplier, companyMultiplier),
              status: latestIncentive?.status ?? "locked",
            };
          })
        );
        setEmployeeRows(rows);
      } catch {
        // Use mock data on error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [request]);

  const companyScore = calculateCompanyScore(
    config.revenue_achievement_percentage,
    config.collections_percentage,
    config.delivery_health_percentage
  );

  const expenses = config.company_revenue * config.expense_percentage / 100;
  const netRevenue = config.company_revenue - expenses;

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Company performance, payouts, and key metrics at a glance."
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="hidden sm:flex">
            <Download size={14} className="mr-1.5" /> Export
          </Button>
          <Link href="/admin/config">
            <Button variant="primary" size="sm">
              <Settings size={14} className="mr-1.5" /> Config
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Revenue",  value: formatCurrency(config.company_revenue), icon: IndianRupee, color: "text-theme-fg",    bg: "bg-theme-raised",     sub: "This month" },
            { label: "Total Expenses", value: formatCurrency(expenses),                icon: TrendingDown, color: "text-red-500",   bg: "bg-red-500/10",       sub: `${config.expense_percentage}% of revenue` },
            { label: "Net Revenue",    value: formatCurrency(netRevenue),              icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-500/10", sub: "After expenses" },
            { label: "Payout Pool",    value: formatCurrency(config.payout_pool_amount), icon: Gift,       color: "text-sky-600",    bg: "bg-sky-500/10",       sub: "Available" },
          ].map(({ label, value, icon: Icon, color, bg, sub }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={17} className={color} />
              </div>
              <div>
                <p className="text-xs text-theme-muted">{label}</p>
                <p className={cn("text-xl font-black leading-tight", color)}>{value}</p>
                <p className="text-[10px] text-theme-subtle">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Business health bars */}
        <div className="page-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-theme-muted" />
              <span className="text-sm font-semibold text-theme-fg">Business Health</span>
            </div>
            <span className="text-sm font-black text-theme-fg">{Math.round(companyScore)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-theme-raised mb-4">
            <div
              className={cn("h-full rounded-full transition-all",
                companyScore >= 80 ? "bg-emerald-500" : companyScore >= 60 ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${companyScore}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Revenue Target",   value: config.revenue_achievement_percentage, color: "bg-sky-500" },
              { label: "Cash Collections", value: config.collections_percentage,         color: "bg-emerald-500" },
              { label: "Project Success",  value: config.delivery_health_percentage,     color: "bg-purple-500" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-theme-muted">{label}</span>
                  <span className="font-bold text-theme-fg">{value}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-theme-raised">
                  <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incentive overview table */}
        <div className="page-card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-theme-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-theme-muted" />
              <h3 className="text-sm font-semibold text-theme-fg">
                Incentive Overview
                {loading && <span className="ml-2 text-xs font-normal text-theme-subtle">Loading…</span>}
              </h3>
            </div>
            <Link href="/admin/incentives">
              <button className="flex items-center gap-1 text-xs text-theme-muted hover:text-theme-fg transition-colors">
                View all <ChevronRight size={13} />
              </button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">KPI Score</th>
                  <th className="px-5 py-3 font-semibold">Base Amount</th>
                  <th className="px-5 py-3 font-semibold">Multiplier</th>
                  <th className="px-5 py-3 font-semibold">Final Payout</th>
                  <th className="px-5 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-3 animate-pulse rounded bg-theme-raised" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : employeeRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-theme-subtle">
                      No data available
                    </td>
                  </tr>
                ) : (
                  employeeRows.map((row) => (
                    <tr key={row.id} className="hover:bg-theme-raised/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">
                            {row.name.split(" ").map((n: string) => n[0]).join("")}
                          </div>
                          <span className="text-xs font-semibold text-theme-fg">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-theme-raised">
                            <div className={cn("h-full rounded-full",
                              row.score >= 80 ? "bg-emerald-500" : row.score >= 60 ? "bg-amber-500" : "bg-red-400"
                            )} style={{ width: `${row.score}%` }} />
                          </div>
                          <span className="text-xs text-theme-muted">{row.score}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-theme-muted">{formatCurrency(row.baseIncentive)}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-md bg-theme-raised px-2 py-0.5 text-[11px] font-semibold text-theme-fg">
                          {row.employeeMultiplier.toFixed(1)}× · {getCompanyMultiplier(companyScore).toFixed(1)}×
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-bold text-theme-fg">{formatCurrency(row.finalIncentive)}</td>
                      <td className="px-5 py-3 text-right">
                        <Badge variant={row.status === "paid" || row.status === "Paid" ? "success" : row.status === "claimable" ? "info" : "default"}>
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
            <span className="text-xs text-theme-subtle">Showing {employeeRows.length} employees</span>
            <div className="flex items-center gap-1.5 text-xs text-theme-subtle">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live data
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
