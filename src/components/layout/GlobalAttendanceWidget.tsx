"use client";

import React, { useState, useEffect } from "react";
import { Clock, Play, Square, Timer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

export function GlobalAttendanceWidget({ floating = false }: { floating?: boolean }) {
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
      // Silently handle errors - table might not exist or user might not have access
      if (error) {
        setActiveSession(null);
      }
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
    <div className="flex items-center gap-4">
      <div className={cn(
        "flex items-center gap-4 bg-theme-surface border border-theme-border rounded-2xl px-5 py-2 shadow-sm transition-all duration-300",
        floating && "bg-theme-surface/70 backdrop-blur-xl border-theme-border/50 shadow-2xl shadow-black/10 scale-105"
      )}>
        <div className="flex items-center gap-3 border-r border-theme-border pr-5 py-1">
          <Clock size={18} className="text-theme-fg" />
          <span className="text-base font-black tabular-nums text-theme-fg tracking-tight">
            {currentTime.format("hh:mm:ss A")}
          </span>
        </div>

        <div className="flex items-center gap-5">
          {activeSession && activeSession.clock_in && !activeSession.clock_out ? (
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-base font-black text-emerald-500 tabular-nums">
                  {formatTime(elapsed)}
                </span>
              </div>
              <button 
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="h-10 px-6 rounded-xl bg-[#f44336] hover:bg-[#d32f2f] text-white font-black text-[11px] uppercase tracking-[0.15em] flex items-center gap-3 shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <div className="w-3.5 h-3.5 bg-white rounded-sm" />
                Check Out
              </button>
            </div>
          ) : (
            <button 
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="h-10 px-6 rounded-xl bg-theme-primary hover:bg-theme-primary/90 text-white font-black text-[11px] uppercase tracking-[0.15em] flex items-center gap-3 shadow-lg shadow-theme-primary/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Play size={14} className="fill-current text-white" />
              Check In
            </button>
          )}
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">System Live</span>
      </div>
    </div>
  );
}
