"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/layout/AuthProvider";
import { cn } from "@/lib/utils";
import { TrendingUp, Award, Target, BarChart3, AlertCircle } from "lucide-react";
import dayjs from "dayjs";

interface KpiMetric {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  kpi_score: number;
  kra_score: number;
  behavioral_score: number;
  final_score: number;
  rating_label: string;
  remarks?: string;
}

export function EmployeeKpiDashboard() {
  const { user } = useAuth();
  const [currentKpi, setCurrentKpi] = useState<KpiMetric | null>(null);
  const [previousKpi, setPreviousKpi] = useState<KpiMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<"improving" | "stable" | "declining">("stable");

  const fetchKpiData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      // Fetch current month KPI
      const now = dayjs();
      const { data: current, error: currentErr } = await supabase
        .from("kpi_metrics")
        .select("*")
        .eq("employee_id", user.id)
        .eq("month", now.month() + 1)
        .eq("year", now.year())
        .maybeSingle();

      if (currentErr) throw currentErr;
      setCurrentKpi(current);

      // Fetch previous month KPI for trend
      const prevMonth = now.subtract(1, "month");
      const { data: previous } = await supabase
        .from("kpi_metrics")
        .select("*")
        .eq("employee_id", user.id)
        .eq("month", prevMonth.month() + 1)
        .eq("year", prevMonth.year())
        .maybeSingle();

      if (previous) {
        setPreviousKpi(previous);

        // Calculate trend
        if (current?.final_score && previous?.final_score) {
          const diff = current.final_score - previous.final_score;
          if (diff > 2) setTrend("improving");
          else if (diff < -2) setTrend("declining");
          else setTrend("stable");
        }
      }
    } catch (err) {
      console.error("KPI fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchKpiData();

    // Subscribe to real-time updates
    if (!user?.id) return;

    const subscription = supabase
      .channel(`kpi-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kpi_metrics",
          filter: `employee_id=eq.${user.id}`
        },
        () => {
          fetchKpiData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id, fetchKpiData]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 rounded-2xl bg-theme-raised" />
      </div>
    );
  }

  if (!currentKpi) {
    return (
      <div className="rounded-2xl border border-theme-border bg-theme-surface p-8">
        <div className="flex items-center gap-3 text-theme-subtle">
          <AlertCircle size={20} />
          <p className="text-sm font-semibold">No KPI data for this month</p>
        </div>
      </div>
    );
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "Outstanding":
        return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10";
      case "Exceeds":
        return "text-sky-600 bg-sky-50 dark:bg-sky-500/10";
      case "Meets":
        return "text-amber-600 bg-amber-50 dark:bg-amber-500/10";
      case "Needs Improvement":
        return "text-orange-600 bg-orange-50 dark:bg-orange-500/10";
      case "Poor":
        return "text-red-600 bg-red-50 dark:bg-red-500/10";
      default:
        return "text-theme-fg bg-theme-raised";
    }
  };

  const getTrendIcon = () => {
    if (trend === "improving")
      return <TrendingUp size={16} className="text-emerald-500" />;
    if (trend === "declining")
      return <TrendingUp size={16} className="rotate-180 text-red-500" />;
    return <Target size={16} className="text-theme-muted" />;
  };

  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <div className="rounded-2xl border border-theme-border bg-gradient-to-br from-theme-primary/10 to-theme-surface p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest mb-2">
              Your Overall Performance
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-theme-fg tracking-tight">
                {currentKpi.final_score.toFixed(1)}
              </span>
              <span className="text-xl font-black text-theme-muted opacity-50">/100</span>
            </div>
          </div>
          <Award size={48} className="text-theme-primary/30" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-theme-border">
          <div>
            <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest mb-1">
              KPI Score
            </p>
            <p className="text-2xl font-black text-emerald-600">
              {currentKpi.kpi_score.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest mb-1">
              KRA Score
            </p>
            <p className="text-2xl font-black text-sky-600">
              {currentKpi.kra_score.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest mb-1">
              Behavioral
            </p>
            <p className="text-2xl font-black text-amber-600">
              {currentKpi.behavioral_score.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className={cn("px-4 py-2 rounded-lg font-black text-sm uppercase tracking-widest", getRatingColor(currentKpi.rating_label))}>
            {currentKpi.rating_label}
          </div>
          <div className="flex items-center gap-2 text-sm">
            {getTrendIcon()}
            <span className="font-bold text-theme-muted capitalize">{trend}</span>
            {previousKpi && currentKpi.final_score !== previousKpi.final_score && (
              <span className={cn(
                "font-black ml-2",
                currentKpi.final_score > previousKpi.final_score
                  ? "text-emerald-600"
                  : "text-red-600"
              )}>
                {currentKpi.final_score > previousKpi.final_score ? "+" : ""}
                {(currentKpi.final_score - previousKpi.final_score).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Remarks */}
      {currentKpi.remarks && (
        <div className="rounded-xl border border-theme-border bg-theme-page/50 p-4">
          <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest mb-2">
            Feedback
          </p>
          <p className="text-sm text-theme-fg leading-relaxed">{currentKpi.remarks}</p>
        </div>
      )}

      {/* Period Info */}
      <div className="text-[10px] font-bold text-theme-muted uppercase tracking-widest text-center">
        {dayjs()
          .month(currentKpi.month - 1)
          .year(currentKpi.year)
          .format("MMMM YYYY")}
      </div>
    </div>
  );
}
