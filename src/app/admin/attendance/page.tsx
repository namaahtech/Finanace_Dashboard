"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users, Clock, CalendarDays, Search, Download, UserCheck, UserX,
  TrendingUp, ChevronLeft, ChevronRight, Edit2, X, CheckCircle2,
  AlarmClock, Palmtree, LayoutGrid, List, CalendarRange, Play, Square, Timer,
  RotateCcw, Target, Coffee
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import dayjs from "dayjs";

// ─── Types ───────────────────────────────────────────────
type AttStatus = "present" | "late" | "absent" | "leave" | "holiday" | "half_day" | "on_duty";
type ViewTab = "daily" | "logsheet" | "summary" | "leaves";

interface LeaveRequest {
  id: string;
  employee_id: string;
  type: string;
  from_date: string;
  to_date: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  employee: { name: string, department: string };
}

interface Employee {
  id: string;
  name: string;
  department: string;
  designation: string;
  employee_id: string;
  monthly_leave_quota: number;
  leave_balance: number;
}

interface DayRecord {
  clock_in: string | null;
  clock_out: string | null;
  status: AttStatus;
  note?: string;
  id?: string;
}

const STATUS_CELL: Record<string, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  late:    "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  absent:  "bg-red-500/15 text-red-600 dark:text-red-400",
  leave:   "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  holiday: "bg-theme-raised text-theme-subtle",
  on_duty: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
};

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "default" | "info"> = {
  present: "success", late: "warning", absent: "danger", leave: "info", holiday: "default", half_day: "warning", on_duty: "info"
};

