"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import {
  TrendingUp, TrendingDown, Building2, Users, Download,
  Activity, Briefcase, IndianRupee, Target,
  ChevronUp, ChevronDown, CheckCircle, Award, Star,
  Loader2,
} from "lucide-react";

// ─── Color token ─────────────────────────────────────────────────────────────
const B = "#FBFBFA";
const S = "white";

// ─── Formatters ──────────────────────────────────────────────────────────────
const formatRupee = (n: number, compact = false) => {
  if (compact && n >= 10000000) return `\u20B9${(n / 10000000).toFixed(2)}Cr`;
  if (compact && n >= 100000)   return `\u20B9${(n / 100000).toFixed(1)}L`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── TypeScript Interfaces ────────────────────────────────────────────────────
interface CompanyData {
  revenue:       number[];
  expenses:      number[];
  profit:        number[];
  kpi:           { revenue: number; expenses: number; profit: number; projects: number; budgetUsed: number };
  quarterProfit: { q: string; v: number }[];
  budgetDept:    { label: string; v: number; color: string }[];
  projects:      { name: string; health: number; budget: number; spent: number; status: string }[];
  kpiScorecard:  { label: string; v: number; color: string }[];
  plTable:       { month: string; revenue: number; expenses: number }[];
}

interface EmpStats {
  kpi:              { avgKpi: number; totalRevenue: number; avgAttendance: number; totalIncentive: number };
  performanceTrend: Record<string, number[]>;
  teamDist:         { label: string; v: number; color: string }[];
  attendanceMonths: { name: string; v: number }[];
  revenueByEmp:     { name: string; v: number }[];
  incentiveByEmp:   { name: string; v: number }[];
}

interface EmployeeItem {
  id:          string;
  name:        string;
  employee_id: string;
  role:        string;
  team:        string;
  kpi:         number;
  leads:       number;
  converted:   number;
  revenue:     number;
  attendance:  number;
  incentive:   number;
  rating:      number;
  trend:       number;
}

const EMPTY_COMPANY: CompanyData = {
  revenue: Array(12).fill(0), expenses: Array(12).fill(0), profit: Array(12).fill(0),
  kpi: { revenue: 0, expenses: 0, profit: 0, projects: 0, budgetUsed: 0 },
  quarterProfit: [], budgetDept: [], projects: [], kpiScorecard: [], plTable: [],
};

const EMPTY_EMP: EmpStats = {
  kpi: { avgKpi: 0, totalRevenue: 0, avgAttendance: 0, totalIncentive: 0 },
  performanceTrend: {}, teamDist: [], attendanceMonths: [], revenueByEmp: [], incentiveByEmp: [],
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
  const max = Math.max(...revenue, ...expenses, 1);
  const W = 100, H = 140, pad = 8;
  const pts = (data: number[]) =>
    data.map((v, i) => `${pad + (i / (data.length - 1 || 1)) * (W - 2 * pad)},${H - pad - ((v / max) * (H - 2 * pad))}`).join(" ");
  const area = (data: number[]) =>
    `M${pad},${H - pad} ` +
    data.map((v, i) => `L${pad + (i / (data.length - 1 || 1)) * (W - 2 * pad)},${H - pad - ((v / max) * (H - 2 * pad))}`).join(" ") +
    ` L${W - pad},${H - pad} Z`;
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
    const sx  = CX + R  * Math.cos(toRad(start));
    const sy  = CY + R  * Math.sin(toRad(start));
    const ex  = CX + R  * Math.cos(toRad(end - 0.2));
    const ey  = CY + R  * Math.sin(toRad(end - 0.2));
    const six = CX + ir * Math.cos(toRad(start));
    const siy = CY + ir * Math.sin(toRad(start));
    const eix = CX + ir * Math.cos(toRad(end - 0.2));
    const eiy = CY + ir * Math.sin(toRad(end - 0.2));
    return `M${sx},${sy} A${R},${R} 0 ${ls},1 ${ex},${ey} L${eix},${eiy} A${ir},${ir} 0 ${ls},0 ${six},${siy} Z`;
  };
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-32 h-32 flex-shrink-0 drop-shadow-sm">
        {data.map(d => <path key={d.label} d={arc((d.v / total) * 100)} fill={d.color} />)}
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
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: color }} />
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

