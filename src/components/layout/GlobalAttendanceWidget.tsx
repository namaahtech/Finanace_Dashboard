"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, Play, Pause, Square } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

type AttSession = {
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
};

type PauseState = {
  pauseStart: number | null;       // Date.now() when pause began
  totalPausedSeconds: number;      // running total of paused seconds across this day
};

const emptyPause: PauseState = { pauseStart: null, totalPausedSeconds: 0 };

function pauseKey(userId: string) {
  return `att-pause-${userId}-${dayjs().format("YYYY-MM-DD")}`;
}

function loadPauseState(userId: string): PauseState {
  if (typeof window === "undefined") return emptyPause;
  try {
    const raw = localStorage.getItem(pauseKey(userId));
    if (!raw) return emptyPause;
    const parsed = JSON.parse(raw);
    return {
      pauseStart: typeof parsed.pauseStart === "number" ? parsed.pauseStart : null,
      totalPausedSeconds: typeof parsed.totalPausedSeconds === "number" ? parsed.totalPausedSeconds : 0,
    };
  } catch {
    return emptyPause;
  }
}

function savePauseState(userId: string, state: PauseState) {
  try {
    localStorage.setItem(pauseKey(userId), JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function clearPauseState(userId: string) {
  try {
    localStorage.removeItem(pauseKey(userId));
  } catch {
    // ignore
  }
}

function formatHMS(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function GlobalAttendanceWidget() {
  const { user, loading: authLoading } = useAuth();

  const [activeSession, setActiveSession] = useState<AttSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [elapsed, setElapsed] = useState(0);
  const [pauseState, setPauseState] = useState<PauseState>(emptyPause);

  // Live wall-clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's session
  const fetchSession = useCallback(async () => {
    if (!user || authLoading) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const today = dayjs().format("YYYY-MM-DD");
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("employee_id", user.id)
        .eq("date", today)
        .maybeSingle();

      if (error) {
        setActiveSession(null);
      } else {
        setActiveSession((data as AttSession) ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchSession();

    const chan = supabase.channel("global_att")
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs', filter: `employee_id=eq.${user.id}` },
        () => { setTimeout(fetchSession, 500); }
      )
      .subscribe();

    return () => { supabase.removeChannel(chan); };
  }, [user, authLoading, fetchSession]);

  // Load persisted pause state when the user becomes available
  useEffect(() => {
    if (!user) return;
    setPauseState(loadPauseState(user.id));
  }, [user]);

  // Tick the elapsed counter, subtracting paused time
  useEffect(() => {
    if (!activeSession?.clock_in || activeSession.clock_out) {
      setElapsed(0);
      return;
    }

    const start = dayjs(`2000-01-01 ${activeSession.clock_in}`);
    const tick = () => {
      const now = dayjs();
      const baseDiff = now.diff(
        dayjs().hour(start.hour()).minute(start.minute()).second(start.second()),
        "second"
      );
      let totalPaused = pauseState.totalPausedSeconds;
      if (pauseState.pauseStart) {
        totalPaused += Math.floor((Date.now() - pauseState.pauseStart) / 1000);
      }
      setElapsed(Math.max(0, baseDiff - totalPaused));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession, pauseState]);

  const isCheckedIn = !!(activeSession?.clock_in && !activeSession?.clock_out);
  const isPaused = isCheckedIn && pauseState.pauseStart !== null;

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
        status: "present",
      }, { onConflict: "employee_id,date" });
      if (error) throw error;
      // Reset pause state for a fresh day
      clearPauseState(user.id);
      setPauseState(emptyPause);
      toast.success("Checked in successfully");
      await fetchSession();
    } catch {
      toast.error("Failed to check in");
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
      const { error } = await supabase
        .from("attendance_logs")
        .update({ clock_out: nowTime })
        .eq("employee_id", user.id)
        .eq("date", today);
      if (error) throw error;
      clearPauseState(user.id);
      setPauseState(emptyPause);
      toast.success("Checked out successfully");
      await fetchSession();
    } catch {
      toast.error("Failed to check out");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = () => {
    if (!user) return;
    const next: PauseState = {
      pauseStart: Date.now(),
      totalPausedSeconds: pauseState.totalPausedSeconds,
    };
    savePauseState(user.id, next);
    setPauseState(next);
    toast.info("Attendance paused");
  };

  const handleResume = () => {
    if (!user || pauseState.pauseStart === null) return;
    const addedPaused = Math.floor((Date.now() - pauseState.pauseStart) / 1000);
    const next: PauseState = {
      pauseStart: null,
      totalPausedSeconds: pauseState.totalPausedSeconds + addedPaused,
    };
    savePauseState(user.id, next);
    setPauseState(next);
    toast.success("Attendance resumed");
  };

  if (loading || authLoading) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Live clock */}
      <div className="hidden sm:flex items-center gap-2 text-sm">
        <Clock className="size-4 text-muted-foreground" />
        <span className="font-medium tabular-nums tracking-tight text-foreground">
          {currentTime.format("hh:mm A")}
        </span>
      </div>

      {isCheckedIn && (
        <>
          <Separator orientation="vertical" className="hidden sm:block h-5" />
          {/* Status badge */}
          <Badge
            variant={isPaused ? "outline" : "secondary"}
            className={cn(
              "gap-1.5 h-7 px-2.5 font-semibold tabular-nums",
              isPaused
                ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            )}
            title={isPaused ? "Paused" : "Active"}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
              )}
            />
            {formatHMS(elapsed)}
          </Badge>
        </>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {isCheckedIn ? (
          <>
            {isPaused ? (
              <Button onClick={handleResume} disabled={actionLoading}>
                <Play className="fill-current" />
                Resume
              </Button>
            ) : (
              <Button variant="outline" onClick={handlePause} disabled={actionLoading}>
                <Pause />
                Pause
              </Button>
            )}
            <Button variant="destructive" onClick={handleCheckOut} disabled={actionLoading}>
              <Square className="fill-current" />
              Check Out
            </Button>
          </>
        ) : (
          <Button onClick={handleCheckIn} disabled={actionLoading}>
            <Play className="fill-current" />
            Check In
          </Button>
        )}
      </div>
    </div>
  );
}
