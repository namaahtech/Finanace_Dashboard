"use client";

import React, { useState, useEffect } from "react";
import { Clock, Play, Square, Timer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

export function GlobalAttendanceWidget() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSession = async () => {
    if (!user) return;
    try {
      const today = dayjs().format("YYYY-MM-DD");
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("employee_id", user.id)
        .eq("date", today)
        .single();
      
      if (data) {
        setActiveSession(data);
      } else {
        setActiveSession(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // Subscribe to realtime updates
    if (user) {
      const chan = supabase.channel("global_att")
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs', filter: `employee_id=eq.${user.id}` }, () => {
          fetchSession();
        }).subscribe();
      return () => { supabase.removeChannel(chan); };
    }
  }, [user]);

  useEffect(() => {
    if (activeSession?.clock_in && !activeSession.clock_out) {
      const start = dayjs(`2000-01-01 ${activeSession.clock_in}`);
      const updateElapsed = () => {
        const now = dayjs();
        const diff = now.diff(dayjs().hour(start.hour()).minute(start.minute()).second(start.second()), 'second');
        setElapsed(diff > 0 ? diff : 0);
      };
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsed(0);
    }
  }, [activeSession]);

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
        status: "present"
      }, { onConflict: 'employee_id,date' });

      if (error) throw error;
      showToast("Checked in successfully", "success");
      await fetchSession();
    } catch (e) {
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
      await fetchSession();
    } catch (e) {
      showToast("Failed to check out", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) return null;

  return (
    <div className="flex items-center gap-4 bg-theme-surface border border-theme-border rounded-xl px-4 py-2 shadow-sm">
      <div className="hidden sm:flex items-center gap-2 border-r border-theme-border pr-4">
        <Clock size={16} className="text-theme-primary" />
        <span className="text-sm font-black tabular-nums text-theme-fg tracking-tight">
          {currentTime.format("hh:mm:ss A")}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {activeSession && activeSession.clock_in && !activeSession.clock_out ? (
          <>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest tabular-nums">
                {formatTime(elapsed)}
              </span>
            </div>
            <Button 
              onClick={handleCheckOut}
              loading={actionLoading}
              variant="danger"
              size="sm"
              className="h-8 px-4 rounded-lg font-bold text-[10px] uppercase tracking-widest bg-red-500 hover:bg-red-600 text-white"
            >
              <Square size={12} className="mr-1.5 fill-current" />
              Check Out
            </Button>
          </>
        ) : activeSession?.clock_out ? (
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-theme-muted" />
            <span className="text-xs font-bold text-theme-muted">
              {dayjs(`2000-01-01 ${activeSession.clock_out}`).diff(dayjs(`2000-01-01 ${activeSession.clock_in}`), 'minute')} Mins Logged
            </span>
          </div>
        ) : (
          <Button 
            onClick={handleCheckIn}
            loading={actionLoading}
            size="sm"
            className="h-8 px-4 rounded-lg bg-theme-primary hover:bg-theme-primary/90 font-bold text-[10px] uppercase tracking-widest text-white"
          >
            <Play size={12} className="mr-1.5 fill-current" />
            Check In
          </Button>
        )}
      </div>
    </div>
  );
}
