"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/layout/AuthProvider";
import axios from "axios";
import { formatCurrency, getYearRange, cn } from "@/lib/utils";
import {
  calculateCompanyScore,
  calculateFinalIncentive,
  getCompanyMultiplier,
  getEmployeeMultiplier,
} from "@/lib/incentiveMath";
import {
  Award,
  ChevronDown,
  TrendingUp,
  IndianRupee,
  RefreshCw,
  Save,
  Activity,
  CheckCircle2,
  Lock,
  Gift,
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
interface KpiScore { final_score: number; }

const MOCK_USERS: User[] = [
  { _id: "1", name: "Priya Sharma",  employeeId: "NM001", department: "Product" },
  { _id: "2", name: "Amit Verma",    employeeId: "NM002", department: "Sales" },
  { _id: "3", name: "Divya Menon",   employeeId: "NM003", department: "Executive" },
  { _id: "4", name: "Rohan Gupta",   employeeId: "NM006", department: "HR" },
  { _id: "5", name: "Ananya Pillai", employeeId: "NM007", department: "Engineering" },
];

const MOCK_INCENTIVES: Incentive[] = [
  { _id: "1", amount: 18500, base_amount: 15000, fixed_amount: 8000, variable_amount: 7000, status: "claimable", month: 3, year: 2026, createdAt: "2026-04-01", employee: { name: "Priya Sharma",  employeeId: "NM001" } },
  { _id: "2", amount: 12400, base_amount: 10000, fixed_amount: 5000, variable_amount: 5000, status: "paid",      month: 2, year: 2026, createdAt: "2026-03-01", employee: { name: "Amit Verma",    employeeId: "NM002" } },
  { _id: "3", amount: 22000, base_amount: 18000, fixed_amount: 10000,variable_amount: 8000, status: "paid",      month: 1, year: 2026, createdAt: "2026-02-01", employee: { name: "Priya Sharma",  employeeId: "NM001" } },
  { _id: "4", amount: 9800,  base_amount: 8000,  fixed_amount: 4000, variable_amount: 4000, status: "locked",   month: 3, year: 2026, createdAt: "2026-04-02", employee: { name: "Rohan Gupta",   employeeId: "NM006" } },
  { _id: "5", amount: 15600, base_amount: 12000, fixed_amount: 6000, variable_amount: 6000, status: "claimable",month: 3, year: 2026, createdAt: "2026-04-03", employee: { name: "Ananya Pillai", employeeId: "NM007" } },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString("en-IN", { month: "long" }),
}));

