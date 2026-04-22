"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useMeetings, Meeting } from "@/hooks/useMeetings";
import { useAuth } from "@/components/layout/AuthProvider";
import { useNotifications } from "@/components/layout/NotificationProvider";
import { Video, Mic, Calendar, Clock, Users, Globe, Loader2, Play, Phone } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";

function StatusBadge({ status }: { status: Meeting["status"] }) {
  const map = {
    scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    ended:     "bg-theme-subtle/10 text-theme-muted border-theme-border",
    cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${map[status]}`}>
      {status === "active" ? "● Live" : status}
    </span>
  );
}

export default function EmployeeMeetingsPage() {
  const { user } = useAuth();
  const { meetings, loading } = useMeetings();
  const { setActiveCall } = useNotifications();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const filtered = meetings.filter(m => {
    const isParticipant = m.meeting_participants?.some(p => p.employee_id === user?.id) || m.host_id === user?.id;
    const matchTab = tab === "past"
      ? (m.status === "ended" || m.status === "cancelled")
      : (m.status === "scheduled" || m.status === "active");
    return isParticipant && matchTab;
  });

  return (
    <DashboardShell title="Meetings" subtitle="Your scheduled and active meetings">
      <div className="space-y-6">
        <div className="flex bg-theme-card border border-theme-border rounded-xl p-1 w-fit">
          {(["upcoming", "past"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === t ? "bg-theme-primary text-white" : "text-theme-muted hover:text-theme-fg"}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-theme-muted" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-theme-muted">
            <Calendar size={48} strokeWidth={1} />
            <p className="font-bold">No {tab} meetings</p>
            <p className="text-sm">Your manager will schedule meetings and they'll appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => {
              const when = m.scheduled_at
                ? isToday(new Date(m.scheduled_at)) ? `Today ${format(new Date(m.scheduled_at), "h:mm a")}`
                : isTomorrow(new Date(m.scheduled_at)) ? `Tomorrow ${format(new Date(m.scheduled_at), "h:mm a")}`
                : format(new Date(m.scheduled_at), "MMM d, h:mm a")
                : "Instant";
              const Icon = m.type === "audio" ? Mic : Video;
              return (
                <div key={m.id} className="bg-theme-card border border-theme-border rounded-2xl p-5 flex items-center gap-4 hover:border-theme-primary/30 transition-all group">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${m.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-theme-primary/10 text-theme-primary"}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-black text-theme-fg truncate">{m.title}</h3>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-theme-muted">
                      <span className="flex items-center gap-1"><Clock size={10} />{when}</span>
                      <span className="flex items-center gap-1"><Users size={10} />{m.meeting_participants?.length || 0} participants</span>
                      {m.host && <span className="flex items-center gap-1"><Globe size={10} />Host: {m.host.name}</span>}
                    </div>
                  </div>
                  {m.status !== "ended" && m.status !== "cancelled" && (
                    <button onClick={() => setActiveCall({ roomName: m.room_name, title: m.title, type: m.type })}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-black opacity-0 group-hover:opacity-100 hover:bg-theme-primary/90 transition-all">
                      <Play size={12} /> Join
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
