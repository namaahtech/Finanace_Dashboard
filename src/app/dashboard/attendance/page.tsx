"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  CalendarDays, 
  Clock, 
  Play, 
  Square, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  UserCheck,
  Timer,
  X,
  RotateCcw,
  ListFilter,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import dayjs from "dayjs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

// --- Types ---
type AttStatus = "present" | "late" | "absent" | "leave" | "holiday" | "half_day" | "on_duty";

interface DayRecord {
  clock_in: string | null;
  clock_out: string | null;
  status: AttStatus;
  date: string;
}

const STATUS_CELL: Record<string, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  late:    "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  absent:  "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  leave:   "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20",
  holiday: "bg-theme-raised text-theme-subtle border-theme-border",
  on_duty: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
};

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  present: "success",
  late: "warning",
  absent: "danger",
  leave: "info",
  holiday: "default",
  on_duty: "info"
};

export default function AttendancePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"calendar" | "logsheet">("calendar");
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [logs, setLogs] = useState<Record<string, DayRecord>>({});
  const [loading, setLoading] = useState(true);
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const [showYearSelect, setShowYearSelect] = useState(false);
  
  // Realtime Active Session
  const [activeSession, setActiveSession] = useState<{ clock_in: string | null; clock_out: string | null; status: string } | null>(null);
  const [elapsed, setElapsed] = useState(0); // in seconds
  const [actionLoading, setActionLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<{ monthly_leave_quota: number; weekly_off_allotment: number } | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Record<string, any>>({});
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [activeProtocol, setActiveProtocol] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [showCheckModal, setShowCheckModal] = useState(false);
  const [selectedDateForCheck, setSelectedDateForCheck] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTakeLeaveType(null);
        setShowCheckModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const fetchProtocol = async () => {
      if (!user) return;
      try {
        const { data: emp } = await supabase.from('employees').select('department').eq('id', user.id).single();
        const { data: protos } = await supabase.from('attendance_protocols')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        if (protos) {
          const proto = protos.find(p => p.target_type === 'All' || p.type === `Department:${emp?.department}`);
          setActiveProtocol(proto);
        }
      } catch (err) {
        console.error("Protocol Fetch Error", err);
      }
    };
    fetchProtocol();
  }, [user]);

  // Fetch Monthly Logs
  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startOfMonth = currentMonth.startOf('month').format('YYYY-MM-DD');
      const endOfMonth = currentMonth.endOf('month').format('YYYY-MM-DD');

      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("employee_id", user.id)
        .gte("date", startOfMonth)
        .lte("date", endOfMonth);

      if (error) throw error;

      const logsMap: Record<string, DayRecord> = {};
      data?.forEach((log) => {
        logsMap[log.date] = log;
      });
      setLogs(logsMap);

      // Check Active Session for Today
      const todayStr = dayjs().format("YYYY-MM-DD");
      if (logsMap[todayStr]) {
        setActiveSession(logsMap[todayStr]);
      } else {
        setActiveSession(null);
      }

      // Fetch PTO details
      const { data: empData } = await supabase
        .from("employees")
        .select("monthly_leave_quota, weekly_off_allotment")
        .eq("id", user.id)
        .maybeSingle();
      if (empData) setEmployeeData(empData);

      // Fetch Leave Requests
      const { data: lrData } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("employee_id", user.id)
        .order("created_at", { ascending: false });
      if (lrData) setLeaveRequests(lrData);

      // Fetch Holidays
      const { data: holiData } = await supabase
        .from("system_holidays")
        .select("*")
        .gte("date", startOfMonth)
        .lte("date", endOfMonth);
        
      const hm: Record<string, any> = {};
      holiData?.forEach(h => hm[h.date] = h);
      setHolidays(hm);
      
    } catch (e) {
      console.error("Error fetching logs:", e);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth]);

  useEffect(() => {
    fetchLogs();

    if (!user) return;

    const empSub = supabase
      .channel('emp-leaves')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'employees', filter: `id=eq.${user.id}` }, (payload) => {
        setEmployeeData({
          monthly_leave_quota: payload.new.monthly_leave_quota,
          weekly_off_allotment: payload.new.weekly_off_allotment
        });
      })
      .subscribe();

    const lrSub = supabase
      .channel('lr-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests', filter: `employee_id=eq.${user.id}` }, () => {
        fetchLogs();
      })
      .subscribe();

    const holiSub = supabase
      .channel('holi-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_holidays' }, () => {
        fetchLogs();
      })
      .subscribe();

    const attSub = supabase
      .channel('att-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs', filter: `employee_id=eq.${user.id}` }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(empSub);
      supabase.removeChannel(lrSub);
      supabase.removeChannel(holiSub);
      supabase.removeChannel(attSub);
    };
  }, [fetchLogs, user]);

  // Sync Active Timer if Checked In
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && activeSession.clock_in && !activeSession.clock_out) {
      const [h, m, s] = activeSession.clock_in.split(":").map(Number);
      const startTime = dayjs().set('hour', h).set('minute', m).set('second', s);

      interval = setInterval(() => {
        const diff = dayjs().diff(startTime, 'second');
        setElapsed(diff > 0 ? diff : 0);
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const [takeLeaveType, setTakeLeaveType] = useState<"PTO" | "Weekly Off" | "Request" | null>(null);
  const [leaveDate, setLeaveDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [leaveReason, setLeaveReason] = useState("");

  const submitLeave = async () => {
    if (!user || !takeLeaveType) return;
    if (!leaveDate) {
      showToast("Please select a date", "warning");
      return;
    }
    
    setActionLoading(true);
    
    try {
      if (takeLeaveType === 'PTO' || takeLeaveType === 'Weekly Off') {
        const { data, error } = await supabase.rpc('auto_approve_leave', {
            p_employee_id: user.id,
            p_type: takeLeaveType,
            p_start_date: leaveDate,
            p_end_date: leaveDate,
            p_reason: leaveReason || `Consumed ${takeLeaveType}`
        });
        if (error) throw error;
        if (data && !data.success) {
            showToast(data.error, "error");
            return;
        }
      } else {
        const { error } = await supabase.from('leave_requests').insert({
            employee_id: user.id,
            type: 'Unpaid',
            start_date: leaveDate,
            end_date: leaveDate,
            from_date: leaveDate,
            to_date: leaveDate,
            days: 1,
            reason: leaveReason,
            status: 'Pending'
        });
        if (error) throw error;
      }

      // --- Admin Notification Dispatch ---
      try {
        const { data: channel } = await supabase.from('channels').select('id').eq('name', 'system-alerts').maybeSingle();
        if (channel) {
          await supabase.from('messages').insert({
            channel_id: channel.id,
            sender_id: user.id,
            sender_name: user.name,
            content: `🚨 **Leave Protocol Initiated**\nEmployee: **${user.name}**\nType: **${takeLeaveType}**\nDate: **${leaveDate}**\nReason: *${leaveReason || 'No specific reason provided'}*`
          });
        }

        await supabase.from('system_notifications').insert({
          user_id: user.id,
          title: `New Leave Request: ${user.name}`,
          message: `${user.name} has submitted a ${takeLeaveType} request for ${leaveDate}.`,
          type: takeLeaveType === 'Request' ? 'warning' : 'success',
          link: '/admin/attendance'
        });
      } catch (notifyErr) {
        console.error("Notification Dispatch Failure:", notifyErr);
      }

      setTakeLeaveType(null);
      setLeaveDate(dayjs().format("YYYY-MM-DD"));
      setLeaveReason("");
      fetchLogs();
      showToast(`Protocol submitted for ${leaveDate}`, "success");
    } catch(err: any) {
      console.error(err);
      showToast(err.message || "Failed to submit leave", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    setActionLoading(true);
    const today = dayjs().format("YYYY-MM-DD");
    const nowTime = dayjs().format("HH:mm:ss");
    
    try {
      const { error } = await supabase.from("attendance_logs").upsert({
        employee_id: user.id,
        date: today,
        clock_in: nowTime,
        status: "present" // Will be recalculated by protocol if needed
      }, { onConflict: 'employee_id,date' });

      if (error) throw error;
      showToast("Checked in successfully", "success");
      await fetchLogs();
    } catch (e) {
      console.error("Check-in Error", e);
      showToast("Failed to check in", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;
    setActionLoading(true);
    const today = dayjs().format("YYYY-MM-DD");
    const nowTime = dayjs().format("HH:mm:ss");

    try {
      const { error } = await supabase.from("attendance_logs").update({
        clock_out: nowTime
      }).eq("employee_id", user.id).eq("date", today);

      if (error) throw error;
      showToast("Checked out successfully", "success");
      setShowCheckModal(false);
      await fetchLogs();
    } catch (e) {
      console.error("Check-out Error", e);
      showToast("Failed to check out", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedDateForCheck(dateStr);
    setShowCheckModal(true);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startDay = currentMonth.startOf('month').day();
  const daysInMonth = currentMonth.daysInMonth();
  const todayStr = dayjs().format("YYYY-MM-DD");

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(currentMonth.date(i).format("YYYY-MM-DD"));
  }

  const presentDays = Object.values(logs).filter(l => l.status === "present").length;
  const lateDays = Object.values(logs).filter(l => l.status === "late").length;
  const absentDays = Object.values(logs).filter(l => l.status === "absent").length;

  return (
    <DashboardShell
      title="Attendance Command Center"
      subtitle="Track, manage, and verify your real-time attendance logs."
    >
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="enterprise-card bg-theme-surface p-4 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 transform rotate-12 group-hover:scale-110 transition-transform">
              <CalendarDays size={60} />
            </div>
            <div>
              <span className="text-[9px] font-black text-theme-muted uppercase tracking-widest block mb-1">Total Logged</span>
              <span className="text-2xl font-black text-theme-fg">{presentDays + lateDays}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-theme-raised flex items-center justify-center text-theme-subtle">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="enterprise-card bg-theme-surface p-4 flex items-center justify-between group overflow-hidden relative border-l-4 border-emerald-500">
            <div>
              <span className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest block mb-1">Present</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{presentDays}</span>
            </div>
          </div>
          <div className="enterprise-card bg-theme-surface p-4 flex items-center justify-between group overflow-hidden relative border-l-4 border-amber-500">
            <div>
              <span className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest block mb-1">Late Starts</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{lateDays}</span>
            </div>
          </div>
          <div className="enterprise-card bg-theme-surface p-4 flex items-center justify-between group overflow-hidden relative border-l-4 border-red-500">
            <div>
              <span className="text-[9px] font-black text-red-500/70 uppercase tracking-widest block mb-1">Absent</span>
              <span className="text-2xl font-black text-red-600 dark:text-red-400">{absentDays}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 flex flex-col gap-4 h-full">
            
            {/* View Selector Tabs (Admin Style) */}
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-1 shadow-inner w-fit">
               <button 
                onClick={() => setActiveTab("calendar")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                  activeTab === "calendar" ? "bg-theme-surface text-theme-fg shadow-sm border border-theme-border/50" : "text-theme-muted hover:text-theme-fg"
                )}
               >
                 <CalendarDays size={14} />
                 Calendar View
               </button>
               <button 
                onClick={() => setActiveTab("logsheet")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                  activeTab === "logsheet" ? "bg-theme-surface text-theme-fg shadow-sm border border-theme-border/50" : "text-theme-muted hover:text-theme-fg"
                )}
               >
                 <ListFilter size={14} />
                 Log Sheet
               </button>
            </div>

            <div className="enterprise-card bg-theme-surface p-0 overflow-hidden flex flex-col border border-theme-border shadow-xl min-h-[500px]">
              
              {activeTab === "calendar" ? (
                <>
                  <div className="p-4 border-b border-theme-border flex items-center justify-between bg-theme-page/50 relative">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <button 
                          onClick={() => { setShowMonthSelect(!showMonthSelect); setShowYearSelect(false); }}
                          className="flex items-center gap-2 text-xl font-black text-theme-fg tracking-tight hover:text-theme-primary transition-colors"
                        >
                          {currentMonth.format('MMMM')}
                          <ChevronDown size={16} className="text-theme-subtle" />
                        </button>
                        {showMonthSelect && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMonthSelect(false)} />
                            <div className="absolute top-full left-0 mt-2 w-48 bg-theme-surface border border-theme-border rounded-xl shadow-2xl z-50 p-2 grid grid-cols-2 gap-1 animate-in slide-in-from-top-2">
                              {Array.from({ length: 12 }).map((_, i) => (
                                <button
                                  key={i}
                                  onClick={() => { setCurrentMonth(currentMonth.month(i)); setShowMonthSelect(false); }}
                                  className={cn(
                                    "text-left px-3 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                    currentMonth.month() === i ? "bg-theme-primary text-white" : "text-theme-fg hover:bg-theme-raised"
                                  )}
                                >
                                  {dayjs().month(i).format('MMM')}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="relative">
                        <button 
                          onClick={() => { setShowYearSelect(!showYearSelect); setShowMonthSelect(false); }}
                          className="flex items-center gap-2 text-xl font-black text-theme-fg tracking-tight hover:text-theme-primary transition-colors"
                        >
                          {currentMonth.year()}
                          <ChevronDown size={16} className="text-theme-subtle" />
                        </button>
                        {showYearSelect && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowYearSelect(false)} />
                            <div className="absolute top-full left-0 mt-2 w-32 bg-theme-surface border border-theme-border rounded-xl shadow-2xl z-50 p-2 flex flex-col gap-1 animate-in slide-in-from-top-2">
                              {Array.from({ length: 7 }).map((_, i) => {
                                const yr = dayjs().year() - 3 + i;
                                return (
                                  <button
                                    key={yr}
                                    onClick={() => { setCurrentMonth(currentMonth.year(yr)); setShowYearSelect(false); }}
                                    className={cn(
                                      "text-left px-3 py-2 text-xs font-bold rounded-lg transition-all text-center",
                                      currentMonth.year() === yr ? "bg-theme-primary text-white" : "text-theme-fg hover:bg-theme-raised"
                                    )}
                                  >
                                    {yr}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-theme-surface border border-theme-border rounded-2xl shadow-sm">
                      <button 
                        onClick={() => {
                          const next = dayjs(selectedDate).subtract(1, 'day');
                          setSelectedDate(next.format('YYYY-MM-DD'));
                          if (!next.isSame(currentMonth, 'month')) setCurrentMonth(next);
                        }}
                        className="p-2.5 hover:bg-theme-raised rounded-xl transition-all text-theme-subtle hover:text-theme-primary"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      
                      <div className="px-5 py-2.5 flex items-center gap-3 bg-theme-page/50 border border-theme-border rounded-xl min-w-[140px] justify-center relative group">
                        <CalendarDays size={14} className="text-theme-primary" />
                        <span className="text-xs font-black uppercase tracking-widest text-theme-fg">
                          {dayjs(selectedDate).isSame(dayjs(), 'day') ? "Today" : 
                          dayjs(selectedDate).isSame(dayjs().subtract(1, 'day'), 'day') ? "Yesterday" :
                          dayjs(selectedDate).isSame(dayjs().add(1, 'day'), 'day') ? "Tomorrow" :
                          dayjs(selectedDate).format('DD MMM, YYYY')}
                        </span>
                        {selectedDate !== dayjs().format('YYYY-MM-DD') && (
                          <button 
                            onClick={() => {
                              const today = dayjs();
                              setSelectedDate(today.format('YYYY-MM-DD'));
                              setCurrentMonth(today);
                            }}
                            className="p-1 hover:bg-theme-primary/10 rounded-lg transition-all text-theme-subtle hover:text-theme-primary ml-1"
                            title="Reset to Today"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>

                      <button 
                        onClick={() => {
                          const next = dayjs(selectedDate).add(1, 'day');
                          setSelectedDate(next.format('YYYY-MM-DD'));
                          if (!next.isSame(currentMonth, 'month')) setCurrentMonth(next);
                        }}
                        className="p-2.5 hover:bg-theme-raised rounded-xl transition-all text-theme-subtle hover:text-theme-primary"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col bg-theme-page">
                    <div className="grid grid-cols-7 border-b border-theme-border bg-theme-surface">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-theme-muted">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 flex-1 auto-rows-[1fr]">
                      {calendarDays.map((dateStr, idx) => {
                        if (!dateStr) {
                          return <div key={`empty-${idx}`} className="border-r border-b border-theme-border bg-theme-surface/30 min-h-[40px]" />;
                        }

                        const isToday = dateStr === todayStr;
                        const isSelected = dateStr === selectedDate;
                        const log = logs[dateStr];
                        const holi = holidays[dateStr];
                        const dayNum = dayjs(dateStr).date();

                        return (
                          <div
                            key={dateStr}
                            onClick={() => handleDayClick(dateStr)}
                            className={cn(
                              "relative border-r border-b border-theme-border p-1.5 transition-all min-h-[40px] flex flex-col group overflow-visible cursor-pointer",
                              isSelected ? "bg-theme-raised" : "bg-theme-surface/50 hover:bg-theme-raised/40",
                              isToday ? "ring-2 ring-inset ring-theme-primary" : "",
                              log ? STATUS_CELL[log.status] : ""
                            )}
                          >
                            <div className="flex justify-between items-start mb-0.5 z-10">
                              <span className={cn(
                                "text-xs font-black w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                                isToday ? "bg-theme-primary text-white" : 
                                isSelected ? "bg-theme-fg text-theme-surface" : "text-theme-fg/90 group-hover:text-theme-primary group-hover:bg-theme-primary/10"
                              )}>
                                {dayNum}
                              </span>
                              {log && !holi && (
                                <span className="uppercase text-[8px] font-bold tracking-widest bg-white/50 dark:bg-black/20 text-theme-fg backdrop-blur-sm px-1.5 py-0.5 rounded">
                                  {log.status}
                                </span>
                              )}
                            </div>

                            {holi && (
                              <div className="mt-auto space-y-1 rounded px-1.5 py-1 mb-1 z-20 shadow-sm relative group/holi" style={{ backgroundColor: `${holi.color}20`, borderLeft: `3px solid ${holi.color}` }}>
                                <span className="block text-[9px] font-black uppercase tracking-widest truncate" style={{ color: holi.color }}>{holi.title}</span>
                                {holi.is_half_day && <span className="block text-[9px] font-bold font-mono opacity-100" style={{ color: holi.color }}>{dayjs(`2000-01-01 ${holi.start_time}`).format('HH:mm')} - {dayjs(`2000-01-01 ${holi.end_time}`).format('HH:mm')}</span>}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-theme-surface border border-theme-border rounded-xl shadow-2xl p-4 opacity-0 pointer-events-none group-hover/holi:opacity-100 transition-all duration-200 z-[100] transform scale-95 group-hover/holi:scale-100">
                                  <h4 className="text-sm font-black uppercase tracking-widest mb-1.5 border-b border-theme-border pb-1.5" style={{ color: holi.color }}>{holi.title}</h4>
                                  {holi.description && <p className="text-[12px] text-theme-subtle mb-3 leading-relaxed font-medium">{holi.description}</p>}
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-black px-2 py-1 rounded bg-theme-raised text-theme-fg uppercase tracking-wider">{holi.type}</span>
                                    {holi.is_half_day ? (
                                      <span className="text-[10px] font-black px-2 py-1 rounded bg-theme-raised text-theme-fg uppercase tracking-wider font-mono">{dayjs(`2000-01-01 ${holi.start_time}`).format('HH:mm')} - {dayjs(`2000-01-01 ${holi.end_time}`).format('HH:mm')}</span>
                                    ) : (
                                      <span className="text-[10px] font-black px-2 py-1 rounded bg-theme-raised text-theme-fg uppercase tracking-wider">Full Day</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex-1 flex flex-col justify-end z-10">
                              {log ? (
                                <div className="mt-auto space-y-0.5 bg-white/50 dark:bg-black/20 backdrop-blur-sm p-1 rounded">
                                  {log.clock_in && (
                                    <div className="flex items-center justify-between text-[7px] font-mono text-theme-fg/80">
                                      <span className="font-bold text-[6px] uppercase tracking-widest text-theme-muted">IN</span>
                                      {dayjs(`2000-01-01 ${log.clock_in}`).format("HH:mm")}
                                    </div>
                                  )}
                                  {log.clock_out && (
                                    <div className="flex items-center justify-between text-[7px] font-mono text-theme-fg/80">
                                      <span className="font-bold text-[6px] uppercase tracking-widest text-theme-muted">OUT</span>
                                      {dayjs(`2000-01-01 ${log.clock_out}`).format("HH:mm")}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-auto text-[7px] font-bold text-theme-muted uppercase tracking-widest text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  No Record
                                </div>
                              )}
                            </div>

                            {isToday && activeSession && !activeSession.clock_out && (
                              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none animate-pulse" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col h-full animate-in fade-in duration-500">
                   <div className="p-4 border-b border-theme-border bg-theme-page/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                     <div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg">Monthly Log Sheet</h3>
                       <p className="text-[10px] text-theme-muted font-bold mt-1 uppercase tracking-wider">{currentMonth.format("MMMM YYYY")}</p>
                     </div>
                     <div className="flex flex-wrap gap-1.5">
                        <button 
                          onClick={() => setStatusFilter(null)}
                          className={cn(
                            "px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all",
                            statusFilter === null ? "bg-theme-fg text-theme-surface" : "bg-theme-raised text-theme-muted hover:text-theme-fg"
                          )}
                        >
                          All
                        </button>
                        {Object.entries(STATUS_BADGE).map(([key, val]) => (
                          <button 
                            key={key} 
                            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded transition-all",
                              statusFilter === key ? "ring-1 ring-inset ring-theme-fg bg-theme-raised" : "bg-theme-raised hover:bg-theme-border/50"
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full", 
                              val === 'success' ? 'bg-emerald-500' : 
                              val === 'warning' ? 'bg-amber-500' : 
                              val === 'danger' ? 'bg-red-500' : 'bg-theme-muted'
                            )} />
                            <span className={cn("text-[9px] font-black uppercase tracking-widest",
                              statusFilter === key ? "text-theme-fg" : "text-theme-muted"
                            )}>{key.replace("_", " ")}</span>
                          </button>
                        ))}
                     </div>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto max-h-[500px] border-t border-theme-border/30">
                     <table className="w-full text-left border-collapse">
                       <thead className="sticky top-0 z-10">
                         <tr className="bg-theme-page border-b border-theme-border">
                           <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-theme-muted">Date</th>
                           <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-theme-muted">Status</th>
                           <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-theme-muted">In</th>
                           <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-theme-muted">Out</th>
                           <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-theme-muted">Time</th>
                           <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-theme-muted text-right">Info</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-theme-border/50">
                         {Array.from({ length: daysInMonth }).map((_, i) => {
                            const date = currentMonth.date(i + 1).format("YYYY-MM-DD");
                            const log = logs[date];
                            const holi = holidays[date];
                            const isWeekend = currentMonth.date(i + 1).day() === 0 || currentMonth.date(i + 1).day() === 6;
                            
                            // Filtering Logic
                            if (statusFilter) {
                              if (statusFilter === 'holiday' && !holi) return null;
                              if (statusFilter !== 'holiday') {
                                if (!log || log.status !== statusFilter) return null;
                              }
                            }

                            return (
                              <tr key={date} className={cn("hover:bg-theme-raised/30 transition-colors group", date === todayStr && "bg-theme-primary/5")}>
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-theme-fg w-5">{currentMonth.date(i + 1).format("DD")}</span>
                                    <span className="text-[8px] font-black text-theme-muted uppercase tracking-tighter">{currentMonth.date(i + 1).format("ddd")}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  {holi ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-1 h-1 rounded-full bg-theme-muted" />
                                      <span className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Holiday</span>
                                    </div>
                                  ) : log ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", 
                                        STATUS_BADGE[log.status] === 'success' ? 'bg-emerald-500' : 
                                        STATUS_BADGE[log.status] === 'warning' ? 'bg-amber-500' : 
                                        STATUS_BADGE[log.status] === 'danger' ? 'bg-red-500' : 'bg-theme-muted'
                                      )} />
                                      <span className="text-[9px] font-black uppercase tracking-widest text-theme-fg">{log.status.replace("_", " ")}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] font-bold text-theme-subtle/50 uppercase tracking-widest">
                                      {isWeekend ? "Weekend" : "—"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 font-mono text-[10px] font-bold text-theme-fg">
                                  {log?.clock_in ? dayjs(`2000-01-01 ${log.clock_in}`).format("HH:mm") : "—"}
                                </td>
                                <td className="px-4 py-2 font-mono text-[10px] font-bold text-theme-fg">
                                  {log?.clock_out ? dayjs(`2000-01-01 ${log.clock_out}`).format("HH:mm") : "—"}
                                </td>
                                <td className="px-4 py-2">
                                  {log?.clock_in && log?.clock_out ? (
                                    <span className="text-[10px] font-black tabular-nums text-theme-fg opacity-60">
                                      {Math.floor(dayjs(`2000-01-01 ${log.clock_out}`).diff(dayjs(`2000-01-01 ${log.clock_in}`), 'minute') / 60)}h {dayjs(`2000-01-01 ${log.clock_out}`).diff(dayjs(`2000-01-01 ${log.clock_in}`), 'minute') % 60}m logged
                                    </span>
                                  ) : "—"}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {holi ? (
                                    <span className="text-[8px] font-black uppercase tracking-tight text-theme-subtle italic">{holi.title}</span>
                                  ) : (
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-theme-raised rounded text-theme-subtle">
                                      <ChevronRight size={12} />
                                    </button>
                                  )}
                                </td>
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

          <div className="xl:col-span-1 flex flex-col gap-4">
            <div className="enterprise-card bg-theme-surface p-5 space-y-5 border border-theme-border shadow-lg">
              {activeProtocol && (
                <div className="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-2xl relative overflow-hidden group">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} className="text-theme-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-theme-primary">Active Protocol</span>
                  </div>
                  <h4 className="text-sm font-black text-theme-fg mb-3">{activeProtocol.name}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-theme-surface border border-theme-border/30">
                      <span className="text-[8px] font-black text-theme-muted uppercase block mb-1">Shift In</span>
                      <span className="text-xs font-black text-theme-fg">{dayjs(`2000-01-01 ${activeProtocol.check_in_time}`).format('hh:mm A')}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-theme-surface border border-theme-border/30">
                      <span className="text-[8px] font-black text-theme-muted uppercase block mb-1">Shift Out</span>
                      <span className="text-xs font-black text-theme-fg">{dayjs(`2000-01-01 ${activeProtocol.check_out_time}`).format('hh:mm A')}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-theme-subtle mb-1">Available PTO</span>
                    <span className="text-2xl font-black text-theme-fg">{employeeData?.monthly_leave_quota || "0.0"}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 items-center">
                    <button 
                      onClick={() => setTakeLeaveType('PTO')}
                      disabled={Number(employeeData?.monthly_leave_quota || 0) === 0}
                      className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center hover:bg-indigo-500/20 hover:scale-110 transition-all disabled:opacity-50"
                    >
                      <Timer size={18} />
                    </button>
                    <span className="text-[8px] font-black uppercase tracking-widest text-theme-primary">TAKE PTO</span>
                  </div>
                </div>

                <div className="h-px w-full bg-theme-border/50" />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-theme-subtle mb-1">Weekly Offs</span>
                    <span className="text-xl font-black text-theme-fg">{employeeData?.weekly_off_allotment || "0.0"}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 items-center">
                    <button 
                      onClick={() => setTakeLeaveType('Weekly Off')}
                      disabled={Number(employeeData?.weekly_off_allotment || 0) === 0}
                      className="w-8 h-8 rounded-full bg-theme-raised text-theme-subtle flex items-center justify-center hover:bg-theme-border hover:scale-110 transition-all disabled:opacity-50"
                    >
                      <CalendarDays size={14} />
                    </button>
                    <span className="text-[8px] font-black uppercase tracking-widest text-theme-primary">TAKE OFF</span>
                  </div>
                </div>
              </div>

              <Button 
                size="sm"
                disabled={Number(employeeData?.monthly_leave_quota || 0) > 0 || Number(employeeData?.weekly_off_allotment || 0) > 0}
                onClick={() => setTakeLeaveType('Request')}
                className="w-full text-[10px] font-black uppercase tracking-widest h-10 rounded-xl"
              >
                {(Number(employeeData?.monthly_leave_quota || 0) > 0 || Number(employeeData?.weekly_off_allotment || 0) > 0) 
                  ? "Exhaust Allocations First" 
                  : "Submit Leave Request"}
              </Button>
            </div>

            <div className="enterprise-card bg-theme-surface p-0 overflow-hidden border border-theme-border shadow-lg flex flex-col min-h-[250px]">
              <div className="p-4 border-b border-theme-border bg-theme-page/50 flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Leave History</h3>
                <ListFilter size={12} className="text-theme-subtle" />
              </div>
              <div className="flex-1 overflow-y-auto max-h-[250px]">
                {leaveRequests.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <CalendarDays size={24} className="text-theme-subtle/20 mb-3" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted">No Requests</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-theme-border">
                    {leaveRequests.map((req) => (
                      <li key={req.id} className="p-3 hover:bg-theme-page transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-theme-fg">{req.type}</span>
                          <Badge 
                            variant={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'danger' : 'warning'}
                            className="text-[7px] uppercase tracking-widest py-0.5 px-1.5"
                          >
                            {req.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-theme-subtle font-mono font-bold">
                          <span>{dayjs(req.start_date).format('MMM DD')} - {dayjs(req.end_date).format('MMM DD')}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="h-20" />
      </div>

      {/* CHECK-IN / CHECK-OUT OVERLAY MODAL */}
      {showCheckModal && selectedDateForCheck && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-theme-surface rounded-3xl shadow-2xl overflow-hidden border border-theme-border animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-8 border-b border-theme-border bg-gradient-to-r from-theme-primary/10 to-transparent flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-theme-fg tracking-tight mb-1">Attendance Protocol</h2>
                <p className="text-sm font-bold text-theme-muted uppercase tracking-widest">
                  {dayjs(selectedDateForCheck).format('dddd, DD MMMM YYYY')}
                </p>
              </div>
              <button
                onClick={() => setShowCheckModal(false)}
                className="h-12 w-12 flex items-center justify-center rounded-full hover:bg-theme-raised transition-colors text-theme-muted hover:text-theme-fg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-8">
              {/* Time Display */}
              <div className="bg-theme-page/50 border border-theme-border rounded-2xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest mb-2">Current Time</p>
                    <p className="text-5xl font-black text-theme-fg tracking-tight">{currentTime.format('HH:mm:ss')}</p>
                    <p className="text-xs font-bold text-theme-subtle mt-2 uppercase tracking-widest">{currentTime.format('dddd')}</p>
                  </div>
                  <Clock size={80} className="text-theme-primary/20" />
                </div>
              </div>

              {/* Session Info */}
              {activeSession && logs[selectedDateForCheck] && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-theme-fg uppercase tracking-widest">Session Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                      <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">Check In</p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {logs[selectedDateForCheck]?.clock_in
                          ? dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_in}`).format('HH:mm:ss')
                          : '— —'}
                      </p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                      <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2">Check Out</p>
                      <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                        {logs[selectedDateForCheck]?.clock_out
                          ? dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_out}`).format('HH:mm:ss')
                          : '— —'}
                      </p>
                    </div>
                  </div>

                  {logs[selectedDateForCheck]?.clock_in && logs[selectedDateForCheck]?.clock_out && (
                    <div className="bg-theme-raised rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle2 size={20} className="text-emerald-500" />
                      <div>
                        <p className="text-xs font-bold text-theme-fg">Session Completed</p>
                        <p className="text-[10px] text-theme-muted font-mono">
                          {Math.floor(dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_out}`).diff(dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_in}`), 'minute') / 60)}h {dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_out}`).diff(dayjs(`2000-01-01 ${logs[selectedDateForCheck].clock_in}`), 'minute') % 60}m logged
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Badge */}
              {logs[selectedDateForCheck] && (
                <div className={cn(
                  "rounded-xl p-4 flex items-center gap-3",
                  logs[selectedDateForCheck].status === 'present' ? "bg-emerald-500/10" :
                  logs[selectedDateForCheck].status === 'late' ? "bg-amber-500/10" : "bg-red-500/10"
                )}>
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    logs[selectedDateForCheck].status === 'present' ? "bg-emerald-500" :
                    logs[selectedDateForCheck].status === 'late' ? "bg-amber-500" : "bg-red-500"
                  )} />
                  <div>
                    <p className="text-sm font-black text-theme-fg uppercase tracking-widest">
                      {logs[selectedDateForCheck].status === 'present' ? "On Time" :
                       logs[selectedDateForCheck].status === 'late' ? "Late Entry" : "Absent"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-8 bg-theme-page/50 border-t border-theme-border flex items-center justify-end gap-4">
              <button
                onClick={() => setShowCheckModal(false)}
                className="px-8 py-3 text-sm font-black uppercase tracking-widest text-theme-muted hover:text-theme-fg hover:bg-theme-raised rounded-xl transition-all"
              >
                Close
              </button>

              {selectedDateForCheck === todayStr && (
                <>
                  {!logs[selectedDateForCheck]?.clock_in && (
                    <Button
                      onClick={handleCheckIn}
                      disabled={actionLoading}
                      className="flex items-center gap-2 h-12 px-8 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/30 font-black uppercase tracking-widest text-[11px]"
                    >
                      <Play size={16} className="fill-current" /> Check In Now
                    </Button>
                  )}
                  {logs[selectedDateForCheck]?.clock_in && !logs[selectedDateForCheck]?.clock_out && (
                    <Button
                      onClick={handleCheckOut}
                      disabled={actionLoading}
                      className="flex items-center gap-2 h-12 px-8 bg-red-500 text-white hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/30 font-black uppercase tracking-widest text-[11px]"
                    >
                      <Square size={16} className="fill-current" /> Check Out Now
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Side Panel */}
      <div className={cn(
        "fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-[2px] transition-all duration-1000 ease-in-out",
        takeLeaveType ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className="absolute inset-0 cursor-pointer" onClick={() => setTakeLeaveType(null)} />
        
        <div 
          className={cn(
            "bg-theme-surface w-full max-w-md h-full shadow-2xl border-l border-theme-border relative flex flex-col transition-all duration-1000 ease-in-out"
          )}
          style={{ 
            transform: takeLeaveType ? 'translateX(0) rotateY(0) scale(1)' : 'translateX(100%) rotateY(-15deg) scale(0.95)',
            transformOrigin: 'right center',
            perspective: '2000px',
            opacity: takeLeaveType ? 1 : 0
          }}
        >
          <div className="p-6 border-b border-theme-border flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-theme-fg tracking-tight">
                {takeLeaveType === 'Request' ? 'Leave Application' : `${takeLeaveType} Protocol`}
              </h2>
              <p className="text-[10px] text-theme-muted font-black uppercase tracking-widest mt-1">Submit your attendance exception</p>
            </div>
            <button onClick={() => setTakeLeaveType(null)} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-theme-raised transition-all border border-theme-border text-theme-muted hover:text-theme-fg">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="space-y-5">
              <div className="p-4 bg-theme-page/50 border border-theme-border rounded-2xl">
                <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted mb-2">Effective Date</label>
                <div className="flex items-center gap-3">
                  <CalendarDays size={18} className="text-theme-primary" />
                  <input 
                    type="date" 
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    className="bg-transparent text-lg font-bold text-theme-fg outline-none w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted mb-2">Detailed Reason</label>
                <textarea 
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Provide a detailed explanation for your leave request..."
                  className="w-full bg-theme-page border border-theme-border rounded-2xl p-5 text-sm text-theme-fg outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all min-h-[160px] resize-none shadow-sm"
                />
              </div>
              
              {takeLeaveType === 'Request' && (
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                  <p className="text-[10px] font-medium text-yellow-600 dark:text-yellow-400 flex gap-2">
                    <AlertCircle size={14} />
                    This request requires manual verification by the administration.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-theme-surface border-t border-theme-border flex items-center justify-between gap-4">
            <button onClick={() => setTakeLeaveType(null)} className="px-6 py-3 text-sm font-black uppercase tracking-widest text-theme-muted hover:text-theme-fg transition-all">Cancel</button>
            <Button 
              onClick={submitLeave} 
              className="flex-1 h-12 bg-theme-primary text-white shadow-lg shadow-theme-primary/25 rounded-xl font-black uppercase tracking-widest text-[11px]"
            >
              Submit Protocol
            </Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