function monthLabel(m: number, y: number) {
  return new Date(y, m - 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

function gaugeColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

export default function AdminIncentivesPage() {
  const { user } = useAuth();

  const [users, setUsers]           = useState<User[]>(MOCK_USERS);
  const [incentives, setIncentives] = useState<Incentive[]>(MOCK_INCENTIVES);
  const [selectedUser, setSelectedUser] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submitting, setSubmitting]     = useState(false);
  const [vestingLoading, setVestingLoading] = useState(false);
  const [savingPerformance, setSavingPerformance] = useState(false);
  const [employeeScore, setEmployeeScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    axios.get("/api/users?limit=100").then((res) => { if (res.data.users?.length) setUsers(res.data.users); }).catch(() => {});
    axios.get("/api/config").then((res) => {
      const cfg = res.data.config ?? {};
      setConfig({
        revenue_achievement_percentage: cfg.revenue_achievement_percentage ?? 84,
        collections_percentage: cfg.collections_percentage ?? 87,
        delivery_health_percentage: cfg.delivery_health_percentage ?? 75,
      });
    }).catch(() => {});
  }, []);

  async function loadIncentives(empId?: string) {
    setLoading(true);
    try {
      const url = empId ? `/api/incentives?employeeId=${empId}` : "/api/incentives";
      const res = await axios.get(url);
      if (res.data.incentives?.length) setIncentives(res.data.incentives);
    } catch {
      // use mock data
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedUser) { loadIncentives(); return; }
    loadIncentives(selectedUser);
    axios.get(`/api/kpi?employeeId=${selectedUser}`)
      .then((res) => { const s = (res.data.scores ?? []) as KpiScore[]; setEmployeeScore(s[0]?.final_score ?? null); })
      .catch(() => setEmployeeScore(null));
  }, [selectedUser]);

  async function handleAward(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    const fixedAmount    = parseFloat(form.fixed_amount    || "0");
    const variableAmount = parseFloat(form.variable_amount || "0");
    if (fixedAmount + variableAmount <= 0) return alert("Enter fixed or variable amount");
    setSubmitting(true);
    try {
      await axios.post("/api/incentives", { employee: selectedUser, fixed_amount: fixedAmount, variable_amount: variableAmount, month: form.month, year: form.year, notes: form.notes });
      setForm({ fixed_amount: "", variable_amount: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: "" });
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
      await axios.post("/api/incentives", { action: "process_vesting" });
      if (selectedUser) await loadIncentives(selectedUser); else await loadIncentives();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
    } finally {
      setVestingLoading(false);
    }
  }

  async function saveCompanyPerformance() {
    setSavingPerformance(true);
    try {
      await axios.patch("/api/config", config);
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error");
    } finally {
      setSavingPerformance(false);
    }
  }

  const fixedAmount    = parseFloat(form.fixed_amount    || "0") || 0;
  const variableAmount = parseFloat(form.variable_amount || "0") || 0;
  const companyScore   = calculateCompanyScore(config.revenue_achievement_percentage, config.collections_percentage, config.delivery_health_percentage);
  const companyMultiplier  = getCompanyMultiplier(companyScore);
  const employeeMultiplier = getEmployeeMultiplier(employeeScore);
  const totalAmount = calculateFinalIncentive(fixedAmount, variableAmount, employeeMultiplier, companyMultiplier);

  const canEditConfig = user?.role === "super_admin";

  const filtered = statusFilter === "all" ? incentives : incentives.filter((i) => i.status === statusFilter);

  const totalAmt    = incentives.reduce((s, i) => s + i.amount, 0);
  const claimable   = incentives.filter((i) => i.status === "claimable").length;
  const paid        = incentives.filter((i) => i.status === "paid").length;

  return (
    <DashboardShell
      title="Incentives"
      subtitle="Manage employee incentive grants and company performance parameters."
      actions={
        <div className="flex items-center gap-2">
          {canEditConfig && (
            <Button variant="secondary" size="sm" loading={savingPerformance} onClick={saveCompanyPerformance}>
              <Save size={13} className="mr-1.5" /> Save Config
            </Button>
          )}
          <Button variant="primary" size="sm" loading={vestingLoading} onClick={processVesting}>
            <RefreshCw size={13} className="mr-1.5" /> Process Vesting
          </Button>
        </div>
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Grants",  value: incentives.length, icon: Award,       color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Total Amount",  value: formatCurrency(totalAmt), icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Claimable",     value: claimable,          icon: Gift,        color: "text-sky-600",     bg: "bg-sky-500/10" },
            { label: "Paid",          value: paid,               icon: CheckCircle2,color: "text-purple-600",  bg: "bg-purple-500/10" },
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

        {/* Company performance */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {/* Overall score card */}
          <div className="page-card flex flex-col items-center justify-center text-center gap-1">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl mb-1", companyScore >= 80 ? "bg-emerald-500/10" : companyScore >= 60 ? "bg-amber-500/10" : "bg-red-500/10")}>
              <Activity size={17} className={companyScore >= 80 ? "text-emerald-600" : companyScore >= 60 ? "text-amber-600" : "text-red-500"} />
            </div>
            <p className="text-[11px] text-theme-muted">Company Score</p>
            <p className={cn("text-3xl font-black leading-tight", companyScore >= 80 ? "text-emerald-600" : companyScore >= 60 ? "text-amber-600" : "text-red-500")}>
              {Math.round(companyScore)}%
            </p>
            <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", companyScore >= 80 ? "bg-emerald-500/10 text-emerald-600" : companyScore >= 60 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500")}>
              {companyMultiplier.toFixed(1)}× multiplier
            </span>
          </div>

          {/* Three metric cards */}
          {[
            { key: "revenue_achievement_percentage", label: "Revenue Achievement", barColor: "bg-sky-500",    textColor: "text-sky-600",     bg: "bg-sky-500/10",     icon: TrendingUp },
            { key: "collections_percentage",         label: "Collections",         barColor: "bg-emerald-500",textColor: "text-emerald-600",  bg: "bg-emerald-500/10", icon: IndianRupee },
            { key: "delivery_health_percentage",     label: "Delivery Health",     barColor: "bg-purple-500", textColor: "text-purple-600",   bg: "bg-purple-500/10",  icon: Activity },
          ].map((item) => {
            const val = config[item.key as keyof ConfigState];
            const Icon = item.icon;
            return (
              <div key={item.key} className="page-card flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", item.bg)}>
                      <Icon size={13} className={item.textColor} />
                    </div>
                    <p className="text-xs font-semibold text-theme-muted">{item.label}</p>
                  </div>
                  <span className={cn("text-lg font-black", item.textColor)}>{val}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-theme-raised">
                  <div className={cn("h-full rounded-full transition-all duration-500", item.barColor)} style={{ width: `${Math.min(100, val)}%` }} />
                </div>

                {/* Stepper */}
                {canEditConfig ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, [item.key]: Math.max(0, val - 1) })}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-theme-border bg-theme-raised text-theme-muted hover:text-theme-fg hover:border-theme-strong transition-all text-base font-bold leading-none"
                    >−</button>
                    <input
                      type="number" min={0} max={120}
                      value={val}
                      onChange={(e) => setConfig({ ...config, [item.key]: Math.max(0, Math.min(120, parseInt(e.target.value) || 0)) })}
                      className="h-7 flex-1 rounded-lg border border-theme-border bg-theme-page px-2 text-center text-xs font-bold text-theme-fg outline-none focus:border-theme-strong transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, [item.key]: Math.min(120, val + 1) })}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-theme-border bg-theme-raised text-theme-muted hover:text-theme-fg hover:border-theme-strong transition-all text-base font-bold leading-none"
                    >+</button>
                  </div>
                ) : (
                  <p className="text-[11px] text-theme-subtle">Read-only — super admin can edit</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Award form + history */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

          {/* Award form */}
          <div className="lg:col-span-2">
            <div className="page-card">
              <div className="mb-4 flex items-center gap-2">
                <Award size={15} className="text-theme-muted" />
                <span className="text-sm font-semibold text-theme-fg">Award Incentive</span>
              </div>
              <form onSubmit={handleAward} className="space-y-4">

                {/* Employee selector */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Employee</label>
                  <div className="relative">
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      required
                      className="w-full appearance-none rounded-lg border border-theme-border bg-theme-page pl-3 pr-8 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all cursor-pointer"
                    >
                      <option value="">Select employee…</option>
                      {users.map((u) => <option key={u._id} value={u._id}>{u.name} — {u.employeeId}</option>)}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted" />
                  </div>
                  {employeeScore !== null && (
                    <p className="mt-1 text-[11px] text-theme-muted">
                      KPI Score: <span className={cn("font-bold", employeeScore >= 80 ? "text-emerald-600" : employeeScore >= 60 ? "text-amber-600" : "text-red-500")}>{employeeScore}%</span>
                      <span className="ml-2 text-theme-subtle">→ {employeeMultiplier.toFixed(1)}× multiplier</span>
                    </p>
                  )}
                </div>

                {/* Month / Year */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Month</label>
                    <div className="relative">
                      <select value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })} className="w-full appearance-none rounded-lg border border-theme-border bg-theme-page pl-3 pr-8 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all cursor-pointer">
                        {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Year</label>
                    <div className="relative">
                      <select value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} className="w-full appearance-none rounded-lg border border-theme-border bg-theme-page pl-3 pr-8 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all cursor-pointer">
                        {getYearRange().map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted" />
                    </div>
                  </div>
                </div>

                {/* Fixed / Variable */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Fixed Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-theme-muted">₹</span>
                      <input type="number" min="0" placeholder="0" value={form.fixed_amount} onChange={(e) => setForm({ ...form, fixed_amount: e.target.value })}
                        className="w-full rounded-lg border border-theme-border bg-theme-page pl-7 pr-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Variable Base (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-theme-muted">₹</span>
                      <input type="number" min="0" placeholder="0" value={form.variable_amount} onChange={(e) => setForm({ ...form, variable_amount: e.target.value })}
                        className="w-full rounded-lg border border-theme-border bg-theme-page pl-7 pr-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                    </div>
                  </div>
                </div>

                {/* Calculation preview */}
                <div className="rounded-xl border border-theme-border bg-theme-raised px-4 py-3 space-y-2">
                  <p className="text-[11px] font-semibold text-theme-muted uppercase tracking-wide">Preview</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-theme-muted">Employee multiplier</span>
                    <span className="font-semibold text-theme-fg">{employeeMultiplier.toFixed(1)}×</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-theme-muted">Company multiplier</span>
                    <span className="font-semibold text-theme-fg">{companyMultiplier.toFixed(1)}×</span>
                  </div>
                  <div className="border-t border-theme-border pt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-theme-muted">Final payout</span>
                    <span className="text-base font-black text-emerald-600">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                <Button type="submit" variant="primary" className="w-full" loading={submitting} disabled={!selectedUser}>
                  Award Incentive
                </Button>
              </form>
            </div>
          </div>

          {/* History table */}
          <div className="lg:col-span-3">
            <div className="page-card overflow-hidden p-0">
              {/* Header */}
              <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-theme-muted" />
                  <span className="text-sm font-semibold text-theme-fg">
                    Grant History
                    {selectedUser && (
                      <span className="ml-2 text-xs font-normal text-theme-muted">
                        — {users.find((u) => u._id === selectedUser)?.name}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
                  {[
                    { id: "all",       label: "All" },
                    { id: "claimable", label: "Claimable" },
                    { id: "paid",      label: "Paid" },
                    { id: "locked",    label: "Locked" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setStatusFilter(t.id)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                        statusFilter === t.id
                          ? "bg-theme-surface text-theme-fg shadow-sm"
                          : "text-theme-muted hover:text-theme-fg"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                      <th className="px-5 py-3 font-semibold">Employee</th>
                      <th className="px-5 py-3 font-semibold">Period</th>
                      <th className="px-5 py-3 font-semibold">Fixed</th>
                      <th className="px-5 py-3 font-semibold">Variable</th>
                      <th className="px-5 py-3 font-semibold">Final</th>
                      <th className="px-5 py-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="px-5 py-3"><div className="h-3 animate-pulse rounded bg-theme-raised" /></td>
                          ))}
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-theme-subtle">No incentive records found</td>
                      </tr>
                    ) : filtered.map((inc) => (
                      <tr key={inc._id} className="group transition-colors hover:bg-theme-raised/40">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">
                              {getInitials(inc.employee.name)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-theme-fg">{inc.employee.name}</p>
                              <p className="text-[10px] text-theme-subtle">{inc.employee.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-theme-muted">{monthLabel(inc.month, inc.year)}</td>
                        <td className="px-5 py-3 text-xs text-theme-muted">{formatCurrency(inc.fixed_amount ?? 0)}</td>
                        <td className="px-5 py-3 text-xs text-theme-muted">{formatCurrency(inc.variable_amount ?? 0)}</td>
                        <td className="px-5 py-3 text-sm font-bold text-emerald-600">{formatCurrency(inc.amount)}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {inc.status === "locked" && <Lock size={11} className="text-theme-subtle" />}
                            <Badge variant={statusBadgeVariant(inc.status)}>
                              {inc.status.charAt(0).toUpperCase() + inc.status.slice(1)}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
                <span className="text-xs text-theme-subtle">{filtered.length} grant{filtered.length !== 1 ? "s" : ""}</span>
                <span className="text-xs text-theme-subtle">
                  Total: <span className="font-bold text-theme-fg">{formatCurrency(filtered.reduce((s, i) => s + i.amount, 0))}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
