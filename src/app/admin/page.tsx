"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useApi } from "@/hooks/useApi";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
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
import { useToast } from "@/components/ui/Toast";
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

interface UserShape  { id: string; name: string; }
interface ConfigShape {
  company_revenue: number;
  expense_percentage: number;
  revenue_achievement_percentage: number;
  collections_percentage: number;
  delivery_health_percentage: number;
  payout_pool_amount: number;
}

interface AnalyticsData {
  revenue: number[];
  expenses: number[];
  kpi: {
    revenue: number;
    expenses: number;
    profit: number;
    projects: number;
    budgetUsed: number;
  };
  kpiScorecard: any[];
}

// ─── Business Health Chart ────────────────────────────────
// Shows last 6 months of the three KPIs as a grouped bar chart.
// The current month uses live config values; prior months are mock trend data.
const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

function buildChartData(revenue: number, collections: number, delivery: number) {
  const rval = Number(revenue) || 0;
  const cval = Number(collections) || 0;
  const dval = Number(delivery) || 0;

  // Mock trend — each prior month is offset by a small delta
  const deltas = [
    { r: -8,  c: -10, d: -5  },
    { r: -5,  c: -6,  d: -3  },
    { r: -3,  c: -4,  d:  2  },
    { r:  2,  c: -2,  d: -1  },
    { r: -1,  c:  3,  d:  4  },
    { r:  0,  c:  0,  d:  0  }, // current month (live)
  ];
  return MONTHS.map((month, i) => ({
    month,
    Revenue:     Math.max(0, Math.min(100, rval + deltas[i].r)),
    Collections: Math.max(0, Math.min(100, cval + deltas[i].c)),
    Delivery:    Math.max(0, Math.min(100, dval + deltas[i].d)),
    isCurrent: i === 5,
  }));
}