function LoadingOverlay() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="animate-spin text-black/20" />
    </div>
  );
}

// ─── COMPANY VIEW ─────────────────────────────────────────────────────────────
function CompanyView({ period, data }: { period: string; data: CompanyData }) {
  const sliceData = (arr: number[]) => {
    const map: Record<string, number> = { "7D": 1, "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "ALL": 12 };
    return arr.slice(-(map[period] || 12));
  };

  const revSlice = sliceData(data.revenue);
  const expSlice = sliceData(data.expenses);

  const prevRev = data.revenue.slice(-2)[0] || 0;
  const currRev = data.revenue.slice(-1)[0] || 0;
  const revDelta = prevRev > 0 ? ((currRev - prevRev) / prevRev * 100).toFixed(1) : "—";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-3">
        <KPICard label="Total Revenue"      value={formatRupee(data.kpi.revenue, true)}  delta={`${revDelta}%`} positive={Number(revDelta) >= 0} icon={TrendingUp}   accent="#0ea5e9" />
        <KPICard label="Total Expenses"     value={formatRupee(data.kpi.expenses, true)} delta="MoM"            positive={false}                  icon={TrendingDown} accent="#ef4444" />
        <KPICard label="Net Profit"         value={formatRupee(data.kpi.profit, true)}   delta={data.kpi.profit > 0 ? "Profitable" : "Loss"}       positive={data.kpi.profit > 0} icon={IndianRupee} accent="#10b981" />
        <KPICard label="Active Projects"    value={String(data.kpi.projects)}             delta="Live"           positive                           icon={Briefcase}    accent="#6366f1" />
        <KPICard label="Budget Utilization" value={`${data.kpi.budgetUsed}%`}             delta={data.kpi.budgetUsed <= 85 ? "On Track" : "Over"} positive={data.kpi.budgetUsed <= 85} icon={Target} accent="#f59e0b" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ChartCard title="Revenue vs Expense Trend" subtitle="Monthly cash flow comparison" className="col-span-2">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500" /><span className="text-[9px] font-black text-black/40 uppercase">Revenue</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[9px] font-black text-black/40 uppercase">Expenses</span></div>
            <div className="ml-auto text-[9px] font-black text-black/30 uppercase">YTD Peak: {formatRupee(Math.max(...data.revenue), true)}</div>
          </div>
          <DualAreaChart revenue={revSlice} expenses={expSlice} labels={MONTHS.slice(-revSlice.length)} />
        </ChartCard>
        <ChartCard title="Profit Margin by Quarter" subtitle="Gross profit %, quarterly">
          {data.quarterProfit.length > 0
            ? <BarChart data={data.quarterProfit.map(q => ({ label: q.q, v: q.v }))} color="#818CF8" height={160} />
            : <p className="text-[10px] text-black/30 text-center py-8">No quarterly data yet</p>
          }
        </ChartCard>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ChartCard title="Budget by Department" subtitle="Allocation breakdown">
          {data.budgetDept.length > 0
            ? <DonutChart data={data.budgetDept} />
            : <p className="text-[10px] text-black/30 text-center py-8">No project budget data</p>
          }
        </ChartCard>
        <ChartCard title="Project Health Matrix" subtitle="Delivery score by project">
          {data.projects.length > 0 ? (
            <div className="space-y-2.5 mt-1">
              {data.projects.map(p => {
                const color = p.health >= 80 ? "#10b981" : p.health >= 65 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={p.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-black/60 truncate max-w-[120px]">{p.name}</span>
                      <span className="text-[10px] font-black" style={{ color }}>{p.health}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.health}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-[10px] text-black/30 text-center py-8">No active projects</p>}
        </ChartCard>
        <ChartCard title="KPI Scorecard" subtitle="Operational performance metrics">
          <div className="space-y-3 mt-1">
            {data.kpiScorecard.map(k => <ProgressBar key={k.label} label={k.label} v={k.v} color={k.color} />)}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard title="Monthly Revenue" subtitle="12-month gross revenue trend">
          <BarChart data={MONTHS.map((m, i) => ({ label: m, v: data.revenue[i] || 0 }))} color="#38BDF8" height={150} />
        </ChartCard>
        <ChartCard title="Monthly Expenses" subtitle="12-month operational expenditure">
          <BarChart data={MONTHS.map((m, i) => ({ label: m, v: data.expenses[i] || 0 }))} color="#F87171" height={150} />
        </ChartCard>
      </div>

      <ChartCard title="Monthly Profit & Loss Ledger" subtitle="Last 6 months financial summary">
        {data.plTable.length > 0 ? (
          <table className="w-full mt-2">
            <thead>
              <tr className="border-b border-black/5">
                {["Month","Revenue","Expenses","Gross Profit","Expense Ratio","Trend"].map(h => (
                  <th key={h} className="text-left pb-2 text-[9px] font-black text-black/30 uppercase tracking-widest pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.plTable.map((row, i) => {
                const profitValue = row.revenue - row.expenses;
                const ratioValue  = row.revenue > 0 ? ((row.expenses / row.revenue) * 100).toFixed(1) : "0.0";
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
        ) : <p className="text-[10px] text-black/30 text-center py-8">No P&L data for selected period</p>}
      </ChartCard>
    </div>
  );
}

// ─── EMPLOYEE VIEW ────────────────────────────────────────────────────────────
function EmployeeView({ empData, employees }: { empData: EmpStats; employees: EmployeeItem[] }) {
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  useEffect(() => {
    if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees]);

  if (employees.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[11px] font-black text-black/30 uppercase tracking-widest">No employee records found</p>
      </div>
    );
  }

  const emp = employees.find(e => e.id === selectedEmpId) || employees[0];
  const trend = empData.performanceTrend[emp.id] || Array(6).fill(0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <KPICard label="Avg KPI Score"     value={`${empData.kpi.avgKpi.toFixed(1)}%`}         delta="YTD Avg"  positive icon={Activity}    accent="#6366f1" />
        <KPICard label="Total Revenue Gen" value={formatRupee(empData.kpi.totalRevenue, true)}  delta="Won Leads" positive icon={TrendingUp}  accent="#0ea5e9" />
        <KPICard label="Avg Attendance"    value={`${empData.kpi.avgAttendance}%`}              delta="This Year" positive={empData.kpi.avgAttendance >= 85} icon={CheckCircle} accent="#10b981" />
        <KPICard label="Incentives Paid"   value={formatRupee(empData.kpi.totalIncentive, true)} delta="Claimed"  positive icon={Award}       accent="#f59e0b" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ChartCard title="Employee Roster" subtitle="Click to explore individual analytics">
          <div className="space-y-1.5 mt-1 max-h-64 overflow-y-auto">
            {employees.map(e => (
              <button key={e.id} onClick={() => setSelectedEmpId(e.id)}
                className={cn("w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left", selectedEmpId === e.id ? "bg-black/5 shadow-inner" : "hover:bg-black/[0.02]")}>
                <div className="w-8 h-8 rounded-lg bg-white border border-black/5 shadow-sm flex items-center justify-center text-[10px] font-black text-black/60 flex-shrink-0 uppercase">
                  {e.name[0]}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-[11px] font-black text-black/80 truncate">{e.name}</p>
                  <p className="text-[9px] font-bold text-black/40">{e.role}</p>
                </div>
                <div className={cn("text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0", e.kpi >= 90 ? "bg-emerald-50 text-emerald-600" : e.kpi >= 80 ? "bg-sky-50 text-sky-600" : "bg-amber-50 text-amber-600")}>
                  {e.kpi}%
                </div>
              </button>
            ))}
          </div>
        </ChartCard>

        <ChartCard title={`${emp.name} — Performance Trend`} subtitle="KPI score over last 6 months" className="col-span-2">
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
          <SparkLine data={trend} color="#6366f1" height={80} />
          <div className="flex justify-between mt-1">
            {["M1","M2","M3","M4","M5","M6"].map(m => <span key={m} className="text-[8px] font-black text-black/30">{m}</span>)}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ChartCard title="Revenue by Employee" subtitle="Individual contribution (won leads)">
          {empData.revenueByEmp.length > 0
            ? <BarChart data={empData.revenueByEmp.map(e => ({ label: e.name, v: e.v }))} color="#0ea5e9" height={150} />
            : <p className="text-[10px] text-black/30 text-center py-8">No revenue data yet</p>}
        </ChartCard>
        <ChartCard title="Attendance Score" subtitle="Monthly attendance %">
          <BarChart data={empData.attendanceMonths.map(e => ({ label: e.name, v: e.v }))} color="#10b981" height={150} />
        </ChartCard>
        <ChartCard title="Team Distribution" subtitle="Headcount by team">
          {empData.teamDist.length > 0 ? (
            <>
              <DonutChart data={empData.teamDist} />
              <div className="mt-4 space-y-2">
                {empData.teamDist.map(t => (
                  <div key={t.label} className="flex justify-between text-[10px] font-bold text-black/60">
                    <span>{t.label}</span><span style={{ color: t.color }}>{t.v} members</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-[10px] text-black/30 text-center py-8">No team data</p>}
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard title="Incentive Distribution" subtitle="Total incentives earned per employee">
          {empData.incentiveByEmp.length > 0
            ? <BarChart data={empData.incentiveByEmp.map(e => ({ label: e.name, v: e.v }))} color="#f59e0b" height={150} />
            : <p className="text-[10px] text-black/30 text-center py-8">No incentive data yet</p>}
        </ChartCard>
        <ChartCard title="Lead Conversion Funnel" subtitle="Leads → Conversion pipeline">
          {employees.filter(e => e.leads > 0).length > 0 ? (
            <div className="space-y-3 mt-2">
              {employees.filter(e => e.leads > 0).map(e => (
                <div key={e.id} className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-bold text-black/60">{e.name.split(" ")[0]}</span>
                    <span className="font-black text-black/80">
                      {e.converted}/{e.leads} — {Math.round((e.converted / e.leads) * 100)}% CR
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-black/5 overflow-hidden">
                    <div className="absolute left-0 top-0 h-full rounded-full bg-sky-200" style={{ width: "100%" }} />
                    <div className="absolute left-0 top-0 h-full rounded-full bg-sky-500 transition-all duration-700" style={{ width: `${(e.converted / e.leads) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-[10px] text-black/30 text-center py-8">No lead data yet</p>}
        </ChartCard>
      </div>

      <ChartCard title="Employee Performance Ledger" subtitle="Full individual metrics across all KPI dimensions">
        <div className="overflow-x-auto">
          <table className="w-full mt-2 min-w-[900px]">
            <thead>
              <tr className="border-b border-black/5">
                {["Employee","ID","Team","KPI Score","Revenue","Leads","Converted","Attendance","Incentive","Rating","Trend"].map(h => (
                  <th key={h} className="text-left pb-2 text-[9px] font-black text-black/30 uppercase tracking-widest pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => (
                <tr key={e.id}
                  className={cn("border-b border-black/[0.04] hover:bg-black/[0.02] transition-colors cursor-pointer", i % 2 === 1 && "bg-black/[0.01]", selectedEmpId === e.id && "bg-indigo-50/50")}
                  onClick={() => setSelectedEmpId(e.id)}>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-white border border-black/10 flex items-center justify-center text-[8px] font-black text-black/60 uppercase">{e.name[0]}</div>
                      <span className="text-[11px] font-bold text-black/80">{e.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-[10px] font-black text-black/40">{e.employee_id}</td>
                  <td className="py-3 pr-3"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-black/5 text-black/60">{e.team}</span></td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-black/5 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${e.kpi}%` }} />
                      </div>
                      <span className={cn("text-[10px] font-black", e.kpi >= 90 ? "text-emerald-600" : e.kpi >= 80 ? "text-sky-600" : "text-amber-600")}>{e.kpi}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-[11px] font-bold text-sky-600">{formatRupee(e.revenue, true)}</td>
                  <td className="py-3 pr-3 text-[11px] font-bold text-black/60">{e.leads}</td>
                  <td className="py-3 pr-3 text-[11px] font-bold text-emerald-600">{e.converted}</td>
                  <td className="py-3 pr-3"><span className={cn("text-[10px] font-black", e.attendance >= 95 ? "text-emerald-600" : "text-amber-600")}>{e.attendance}%</span></td>
                  <td className="py-3 pr-3 text-[11px] font-bold text-amber-600">{formatRupee(e.incentive, true)}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} size={8} className={s <= Math.floor(e.rating) ? "text-amber-400 fill-amber-400" : "text-black/10"} />)}
                      <span className="text-[9px] font-black text-black/40 ml-1">{e.rating}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-black", e.trend > 0 ? "text-emerald-600" : "text-rose-600")}>
                      {e.trend > 0 ? <ChevronUp size={10} /> : <ChevronDown size={10} />}{Math.abs(e.trend)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [tab, setTab]     = useState<"company" | "employee">("company");
  const [period, setPeriod] = useState("1Y");

  const [companyData,  setCompanyData]  = useState<CompanyData>(EMPTY_COMPANY);
  const [empStats,     setEmpStats]     = useState<EmpStats>(EMPTY_EMP);
  const [employees,    setEmployees]    = useState<EmployeeItem[]>([]);
  const [loadingC,     setLoadingC]     = useState(true);
  const [loadingE,     setLoadingE]     = useState(true);

  const year = new Date().getFullYear();

  const fetchCompany = useCallback(async () => {
    try {
      const { data } = await axios.get<CompanyData>(`/api/analytics/company?year=${year}`);
      setCompanyData(data);
    } catch (_) {
      // silently keep last data on error
    } finally {
      setLoadingC(false);
    }
  }, [year]);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await axios.get<{ employees: EmployeeItem[] } & EmpStats>(`/api/analytics/employees?year=${year}`);
      const { employees: emps, ...stats } = data;
      setEmployees(emps);
      setEmpStats(stats as EmpStats);
    } catch (_) {
      // silently keep last data
    } finally {
      setLoadingE(false);
    }
  }, [year]);

  useEffect(() => {
    fetchCompany();
    fetchEmployees();

    // ── Realtime subscriptions ─────────────────────────────────────────────
    const channel = supabase
      .channel("analytics-realtime")
      // Company data triggers
      .on("postgres_changes", { event: "*", schema: "public", table: "company_revenues" },   fetchCompany)
      .on("postgres_changes", { event: "*", schema: "public", table: "company_expenses" },   fetchCompany)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" },           fetchCompany)
      // Employee data triggers
      .on("postgres_changes", { event: "*", schema: "public", table: "kpi_scores" },         fetchEmployees)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_logs" },    fetchEmployees)
      .on("postgres_changes", { event: "*", schema: "public", table: "incentives" },         fetchEmployees)
      .on("postgres_changes", { event: "*", schema: "public", table: "employee_ratings" },   fetchEmployees)
      // Shared triggers (leads affect both)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchCompany();
        fetchEmployees();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCompany, fetchEmployees]);

  return (
    <DashboardShell
      moduleKey="analytics"
      title="Analytics Command Center"
      subtitle="Enterprise-grade visualization for company and employee performance intelligence"
    >
      <div className="min-h-full -m-8" style={{ background: B, padding: "32px" }}>

        {/* ── Controls ── */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center rounded-lg p-1 gap-1" style={{ background: S, border: "1px solid rgba(0,0,0,0.05)" }}>
            <button onClick={() => setTab("company")}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-widest transition-all",
                tab === "company" ? "bg-black text-white shadow-sm" : "text-black/40 hover:text-black hover:bg-black/5")}>
              <Building2 size={13} /> Company
            </button>
            <button onClick={() => setTab("employee")}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-widest transition-all",
                tab === "employee" ? "bg-black text-white shadow-sm" : "text-black/40 hover:text-black hover:bg-black/5")}>
              <Users size={13} /> Employee
            </button>
          </div>

          <div className="flex items-center rounded-lg p-1 gap-0.5" style={{ background: S, border: "1px solid rgba(0,0,0,0.05)" }}>
            {["7D","1M","3M","6M","1Y","ALL"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all",
                  period === p ? "bg-black text-white shadow-md" : "text-black/30 hover:text-black hover:bg-black/5")}>
                {p}
              </button>
            ))}
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[9px] font-black text-black/30 uppercase tracking-widest">Live</span>
          </div>

          <div className="flex-grow" />

          <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/50 hover:text-black px-4 py-2 rounded-lg border border-black/10 hover:border-black/20 hover:bg-white transition-all">
            <Download size={13} /> Export
          </button>
        </div>

        {/* ── Views ── */}
        {tab === "company" ? (
          loadingC ? <LoadingOverlay /> : <CompanyView period={period} data={companyData} />
        ) : (
          loadingE ? <LoadingOverlay /> : <EmployeeView empData={empStats} employees={employees} />
        )}
      </div>
    </DashboardShell>
  );
}
