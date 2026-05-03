"use client";

import { useState } from "react";
import {
  Video, Mic, Settings, Users, Activity, Zap, Clock, X,
  BarChart3, Sliders, Plus, Calendar, CheckCircle2, ChevronRight,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

/* ─── Video preview placeholder ──────────────────────────────────────────── */
function VideoPreview() {
  return (
    <div className="relative h-full bg-theme-overlay rounded-xl overflow-hidden border border-theme-border">
      {/* Status chip */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface/80 backdrop-blur-sm border border-theme-border rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-semibold text-theme-muted">Live · Connected</span>
      </div>

      {/* Centre avatar */}
      <div className="h-full flex items-center justify-center">
        <div className="h-24 w-24 rounded-full bg-theme-raised border border-theme-border flex items-center justify-center text-theme-muted">
          <Users size={40} strokeWidth={1.2} />
        </div>
      </div>

      {/* Waveform */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-8">
        {[3, 6, 10, 14, 10, 6, 14, 10, 6, 3, 6, 10, 14, 8, 4].map((h, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-theme-primary/40"
            style={{ height: h }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/20 to-transparent flex items-center justify-center gap-3">
        <button className="h-9 w-9 rounded-full bg-theme-surface/50 border border-theme-border flex items-center justify-center text-theme-muted hover:text-theme-fg transition-all">
          <Mic size={14} />
        </button>
        <button className="h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all">
          <X size={16} />
        </button>
        <button className="h-9 w-9 rounded-full bg-theme-surface/50 border border-theme-border flex items-center justify-center text-theme-muted hover:text-theme-fg transition-all">
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Session Card ────────────────────────────────────────────────────────── */
function SessionCard({ session }: { session: any }) {
  return (
    <div className="group bg-theme-card border border-theme-border hover:border-theme-strong rounded-xl p-4 transition-all hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Status dot */}
          <div className="mt-1.5 flex-shrink-0">
            <span className={cn(
              "h-2 w-2 rounded-full block",
              session.status === "active"
                ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-theme-muted/40",
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-theme-fg truncate">{session.candidate}</p>
            <p className="text-[11px] text-theme-muted mt-0.5">{session.role}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-theme-muted">
                <Clock size={11} />
                <span>{session.time}</span>
              </div>
              <span className="text-[11px] text-theme-muted">·</span>
              <span className="text-[11px] text-theme-muted">{session.duration}</span>
            </div>
          </div>
        </div>

        {/* Interviewers */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex -space-x-1.5">
            {["JD", "KP", "+2"].map((init, i) => (
              <div
                key={i}
                className={cn(
                  "h-7 w-7 rounded-full border-2 border-theme-surface flex items-center justify-center text-[9px] font-bold",
                  i === 2 ? "bg-theme-primary text-white" : "bg-theme-raised text-theme-muted",
                )}
              >
                {init}
              </div>
            ))}
          </div>
          <button className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-theme-raised border border-theme-border hover:border-theme-strong hover:text-theme-primary transition-all">
            Join <ChevronRight size={11} />
          </button>
        </div>
      </div>

      {/* Status badge */}
      {session.status === "active" && (
        <div className="mt-3 pt-3 border-t border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity size={11} className="text-emerald-500" />
            <span className="text-[10px] font-semibold text-emerald-500">Session in progress</span>
          </div>
          <button className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-theme-primary text-white hover:opacity-90 transition-opacity">
            <Zap size={11} fill="currentColor" /> Join Live
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Scorecard ───────────────────────────────────────────────────────────── */
function Scorecard({ metrics }: { metrics: { label: string; value: number; color: string }[] }) {
  return (
    <div className="bg-theme-card border border-theme-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-theme-muted" />
          <span className="text-sm font-semibold text-theme-fg">Evaluation Scorecard</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-theme-raised border border-theme-border text-theme-muted">
          Auto-audit on
        </span>
      </div>

      <div className="space-y-4">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-theme-muted">{m.label}</span>
              <span className="text-xs font-semibold text-theme-fg tabular-nums">{m.value}%</span>
            </div>
            <div className="h-1.5 bg-theme-raised rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", m.color)}
                style={{ width: `${m.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-5 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity">
        <CheckCircle2 size={13} /> Submit Evaluation
      </button>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function InterviewsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "archived">("upcoming");

  const sessions = [
    {
      id: "S-1422", candidate: "Aravind Swaminathan",
      role: "Principal Engineer", time: "14:00 GST", duration: "60 min", status: "active",
    },
    {
      id: "S-1423", candidate: "Priya Kapoor",
      role: "Senior Backend Engineer", time: "16:30 GST", duration: "45 min", status: "idle",
    },
    {
      id: "S-1424", candidate: "Marcus Chen",
      role: "AI Product Manager", time: "Tomorrow · 09:00", duration: "30 min", status: "idle",
    },
  ];

  const metrics = [
    { label: "Technical Skills", value: 88, color: "bg-theme-primary" },
    { label: "Cultural Fit",     value: 94, color: "bg-emerald-500" },
    { label: "Communication",   value: 76, color: "bg-amber-500" },
  ];

  const TABS = ["upcoming", "completed", "archived"] as const;

  return (
    <DashboardShell
      title="Interviews"
      subtitle="Schedule and manage candidate interview sessions"
      actions={
        <button
          onClick={() => showToast("Interview scheduling coming soon", "info")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={13} /> Schedule Interview
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left: Sessions ─────────────────────────────────────────── */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Scheduled today", value: "3", icon: <Calendar size={14} />, color: "text-theme-primary" },
              { label: "In progress",     value: "1", icon: <Activity size={14} />, color: "text-emerald-500" },
              { label: "Completed",       value: "12", icon: <CheckCircle2 size={14} />, color: "text-theme-muted" },
            ].map((s) => (
              <div key={s.label} className="bg-theme-card border border-theme-border rounded-xl p-3.5">
                <div className={cn("mb-2", s.color)}>{s.icon}</div>
                <p className="text-xl font-black text-theme-fg tabular-nums">{s.value}</p>
                <p className="text-[11px] text-theme-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-theme-raised rounded-lg p-0.5 w-fit">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all",
                  activeTab === tab
                    ? "bg-theme-surface text-theme-fg shadow-sm"
                    : "text-theme-muted hover:text-theme-fg",
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Session list */}
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>

        {/* ── Right: Video + Scorecard ────────────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Video */}
          <div className="bg-theme-card border border-theme-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-theme-raised border border-theme-border flex items-center justify-center text-theme-muted">
                  <Video size={13} />
                </div>
                <span className="text-sm font-semibold text-theme-fg">Active Session</span>
              </div>
              <button className="text-[11px] font-semibold text-theme-muted hover:text-theme-fg transition-colors">
                Full screen
              </button>
            </div>
            <div className="h-64">
              <VideoPreview />
            </div>
          </div>

          {/* Scorecard */}
          <Scorecard metrics={metrics} />
        </div>
      </div>
    </DashboardShell>
  );
}
