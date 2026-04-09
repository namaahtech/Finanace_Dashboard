"use client";

import React, { useState } from "react";
import {
  Users,
  Clock,
  CalendarDays,
  Search,
  Download,
  UserCheck,
  UserX,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Edit2,
  X,
  CheckCircle2,
  AlarmClock,
  UmbrellaOff,
  Palmtree,
  LayoutGrid,
  List,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ─── Types ───────────────────────────────────────────────
type AttStatus = "present" | "late" | "absent" | "leave" | "holiday";
type ViewTab = "daily" | "logsheet" | "summary";

interface Employee {
  id: string;
  name: string;
  dept: string;
  designation: string;
}

interface DayRecord {
  clockIn: string;
  clockOut: string;
  hours: number;
  status: AttStatus;
  note?: string;
}

// ─── Mock Data ───────────────────────────────────────────
const EMPLOYEES: Employee[] = [
  { id: "1",  name: "Priya Sharma",    dept: "Product",     designation: "Product Manager" },
  { id: "2",  name: "Amit Verma",      dept: "Sales",       designation: "Sales Executive" },
  { id: "3",  name: "Divya Menon",     dept: "Executive",   designation: "COO" },
  { id: "4",  name: "Kartik Verma",    dept: "Operations",  designation: "Ops Lead" },
  { id: "5",  name: "Neha Kapoor",     dept: "Finance",     designation: "Accounts Manager" },
  { id: "6",  name: "Rohan Gupta",     dept: "HR",          designation: "HR Executive" },
  { id: "7",  name: "Sanya Iyer",      dept: "Product",     designation: "UI Designer" },
  { id: "8",  name: "Dev Mehta",       dept: "Sales",       designation: "Sales Manager" },
  { id: "9",  name: "Ananya Pillai",   dept: "Engineering", designation: "Backend Engineer" },
  { id: "10", name: "Manish Rao",      dept: "Finance",     designation: "Finance Analyst" },
  { id: "11", name: "Simran Kaur",     dept: "HR",          designation: "Recruiter" },
  { id: "12", name: "Arjun Nair",      dept: "Engineering", designation: "Frontend Engineer" },
];

const DEPARTMENTS = ["All", "Executive", "Engineering", "Operations", "Finance", "Sales", "Product", "HR"];

// Generate mock monthly data for April 2026 (30 days)
function generateMonthData(): Record<string, Record<number, DayRecord>> {
  const data: Record<string, Record<number, DayRecord>> = {};
  const statuses: AttStatus[] = ["present", "present", "present", "present", "late", "absent", "leave"];
  EMPLOYEES.forEach((emp) => {
    data[emp.id] = {};
    for (let d = 1; d <= 30; d++) {
      const dow = new Date(2026, 3, d).getDay(); // 0=Sun, 6=Sat
      if (dow === 0 || dow === 6) {
        data[emp.id][d] = { clockIn: "—", clockOut: "—", hours: 0, status: "holiday" };
        continue;
      }
      const seed = (parseInt(emp.id) * 7 + d * 13) % statuses.length;
      const status = statuses[seed];
      const clockInH = status === "late" ? 10 : 9;
      const clockInM = (d * 3 + parseInt(emp.id) * 7) % 60;
      const clockOutH = 18;
      const clockOutM = (d * 5 + parseInt(emp.id) * 3) % 30;
      const hours = status === "absent" || status === "leave"
        ? 0
        : parseFloat((clockOutH - clockInH + (clockOutM - clockInM) / 60).toFixed(1));
      data[emp.id][d] = {
        clockIn:  status === "absent" || status === "leave" ? "—" : `${String(clockInH).padStart(2, "0")}:${String(clockInM).padStart(2, "0")} AM`,
        clockOut: status === "absent" || status === "leave" ? "—" : `${String(clockOutH - 12).padStart(2, "0")}:${String(clockOutM).padStart(2, "0")} PM`,
        hours,
        status,
      };
    }
  });
  return data;
}

const MONTH_DATA = generateMonthData();

// Today = April 9, 2026
const TODAY_DAY = 9;
const TODAY_MONTH = 3; // 0-indexed
const TODAY_YEAR = 2026;

const STATUS_BADGE: Record<AttStatus, "success" | "warning" | "danger" | "default" | "info"> = {
  present: "success",
  late: "warning",
  absent: "danger",
  leave: "info",
  holiday: "default",
};

const STATUS_CELL: Record<AttStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  late:    "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  absent:  "bg-red-500/15 text-red-600 dark:text-red-400",
  leave:   "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  holiday: "bg-theme-raised text-theme-subtle",
};

