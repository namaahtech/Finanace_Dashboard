"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Building2, Users, Download,
  Activity, Briefcase, IndianRupee, Target, Zap,
  ChevronUp, ChevronDown, CheckCircle, Award, Star
} from "lucide-react";

// ─── Color Tokens ────────────────────────────────────────────────────────────
// Switched to Paper Slate Light Theme
const B = "#FBFBFA";   // background
const S = "white";     // surface

// ─── Formatters ──────────────────────────────────────────────────────────────
const formatRupee = (n: number, compact = false) => {
  if (compact && n >= 10000000) return `\u20B9${(n / 10000000).toFixed(2)}Cr`;
  if (compact && n >= 100000) return `\u20B9${(n / 100000).toFixed(1)}L`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const COMPANY = {
  revenue:   [3200000, 3800000, 3500000, 4200000, 3900000, 4800000, 4400000, 5100000, 4700000, 5400000, 5200000, 5900000],
  expenses:  [1200000, 1400000, 1300000, 1600000, 1500000, 1800000, 1600000, 1900000, 1700000, 2000000, 1900000, 2100000],
  profit:    [] as number[],
  kpi: { revenue: 48200000, expenses: 11500000, profit: 36700000, projects: 24, budgetUsed: 78.3 },
  quarterProfit: [{ q: "Q1", v: 32 }, { q: "Q2", v: 38 }, { q: "Q3", v: 44 }, { q: "Q4", v: 51 }],
  budgetDept: [
    { label: "Engineering", v: 35, color: "#38BDF8" },
    { label: "Sales & CRM",  v: 25, color: "#818CF8" },
    { label: "Operations",   v: 20, color: "#34D399" },
    { label: "Marketing",    v: 12, color: "#FBBF24" },
    { label: "Admin",        v: 8,  color: "#F87171" },
  ],
  projects: [
    { name: "Project Alpha", health: 92, budget: 1200000, spent: 1100000, status: "On Track" },
    { name: "Project Beta",  health: 78, budget: 800000,  spent: 650000,  status: "Attention" },
    { name: "Project Gamma", health: 65, budget: 600000,  spent: 510000,  status: "At Risk" },
    { name: "Project Delta", health: 88, budget: 1500000, spent: 1300000, status: "On Track" },
    { name: "Project Epsilon",health: 55, budget: 400000, spent: 380000,  status: "At Risk" },
    { name: "Project Zeta",  health: 71, budget: 950000,  spent: 720000,  status: "Attention" },
  ],
  kpiScorecard: [
    { label: "Revenue Target",      v: 84, color: "#38BDF8" },
    { label: "Client Retention",    v: 97, color: "#34D399" },
    { label: "Budget Compliance",   v: 78, color: "#FBBF24" },
    { label: "Project Delivery",    v: 89, color: "#818CF8" },
    { label: "Employee Satisfaction", v: 91, color: "#A78BFA" },
    { label: "API Uptime",          v: 99, color: "#34D399" },
  ],
  plTable: [
    { month: "Jul 2025", revenue: 4400000, expenses: 1600000 },
    { month: "Aug 2025", revenue: 5100000, expenses: 1900000 },
    { month: "Sep 2025", revenue: 4700000, expenses: 1700000 },
    { month: "Oct 2025", revenue: 5400000, expenses: 2000000 },
    { month: "Nov 2025", revenue: 5200000, expenses: 1900000 },
    { month: "Dec 2025", revenue: 5900000, expenses: 2100000 },
  ],
};
COMPANY.profit = COMPANY.revenue.map((r, i) => r - COMPANY.expenses[i]);

const EMPLOYEES_DATA = [
  { id: "EMP-402", name: "Vijay Kumar",           role: "Senior Sales Executive", team: "Sales",       kpi: 94, revenue: 8200000, leads: 18, converted: 14, attendance: 97, incentive: 45000, deals: 12, rating: 4.8, trend: +8 },
  { id: "EMP-215", name: "Ananya Sharma",          role: "Account Manager",        team: "Sales",       kpi: 89, revenue: 6800000, leads: 15, converted: 11, attendance: 95, incentive: 38000, deals: 9,  rating: 4.6, trend: +5 },
  { id: "EMP-108", name: "Rohan Das",              role: "Business Analyst",       team: "Operations",  kpi: 82, revenue: 3100000, leads: 8,  converted: 6,  attendance: 99, incentive: 28000, deals: 5,  rating: 4.4, trend: +2 },
  { id: "EMP-612", name: "Siddharth Malhotra",     role: "Sales Executive",        team: "Sales",       kpi: 76, revenue: 4200000, leads: 12, converted: 8,  attendance: 91, incentive: 31000, deals: 7,  rating: 4.1, trend: -3 },
  { id: "EMP-901", name: "Priya Singh",            role: "Marketing Lead",         team: "Marketing",   kpi: 88, revenue: 1900000, leads: 22, converted: 9,  attendance: 96, incentive: 35000, deals: 4,  rating: 4.7, trend: +6 },
];

const EMP = {
  kpi: { avgKpi: 85.8, totalRevenue: 24200000, avgAttendance: 95.6, totalIncentive: 177000 },
  performanceTrend: {
    "EMP-402": [82, 85, 87, 90, 91, 94],
    "EMP-215": [78, 80, 82, 85, 87, 89],
    "EMP-108": [75, 77, 79, 80, 81, 82],
    "EMP-612": [80, 79, 78, 77, 76, 76],
    "EMP-901": [82, 83, 85, 86, 87, 88],
  } as Record<string, number[]>,
  teamDist: [
    { label: "Sales",      v: 3, color: "#38BDF8" },
    { label: "Operations", v: 1, color: "#34D399" },
    { label: "Marketing",  v: 1, color: "#FBBF24" },
  ],
  attendanceMonths: [97, 95, 99, 91, 96].map((a, i) => ({ name: EMPLOYEES_DATA[i].name.split(" ")[0], v: a })),
  revenueByEmp: EMPLOYEES_DATA.map(e => ({ name: e.name.split(" ")[0], v: e.revenue })),
  incentiveByEmp: EMPLOYEES_DATA.map(e => ({ name: e.name.split(" ")[0], v: e.incentive })),
};

// ─── Sub-Components ───────────────────────────────────────────────────────────
function KPICard({ label, value, delta, positive, icon: Icon, accent }: any) {
  return (
    <div className="rounded-lg p-5 flex flex-col gap-3 border transition-shadow bg-white shadow-[0_1px_6px_rgba(0,0,0,0.03)] border-black/5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1" style={{ background: `${accent}15` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <div className={cn("flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide", positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
          {positive ? <ChevronUp size={10} strokeWidth={3}/> : <ChevronDown size={10} strokeWidth={3}/>}{delta}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-black/80 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = "" }: any) {
  return (
    <div className={cn("rounded-lg p-5 border bg-white shadow-[0_1px_6px_rgba(0,0,0,0.03)] border-black/5", className)}>
      <div className="mb-4">
        <h3 className="text-[11px] font-black text-black/70 uppercase tracking-widest">{title}</h3>
        {subtitle && <p className="text-[10px] font-bold text-black/30 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function BarChart({ data, color = "#38BDF8", height = 120, showLabels = true }: { data: { label: string; v: number }[]; color?: string; height?: number; showLabels?: boolean }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-grow group">
          <span className="text-[8px] font-black text-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {typeof d.v === "number" && d.v > 100000 ? formatRupee(d.v, true) : `${d.v}${d.v <= 100 ? "%" : ""}`}
          </span>
          <div className="w-full rounded-t-md transition-all hover:opacity-90 cursor-pointer" style={{ height: `${(d.v / max) * (height - 24)}px`, background: color }} />
          {showLabels && <span className="text-[7px] font-black text-black/30 uppercase">{d.label}</span>}
        </div>
      ))}
    </div>
  );
}

function DualAreaChart({ revenue, expenses, labels }: { revenue: number[]; expenses: number[]; labels: string[] }) {
  const max = Math.max(...revenue, 1);
  const W = 100;
  const H = 140;
  const pad = 8;
  const pts = (data: number[]) => data.map((v, i) => `${pad + (i / (data.length - 1 || 1)) * (W - 2 * pad)},${H - pad - ((v / max) * (H - 2 * pad))}`).join(" ");
  const area = (data: number[]) => `M${pad},${H - pad} ` + data.map((v, i) => `L${pad + (i / (data.length - 1 || 1)) * (W - 2 * pad)},${H - pad - ((v / max) * (H - 2 * pad))}`).join(" ") + ` L${W - pad},${H - pad} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="revGradLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="expGradLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F87171" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F87171" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={area(revenue)} fill="url(#revGradLight)" />
        <path d={area(expenses)} fill="url(#expGradLight)" />
        <polyline points={pts(revenue)} fill="none" stroke="#38BDF8" strokeWidth="1" />
        <polyline points={pts(expenses)} fill="none" stroke="#F87171" strokeWidth="1" />
        {revenue.map((v, i) => {
          const x = pad + (i / (revenue.length - 1 || 1)) * (W - 2 * pad);
          const y = H - pad - ((v / max) * (H - 2 * pad));
          return <circle key={i} cx={x} cy={y} r="1.5" fill="#38BDF8" stroke="white" strokeWidth="0.5" />;
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {labels.map((l, i) => <span key={i} className="text-[7px] font-black text-black/25">{l}</span>)}
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; v: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.v, 0) || 1;
  let angle = -90;
  const R = 36, CX = 50, CY = 50, ir = 22;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc = (p: number) => {
    const start = angle;
    const end = angle + (p / 100) * 360;
    angle = end;
    const ls = end - start > 180 ? 1 : 0;
    const sx = CX + R * Math.cos(toRad(start));
    const sy = CY + R * Math.sin(toRad(start));
    const ex = CX + R * Math.cos(toRad(end - 0.2));
    const ey = CY + R * Math.sin(toRad(end - 0.2));
    const six = CX + ir * Math.cos(toRad(start));
    const siy = CY + ir * Math.sin(toRad(start));
    const eix = CX + ir * Math.cos(toRad(end - 0.2));
    const eiy = CY + ir * Math.sin(toRad(end - 0.2));
    return `M${sx},${sy} A${R},${R} 0 ${ls},1 ${ex},${ey} L${eix},${eiy} A${ir},${ir} 0 ${ls},0 ${six},${siy} Z`;
  };
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-32 h-32 flex-shrink-0 drop-shadow-sm">
        {data.map((d) => <path key={d.label} d={arc((d.v / total) * 100)} fill={d.color} opacity="1" />)}
      </svg>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-[10px] font-bold text-black/50">{d.label}</span>
            <span className="text-[10px] font-black text-black/80 ml-auto">{d.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-black/50">{label}</span>
        <span className="text-[10px] font-black" style={{ color }}>{v}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: color }} />
      </div>
    </div>
  );
}

function SparkLine({ data, color = "#38BDF8", height = 60 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * 100},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      {data.map((v, i) => (
        <circle key={i} cx={(i / (data.length - 1 || 1)) * 100} cy={height - ((v - min) / range) * height} r="1.5" fill={color} />
      ))}
    </svg>
  );
}

// ─── COMPANY VIEW ─────────────────────────────────────────────────────────────
function CompanyView({ period }: { period: string }) {
  const sliceData = (arr: number[]) => {
    const map: Record<string, number> = { "7D": 1, "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "ALL": 12 };
    const n = map[period] || 12;
    return arr.slice(-n);
  };
  const revSlice = sliceData(COMPANY.revenue);
  const expSlice = sliceData(COMPANY.expenses);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-3">
        <KPICard label="Total Revenue"       value={formatRupee(COMPANY.kpi.revenue, true)}  delta="18.4%" positive icon={TrendingUp}    accent="#0ea5e9" />
        <KPICard label="Total Expenses"      value={formatRupee(COMPANY.kpi.expenses, true)} delta="4.2%"  positive={false} icon={TrendingDown} accent="#ef4444" />
        <KPICard label="Net Profit"          value={formatRupee(COMPANY.kpi.profit, true)}   delta="22.1%" positive icon={IndianRupee}   accent="#10b981" />
        <KPICard label="Active Projects"     value="24"                             delta="3 new" positive icon={Briefcase}     accent="#6366f1" />
        <KPICard label="Budget Utilization"  value="78.3%"                          delta="On Track" positive icon={Target}     accent="#f59e0b" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ChartCard title="Revenue vs Expense Trend" subtitle="Monthly cash flow comparison" className="col-span-2">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500" /><span className="text-[9px] font-black text-black/40 uppercase">Revenue</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[9px] font-black text-black/40 uppercase">Expenses</span></div>
            <div className="ml-auto text-[9px] font-black text-black/30 uppercase">YTD Peak: {formatRupee(Math.max(...COMPANY.revenue), true)}</div>
          </div>
          <DualAreaChart revenue={revSlice} expenses={expSlice} labels={MONTHS.slice(-revSlice.length)} />
        </ChartCard>
        <ChartCard title="Profit Margin by Quarter" subtitle="Gross profit %, quarterly">
          <BarChart data={COMPANY.quarterProfit.map(q => ({ label: q.q, v: q.v }))} color="#818CF8" height={160} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ChartCard title="Budget by Department" subtitle="Allocation breakdown">
          <DonutChart data={COMPANY.budgetDept} />
        </ChartCard>
        <ChartCard title="Project Health Matrix" subtitle="Delivery score by project">
          <div className="space-y-2.5 mt-1">
            {COMPANY.projects.map(p => {
              const color = p.health >= 80 ? "#10b981" : p.health >= 65 ? "#f59e0b" : "#ef4444";
              return (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-black/60">{p.name}</span>
                    <span className="text-[10px] font-black" style={{ color }}>{p.health}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.health}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
        <ChartCard title="KPI Scorecard" subtitle="Operational performance metrics">
          <div className="space-y-3 mt-1">
            {COMPANY.kpiScorecard.map(k => <ProgressBar key={k.label} label={k.label} v={k.v} color={k.color} />)}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard title="Monthly Revenue" subtitle="12-month gross revenue trend">
          <BarChart data={MONTHS.map((m, i) => ({ label: m, v: COMPANY.revenue[i] }))} color="#38BDF8" height={150} />
        </ChartCard>
        <ChartCard title="Monthly Expenses" subtitle="12-month operational expenditure">
          <BarChart data={MONTHS.map((m, i) => ({ label: m, v: COMPANY.expenses[i] }))} color="#F87171" height={150} />
        </ChartCard>
      </div>

      <ChartCard title="Monthly Profit & Loss Ledger" subtitle="Last 6 months financial summary">
        <table className="w-full mt-2">
          <thead>
            <tr className="border-b border-black/5">
              {["Month", "Revenue", "Expenses", "Gross Profit", "Expense Ratio", "Trend"].map(h => (
                <th key={h} className="text-left pb-2 text-[9px] font-black text-black/30 uppercase tracking-widest pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPANY.plTable.map((row, i) => {
              const profitValue = row.revenue - row.expenses;
              const ratioValue = ((row.expenses / row.revenue) * 100).toFixed(1);
              const isHighRatio = parseFloat(ratioValue) > 35;
              return (
                <tr key={i} className={cn("border-b border-black/[0.04] hover:bg-black/[0.02] transition-colors", i % 2 === 1 && "bg-black/[0.01]")}>
                  <td className="py-3 text-[11px] font-black text-black/60 pr-4">{row.month}</td>
                  <td className="py-3 text-[11px] font-bold text-sky-600 pr-4">{formatRupee(row.revenue, true)}</td>
                  <td className="py-3 text-[11px] font-bold text-rose-600 pr-4">{formatRupee(row.expenses, true)}</td>
                  <td className="py-3 text-[11px] font-black text-emerald-600 pr-4">{formatRupee(profitValue, true)}</td>
                  <td className="py-3 pr-4">
                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-black", isHighRatio ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>{ratioValue}%</span>
                  </td>
                  <td className="py-3">
                    {profitValue > 0 ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-rose-500" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}

// ─── EMPLOYEE VIEW ─────────────────────────────────────────────────────────────
function EmployeeView({ period }: { period: string }) {
  const [selectedEmp, setSelectedEmp] = useState(EMPLOYEES_DATA[0].id);
  const emp = EMPLOYEES_DATA.find(e => e.id === selectedEmp)!;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <KPICard label="Avg KPI Score"     value={`${EMP.kpi.avgKpi.toFixed(1)}%`}  delta="3.2%"  positive icon={Activity}  accent="#6366f1" />
        <KPICard label="Total Revenue Gen" value={formatRupee(EMP.kpi.totalRevenue, true)}    delta="14.8%" positive icon={TrendingUp} accent="#0ea5e9" />
        <KPICard label="Avg Attendance"    value={`${EMP.kpi.avgAttendance}%`}       delta="1.1%"  positive icon={CheckCircle} accent="#10b981" />
        <KPICard label="Incentives Paid"   value={formatRupee(EMP.kpi.totalIncentive, true)}  delta="8.3%"  positive icon={Award}      accent="#f59e0b" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ChartCard title="Employee Roster" subtitle="Click to explore individual analytics">
          <div className="space-y-2 mt-1">
            {EMPLOYEES_DATA.map(e => (
              <button key={e.id} onClick={() => setSelectedEmp(e.id)} className={cn("w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left", selectedEmp === e.id ? "bg-black/5 shadow-inner" : "hover:bg-black/[0.02]")}>
                <div className="w-8 h-8 rounded-lg bg-white border border-black/5 shadow-sm flex items-center justify-center text-[10px] font-black text-black/60 flex-shrink-0">{e.name[0]}</div>
                <div className="flex-grow min-w-0">
                  <p className="text-[11px] font-black text-black/80 truncate">{e.name}</p>
                  <p className="text-[9px] font-bold text-black/40">{e.role}</p>
                </div>
                <div className={cn("text-[10px] font-black px-1.5 py-0.5 rounded", e.kpi >= 90 ? "bg-emerald-50 text-emerald-600" : e.kpi >= 80 ? "bg-sky-50 text-sky-600" : "bg-amber-50 text-amber-600")}>{e.kpi}%</div>
              </button>
            ))}
          </div>
        </ChartCard>

        <ChartCard title={`${emp.name} — Performance Trend`} subtitle="KPI score over 6 months" className="col-span-2">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg p-3 bg-black/[0.02] text-center border border-black/5">
              <p className="text-[8px] font-black text-black/40 uppercase mb-1">Leads</p>
              <p className="text-lg font-black text-black/70">{emp.leads}</p>
            </div>
            <div className="rounded-lg p-3 bg-emerald-50/50 text-center border border-emerald-500/10">
              <p className="text-[8px] font-black text-black/40 uppercase mb-1">Converted</p>
              <p className="text-lg font-black text-emerald-600">{emp.converted}</p>
            </div>
            <div className="rounded-lg p-3 bg-sky-50/50 text-center border border-sky-500/10">
              <p className="text-[8px] font-black text-black/40 uppercase mb-1">Revenue</p>
              <p className="text-lg font-black text-sky-600">{formatRupee(emp.revenue, true)}</p>
            </div>
          </div>
          <SparkLine data={EMP.performanceTrend[emp.id]} color="#6366f1" height={80} />
          <div className="flex justify-between mt-1">{["M1","M2","M3","M4","M5","M6"].map(m => <span key={m} className="text-[8px] font-black text-black/30">{m}</span>)}</div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ChartCard title="Revenue by Employee" subtitle="Individual contribution">
          <BarChart data={EMP.revenueByEmp.map(e => ({ label: e.name, v: e.v }))} color="#0ea5e9" height={150} />
        </ChartCard>
        <ChartCard title="Attendance Score" subtitle="Monthly attendance %" >
          <BarChart data={EMP.attendanceMonths.map(e => ({ label: e.name, v: e.v }))} color="#10b981" height={150} />
        </ChartCard>
        <ChartCard title="Team Distribution" subtitle="Headcount by department">
          <DonutChart data={EMP.teamDist} />
          <div className="mt-4 space-y-2">
            {EMP.teamDist.map(t => (
              <div key={t.label} className="flex justify-between text-[10px] font-bold text-black/60">
                <span>{t.label}</span><span style={{ color: t.color }}>{t.v} members</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard title="Incentive Distribution" subtitle="Total incentives paid per employee">
          <BarChart data={EMP.incentiveByEmp.map(e => ({ label: e.name, v: e.v }))} color="#f59e0b" height={150} />
        </ChartCard>
        <ChartCard title="Lead Conversion Funnel" subtitle="Leads → Conversion pipeline">
          <div className="space-y-3 mt-2">
            {EMPLOYEES_DATA.map(e => (
              <div key={e.id} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-black/60">{e.name.split(" ")[0]}</span>
                  <span className="font-black text-black/80">{e.converted}/{e.leads} — {Math.round((e.converted/e.leads)*100)}% CR</span>
                </div>
                <div className="relative h-2 rounded-full bg-black/5 overflow-hidden">
                  <div className="absolute left-0 top-0 h-full rounded-full bg-sky-200" style={{ width: "100%" }} />
                  <div className="absolute left-0 top-0 h-full rounded-full bg-sky-500" style={{ width: `${(e.converted/e.leads)*100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Employee Performance Ledger" subtitle="Full individual metrics across all KPI dimensions">
        <table className="w-full mt-2">
          <thead>
            <tr className="border-b border-black/5">
              {["Employee", "ID", "Team", "KPI Score", "Revenue", "Leads", "Converted", "Attendance", "Incentive", "Rating", "Trend"].map(h => (
                <th key={h} className="text-left pb-2 text-[9px] font-black text-black/30 uppercase tracking-widest pr-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EMPLOYEES_DATA.map((e, i) => (
              <tr key={e.id} className={cn("border-b border-black/[0.04] hover:bg-black/[0.02] transition-colors cursor-pointer", i % 2 === 1 && "bg-black/[0.01]")} onClick={() => setSelectedEmp(e.id)}>
                <td className="py-3 pr-3"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-md bg-white border border-black/10 flex items-center justify-center text-[8px] font-black text-black/60">{e.name[0]}</div><span className="text-[11px] font-bold text-black/80">{e.name}</span></div></td>
                <td className="py-3 pr-3 text-[10px] font-black text-black/40">{e.id}</td>
                <td className="py-3 pr-3"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-black/5 text-black/60">{e.team}</span></td>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-black/5 overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${e.kpi}%` }} /></div>
                    <span className={cn("text-[10px] font-black", e.kpi >= 90 ? "text-emerald-600" : e.kpi >= 80 ? "text-sky-600" : "text-amber-600")}>{e.kpi}%</span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-[11px] font-bold text-sky-600">{formatRupee(e.revenue, true)}</td>
                <td className="py-3 pr-3 text-[11px] font-bold text-black/60">{e.leads}</td>
                <td className="py-3 pr-3 text-[11px] font-bold text-emerald-600">{e.converted}</td>
                <td className="py-3 pr-3"><span className={cn("text-[10px] font-black", e.attendance >= 95 ? "text-emerald-600" : "text-amber-600")}>{e.attendance}%</span></td>
                <td className="py-3 pr-3 text-[11px] font-bold text-amber-600">{formatRupee(e.incentive, true)}</td>
                <td className="py-3 pr-3"><div className="flex items-center gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={8} className={s <= Math.floor(e.rating) ? "text-amber-400 fill-amber-400" : "text-black/10"} />)}<span className="text-[9px] font-black text-black/40 ml-1">{e.rating}</span></div></td>
                <td className="py-3">
                  <div className={cn("flex items-center gap-0.5 text-[10px] font-black", e.trend > 0 ? "text-emerald-600" : "text-rose-600")}>
                    {e.trend > 0 ? <ChevronUp size={10} /> : <ChevronDown size={10} />}{Math.abs(e.trend)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [tab, setTab] = useState<"company" | "employee">("company");
  const [period, setPeriod] = useState("1Y");

  return (
    <DashboardShell title="Analytics Command Center" subtitle="Enterprise-grade visualization for company and employee performance intelligence">
      <div className="min-h-full -m-8" style={{ background: B, padding: "32px" }}>
        
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center rounded-lg p-1 gap-1" style={{ background: S, border: "1px solid rgba(0,0,0,0.05)" }}>
            <button onClick={() => setTab("company")} className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-widest transition-all", tab === "company" ? "bg-black text-white shadow-sm" : "text-black/40 hover:text-black hover:bg-black/5")}>
              <Building2 size={13} /> Company
            </button>
            <button onClick={() => setTab("employee")} className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-widest transition-all", tab === "employee" ? "bg-black text-white shadow-sm" : "text-black/40 hover:text-black hover:bg-black/5")}>
              <Users size={13} /> Employee
            </button>
          </div>

          <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: S, border: "1px solid rgba(0,0,0,0.05)" }}>
            {["7D","1M","3M","6M","1Y","ALL"].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={cn("px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all", period === p ? "bg-black text-white shadow-md" : "text-black/30 hover:text-black hover:bg-black/5")}>
                {p}
              </button>
            ))}
          </div>

          <div className="flex-grow" />

          <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/50 hover:text-black px-4 py-2 rounded-lg border border-black/10 hover:border-black/20 hover:bg-white transition-all">
            <Download size={13} /> Export
          </button>
        </div>

        {tab === "company" ? <CompanyView period={period} /> : <EmployeeView period={period} />}
      </div>
    </DashboardShell>
  );
}