const STATUS_LABEL: Record<string, string> = {
  present: "P", late: "L", absent: "A", leave: "Le", holiday: "H", on_duty: "OD",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDurationDisplay(clock_in: string, clock_out: string | null) {
  if (!clock_in) return "—";
  const start = dayjs(`2000-01-01 ${clock_in}`);
  const end = clock_out ? dayjs(`2000-01-01 ${clock_out}`) : dayjs();
  const diffMin = end.diff(start, 'minute');
  const hrs = Math.floor(Math.abs(diffMin) / 60);
  const mins = Math.abs(diffMin) % 60;
  return `${hrs} hr ${mins} min`;
}

// ─── Digital Clock & Session Timer ────────────────────────
function DigitalClock({ clockIn, clockOut }: { clockIn?: string | null, clockOut?: string | null }) {
  const [now, setNow] = useState(dayjs());
  
  useEffect(() => {
    const inv = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(inv);
  }, []);

  const getSessionDuration = () => {
    if (!clockIn) return "00 hr 00 min";
    const today = dayjs().format("YYYY-MM-DD");
    const start = dayjs(`${today} ${clockIn}`);
    const end = clockOut ? dayjs(`${today} ${clockOut}`) : now;
    const diff = end.diff(start, 'minute');
    if (diff < 0) return "00 hr 00 min";
    const h = Math.floor(Math.abs(diff) / 60);
    const m = Math.abs(diff) % 60;
    return `${h} hr ${m} min`;
  };

  const getExactSessionTimer = () => {
    if (!clockIn) return "00:00:00";
    const today = dayjs().format("YYYY-MM-DD");
    const start = dayjs(`${today} ${clockIn}`);
    const end = clockOut ? dayjs(`${today} ${clockOut}`) : now;
    const diff = end.diff(start, 'second');
    if (diff < 0) return "00:00:00";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-8 mr-8 border-r border-theme-border pr-8">
      <div className="flex flex-col items-end">
        <div className={cn("text-3xl font-black tabular-nums leading-none tracking-tighter", clockIn ? "text-theme-fg" : "text-theme-subtle/30")}>
          {clockIn ? dayjs(`2000-01-01 ${clockIn}`).format("hh:mm:ss") : "00:00:00"} 
          <span className="text-[10px] ml-1 opacity-50 uppercase">{clockIn ? dayjs(`2000-01-01 ${clockIn}`).format("A") : "AM"}</span>
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted mt-1">START PROTOCOL</p>
      </div>
      
      <div className="flex flex-col items-end">
        <div className={cn(
          "text-3xl font-black tabular-nums leading-none tracking-tighter transition-colors duration-500", 
          clockIn && !clockOut ? "text-emerald-500" : "text-theme-fg",
          !clockIn && "text-theme-subtle/30"
        )}>
          {getExactSessionTimer()}
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted mt-1">
          {clockOut ? "TOTAL DURATION" : "RUNNING SESSION"}
        </p>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────
export default function AdminAttendancePage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<ViewTab>("daily");
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dailyLogs, setDailyLogs] = useState<Record<string, DayRecord & { modified_by_name?: string }>>({});
  const [monthLogs, setMonthLogs] = useState<Record<string, Record<string, DayRecord>>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("employee");
  const [showOverride, setShowOverride] = useState(false);
  const [targetEmp, setTargetEmp] = useState<any>(null);
  const [overrideForm, setOverrideForm] = useState({
    clock_in: "",
    clock_out: "",
    status: "present" as AttStatus,
    reason: ""
  });

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    empId: "",
    type: "casual",
    from: dayjs().format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
    reason: ""
  });

  // Initial Auth & Data
  async function init() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         setUserId(user.id);
         const { data: profile } = await supabase.from("employees").select("role").eq("id", user.id).single();
         if (profile) setUserRole(profile.role);
      }
      
      const { data: emps } = await supabase.from("employees").select("id, name, department, designation, employee_id, monthly_leave_quota, leave_balance").order("name");
      setEmployees(emps || []);
      
      await loadLogsForDate(selectedDate);
    } finally {
      setLoading(false);
    }
  }

  async function loadLogsForDate(dateStr: string) {
    const { data: att } = await supabase.from("attendance_logs").select("*, modified_by_name:employees!modified_by(name)").eq("date", dateStr);
    const logMap: Record<string, DayRecord & { modified_by_name?: string }> = {};
    att?.forEach(l => {
      logMap[l.employee_id] = { 
         clock_in: l.clock_in, 
         clock_out: l.clock_out, 
         status: l.status, 
         id: l.id,
         modified_by_name: l.modified_by_name?.name 
      };
    });
    setDailyLogs(logMap);
  }

  async function loadMonthData() {
    const start = dayjs(selectedDate).startOf('month').format("YYYY-MM-DD");
    const end = dayjs(selectedDate).endOf('month').format("YYYY-MM-DD");
    const { data } = await supabase.from("attendance_logs").select("*").gte("date", start).lte("date", end);
    const bigMap: Record<string, Record<string, DayRecord>> = {};
    data?.forEach(l => {
      if (!bigMap[l.employee_id]) bigMap[l.employee_id] = {};
      bigMap[l.employee_id][l.date] = { clock_in: l.clock_in, clock_out: l.clock_out, status: l.status };
    });
    setMonthLogs(bigMap);
  }

  async function loadLeaves() {
    const { data } = await supabase.from("leave_requests")
      .select("*, employee:employees(name, department)")
      .order("created_at", { ascending: false });
    setLeaves(data || []);
  }

  useEffect(() => { init(); }, []); // Run once on mount
  useEffect(() => { loadLogsForDate(selectedDate); }, [selectedDate]); // Refetch on date change
  useEffect(() => { 
    if (tab === "leaves") loadLeaves();
    else if (tab !== "daily") loadMonthData(); 
  }, [tab, selectedDate]);

  useEffect(() => {
    const chan = supabase.channel("att_updates").on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => {
      loadLogsForDate(selectedDate);
      if (tab !== "daily") loadMonthData();
    }).subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [tab, selectedDate]);

  // Actions
  async function handleCheckAction(type: "in" | "out") {
    if (!userId) return;
    setChecking(true);
    try {
      const nowTime = dayjs().format("HH:mm:ss");
      const today = dayjs().format("YYYY-MM-DD");
      
      if (type === "in") {
        const isLate = dayjs().hour() >= 10;
        const status: AttStatus = isLate ? "late" : "present";
        
        // Optimistic UI Update
        setDailyLogs(prev => ({
          ...prev,
          [userId]: { ...prev[userId], clock_in: nowTime, status: status } as any
        }));

        const { error } = await supabase.from("attendance_logs").upsert({
          employee_id: userId, 
          date: today, 
          clock_in: nowTime, 
          status: status
        }, { onConflict: "employee_id,date" });
        
        if (error) {
          console.error("Attendance Sync Error:", error);
          throw new Error(`Sync Error: ${error.message}`);
        }
        showToast("Mission Protocol Initiated", "success");
      } else {
        const { error } = await supabase.from("attendance_logs").update({ clock_out: nowTime })
          .eq("employee_id", userId).eq("date", today);
        
        if (error) {
          console.error("Attendance Sync Error:", error);
          throw new Error(`Sync Error: ${error.message}`);
        }
        
        // Optimistic UI Update
        setDailyLogs(prev => ({
          ...prev,
          [userId]: { ...prev[userId], clock_out: nowTime } as any
        }));
        
        showToast("Protocol Safely Concluded", "success");
      }
      
      // Refresh to ensure absolute consistency
      if (selectedDate === today) loadLogsForDate(today);
    } catch (e: any) {
      console.error("Critical Attendance Error:", e);
      showToast(e.message, "error");
      // Revert on error
      loadLogsForDate(selectedDate);
    } finally {
      setChecking(false);
    }
  }

  async function handleAdminOverride() {
    if (!targetEmp || !userId) return;
    setChecking(true);
    try {
      const { error } = await supabase.from("attendance_logs").upsert({
        employee_id: targetEmp.id,
        date: selectedDate,
        clock_in: overrideForm.clock_in || null,
        clock_out: overrideForm.clock_out || null,
        status: overrideForm.status,
        modified_by: userId,
        modified_at: dayjs().toISOString(),
        modification_reason: overrideForm.reason
      }, { onConflict: "employee_id,date" });

      if (error) throw error;
      showToast(`Protocol updated for ${targetEmp.name}`, "success");
      setShowOverride(false);
      loadLogsForDate(selectedDate);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setChecking(false);
    }
  }

  async function handleAdminDelete(empId: string) {
    if (!confirm("Are you sure you want to purge this attendance record? This will be logged.")) return;
    try {
       const { error } = await supabase.from("attendance_logs").delete().eq("employee_id", empId).eq("date", selectedDate);
       if (error) throw error;
       showToast("Record purged successfully", "success");
       loadLogsForDate(selectedDate);
    } catch (e: any) {
       showToast(e.message, "error");
    }
  }

  async function handleLeaveStatus(id: string, status: "approved" | "rejected") {
    try {
      const { error } = await supabase.from("leave_requests").update({ 
        status, 
        approved_by: userId 
      }).eq("id", id);
      if (error) throw error;
      showToast(`Protocol ${status} successfully`, "success");
      loadLeaves();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  async function handleManualLeave() {
    if (!leaveForm.empId) return;
    try {
      const { error } = await supabase.from("leave_requests").insert({
        employee_id: leaveForm.empId,
        type: leaveForm.type,
        from_date: leaveForm.from,
        to_date: leaveForm.to,
        reason: leaveForm.reason,
        status: userRole === "super_admin" ? "approved" : "pending",
        approved_by: userRole === "super_admin" ? userId : null
      });
      if (error) throw error;
      showToast("Leave induction completed", "success");
      setShowLeaveModal(false);
      loadLeaves();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  const depts = ["All", ...new Set(employees.map(e => e.department).filter(Boolean))];
  const filtered = employees.filter(e => {
    const mSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const mDept = deptFilter === "All" || e.department === deptFilter;
    return mSearch && mDept;
  });

  const presentCount = Object.values(dailyLogs).filter(l => l.status === "present" || l.status === "late").length;
  const lateCount = Object.values(dailyLogs).filter(l => l.status === "late").length;
  const absentCount = employees.length - presentCount;

  const myTodayLog = userId ? dailyLogs[userId] : null;
  const isSelectedToday = selectedDate === dayjs().format("YYYY-MM-DD");

  return (
    <>
      <DashboardShell
        title="Attendance"
        subtitle="Track, manage and audit workforce attendance."
        actions={
          <div className="flex items-center">
            <DigitalClock clockIn={myTodayLog?.clock_in} clockOut={myTodayLog?.clock_out} />
            <div className="flex items-center gap-2">
              <Button 
                 variant="outline" size="sm" onClick={() => handleCheckAction("in")} 
                 disabled={checking || (!!myTodayLog?.clock_in && isSelectedToday) || !isSelectedToday} 
                 className="h-10 px-6 rounded-xl font-bold border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5 transition-all">
                <Play size={14} className="mr-2" /> Check In
              </Button>
              <Button 
                 variant="outline" size="sm" onClick={() => handleCheckAction("out")} 
                 disabled={checking || !myTodayLog?.clock_in || !!myTodayLog?.clock_out}
                 className="h-10 px-6 rounded-xl font-bold border-rose-500/20 text-rose-600 hover:bg-rose-500/5 transition-all">
                <Square size={14} className="mr-2" /> Check Out
              </Button>
              <Button variant="secondary" size="sm" className="h-10 px-4 rounded-xl font-bold">
                <Download size={14} className="mr-2" /> Export
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5 shadow-inner">
              {[
                { key: "daily",    label: "Daily Log",    icon: List },
                { key: "logsheet", label: "Log Sheet",    icon: LayoutGrid },
                { key: "summary",  label: "Monthly Summary", icon: CalendarRange },
                { key: "leaves",   label: "Leave Approval", icon: Palmtree },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key as ViewTab)}
                  className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all", tab === key ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format("YYYY-MM-DD"))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-surface text-theme-muted hover:text-theme-fg transition-all"><ChevronLeft size={14} /></button>
              <div className="flex items-center gap-2 rounded-lg border border-theme-border bg-theme-surface px-4 py-1.5 group">
                <CalendarDays size={14} className="text-theme-primary" />
                <span className="text-xs font-bold text-theme-fg tabular-nums">{dayjs(selectedDate).format("D MMM, YYYY")}</span>
                {!isSelectedToday && (
                  <button 
                    onClick={() => setSelectedDate(dayjs().format("YYYY-MM-DD"))}
                    title="Reset to Today"
                    className="ml-2 p-1 rounded-md bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-white transition-all"
                  >
                    <RotateCcw size={10} />
                  </button>
                )}
              </div>
              <button onClick={() => setSelectedDate(dayjs(selectedDate).add(1, 'day').format("YYYY-MM-DD"))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-surface text-theme-muted hover:text-theme-fg transition-all"><ChevronRight size={14} /></button>
            </div>
          </div>

          {tab === "daily" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { label: "Total", value: employees.length, icon: Users, color: "text-theme-fg", bg: "bg-theme-raised" },
                  { label: "Present", value: presentCount, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                  { label: "Late", value: lateCount, icon: AlarmClock, color: "text-amber-600", bg: "bg-amber-500/10" },
                  { label: "Absent", value: absentCount, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
                  { label: "On Duty", value: Object.values(dailyLogs).filter(l => l.status === 'on_duty').length, icon: Target, color: "text-indigo-600", bg: "bg-indigo-500/10" },
                ].map((s) => (
                  <div key={s.label} className="page-card flex items-center gap-3">
                    <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", s.bg)}><s.icon size={16} className={s.color} /></div>
                    <div><p className="text-[11px] text-theme-muted">{s.label}</p><p className={cn("text-xl font-black tabular-nums", s.color)}>{s.value}</p></div>
                  </div>
                ))}
              </div>

              <div className="page-card p-0 overflow-hidden">
                 <div className="flex flex-col gap-3 border-b border-theme-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between bg-theme-page/10">
                   <div className="flex flex-wrap gap-1.5">
                     {depts.map(d => (
                       <button key={d} onClick={() => setDeptFilter(d)} className={cn("rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all", deptFilter === d ? "bg-theme-primary text-theme-surface shadow-md" : "bg-theme-raised text-theme-muted hover:text-theme-fg")}>{d}</button>
                     ))}
                   </div>
                   <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
                     <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-52 rounded-xl border border-theme-border bg-theme-page pl-9 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong" />
                   </div>
                 </div>

                 <div className="overflow-x-auto">
                   <table className="w-full text-sm">
                     <thead>
                       <tr className="border-b border-theme-border bg-theme-page/30 text-left text-[11px] font-bold text-theme-muted uppercase tracking-widest">
                         <th className="px-6 py-4">Employee</th>
                         <th className="px-6 py-4">Department / Designation</th>
                         <th className="px-6 py-4">Check In</th>
                         <th className="px-6 py-4">Check Out</th>
                         <th className="px-6 py-4">Hours</th>
                         <th className="px-6 py-4">Leave Quota</th>
                         <th className="px-6 py-4 text-right">Audit Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-theme-border">
                       {loading ? (
                         <tr><td colSpan={7} className="px-6 py-12 text-center text-xs text-theme-muted">Synchronizing Protocols...</td></tr>
                       ) : filtered.map(emp => {
                         const log: any = dailyLogs[emp.id];
                         const isAdmin = userRole === "super_admin";
                         return (
                           <tr key={emp.id} className="group hover:bg-theme-raised/30 transition-colors">
                             <td className="px-6 py-4"><div className="flex items-center gap-3">
                               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-black">{getInitials(emp.name)}</div>
                               <span className="text-xs font-bold text-theme-fg">{emp.name}</span>
                               {emp.id === userId && <Badge variant="default" className="text-[8px] h-4">YOU</Badge>}
                             </div></td>
                             <td className="px-6 py-4"><p className="text-xs font-medium text-theme-fg">{emp.department}</p><p className="text-[10px] text-theme-subtle">{emp.designation}</p></td>
                             <td className="px-6 py-4 font-mono text-xs text-theme-fg">{log?.clock_in ? dayjs(`2000-01-01 ${log.clock_in}`).format("hh:mm A") : "—"}</td>
                             <td className="px-6 py-4 font-mono text-xs text-theme-fg">{log?.clock_out ? dayjs(`2000-01-01 ${log.clock_out}`).format("hh:mm A") : "—"}</td>
                             <td className="px-6 py-4 text-xs font-bold text-theme-fg tabular-nums">{log?.clock_in ? formatDurationDisplay(log.clock_in, log.clock_out) : "—"}</td>
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-theme-muted bg-theme-raised/30 px-2.5 py-1.5 rounded-lg w-fit border border-theme-border/50 transition-all hover:bg-emerald-500/5 hover:text-emerald-600 group/quota">
                                  <Coffee size={11} className="transition-transform group-hover/quota:scale-110" />
                                  <span className="tabular-nums tracking-tighter">{emp.monthly_leave_quota || 0} L/M</span>
                                </div>
                              </td>
                             <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                   <div className="flex flex-col items-end">
                                      <Badge variant={STATUS_BADGE[log?.status || 'absent']}>{log?.status ? log.status.toUpperCase().replace('_', ' ') : "ABSENT"}</Badge>
                                      {log?.modified_by_name && (
                                        <span className="text-[8px] font-black uppercase text-amber-600 mt-1 opacity-60">Modified by {log.modified_by_name}</span>
                                      )}
                                   </div>
                                   {isAdmin && (
                                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                           onClick={() => {
                                              setTargetEmp(emp);
                                              setOverrideForm({
                                                 clock_in: log?.clock_in || "09:00:00",
                                                 clock_out: log?.clock_out || "18:00:00",
                                                 status: log?.status || "present",
                                                 reason: ""
                                              });
                                              setShowOverride(true);
                                           }}
                                           className="p-1.5 rounded-lg bg-theme-raised text-theme-muted hover:text-theme-fg transition-all"
                                        >
                                           <Edit2 size={13} />
                                        </button>
                                        {log && (
                                          <button 
                                             onClick={() => handleAdminDelete(emp.id)}
                                             className="p-1.5 rounded-lg bg-rose-50 text-rose-400 hover:text-rose-600 transition-all"
                                          >
                                             <X size={13} />
                                          </button>
                                        )}
                                     </div>
                                   )}
                                </div>
                             </td>
                           </tr>
                         )
                       })}
                     </tbody>
                   </table>
                 </div>
              </div>
            </>
          )}

          {/* ── LOG SHEET ── */}
          {tab === "logsheet" && (
            <div className="page-card overflow-hidden p-0">
              <div className="border-b border-theme-border px-5 py-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-theme-fg">Monthly Log Sheet — {dayjs(selectedDate).format("MMMM YYYY")}</h3>
                <div className="flex items-center gap-4 text-[9px] font-black tracking-widest text-theme-muted uppercase">
                  {["P: Present", "L: Late", "A: Absent", "Le: Leave"].map(l => <span key={l}>{l}</span>)}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead><tr className="border-b border-theme-border bg-theme-page">
                    <th className="sticky left-0 bg-theme-page px-4 py-3 text-left font-bold text-theme-muted min-w-[180px] z-10">Employee</th>
                    {Array.from({ length: dayjs(selectedDate).daysInMonth() }, (_, i) => i + 1).map(d => (
                      <th key={d} className={cn("px-1 text-center font-bold min-w-[32px]", d === dayjs().date() && isSelectedToday ? "text-theme-primary" : "text-theme-muted")}>{d}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-theme-border">
                    {filtered.map(emp => (
                      <tr key={emp.id} className="hover:bg-theme-raised/10 transition-colors">
                        <td className="sticky left-0 bg-theme-surface px-4 py-2 z-10 font-bold text-theme-fg text-[11px]">{emp.name}</td>
                        {Array.from({ length: dayjs(selectedDate).daysInMonth() }, (_, i) => i + 1).map(d => {
                          const dateCode = dayjs(selectedDate).date(d).format("YYYY-MM-DD");
                          const st = monthLogs[emp.id]?.[dateCode]?.status;
                          return (
                            <td key={d} className="px-0.5 py-1 text-center">
                               <div className={cn("mx-auto h-6 w-7 flex items-center justify-center rounded text-[9px] font-black transition-all", st ? STATUS_CELL[st] : "bg-theme-raised/30 text-theme-subtle/20")}>
                                 {st ? STATUS_LABEL[st] : "—"}
                               </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── MONTHLY SUMMARY ── */}
          {tab === "summary" && (
            <div className="page-card p-0 overflow-hidden">
               <div className="border-b border-theme-border px-5 py-4 font-bold text-theme-fg flex justify-between items-center">
                 <span>Monthly Performance Audit — {dayjs(selectedDate).format("MMMM YYYY")}</span>
                 <Target size={14} className="text-theme-muted" />
               </div>
               <table className="w-full text-sm">
                  <thead><tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted font-bold">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4 text-center">Present</th>
                    <th className="px-6 py-4 text-center">Late</th>
                    <th className="px-6 py-4 text-center">Absent</th>
                    <th className="px-6 py-4 text-right">Total Duration</th>
                  </tr></thead>
                  <tbody className="divide-y divide-theme-border">
                    {filtered.map(emp => {
                      const logs = Object.values(monthLogs[emp.id] || {});
                      const p = logs.filter(l => l.status === 'present').length;
                      const l = logs.filter(l => l.status === 'late').length;
                      const a = logs.filter(l => l.status === 'absent').length;
                      let totalMin = 0;
                      logs.forEach(log => {
                        if (log.clock_in && log.clock_out) {
                          totalMin += Math.abs(dayjs(`2000-01-01 ${log.clock_out}`).diff(dayjs(`2000-01-01 ${log.clock_in}`), 'm'));
                        }
                      });
                      return (
                        <tr key={emp.id} className="hover:bg-theme-raised/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-theme-fg">{emp.name}</td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-600">{p}</td>
                          <td className="px-6 py-4 text-center font-bold text-amber-600">{l}</td>
                          <td className="px-6 py-4 text-center font-bold text-red-500">{a}</td>
                          <td className="px-6 py-4 text-right font-black tabular-nums">{Math.floor(totalMin/60)} hr {totalMin%60} min</td>
                        </tr>
                      )
                    })}
                  </tbody>
               </table>
            </div>
          )}
          {/* ── LEAVE APPROVAL ── */}
          {tab === "leaves" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-black text-theme-fg tracking-tight">Active Leave Protocols</h3>
                {userRole === "super_admin" && (
                  <Button onClick={() => setShowLeaveModal(true)} size="sm" className="rounded-xl font-bold bg-theme-primary text-white">
                    <Palmtree size={14} className="mr-2" /> Manual Entry
                  </Button>
                )}
              </div>
              
              <div className="page-card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme-border bg-theme-page/30 text-left text-[11px] font-bold text-theme-muted uppercase tracking-widest">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Duration</th>
                      <th className="px-6 py-4">Reason</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {leaves.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-xs text-theme-muted">No pending protocols found.</td></tr>
                    ) : leaves.map(req => (
                      <tr key={req.id} className="hover:bg-theme-raised/30 transition-colors">
                        <td className="px-6 py-4">
                           <p className="text-xs font-bold text-theme-fg">{req.employee?.name}</p>
                           <p className="text-[10px] text-theme-muted">{req.employee?.department}</p>
                        </td>
                        <td className="px-6 py-4 uppercase text-[10px] font-black text-theme-fg">{req.type}</td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-theme-fg">{dayjs(req.from_date).format("D MMM")} — {dayjs(req.to_date).format("D MMM")}</p>
                          <p className="text-[10px] text-theme-muted">{dayjs(req.to_date).diff(dayjs(req.from_date), 'day') + 1} Days</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-theme-muted max-w-xs truncate">{req.reason || "—"}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {req.status === "pending" ? (
                              <>
                                <button onClick={() => handleLeaveStatus(req.id, "approved")} className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle2 size={14} /></button>
                                <button onClick={() => handleLeaveStatus(req.id, "rejected")} className="h-8 w-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all"><X size={14} /></button>
                              </>
                            ) : (
                              <Badge variant={req.status === "approved" ? "success" : "danger"}>{req.status.toUpperCase()}</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DashboardShell>

      {/* MANUAL LEAVE MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                 <h3 className="text-lg font-black text-zinc-900 tracking-tight">Manual Leave Entry</h3>
                 <button onClick={() => setShowLeaveModal(false)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-200 transition-colors text-zinc-400">
                    <X size={18} />
                 </button>
              </div>
              
              <div className="p-8 space-y-6">
                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Select Employee</label>
                    <select 
                       value={leaveForm.empId}
                       onChange={(e) => setLeaveForm({...leaveForm, empId: e.target.value})}
                       className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-sm font-bold text-zinc-900 outline-none focus:border-theme-primary transition-all"
                    >
                       <option value="">Choose Employee...</option>
                       {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_id})</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">From Date</label>
                       <input type="date" value={leaveForm.from} onChange={(e) => setLeaveForm({...leaveForm, from: e.target.value})} className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-sm font-bold text-zinc-900 outline-none" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">To Date</label>
                       <input type="date" value={leaveForm.to} onChange={(e) => setLeaveForm({...leaveForm, to: e.target.value})} className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-sm font-bold text-zinc-900 outline-none" />
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Leave Type</label>
                    <div className="grid grid-cols-2 gap-2">
                       {['sick', 'casual', 'earned', 'unpaid'].map(t => (
                          <button key={t} onClick={() => setLeaveForm({...leaveForm, type: t})} className={cn("h-10 text-[10px] font-bold uppercase rounded-xl border transition-all", leaveForm.type === t ? "bg-theme-primary text-white border-theme-primary" : "bg-white text-zinc-500 border-zinc-200")}>
                             {t}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Reason (Optional)</label>
                    <textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})} className="w-full h-24 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium text-zinc-900 outline-none focus:border-theme-primary resize-none" />
                 </div>
              </div>

              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3">
                 <button onClick={() => setShowLeaveModal(false)} className="px-6 py-2.5 text-sm font-bold text-zinc-500">Cancel</button>
                 <button onClick={handleManualLeave} className="px-8 py-2.5 bg-black text-white rounded-full text-sm font-bold shadow-xl">Apply Protocol</button>
              </div>
           </div>
        </div>
      )}
      
      {/* ADMIN OVERRIDE MODAL */}
      {showOverride && targetEmp && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 flex items-center justify-center bg-black text-white rounded-full font-black text-sm">
                       {getInitials(targetEmp.name)}
                    </div>
                    <div>
                       <h3 className="text-base font-bold text-zinc-900">{targetEmp.name}</h3>
                       <p className="text-xs text-zinc-500 font-medium">{targetEmp.employee_id} • {targetEmp.designation}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowOverride(false)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-200 transition-colors text-zinc-400">
                    <X size={18} />
                 </button>
              </div>
              
              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Clock In Time</label>
                       <input 
                          type="time" 
                          step="1"
                          value={overrideForm.clock_in}
                          onChange={(e) => setOverrideForm({...overrideForm, clock_in: e.target.value})}
                          className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-sm font-bold text-zinc-900 outline-none focus:border-emerald-500 transition-all"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Clock Out Time</label>
                       <input 
                          type="time" 
                          step="1"
                          value={overrideForm.clock_out}
                          onChange={(e) => setOverrideForm({...overrideForm, clock_out: e.target.value})}
                          className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-sm font-bold text-zinc-900 outline-none focus:border-emerald-500 transition-all"
                       />
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Attendance Status</label>
                    <div className="grid grid-cols-3 gap-2">
                       {(['present', 'late', 'absent', 'on_duty', 'half_day', 'leave'] as AttStatus[]).map(s => (
                          <button 
                             key={s}
                             onClick={() => setOverrideForm({...overrideForm, status: s})}
                             className={cn(
                                "h-10 text-[10px] font-bold uppercase rounded-xl border transition-all",
                                overrideForm.status === s 
                                   ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100" 
                                   : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                             )}
                          >
                             {s.replace('_', ' ')}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Reason for Override</label>
                    <textarea 
                       placeholder="e.g. Forgot to sign in, System downtime..."
                       value={overrideForm.reason}
                       onChange={(e) => setOverrideForm({...overrideForm, reason: e.target.value})}
                       className="w-full min-h-[100px] p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium text-zinc-900 outline-none focus:border-emerald-500 transition-all resize-none"
                    />
                 </div>
              </div>

              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3">
                 <button 
                    onClick={() => setShowOverride(false)}
                    className="px-6 py-2.5 text-sm font-bold text-zinc-500 hover:text-zinc-900"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={handleAdminOverride}
                    disabled={checking}
                    className="px-8 py-2.5 bg-black text-white rounded-full text-sm font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 disabled:opacity-50"
                 >
                    {checking ? "Applying..." : "Confirm Override"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
}
