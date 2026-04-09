"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import {
  BarChart3,
  Search,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronDown,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TeamBudget {
  team: string;
  department: string;
  budget: number;
  spent: number;
  revenue: number;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TEAM_BUDGETS: TeamBudget[] = [
  { team: "Engineering",    department: "Technology",  budget: 1200000, spent: 850000,  revenue: 4200000 },
  { team: "Sales",          department: "Revenue",     budget: 450000,  spent: 485000,  revenue: 3800000 },
  { team: "Finance",        department: "Operations",  budget: 250000,  spent: 95000,   revenue: 0 },
  { team: "HR & People",    department: "Operations",  budget: 180000,  spent: 172000,  revenue: 0 },
  { team: "Marketing",      department: "Growth",      budget: 620000,  spent: 590000,  revenue: 1200000 },
  { team: "Customer Success",department: "Revenue",    budget: 300000,  spent: 120000,  revenue: 980000 },
  { team: "Product",        department: "Technology",  budget: 550000,  spent: 540000,  revenue: 0 },
  { team: "Legal",          department: "Operations",  budget: 150000,  spent: 45000,   revenue: 0 },
];

const CHART_DATA = TEAM_BUDGETS.map((t) => ({
  team: t.team.split(" ")[0],
  Budget: Math.round(t.budget / 1000),
  Spent:  Math.round(t.spent / 1000),
}));

function CustomTooltip({ active, payload, label }: any) {
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
          <span className="font-semibold text-theme-fg">₹{p.value}K</span>
        </div>
      ))}
    </div>
  );
}

export default function TeamBudgetsPage() {
  const [month, setMonth]       = useState(3);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");
  const [editModal, setEditModal] = useState<TeamBudget | null>(null);

  const filtered = TEAM_BUDGETS.filter((b) => {
    const matchSearch = b.team.toLowerCase().includes(search.toLowerCase());
    const pct = (b.spent / b.budget) * 100;
    if (filter === "over")   return b.spent > b.budget;
    if (filter === "risk")   return pct >= 85 && b.spent <= b.budget;
    if (filter === "ok")     return pct < 85;
    return matchSearch;
  }).filter((b) => b.team.toLowerCase().includes(search.toLowerCase()));

  const totalBudget = TEAM_BUDGETS.reduce((s, b) => s + b.budget, 0);
  const totalSpent  = TEAM_BUDGETS.reduce((s, b) => s + b.spent, 0);
  const overBudget  = TEAM_BUDGETS.filter((b) => b.spent > b.budget).length;
  const remaining   = totalBudget - totalSpent;

  return (
    <DashboardShell
      title="Budgets"
      subtitle="Track team budgets, monitor spend, and analyse cost vs revenue."
      actions={
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-8 appearance-none rounded-lg border border-theme-border bg-theme-raised pl-3 pr-7 text-xs font-semibold text-theme-fg outline-none focus:border-theme-strong transition-all cursor-pointer"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted" />
          </div>
          <Button variant="primary" size="sm">Update Budgets</Button>
        </div>
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Budget",    value: formatCurrency(totalBudget), icon: IndianRupee,  color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Total Spent",     value: formatCurrency(totalSpent),  icon: TrendingDown, color: "text-sky-600",     bg: "bg-sky-500/10" },
            { label: "Remaining",       value: formatCurrency(remaining),   icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Over Budget",     value: overBudget,                  icon: AlertCircle,  color: "text-red-500",     bg: "bg-red-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={15} className={color} />
              </div>
              <div>
                <p className="text-[11px] text-theme-muted">{label}</p>
                <p className={cn("text-xl font-black leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Spend vs Budget chart */}
        <div className="page-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-theme-muted" />
              <span className="text-sm font-semibold text-theme-fg">Spend vs Budget by Team</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-theme-muted">
              {[
                { dot: "bg-sky-500",    label: "Budget" },
                { dot: "bg-emerald-500",label: "Spent" },
              ].map(({ dot, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0", dot)} />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CHART_DATA} barCategoryGap="30%" barGap={3}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="4 0" />
              <XAxis dataKey="team" tick={{ fontSize: 11, fill: "hsl(var(--fg-muted))" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `₹${v}K`} tick={{ fontSize: 11, fill: "hsl(var(--fg-muted))" }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--surface-raised))", radius: 6 }} />
              <Bar dataKey="Budget" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent"  fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team budget table */}
        <div className="page-card overflow-hidden p-0">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
              {[
                { id: "all",  label: "All" },
                { id: "over", label: "Over Budget" },
                { id: "risk", label: "At Risk" },
                { id: "ok",   label: "On Track" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    filter === t.id ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teams…"
                className="h-8 w-44 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Team</th>
                  <th className="px-5 py-3 font-semibold">Budget</th>
                  <th className="px-5 py-3 font-semibold">Spent</th>
                  <th className="px-5 py-3 font-semibold">Remaining</th>
                  <th className="px-5 py-3 font-semibold">Revenue</th>
                  <th className="px-5 py-3 font-semibold">Spend %</th>
                  <th className="px-5 py-3 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-theme-subtle">No teams found</td></tr>
                ) : filtered.map((b) => {
                  const pct     = Math.min((b.spent / b.budget) * 100, 100);
                  const isOver  = b.spent > b.budget;
                  const isRisk  = !isOver && pct >= 85;
                  const rem     = b.budget - b.spent;
                  const barColor = isOver ? "bg-red-500" : isRisk ? "bg-amber-500" : "bg-emerald-500";
                  const pctColor = isOver ? "text-red-500" : isRisk ? "text-amber-600" : "text-emerald-600";

                  return (
                    <tr key={b.team} className="group transition-colors hover:bg-theme-raised/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-theme-primary text-theme-surface text-[10px] font-black">
                            {b.team.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-theme-fg">{b.team}</p>
                            <p className="text-[10px] text-theme-subtle">{b.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-theme-muted">{formatCurrency(b.budget)}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-theme-fg">{formatCurrency(b.spent)}</td>
                      <td className={cn("px-5 py-3 text-xs font-semibold", isOver ? "text-red-500" : "text-emerald-600")}>
                        {isOver ? `−${formatCurrency(Math.abs(rem))}` : formatCurrency(rem)}
                      </td>
                      <td className="px-5 py-3 text-xs text-theme-muted">
                        {b.revenue > 0 ? formatCurrency(b.revenue) : <span className="text-theme-subtle">—</span>}
                      </td>
                      <td className={cn("px-5 py-3 text-xs font-bold", pctColor)}>
                        {isOver ? `${((b.spent / b.budget) * 100).toFixed(0)}%` : `${pct.toFixed(0)}%`}
                        {isOver && <AlertCircle size={11} className="inline ml-1 text-red-500" />}
                      </td>
                      <td className="px-5 py-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-theme-raised">
                          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
            <span className="text-xs text-theme-subtle">{filtered.length} teams</span>
            <span className="text-xs text-theme-subtle">
              Utilisation: <span className="font-bold text-theme-fg">{((totalSpent / totalBudget) * 100).toFixed(1)}%</span>
            </span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
