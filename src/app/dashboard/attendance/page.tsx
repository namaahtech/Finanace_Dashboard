"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarDays, Clock, Play, Square, ChevronLeft, ChevronRight,
  ChevronDown, UserCheck, Timer, X, RotateCcw, ListFilter,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import dayjs from "dayjs";
import { Badge } from "@/components/ui/BadgeLegacy";
import { Button } from "@/components/ui/ButtonLegacy";
import { useToast } from "@/components/ui/ToastLegacy";

type AttStatus = "present" | "late" | "absent" | "leave" | "holiday" | "half_day" | "on_duty";

interface DayRecord { clock_in: string | null; clock_out: string | null; status: AttStatus; date: string }

const STATUS_CELL: Record<string, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  late:    "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  absent:  "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  leave:   "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20",
  holiday: "bg-theme-raised text-theme-subtle border-theme-border",
  on_duty: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
};

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  present: "success", late: "warning", absent: "danger", leave: "info", holiday: "default", on_duty: "info",
};

export default function AttendancePage() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"calendar" | "logsheet">("calendar");
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [logs, setLogs] = useState<Record<string, DayRecord>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const [showYearSelect, setShowYearSelect] = useState(false);
  const [activeSession, setActiveSession] = useState<{ clock_in: string | null; clock_out: string | null; status: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<{ monthly_leave_quota: number; weekly_off_allotment: number } | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Record<string, any>>({});
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [activeProtocol, setActiveProtocol] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [selectedDateForCheck, setSelectedDateForCheck] = useState<string | null>(null);
  const [takeLeaveType, setTakeLeaveType] = useState<"PTO" | "Weekly Off" | "Request" | null>(null);
  const [leaveDate, setLeaveDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [leaveReason, setLeaveReason] = useState("");
  const [attSettings, setAttSettings] = useState({ id: 1, holiday_is_paid_leave: false });

  useEffect(() => { const t = setInterval(() => setCurrentTime(dayjs()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") { setTakeLeaveType(null); setShowCheckModal(false); } };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const fetchProtocol = async () => {
      if (!user || loading) return;
      try {
        const { data: emp } = await supabase.from("employees").select("department").eq("id", user.id).single();
        const { data: protos } = await supabase.from("attendance_protocols").select("*").eq("status", "active").order("created_at", { ascending: false });
        if (protos) {
          const proto = protos.find((p) => p.target_type === "All" || p.type === `Department:${emp?.department}`);
          setActiveProtocol(proto);
        }
      } catch {}
    };
    fetchProtocol();
  }, [user]);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("attendance_settings").select("*").eq("id", 1).maybeSingle();
    if (data) setAttSettings(data);
  }, []);

  const fetchLogs = useCallback(async () => {
    setDataLoading(true);
    try {
      const startOfMonth = currentMonth.startOf("month").format("YYYY-MM-DD");
      const endOfMonth   = currentMonth.endOf("month").format("YYYY-MM-DD");
      if (!user) return;
      const { data, error } = await supabase.from("attendance_logs").select("*").eq("employee_id", user.id).gte("date", startOfMonth).lte("date", endOfMonth);
      if (error) throw error;
      const logsMap: Record<string, DayRecord> = {};
      data?.forEach((log) => { logsMap[log.date] = log; });
      setLogs(logsMap);
      const todayStr = dayjs().format("YYYY-MM-DD");
      setActiveSession(logsMap[todayStr] ?? null);
      const { data: empData } = await supabase.from("employees").select("monthly_leave_quota, weekly_off_allotment").eq("id", user.id).maybeSingle();
      if (empData) setEmployeeData(empData);
      const { data: lrData } = await supabase.from("leave_requests").select("*").eq("employee_id", user.id).order("created_at", { ascending: false });
      if (lrData) setLeaveRequests(lrData);
      const { data: holiData } = await supabase.from("system_holidays").select("*").gte("date", startOfMonth).lte("date", endOfMonth);
      const hm: Record<string, any> = {};
      holiData?.forEach((h) => { hm[h.date] = h; });
      setHolidays(hm);
    } catch (e) { console.error(e); } finally { setDataLoading(false); }
  }, [user, currentMonth]);

  useEffect(() => {
    fetchLogs();
    fetchSettings();
    if (!user) return;
    const empSub  = supabase.channel("emp-leaves").on("postgres_changes", { event: "UPDATE", schema: "public", table: "employees", filter: `id=eq.${user.id}` }, (p) => setEmployeeData({ monthly_leave_quota: p.new.monthly_leave_quota, weekly_off_allotment: p.new.weekly_off_allotment })).subscribe();
    const lrSub   = supabase.channel("lr-sync").on("postgres_changes", { event: "*", schema: "public", table: "leave_requests", filter: `employee_id=eq.${user.id}` }, () => fetchLogs()).subscribe();
    const holiSub = supabase.channel("holi-sync").on("postgres_changes", { event: "*", schema: "public", table: "system_holidays" }, () => fetchLogs()).subscribe();
    const attSub  = supabase.channel("att-sync").on("postgres_changes", { event: "*", schema: "public", table: "attendance_logs", filter: `employee_id=eq.${user.id}` }, () => fetchLogs()).subscribe();
    const setSub  = supabase.channel("settings-sync").on("postgres_changes", { event: "*", schema: "public", table: "attendance_settings" }, () => fetchSettings()).subscribe();
    return () => { supabase.removeChannel(empSub); supabase.removeChannel(lrSub); supabase.removeChannel(holiSub); supabase.removeChannel(attSub); supabase.removeChannel(setSub); };
  }, [fetchLogs, fetchSettings, user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession?.clock_in && !activeSession.clock_out) {
      const [h, m, s] = activeSession.clock_in.split(":").map(Number);
      const startTime = dayjs().set("hour", h).set("minute", m).set("second", s);
      interval = setInterval(() => { const diff = dayjs().diff(startTime, "second"); setElapsed(diff > 0 ? diff : 0); }, 1000);
    } else { setElapsed(0); }
    return () => clearInterval(interval);
  }, [activeSession]);

  const submitLeave = async () => {
    if (!user || !takeLeaveType) return;
    if (!leaveDate) { showToast("Please select a date", "warning"); return; }
    setActionLoading(true);
    try {
      let targetId: string | null = null;
      let targetRole: string = "hr";
      if (takeLeaveType === "PTO" || takeLeaveType === "Weekly Off") {
        const { data, error } = await supabase.rpc("auto_approve_leave", { p_employee_id: user.id, p_type: takeLeaveType, p_start_date: leaveDate, p_end_date: leaveDate, p_reason: leaveReason || `Consumed ${takeLeaveType}` });
        if (error) throw error;
        if (data && !data.success) { showToast(data.error, "error"); return; }
      } else {
        // Leave approver hierarchy (new model uses manager flags, not roles):
        //   regular employee/intern → look for team_lead in same dept, then dept_lead
        //   team_lead (is_team_lead=true) → escalate to dept_lead
        //   dept_lead (is_dept_lead=true) → escalate to admin
        targetId = user.id;
        targetRole = "hr";
        let foundLead = false;

        if (!user.is_team_lead && !user.is_dept_lead) {
          // Look for a team_lead or dept_lead in the same department
          const { data: leads } = await supabase.from("employees")
            .select("id, role, is_team_lead, is_dept_lead")
            .eq("department", user.department)
            .or("is_team_lead.eq.true,is_dept_lead.eq.true")
            .limit(1);
          if (leads && leads.length > 0) {
            targetId = leads[0].id;
            targetRole = leads[0].is_dept_lead ? "dept_lead" : "team_lead";
            foundLead = true;
          }
        } else if (user.is_team_lead && !user.is_dept_lead) {
          // Escalate to a dept_lead in the same department
          const { data: leads } = await supabase.from("employees")
            .select("id, role")
            .eq("department", user.department)
            .eq("is_dept_lead", true)
            .limit(1);
          if (leads && leads.length > 0) {
            targetId = leads[0].id;
            targetRole = "dept_lead";
            foundLead = true;
          }
        }

        // Final fallback: admin
        if (!foundLead) {
          const { data: admins } = await supabase.from("employees")
            .select("id, role")
            .eq("role", "admin")
            .limit(1);

          if (admins && admins.length > 0) {
            targetId = admins[0].id;
            targetRole = admins[0].role;
          }
        }

        // 2. Create the Support Ticket
        const { data: ticket, error: ticketError } = await supabase.from("support_tickets").insert({
          creator_id: user.id,
          target_role: targetRole,
          assignee_id: targetId,
          subject: `Leave Request: ${leaveDate}`,
          description: `Employee ${user.name} has requested an unpaid leave extension for ${leaveDate}.\n\nReason: ${leaveReason}\n\nPlease approve or reject this request by resolving or rejecting this ticket.`,
          category: "Leave Extension",
          priority: "high"
        }).select().single();

        if (ticketError) throw ticketError;

        // 3. Create leave request linked to the ticket
        const { error } = await supabase.from("leave_requests").insert({ 
          employee_id: user.id, 
          type: "Unpaid", 
          start_date: leaveDate, 
          end_date: leaveDate, 
          from_date: leaveDate, 
          to_date: leaveDate, 
          days: 1, 
          reason: leaveReason, 
          status: "Pending",
          support_ticket_id: ticket.id
        });
        if (error) throw error;
      }
      try {
        const { data: channel } = await supabase.from("channels").select("id").eq("name", "system-alerts").maybeSingle();
        if (channel) await supabase.from("messages").insert({ channel_id: channel.id, sender_id: user.id, sender_name: user.name, content: `Leave request — ${user.name} · ${takeLeaveType} · ${leaveDate}` });
        // Notify the specific target (Lead/Manager)
        if (targetId && targetId !== user.id) {
          await supabase.from("system_notifications").insert({ 
            user_id: targetId, 
            title: `Action Required: Leave Request`, 
            message: `${user.name || user.email} has requested leave for ${leaveDate}. Please review the support ticket.`, 
            type: "warning", 
            link: "/dashboard/support" 
          });
        }

        // Notify all HR members
        const { data: hrUsers } = await supabase.from("employees").select("id").eq("role", "admin");
        if (hrUsers && hrUsers.length > 0) {
          const hrNotifs = hrUsers.map(hr => ({
            user_id: hr.id,
            title: `New Leave Request: ${user.name || user.email}`,
            message: `${user.name || user.email} submitted a leave request for ${leaveDate}.`,
            type: "info",
            link: "/admin/support"
          }));
          await supabase.from("system_notifications").insert(hrNotifs);
        }
        
        // Notify the user themselves
        await supabase.from("system_notifications").insert({ 
          user_id: user.id, 
          title: `Leave Request Submitted`, 
          message: `Your request for ${leaveDate} has been sent for approval.`, 
          type: "success", 
          link: "/dashboard/attendance" 
        });
      } catch {}
      setTakeLeaveType(null); setLeaveDate(dayjs().format("YYYY-MM-DD")); setLeaveReason("");
      fetchLogs(); showToast(`Leave submitted for ${leaveDate}`, "success");
    } catch (err: any) { showToast(err.message || "Failed to submit leave", "error"); } finally { setActionLoading(false); }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from("attendance_logs").upsert({ employee_id: user.id, date: dayjs().format("YYYY-MM-DD"), clock_in: dayjs().format("HH:mm:ss"), status: "present" }, { onConflict: "employee_id,date" });
      if (error) throw error;
      showToast("Checked in successfully", "success"); await fetchLogs();
    } catch { showToast("Failed to check in", "error"); } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from("attendance_logs").update({ clock_out: dayjs().format("HH:mm:ss") }).eq("employee_id", user.id).eq("date", dayjs().format("YYYY-MM-DD"));
      if (error) throw error;
      showToast("Checked out successfully", "success"); setShowCheckModal(false); await fetchLogs();
    } catch { showToast("Failed to check out", "error"); } finally { setActionLoading(false); }
  };

  const handleDayClick = (dateStr: string) => { setSelectedDate(dateStr); setSelectedDateForCheck(dateStr); setShowCheckModal(true); };

  const startDay    = currentMonth.startOf("month").day();
  const daysInMonth = currentMonth.daysInMonth();
  const todayStr    = dayjs().format("YYYY-MM-DD");

  const calendarDays: (string | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(currentMonth.date(i).format("YYYY-MM-DD"));

  const presentDays = Object.values(logs).filter((l) => l.status === "present").length;
  const lateDays    = Object.values(logs).filter((l) => l.status === "late").length;
  const absentDays  = Object.values(logs).filter((l) => l.status === "absent").length;

  return (
    <DashboardShell
      moduleKey="my_attendance" title="Attendance" subtitle="Track and manage your daily attendance logs.">
      <div className="space-y-5">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Logged",  value: presentDays + lateDays, color: "text-theme-fg",    bg: "bg-theme-raised",   icon: UserCheck },
            { label: "Present",       value: presentDays,            color: "text-emerald-600", bg: "bg-emerald-500/10", icon: UserCheck },
            { label: "Late Starts",   value: lateDays,               color: "text-amber-600",   bg: "bg-amber-500/10",   icon: Clock },
            { label: "Absent",        value: absentDays,             color: "text-red-500",     bg: "bg-red-500/10",     icon: CalendarDays },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={15} className={color} />
              </div>
              <div>
                <p className="text-[11px] text-theme-muted">{label}</p>
                <p className={cn("text-lg font-black leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
          {/* Calendar / Log Sheet */}
          <div className="xl:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5 w-fit">
              {(["calendar", "logsheet"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all capitalize",
                    activeTab === t ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg"
                  )}
                >
                  {t === "calendar" ? <><CalendarDays size={13} /> Calendar</> : <><ListFilter size={13} /> Log Sheet</>}
                </button>
              ))}
            </div>

            <div className="page-card overflow-hidden p-0">
              {activeTab === "calendar" ? (
                <>
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between border-b border-theme-border px-5 py-4">
                    <div className="flex items-center gap-3">
                      {/* Month picker */}
                      <div className="relative">
                        <button onClick={() => { setShowMonthSelect(!showMonthSelect); setShowYearSelect(false); }} className="flex items-center gap-1.5 text-base font-bold text-theme-fg hover:text-theme-primary transition-colors">
                          {currentMonth.format("MMMM")} <ChevronDown size={14} className="text-theme-subtle" />
                        </button>
                        {showMonthSelect && (
                          <><div className="fixed inset-0 z-40" onClick={() => setShowMonthSelect(false)} />
                          <div className="absolute top-full left-0 mt-2 w-44 bg-theme-surface border border-theme-border rounded-xl shadow-2xl z-50 p-2 grid grid-cols-2 gap-1 animate-in slide-in-from-top-2">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <button key={i} onClick={() => { setCurrentMonth(currentMonth.month(i)); setShowMonthSelect(false); }}
                                className={cn("text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-all", currentMonth.month() === i ? "bg-theme-primary text-theme-surface" : "text-theme-fg hover:bg-theme-raised")}>
                                {dayjs().month(i).format("MMM")}
                              </button>
                            ))}
                          </div></>
                        )}
                      </div>
                      {/* Year picker */}
                      <div className="relative">
                        <button onClick={() => { setShowYearSelect(!showYearSelect); setShowMonthSelect(false); }} className="flex items-center gap-1.5 text-base font-bold text-theme-fg hover:text-theme-primary transition-colors">
                          {currentMonth.year()} <ChevronDown size={14} className="text-theme-subtle" />
                        </button>
                        {showYearSelect && (
                          <><div className="fixed inset-0 z-40" onClick={() => setShowYearSelect(false)} />
                          <div className="absolute top-full left-0 mt-2 w-28 bg-theme-surface border border-theme-border rounded-xl shadow-2xl z-50 p-2 flex flex-col gap-1 animate-in slide-in-from-top-2">
                            {Array.from({ length: 7 }).map((_, i) => { const yr = dayjs().year() - 3 + i; return (
                              <button key={yr} onClick={() => { setCurrentMonth(currentMonth.year(yr)); setShowYearSelect(false); }}
                                className={cn("text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-all text-center", currentMonth.year() === yr ? "bg-theme-primary text-theme-surface" : "text-theme-fg hover:bg-theme-raised")}>
                                {yr}
                              </button>
                            ); })}
                          </div></>
                        )}
                      </div>
                    </div>

                    {/* Day navigator */}
                    <div className="flex items-center gap-1 p-0.5 bg-theme-raised border border-theme-border rounded-xl">
                      <button onClick={() => { const next = dayjs(selectedDate).subtract(1,"day"); setSelectedDate(next.format("YYYY-MM-DD")); if (!next.isSame(currentMonth,"month")) setCurrentMonth(next); }} className="p-2 hover:bg-theme-surface rounded-lg transition-all text-theme-subtle hover:text-theme-primary">
                        <ChevronLeft size={15} />
                      </button>
                      <div className="px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-theme-fg min-w-[110px] justify-center">
                        <CalendarDays size={12} className="text-theme-muted" />
                        {dayjs(selectedDate).isSame(dayjs(),"day") ? "Today" : dayjs(selectedDate).isSame(dayjs().subtract(1,"day"),"day") ? "Yesterday" : dayjs(selectedDate).isSame(dayjs().add(1,"day"),"day") ? "Tomorrow" : dayjs(selectedDate).format("DD MMM, YYYY")}
                        {selectedDate !== dayjs().format("YYYY-MM-DD") && (
                          <button onClick={() => { const t = dayjs(); setSelectedDate(t.format("YYYY-MM-DD")); setCurrentMonth(t); }} className="p-0.5 hover:text-theme-primary transition-colors" title="Reset to Today">
                            <RotateCcw size={11} />
                          </button>
                        )}
                      </div>
                      <button onClick={() => { const next = dayjs(selectedDate).add(1,"day"); setSelectedDate(next.format("YYYY-MM-DD")); if (!next.isSame(currentMonth,"month")) setCurrentMonth(next); }} className="p-2 hover:bg-theme-surface rounded-lg transition-all text-theme-subtle hover:text-theme-primary">
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="bg-theme-page">
                    <div className="grid grid-cols-7 border-b border-theme-border bg-theme-surface">
                      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                        <div key={d} className="py-3 text-center text-[10px] font-semibold text-theme-muted">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {calendarDays.map((dateStr, idx) => {
                        if (!dateStr) return <div key={`e-${idx}`} className="border-r border-b border-theme-border bg-theme-surface/30 min-h-[40px]" />;
                        const isToday = dateStr === todayStr;
                        const isSelected = dateStr === selectedDate;
                        const log  = logs[dateStr];
                        const holi = holidays[dateStr];
                        const dayNum = dayjs(dateStr).date();
                        return (
                          <div key={dateStr} onClick={() => handleDayClick(dateStr)}
                            className={cn("relative border-r border-b border-theme-border p-1.5 min-h-[40px] flex flex-col group cursor-pointer transition-all overflow-visible",
                              isSelected ? "bg-theme-raised" : "bg-theme-surface/50 hover:bg-theme-raised/40",
                              isToday ? "ring-2 ring-inset ring-theme-primary" : "",
                              log ? STATUS_CELL[log.status] : ""
                            )}
                          >
                            <div className="flex justify-between items-start mb-0.5">
                              <span className={cn("text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                                isToday ? "bg-theme-primary text-theme-surface" : isSelected ? "bg-theme-fg text-theme-surface" : "text-theme-fg/90 group-hover:text-theme-primary group-hover:bg-theme-primary/10"
                              )}>{dayNum}</span>
                              {log && !holi && <span className="text-[8px] font-semibold bg-white/50 dark:bg-black/20 text-theme-fg px-1 py-0.5 rounded">{log.status}</span>}
                            </div>
                            {holi && (
                              <div className="mt-auto rounded px-1.5 py-1 mb-1" style={{ backgroundColor: `${holi.color}20`, borderLeft: `2px solid ${holi.color}` }}>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="block text-[9px] font-semibold truncate" style={{ color: holi.color }}>{holi.title}</span>
                                  {attSettings.holiday_is_paid_leave && (holi.type === 'government' || holi.type === 'public') && (
                                    <span className="text-[7px] font-black uppercase px-1 rounded-sm bg-emerald-500 text-white leading-none flex items-center justify-center h-3">Paid</span>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="flex-1 flex flex-col justify-end">
                              {log && (
                                <div className="mt-auto bg-white/50 dark:bg-black/20 p-1 rounded space-y-0.5">
                                  {log.clock_in && <div className="flex justify-between text-[7px] tabular-nums text-theme-fg/80"><span className="text-[6px] font-semibold text-theme-muted">IN</span>{dayjs(`2000-01-01 ${log.clock_in}`).format("HH:mm")}</div>}
                                  {log.clock_out && <div className="flex justify-between text-[7px] tabular-nums text-theme-fg/80"><span className="text-[6px] font-semibold text-theme-muted">OUT</span>{dayjs(`2000-01-01 ${log.clock_out}`).format("HH:mm")}</div>}
                                </div>
                              )}
                            </div>
                            {isToday && activeSession && !activeSession.clock_out && <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none animate-pulse" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                /* Log Sheet */
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-border px-5 py-4">
                    <div>
                      <h3 className="text-sm font-semibold text-theme-fg">Monthly Log Sheet</h3>
                      <p className="text-xs text-theme-muted mt-0.5">{currentMonth.format("MMMM YYYY")}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => setStatusFilter(null)} className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold transition-all", statusFilter === null ? "bg-theme-fg text-theme-surface" : "bg-theme-raised text-theme-muted hover:text-theme-fg")}>All</button>
                      {Object.entries(STATUS_BADGE).map(([key, val]) => (
                        <button key={key} onClick={() => setStatusFilter(statusFilter === key ? null : key)}
                          className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all", statusFilter === key ? "ring-1 ring-inset ring-theme-fg bg-theme-raised" : "bg-theme-raised hover:bg-theme-border/50")}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", val==="success"?"bg-emerald-500":val==="warning"?"bg-amber-500":val==="danger"?"bg-red-500":"bg-theme-muted")} />
                          <span className={cn("capitalize", statusFilter===key?"text-theme-fg":"text-theme-muted")}>{key.replace("_"," ")}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                          <th className="px-5 py-3 font-semibold">Date</th>
                          <th className="px-5 py-3 font-semibold">Status</th>
                          <th className="px-5 py-3 font-semibold">In</th>
                          <th className="px-5 py-3 font-semibold">Out</th>
                          <th className="px-5 py-3 font-semibold">Hours</th>
                          <th className="px-5 py-3 font-semibold text-right">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border">
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const date = currentMonth.date(i+1).format("YYYY-MM-DD");
                          const log  = logs[date];
                          const holi = holidays[date];
                          const isWeekend = [0,6].includes(currentMonth.date(i+1).day());
                          if (statusFilter) {
                            if (statusFilter==="holiday" && !holi) return null;
                            if (statusFilter!=="holiday" && (!log || log.status!==statusFilter)) return null;
                          }
                          return (
                            <tr key={date} className={cn("hover:bg-theme-raised/40 transition-colors", date===todayStr&&"bg-theme-primary/5")}>
                              <td className="px-5 py-2.5">
                                <span className="text-xs font-semibold text-theme-fg">{currentMonth.date(i+1).format("DD")}</span>
                                <span className="ml-2 text-[10px] text-theme-subtle">{currentMonth.date(i+1).format("ddd")}</span>
                              </td>
                              <td className="px-5 py-2.5">
                                {holi ? <span className="text-xs text-theme-muted">Holiday</span>
                                : log ? <div className="flex items-center gap-1.5"><div className={cn("w-1.5 h-1.5 rounded-full", STATUS_BADGE[log.status]==="success"?"bg-emerald-500":STATUS_BADGE[log.status]==="warning"?"bg-amber-500":STATUS_BADGE[log.status]==="danger"?"bg-red-500":"bg-theme-muted")} /><span className="text-xs text-theme-fg capitalize">{log.status.replace("_"," ")}</span></div>
                                : <span className="text-xs text-theme-subtle">{isWeekend?"Weekend":"—"}</span>}
                              </td>
                              <td className="px-5 py-2.5 tabular-nums text-xs text-theme-fg">{log?.clock_in ? dayjs(`2000-01-01 ${log.clock_in}`).format("HH:mm") : "—"}</td>
                              <td className="px-5 py-2.5 tabular-nums text-xs text-theme-fg">{log?.clock_out ? dayjs(`2000-01-01 ${log.clock_out}`).format("HH:mm") : "—"}</td>
                              <td className="px-5 py-2.5 text-xs text-theme-muted">
                                {log?.clock_in && log?.clock_out ? `${Math.floor(dayjs(`2000-01-01 ${log.clock_out}`).diff(dayjs(`2000-01-01 ${log.clock_in}`),"minute")/60)}h ${dayjs(`2000-01-01 ${log.clock_out}`).diff(dayjs(`2000-01-01 ${log.clock_in}`),"minute")%60}m` : "—"}
                              </td>
                              <td className="px-5 py-2.5 text-right text-xs text-theme-subtle italic">{holi ? holi.title : ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Leave Management */}
            <div className="page-card overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b border-theme-border px-5 py-4">
                <CalendarDays size={15} className="text-theme-muted" />
                <h3 className="text-sm font-semibold text-theme-fg">Leave Management</h3>
              </div>
              <div className="px-5 py-4 space-y-4">
                {activeProtocol && (
                  <div className="rounded-xl border border-theme-border bg-theme-raised px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock size={12} className="text-theme-muted" />
                      <span className="text-xs font-semibold text-theme-muted">Active Protocol</span>
                    </div>
                    <p className="text-xs font-semibold text-theme-fg mb-2">{activeProtocol.name}</p>
                    <div className="flex gap-3 text-xs text-theme-muted">
                      <span>In: <span className="font-semibold text-theme-fg">{dayjs(`2000-01-01 ${activeProtocol.check_in_time}`).format("hh:mm A")}</span></span>
                      <span>Out: <span className="font-semibold text-theme-fg">{dayjs(`2000-01-01 ${activeProtocol.check_out_time}`).format("hh:mm A")}</span></span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-theme-muted">Available PTO</p>
                      <p className="text-xl font-black text-theme-fg">{employeeData?.monthly_leave_quota || "0.0"}</p>
                    </div>
                    <button onClick={() => setTakeLeaveType("PTO")} disabled={Number(employeeData?.monthly_leave_quota || 0) === 0} className="flex flex-col items-center gap-1 disabled:opacity-50">
                      <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center hover:bg-indigo-500/20 transition-all">
                        <Timer size={16} />
                      </div>
                      <span className="text-[9px] font-semibold text-theme-muted">Take PTO</span>
                    </button>
                  </div>
                  <div className="h-px bg-theme-border" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-theme-muted">Weekly Offs</p>
                      <p className="text-xl font-black text-theme-fg">{employeeData?.weekly_off_allotment || "0.0"}</p>
                    </div>
                    <button onClick={() => setTakeLeaveType("Weekly Off")} disabled={Number(employeeData?.weekly_off_allotment || 0) === 0} className="flex flex-col items-center gap-1 disabled:opacity-50">
                      <div className="w-8 h-8 rounded-full bg-theme-raised text-theme-muted flex items-center justify-center hover:bg-theme-overlay transition-all">
                        <CalendarDays size={14} />
                      </div>
                      <span className="text-[9px] font-semibold text-theme-muted">Take Off</span>
                    </button>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  disabled={Number(employeeData?.monthly_leave_quota||0) > 0 || Number(employeeData?.weekly_off_allotment||0) > 0}
                  onClick={() => setTakeLeaveType("Request")}
                >
                  {(Number(employeeData?.monthly_leave_quota||0) > 0 || Number(employeeData?.weekly_off_allotment||0) > 0)
                    ? "Exhaust Allocations First"
                    : "Submit Leave Request"}
                </Button>
              </div>
            </div>

            {/* Leave History */}
            <div className="page-card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-theme-border px-5 py-4">
                <h3 className="text-sm font-semibold text-theme-fg">Leave History</h3>
                <ListFilter size={13} className="text-theme-subtle" />
              </div>
              <div className="max-h-[240px] overflow-y-auto">
                {leaveRequests.length === 0 ? (
                  <div className="py-10 text-center text-sm text-theme-subtle">No requests yet</div>
                ) : (
                  <ul className="divide-y divide-theme-border">
                    {leaveRequests.map((req) => (
                      <li key={req.id} className="px-5 py-3 hover:bg-theme-raised/40 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-theme-fg">{req.type}</span>
                          <Badge variant={req.status==="Approved"?"success":req.status==="Rejected"?"danger":"warning"}>
                            {req.status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-theme-subtle tabular-nums">
                          {dayjs(req.start_date).format("MMM DD")} – {dayjs(req.end_date).format("MMM DD")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Check-in / Check-out Modal */}
      {showCheckModal && selectedDateForCheck && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-theme-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-theme-fg">Attendance Log</h3>
                <p className="text-xs text-theme-muted">{dayjs(selectedDateForCheck).format("dddd, DD MMMM YYYY")}</p>
              </div>
              <button onClick={() => setShowCheckModal(false)} className="rounded-full p-2 text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="rounded-xl bg-theme-raised border border-theme-border px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-theme-muted mb-1">Current Time</p>
                  <p className="text-3xl font-black text-theme-fg tracking-tight">{currentTime.format("HH:mm:ss")}</p>
                  <p className="text-xs text-theme-subtle mt-1">{currentTime.format("dddd")}</p>
                </div>
                <Clock size={48} className="text-theme-border" />
              </div>

              {logs[selectedDateForCheck] && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-theme-muted">Session Summary</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-500/10 border border-theme-border p-3">
                      <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Check In</p>
                      <p className="text-xl font-black text-emerald-600 tabular-nums">
                        {logs[selectedDateForCheck]?.clock_in ? dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_in}`).format("HH:mm:ss") : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 border border-theme-border p-3">
                      <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-1">Check Out</p>
                      <p className="text-xl font-black text-amber-600 tabular-nums">
                        {logs[selectedDateForCheck]?.clock_out ? dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_out}`).format("HH:mm:ss") : "—"}
                      </p>
                    </div>
                  </div>
                  {logs[selectedDateForCheck]?.clock_in && logs[selectedDateForCheck]?.clock_out && (
                    <div className="flex items-center gap-2 rounded-xl bg-theme-raised border border-theme-border px-4 py-3">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <p className="text-xs font-semibold text-theme-fg">Session Completed</p>
                      <span className="text-xs text-theme-muted ml-auto tabular-nums">
                        {Math.floor(dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_out}`).diff(dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_in}`),"minute")/60)}h {dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_out}`).diff(dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_in}`),"minute")%60}m
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-theme-border bg-theme-page px-6 py-4">
              <button onClick={() => setShowCheckModal(false)} className="px-4 py-2 text-sm font-semibold text-theme-muted hover:text-theme-fg transition-colors">Close</button>
              {selectedDateForCheck === todayStr && (
                <>
                  {!logs[selectedDateForCheck]?.clock_in && (
                    <Button onClick={handleCheckIn} disabled={actionLoading} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">
                      <Play size={14} className="fill-current mr-1.5" /> Check In
                    </Button>
                  )}
                  {logs[selectedDateForCheck]?.clock_in && !logs[selectedDateForCheck]?.clock_out && (
                    <Button onClick={handleCheckOut} disabled={actionLoading} className="bg-red-500 hover:bg-red-600 text-white shadow-sm">
                      <Square size={14} className="fill-current mr-1.5" /> Check Out
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Slide-over */}
      <div className={cn("fixed inset-0 z-[100] flex justify-end bg-black/40 transition-all duration-300", takeLeaveType ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
        <div className="absolute inset-0" onClick={() => setTakeLeaveType(null)} />
        <div className={cn("bg-theme-surface w-full max-w-md h-full shadow-2xl border-l border-theme-border relative flex flex-col transition-all duration-300", takeLeaveType ? "translate-x-0" : "translate-x-full")}>
          <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-theme-fg">{takeLeaveType === "Request" ? "Leave Application" : `${takeLeaveType} Protocol`}</h2>
              <p className="text-xs text-theme-muted mt-0.5">Submit your attendance exception</p>
            </div>
            <button onClick={() => setTakeLeaveType(null)} className="rounded-full p-2 text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors border border-theme-border">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold text-theme-muted block mb-1.5">Effective Date</label>
              <input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-theme-muted block mb-1.5">Reason</label>
              <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Provide a reason for your leave request..." className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all min-h-[120px] resize-none" />
            </div>
            {takeLeaveType === "Request" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-theme-border bg-amber-500/5 px-4 py-3">
                <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-theme-muted">This request requires manual verification by the administration.</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 border-t border-theme-border bg-theme-page px-6 py-4">
            <button onClick={() => setTakeLeaveType(null)} className="px-4 py-2 text-sm font-semibold text-theme-muted hover:text-theme-fg transition-colors">Cancel</button>
            <Button onClick={submitLeave} loading={actionLoading} className="flex-1">Submit Request</Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