const STATUS_LABEL: Record<AttStatus, string> = {
  present: "P",
  late:    "L",
  absent:  "A",
  leave:   "Le",
  holiday: "H",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

function computeCompliance(empId: string, day: number): number {
  const rec = MONTH_DATA[empId]?.[day];
  if (!rec) return 0;
  if (rec.status === "holiday") return 100;
  if (rec.status === "absent") return 0;
  if (rec.status === "leave") return 80;
  if (rec.status === "late") return 75;
  return 95 + (parseInt(empId) % 6);
}

// ─── Component ───────────────────────────────────────────
export default function AdminAttendancePage() {
  const [tab, setTab] = useState<ViewTab>("daily");
  const [selectedDay, setSelectedDay] = useState(TODAY_DAY);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  // Edit modal
  const [editTarget, setEditTarget] = useState<{ emp: Employee; day: number } | null>(null);
  const [editForm, setEditForm] = useState<{ status: AttStatus; clockIn: string; clockOut: string; note: string }>({
    status: "present", clockIn: "", clockOut: "", note: "",
  });

  const filteredEmps = EMPLOYEES.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.dept.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || e.dept === deptFilter;
    return matchSearch && matchDept;
  });

  // Daily stats for selected day
  const dayRecords = filteredEmps.map((e) => ({
    emp: e,
    rec: MONTH_DATA[e.id]?.[selectedDay] ?? { clockIn: "—", clockOut: "—", hours: 0, status: "absent" as AttStatus },
    compliance: computeCompliance(e.id, selectedDay),
  }));

  const statsAll = EMPLOYEES.map((e) => MONTH_DATA[e.id]?.[selectedDay]);
  const present  = statsAll.filter((r) => r?.status === "present").length;
  const late     = statsAll.filter((r) => r?.status === "late").length;
  const absent   = statsAll.filter((r) => r?.status === "absent").length;
  const onLeave  = statsAll.filter((r) => r?.status === "leave").length;
  const avgComp  = Math.round(
    EMPLOYEES.map((e) => computeCompliance(e.id, selectedDay)).reduce((a, b) => a + b, 0) / EMPLOYEES.length
  );

  // Working days so far this month (up to selected day, excl. weekends)
  const workingDaysSoFar = Array.from({ length: selectedDay }, (_, i) => i + 1)
    .filter((d) => { const dow = new Date(TODAY_YEAR, TODAY_MONTH, d).getDay(); return dow !== 0 && dow !== 6; });

  // Monthly summary per employee
  const monthlySummary = EMPLOYEES.map((emp) => {
    const days = Object.values(MONTH_DATA[emp.id] ?? {});
    return {
      emp,
      present: days.filter((d) => d.status === "present").length,
      late:    days.filter((d) => d.status === "late").length,
      absent:  days.filter((d) => d.status === "absent").length,
      leave:   days.filter((d) => d.status === "leave").length,
      totalHours: parseFloat(days.reduce((s, d) => s + d.hours, 0).toFixed(1)),
      compliance: Math.round(days.filter((d) => d.status !== "holiday")
        .reduce((s, _, i, arr) => s + computeCompliance(emp.id, i + 1), 0) /
        days.filter((d) => d.status !== "holiday").length),
    };
  });

  // All days in April for log sheet header
  const aprilDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const weekendDays = new Set(aprilDays.filter((d) => {
    const dow = new Date(TODAY_YEAR, TODAY_MONTH, d).getDay();
    return dow === 0 || dow === 6;
  }));

  function openEdit(emp: Employee, day: number) {
    const rec = MONTH_DATA[emp.id]?.[day];
    setEditTarget({ emp, day });
    setEditForm({
      status: rec?.status ?? "absent",
      clockIn: rec?.clockIn ?? "",
      clockOut: rec?.clockOut ?? "",
      note: rec?.note ?? "",
    });
  }

  function saveEdit() {
    if (!editTarget) return;
    MONTH_DATA[editTarget.emp.id][editTarget.day] = {
      ...MONTH_DATA[editTarget.emp.id][editTarget.day],
      status: editForm.status,
      clockIn: editForm.clockIn,
      clockOut: editForm.clockOut,
      note: editForm.note,
    };
    setEditTarget(null);
  }

  const dayLabel = new Date(TODAY_YEAR, TODAY_MONTH, selectedDay)
    .toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <DashboardShell
      title="Attendance"
      subtitle="Track, manage and audit workforce attendance."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Download size={14} className="mr-1.5" />
            Export
          </Button>
        </div>
      }
    >
      <div className="space-y-5">

        {/* View Tabs + Date Navigation */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
            {([
              { key: "daily",    label: "Daily Log",    icon: List },
              { key: "logsheet", label: "Log Sheet",    icon: LayoutGrid },
              { key: "summary",  label: "Monthly Summary", icon: CalendarRange },
            ] as { key: ViewTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  tab === key
                    ? "bg-theme-surface text-theme-fg shadow-sm"
                    : "text-theme-muted hover:text-theme-fg"
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Date Navigation (not shown in summary tab) */}
          {tab !== "summary" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                disabled={selectedDay <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-surface text-theme-muted hover:text-theme-fg disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="flex items-center gap-1.5 rounded-lg border border-theme-border bg-theme-surface px-3 py-1.5">
                <CalendarDays size={13} className="text-theme-muted" />
                <span className="text-xs font-semibold text-theme-fg whitespace-nowrap">
                  {new Date(TODAY_YEAR, TODAY_MONTH, selectedDay).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric"
                  })}
                </span>
              </div>
              <button
                onClick={() => setSelectedDay(Math.min(30, selectedDay + 1))}
                disabled={selectedDay >= 30}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-surface text-theme-muted hover:text-theme-fg disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ── DAILY LOG ── */}
        {tab === "daily" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: "Total",    value: EMPLOYEES.length, icon: Users,      color: "text-theme-fg",    bg: "bg-theme-raised" },
                { label: "Present",  value: present,          icon: UserCheck,  color: "text-emerald-600", bg: "bg-emerald-500/10" },
                { label: "Late",     value: late,             icon: AlarmClock, color: "text-amber-600",   bg: "bg-amber-500/10" },
                { label: "Absent",   value: absent,           icon: UserX,      color: "text-red-500",     bg: "bg-red-500/10" },
                { label: "On Leave", value: onLeave,          icon: Palmtree,   color: "text-sky-500",     bg: "bg-sky-500/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="page-card flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                    <Icon size={16} className={color} />
                  </div>
                  <div>
                    <p className="text-[11px] text-theme-muted">{label}</p>
                    <p className={cn("text-xl font-black leading-tight", color)}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Compliance bar */}
            <div className="page-card">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-theme-muted" />
                  <span className="text-xs font-semibold text-theme-fg">
                    Compliance — <span className="text-theme-muted font-normal">{dayLabel}</span>
                  </span>
                </div>
                <span className="text-sm font-black text-theme-fg">{avgComp}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-theme-raised">
                <div className="h-full rounded-full bg-theme-primary transition-all" style={{ width: `${avgComp}%` }} />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-4">
                {[
                  { label: "Present", count: present, dot: "bg-emerald-500" },
                  { label: "Late",    count: late,    dot: "bg-amber-500" },
                  { label: "Absent",  count: absent,  dot: "bg-red-500" },
                  { label: "Leave",   count: onLeave, dot: "bg-sky-500" },
                ].map(({ label, count, dot }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full flex-shrink-0", dot)} />
                    <span className="text-xs text-theme-muted">
                      {label}: <span className="font-semibold text-theme-fg">{count}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters + Table */}
            <div className="page-card overflow-hidden p-0">
              <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {DEPARTMENTS.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setDeptFilter(dept)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all",
                        deptFilter === dept
                          ? "bg-theme-primary text-theme-surface shadow-sm"
                          : "bg-theme-raised text-theme-muted hover:text-theme-fg"
                      )}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all w-44"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                      <th className="px-5 py-3 font-semibold">Employee</th>
                      <th className="px-5 py-3 font-semibold">Dept / Role</th>
                      <th className="px-5 py-3 font-semibold">Clock In</th>
                      <th className="px-5 py-3 font-semibold">Clock Out</th>
                      <th className="px-5 py-3 font-semibold">Hours</th>
                      <th className="px-5 py-3 font-semibold">Compliance</th>
                      <th className="px-5 py-3 font-semibold text-right">Status</th>
                      <th className="px-5 py-3 font-semibold text-right">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {dayRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-sm text-theme-subtle">No records found</td>
                      </tr>
                    ) : dayRecords.map(({ emp, rec, compliance }) => (
                      <tr key={emp.id} className="group transition-colors hover:bg-theme-raised/40">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">
                              {getInitials(emp.name)}
                            </div>
                            <span className="text-xs font-semibold text-theme-fg">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div>
                            <span className="text-xs font-medium text-theme-fg">{emp.dept}</span>
                            <p className="text-[10px] text-theme-subtle">{emp.designation}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-theme-fg">{rec.clockIn}</td>
                        <td className="px-5 py-3 font-mono text-xs text-theme-fg">{rec.clockOut}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-semibold text-theme-fg">
                            {rec.hours > 0 ? `${rec.hours}h` : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {rec.status !== "holiday" && rec.status !== "absent" ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-theme-raised">
                                <div
                                  className={cn("h-full rounded-full", compliance >= 90 ? "bg-emerald-500" : compliance >= 75 ? "bg-amber-500" : "bg-red-500")}
                                  style={{ width: `${compliance}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-theme-muted">{compliance}%</span>
                            </div>
                          ) : <span className="text-xs text-theme-subtle">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Badge variant={STATUS_BADGE[rec.status]}>
                            {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => openEdit(emp, selectedDay)}
                            className="rounded-lg p-1.5 text-theme-subtle hover:bg-theme-raised hover:text-theme-fg transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
                <span className="text-xs text-theme-subtle">
                  {dayRecords.length} of {EMPLOYEES.length} employees
                </span>
                <span className="text-xs text-theme-muted">
                  Working days this month so far: <span className="font-semibold text-theme-fg">{workingDaysSoFar.length}</span>
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── LOG SHEET ── */}
        {tab === "logsheet" && (
          <div className="page-card overflow-hidden p-0">
            <div className="border-b border-theme-border px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-theme-fg">
                  Monthly Log Sheet — April 2026
                </h3>
                <div className="flex items-center gap-3 text-[10px] text-theme-muted font-semibold">
                  {[
                    { label: "P = Present", cls: "text-emerald-600" },
                    { label: "L = Late",    cls: "text-amber-600" },
                    { label: "A = Absent",  cls: "text-red-500" },
                    { label: "Le = Leave",  cls: "text-sky-600" },
                    { label: "H = Holiday", cls: "text-theme-subtle" },
                  ].map(({ label, cls }) => (
                    <span key={label} className={cls}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-page">
                    <th className="sticky left-0 bg-theme-page px-4 py-2 text-left text-xs font-semibold text-theme-muted min-w-[160px] z-10">Employee</th>
                    {aprilDays.map((d) => (
                      <th
                        key={d}
                        className={cn(
                          "px-1 py-2 text-center font-semibold min-w-[30px]",
                          weekendDays.has(d) ? "text-theme-subtle" : "text-theme-muted",
                          d === selectedDay && "text-theme-primary"
                        )}
                      >
                        <div>{d}</div>
                        <div className="text-[9px] font-normal">
                          {new Date(TODAY_YEAR, TODAY_MONTH, d).toLocaleDateString("en-IN", { weekday: "narrow" })}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold text-theme-muted">P</th>
                    <th className="px-3 py-2 text-center font-semibold text-theme-muted">L</th>
                    <th className="px-3 py-2 text-center font-semibold text-theme-muted">A</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {EMPLOYEES.map((emp) => {
                    const pCount = Object.values(MONTH_DATA[emp.id]).filter((r) => r.status === "present").length;
                    const lCount = Object.values(MONTH_DATA[emp.id]).filter((r) => r.status === "late").length;
                    const aCount = Object.values(MONTH_DATA[emp.id]).filter((r) => r.status === "absent").length;
                    return (
                      <tr key={emp.id} className="hover:bg-theme-raised/30 transition-colors">
                        <td className="sticky left-0 bg-theme-surface px-4 py-1.5 z-10">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[9px] font-black">
                              {getInitials(emp.name)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-theme-fg leading-tight">{emp.name}</p>
                              <p className="text-[10px] text-theme-subtle">{emp.dept}</p>
                            </div>
                          </div>
                        </td>
                        {aprilDays.map((d) => {
                          const rec = MONTH_DATA[emp.id][d];
                          return (
                            <td key={d} className="px-0.5 py-1 text-center">
                              <button
                                onClick={() => openEdit(emp, d)}
                                title={`${emp.name} — ${d} Apr`}
                                className={cn(
                                  "mx-auto flex h-6 w-7 items-center justify-center rounded text-[10px] font-bold transition-all hover:ring-1 hover:ring-theme-primary",
                                  STATUS_CELL[rec.status]
                                )}
                              >
                                {STATUS_LABEL[rec.status]}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-center font-bold text-emerald-600">{pCount}</td>
                        <td className="px-3 py-1.5 text-center font-bold text-amber-600">{lCount}</td>
                        <td className="px-3 py-1.5 text-center font-bold text-red-500">{aCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MONTHLY SUMMARY ── */}
        {tab === "summary" && (
          <div className="page-card overflow-hidden p-0">
            <div className="border-b border-theme-border px-5 py-4">
              <h3 className="text-sm font-semibold text-theme-fg">Monthly Summary — April 2026</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                    <th className="px-5 py-3 font-semibold">Employee</th>
                    <th className="px-5 py-3 font-semibold text-center">Present</th>
                    <th className="px-5 py-3 font-semibold text-center">Late</th>
                    <th className="px-5 py-3 font-semibold text-center">Absent</th>
                    <th className="px-5 py-3 font-semibold text-center">Leave</th>
                    <th className="px-5 py-3 font-semibold text-center">Total Hours</th>
                    <th className="px-5 py-3 font-semibold">Compliance</th>
                    <th className="px-5 py-3 font-semibold text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {monthlySummary
                    .filter((r) => {
                      const matchDept = deptFilter === "All" || r.emp.dept === deptFilter;
                      const matchSearch = r.emp.name.toLowerCase().includes(search.toLowerCase());
                      return matchDept && matchSearch;
                    })
                    .sort((a, b) => b.compliance - a.compliance)
                    .map(({ emp, present: p, late: l, absent: a, leave: lv, totalHours, compliance }) => {
                      const grade = compliance >= 95 ? "A+" : compliance >= 90 ? "A" : compliance >= 80 ? "B" : compliance >= 70 ? "C" : "D";
                      const gradeColor = compliance >= 90 ? "text-emerald-600" : compliance >= 80 ? "text-amber-600" : "text-red-500";
                      return (
                        <tr key={emp.id} className="hover:bg-theme-raised/40 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">
                                {getInitials(emp.name)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-theme-fg">{emp.name}</p>
                                <p className="text-[10px] text-theme-subtle">{emp.dept}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center font-semibold text-emerald-600">{p}</td>
                          <td className="px-5 py-3 text-center font-semibold text-amber-600">{l}</td>
                          <td className="px-5 py-3 text-center font-semibold text-red-500">{a}</td>
                          <td className="px-5 py-3 text-center font-semibold text-sky-600">{lv}</td>
                          <td className="px-5 py-3 text-center text-xs font-semibold text-theme-fg">{totalHours}h</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-theme-raised">
                                <div
                                  className={cn("h-full rounded-full", compliance >= 90 ? "bg-emerald-500" : compliance >= 75 ? "bg-amber-500" : "bg-red-500")}
                                  style={{ width: `${compliance}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-theme-muted">{compliance}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={cn("text-sm font-black", gradeColor)}>{grade}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {/* Summary filters row */}
            <div className="flex flex-wrap items-center gap-2 border-t border-theme-border bg-theme-page px-5 py-3">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(dept)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all",
                    deptFilter === dept
                      ? "bg-theme-primary text-theme-surface shadow-sm"
                      : "bg-theme-raised text-theme-muted hover:text-theme-fg"
                  )}
                >
                  {dept}
                </button>
              ))}
              <div className="relative ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-muted" size={12} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 rounded-lg border border-theme-border bg-theme-surface pl-7 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all w-36"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Attendance Modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-theme-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div>
                <h3 className="text-sm font-bold text-theme-fg">Edit Attendance</h3>
                <p className="text-xs text-theme-muted mt-0.5">
                  {editTarget.emp.name} · {editTarget.day} Apr 2026
                </p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              {/* Status */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-theme-muted uppercase tracking-wide">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["present", "late", "absent", "leave", "holiday"] as AttStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditForm({ ...editForm, status: s })}
                      className={cn(
                        "rounded-lg py-2 text-xs font-semibold transition-all capitalize",
                        editForm.status === s
                          ? cn("shadow-sm", STATUS_CELL[s])
                          : "bg-theme-raised text-theme-muted hover:text-theme-fg"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted uppercase tracking-wide">Clock In</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:05 AM"
                    value={editForm.clockIn}
                    onChange={(e) => setEditForm({ ...editForm, clockIn: e.target.value })}
                    className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted uppercase tracking-wide">Clock Out</label>
                  <input
                    type="text"
                    placeholder="e.g. 06:00 PM"
                    value={editForm.clockOut}
                    onChange={(e) => setEditForm({ ...editForm, clockOut: e.target.value })}
                    className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all"
                  />
                </div>
              </div>
              {/* Note */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-theme-muted uppercase tracking-wide">Note (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Admin note..."
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-theme-border px-6 py-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={saveEdit}>
                <CheckCircle2 size={13} className="mr-1.5" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