function BusinessHealthChart({
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

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-theme-border bg-theme-surface p-3 shadow-lg text-xs">
        <p className="mb-2 font-bold text-theme-fg">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-theme-muted">{p.name}</span>
            </div>
            <span className="font-semibold text-theme-fg">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="30%" barGap={3}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="4 0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "hsl(var(--fg-muted))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: "hsl(var(--fg-muted))" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <ReferenceLine y={100} stroke="hsl(var(--border))" strokeDasharray="4 4" />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--surface-raised))", radius: 6 }} />
        {(["Revenue", "Collections", "Delivery"] as const).map((key) => (
          <Bar key={key} dataKey={key} fill={COLORS[key]} radius={[4, 4, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={COLORS[key]}
                opacity={entry.isCurrent ? 1 : 0.55}
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Mock fallback data (shown when API is not wired) ─────
const MOCK_CONFIG: ConfigShape = {
  company_revenue: 0,
  expense_percentage: 0,
  revenue_achievement_percentage: 0,
  collections_percentage: 0,
  delivery_health_percentage: 0,
  payout_pool_amount: 0,
};

export default function AdminOverview() {
  const { request } = useApi();
  const { showToast } = useToast();
  const [config, setConfig] = useState<ConfigShape>(MOCK_CONFIG);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [employeeRows, setEmployeeRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    let hadError = false;

    const [configRes, analyticsRes, usersRes] = await Promise.allSettled([
      request<{ config: ConfigShape }>({ url: "/api/config" }),
      request<AnalyticsData>({ url: "/api/analytics/company" }),
      request<{ users: UserShape[] }>({ url: "/api/users?role=employee&limit=6" }),
    ]);

    if (configRes.status === "fulfilled" && configRes.value?.config) {
      setConfig(configRes.value.config);
    } else if (configRes.status === "rejected") {
      hadError = true;
    }

    if (analyticsRes.status === "fulfilled" && analyticsRes.value) {
      setAnalytics(analyticsRes.value);
    } else if (analyticsRes.status === "rejected") {
      hadError = true;
    }

    const cfg = configRes.status === "fulfilled" ? (configRes.value?.config ?? MOCK_CONFIG) : MOCK_CONFIG;
    const companyScore = calculateCompanyScore(
      cfg.revenue_achievement_percentage,
      cfg.collections_percentage,
      cfg.delivery_health_percentage
    );
    const companyMultiplier = getCompanyMultiplier(companyScore);

    const users = usersRes.status === "fulfilled" ? (usersRes.value?.users ?? []) : [];
    if (usersRes.status === "rejected") hadError = true;

    try {
      const rows = await Promise.all(
        users.map(async (emp) => {
          const [kpiRes, incRes] = await Promise.allSettled([
            request<{ scores: any[] }>({ url: `/api/kpi?employeeId=${emp.id}` }),
            request<{ incentives: any[] }>({ url: `/api/incentives?employeeId=${emp.id}` }),
          ]);
          const score = kpiRes.status === "fulfilled" ? (kpiRes.value?.scores?.[0]?.final_score ?? 80) : 80;
          const employeeMultiplier = getEmployeeMultiplier(score);
          const latestIncentive = incRes.status === "fulfilled" ? incRes.value?.incentives?.[0] : undefined;
          const baseIncentive = latestIncentive?.base_amount ?? 10000;
          return {
            id: emp.id,
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
      hadError = true;
    }

    if (hadError && !isRefresh) {
      showToast("Some data could not be loaded. Showing available metrics.", "warning");
    }

    setLoading(false);
  }, [request, showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ─── Realtime Integration ───────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase.channel("dashboard-realtime-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => loadDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "company_revenues" }, () => loadDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "company_expenses" }, () => loadDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => loadDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "incentives" }, () => loadDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "system_config" }, () => loadDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => loadDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "purchases" }, () => loadDashboardData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_logs" }, () => loadDashboardData(true))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") setRealtimeStatus("disconnected");
      });

    return () => { supabase.removeChannel(channel); };
  }, [loadDashboardData]);

  const currentMonth = new Date().getMonth();
  const liveRevenue = analytics?.revenue?.[currentMonth] ?? 0;
  const liveExpenses = analytics?.expenses?.[currentMonth] ?? 0;
  const liveNetRevenue = liveRevenue - liveExpenses;
  const expensePercentage = liveRevenue > 0 ? Math.round((liveExpenses / liveRevenue) * 100) : 0;

  // Real Achievement Logic
  const targetRevenue = Number(config.company_revenue) || 100000;
  const revAchievement = Math.min(100, Math.round((liveRevenue / targetRevenue) * 100));
  
  // Use config as primary source for Collections/Delivery, fallback to sensible industry averages
  const liveCollections = Number(config.collections_percentage) || 85; 
  const liveDelivery    = Number(config.delivery_health_percentage) || 92;

  const companyScore = calculateCompanyScore(
    revAchievement,
    liveCollections,
    liveDelivery
  );

  // Use live analytics but fallback to config if analytics is still loading
  const displayRevenue = analytics ? liveRevenue : (config.company_revenue || 0);
  const displayExpensesValue = analytics ? liveExpenses : (config.company_revenue * config.expense_percentage / 100);
  const displayNetRevenue = displayRevenue - displayExpensesValue;
  const displayExpensePct = analytics ? expensePercentage : config.expense_percentage;

  return (
    <DashboardShell
      moduleKey="admin_dashboard"
      title="Dashboard"
      subtitle="Company performance, payouts, and key metrics at a glance."
      actions={
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold">
            <span className={cn("h-1.5 w-1.5 rounded-full",
              realtimeStatus==="connected" ? "bg-emerald-500 animate-pulse" :
              realtimeStatus==="connecting"? "bg-amber-500 animate-pulse" : "bg-red-500")} />
            <span className={cn(realtimeStatus==="connected"?"text-emerald-600":realtimeStatus==="connecting"?"text-amber-600":"text-red-500")}>
              {realtimeStatus==="connected"?"System Live":realtimeStatus==="connecting"?"Syncing...":"Realtime Offline"}
            </span>
          </span>
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
        </div>
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Revenue",  value: formatCurrency(displayRevenue),       icon: IndianRupee, color: "text-theme-fg",    bg: "bg-theme-raised",     sub: "Current Month" },
            { label: "Total Expenses", value: formatCurrency(displayExpensesValue), icon: TrendingDown, color: "text-red-500",   bg: "bg-red-500/10",       sub: `${displayExpensePct}% of revenue` },
            { label: "Net Revenue",    value: formatCurrency(displayNetRevenue),    icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-500/10", sub: "After expenses" },
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

        {/* Business Health Chart */}
        <div className="page-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-theme-muted" />
              <span className="text-sm font-semibold text-theme-fg">Business Health</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-[11px] text-theme-muted">
                {[
                  { dot: "bg-sky-500",    label: "Revenue" },
                  { dot: "bg-emerald-500", label: "Collections" },
                  { dot: "bg-purple-500", label: "Delivery" },
                ].map(({ dot, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full flex-shrink-0", dot)} />
                    {label}
                  </div>
                ))}
              </div>
              <span className={cn(
                "text-sm font-black",
                companyScore >= 80 ? "text-emerald-600" : companyScore >= 60 ? "text-amber-600" : "text-red-500"
              )}>
                {Math.round(companyScore)}%
              </span>
            </div>
          </div>

          <BusinessHealthChart
            revenue={revAchievement}
            collections={liveCollections}
            delivery={liveDelivery}
          />
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
