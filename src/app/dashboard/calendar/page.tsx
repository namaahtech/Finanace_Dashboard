"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Clock,
  MapPin, Users, AlertCircle, Tag, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";

dayjs.extend(isBetween);
dayjs.extend(isToday);

interface CalEvent {
  id:            string;
  title:         string;
  description?:  string;
  start_time:    string;
  end_time:      string;
  all_day:       boolean;
  calendar_type: "personal" | "department" | "statutory";
  department?:   string;
  color?:        string;
  location?:     string;
  attendees?:    string[];
}

type ViewMode = "month" | "week" | "day";

const TYPE_COLOR: Record<string, string> = {
  statutory:  "#ef4444",
  department: "#22c55e",
  personal:   "#6366f1",
};

function getEventColor(evt: CalEvent) {
  return evt.color || TYPE_COLOR[evt.calendar_type] || "#6366f1";
}

function getDaysInMonth(year: number, month: number): Dayjs[] {
  const first = dayjs(new Date(year, month, 1));
  const last  = first.endOf("month");
  const days: Dayjs[] = [];
  // Pad start (Sunday = 0)
  for (let i = 0; i < first.day(); i++) {
    days.push(first.subtract(first.day() - i, "day"));
  }
  for (let d = 1; d <= last.date(); d++) {
    days.push(dayjs(new Date(year, month, d)));
  }
  // Pad end to complete last row
  const rem = 7 - (days.length % 7);
  if (rem < 7) {
    for (let i = 1; i <= rem; i++) {
      days.push(last.add(i, "day"));
    }
  }
  return days;
}

function getWeekDays(anchor: Dayjs): Dayjs[] {
  const start = anchor.startOf("week");
  return Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarPage() {
  const { user } = useAuth();
  const [view,       setView]       = useState<ViewMode>("month");
  const [anchor,     setAnchor]     = useState<Dayjs>(dayjs());
  const [events,     setEvents]     = useState<CalEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<CalEvent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newEvt,     setNewEvt]     = useState({ title: "", date: dayjs().format("YYYY-MM-DD"), startTime: "09:00", endTime: "10:00", description: "", location: "", type: "personal" as CalEvent["calendar_type"], color: "#6366f1" });

  const fetchEvents = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const from = anchor.startOf("month").subtract(7, "day").toISOString();
    const to   = anchor.endOf("month").add(7, "day").toISOString();
    try {
      const res  = await fetch(`/api/calendar/events?userId=${user.id}&department=${user.department || ""}&from=${from}&to=${to}&limit=200`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch {}
    setLoading(false);
  }, [user?.id, user?.department, anchor]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function eventsForDay(day: Dayjs) {
    return events.filter(e => dayjs(e.start_time).format("YYYY-MM-DD") === day.format("YYYY-MM-DD"));
  }

  async function createEvent() {
    if (!newEvt.title || !user?.id) return;
    const start = new Date(`${newEvt.date}T${newEvt.startTime}:00`).toISOString();
    const end   = new Date(`${newEvt.date}T${newEvt.endTime}:00`).toISOString();
    await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:         newEvt.title,
        description:   newEvt.description,
        start_time:    start,
        end_time:      end,
        location:      newEvt.location,
        calendar_type: newEvt.type,
        department:    user.department || null,
        created_by:    user.id,
        color:         newEvt.color,
      }),
    });
    setShowCreate(false);
    setNewEvt({ title: "", date: dayjs().format("YYYY-MM-DD"), startTime: "09:00", endTime: "10:00", description: "", location: "", type: "personal", color: "#6366f1" });
    fetchEvents();
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function prev() {
    if (view === "month") setAnchor(a => a.subtract(1, "month"));
    else if (view === "week") setAnchor(a => a.subtract(1, "week"));
    else setAnchor(a => a.subtract(1, "day"));
  }
  function next() {
    if (view === "month") setAnchor(a => a.add(1, "month"));
    else if (view === "week") setAnchor(a => a.add(1, "week"));
    else setAnchor(a => a.add(1, "day"));
  }
  function title() {
    if (view === "month") return anchor.format("MMMM YYYY");
    if (view === "week")  return `${anchor.startOf("week").format("MMM D")} – ${anchor.endOf("week").format("MMM D, YYYY")}`;
    return anchor.format("dddd, MMMM D YYYY");
  }

  const days     = getDaysInMonth(anchor.year(), anchor.month());
  const weekDays = getWeekDays(anchor);
  const isAdmin  = ["admin", "dept_lead"].includes(user?.role || "");

  return (
    <DashboardShell>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-theme-fg">Calendar</h1>
            <p className="text-sm text-theme-muted mt-0.5">Personal, department &amp; compliance events</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
          >
            <Plus className="h-4 w-4" /> New Event
          </button>
        </div>

        {/* Legend + Controls */}
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 text-xs font-bold">
            {[["personal","#6366f1","Personal"],["department","#22c55e","Department"],["statutory","#ef4444","Statutory"]].map(([k,c,l]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-theme-border overflow-hidden">
              {(["month","week","day"] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={cn("px-4 py-2 text-xs font-bold capitalize transition-colors",
                    view === v ? "bg-indigo-600 text-white" : "bg-theme-card text-theme-muted hover:text-theme-fg")}>
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prev} className="p-2 rounded-lg hover:bg-theme-page transition-colors"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setAnchor(dayjs())} className="px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-theme-page transition-colors">Today</button>
              <button onClick={next} className="p-2 rounded-lg hover:bg-theme-page transition-colors"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <span className="font-black text-sm text-theme-fg">{title()}</span>
          </div>
        </div>

        {/* Month View */}
        {view === "month" && (
          <div className="rounded-2xl border border-theme-border overflow-hidden bg-theme-card">
            <div className="grid grid-cols-7 border-b border-theme-border">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} className="py-2.5 text-center text-[11px] font-black uppercase tracking-widest text-theme-muted">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const isCurrentMonth = day.month() === anchor.month();
                const isSelected     = day.isSame(anchor, "day");
                const evts           = eventsForDay(day);
                return (
                  <div key={idx}
                    onClick={() => { setAnchor(day); if (view === "month") setView("day"); }}
                    className={cn(
                      "min-h-[90px] p-1.5 border-b border-r border-theme-border cursor-pointer transition-colors",
                      isCurrentMonth ? "bg-theme-card hover:bg-theme-page" : "bg-theme-page/50 opacity-40",
                      day.isToday() && "bg-indigo-50 dark:bg-indigo-950/20",
                    )}>
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold mb-1",
                      day.isToday() ? "bg-indigo-600 text-white" : "text-theme-fg"
                    )}>
                      {day.date()}
                    </span>
                    <div className="space-y-0.5">
                      {evts.slice(0, 3).map(e => (
                        <div key={e.id}
                          onClick={ev => { ev.stopPropagation(); setSelected(e); }}
                          className="truncate rounded px-1 py-0.5 text-[10px] font-semibold text-white cursor-pointer"
                          style={{ background: getEventColor(e) }}>
                          {e.title}
                        </div>
                      ))}
                      {evts.length > 3 && (
                        <div className="text-[10px] text-theme-muted pl-1">+{evts.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View */}
        {view === "week" && (
          <div className="rounded-2xl border border-theme-border overflow-hidden bg-theme-card">
            <div className="grid grid-cols-8 border-b border-theme-border">
              <div className="py-2.5 text-center text-[11px] font-black text-theme-muted border-r border-theme-border">TIME</div>
              {weekDays.map(d => (
                <div key={d.format()} className={cn("py-2.5 text-center border-r border-theme-border last:border-r-0", d.isToday() && "bg-indigo-50 dark:bg-indigo-950/20")}>
                  <div className="text-[11px] font-black uppercase tracking-widest text-theme-muted">{d.format("ddd")}</div>
                  <div className={cn("text-sm font-black", d.isToday() ? "text-indigo-600" : "text-theme-fg")}>{d.date()}</div>
                </div>
              ))}
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {HOURS.map(h => (
                <div key={h} className="grid grid-cols-8 border-b border-theme-border min-h-[50px]">
                  <div className="border-r border-theme-border px-2 py-1 text-[10px] text-theme-muted font-bold">
                    {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                  </div>
                  {weekDays.map(d => {
                    const dayEvts = eventsForDay(d).filter(e => dayjs(e.start_time).hour() === h);
                    return (
                      <div key={d.format()} className={cn("border-r border-theme-border last:border-r-0 p-0.5 space-y-0.5", d.isToday() && "bg-indigo-50/50 dark:bg-indigo-950/10")}>
                        {dayEvts.map(e => (
                          <div key={e.id}
                            onClick={() => setSelected(e)}
                            className="rounded px-1 py-0.5 text-[10px] font-semibold text-white cursor-pointer truncate"
                            style={{ background: getEventColor(e) }}>
                            {e.title}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day View */}
        {view === "day" && (
          <div className="rounded-2xl border border-theme-border overflow-hidden bg-theme-card">
            <div className="border-b border-theme-border px-5 py-3 flex items-center gap-3">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-sm font-black", anchor.isToday() ? "bg-indigo-600 text-white" : "bg-theme-page text-theme-fg")}>
                {anchor.date()}
              </span>
              <span className="font-black text-theme-fg">{anchor.format("dddd, MMMM YYYY")}</span>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {HOURS.map(h => {
                const dayEvts = eventsForDay(anchor).filter(e => dayjs(e.start_time).hour() === h);
                return (
                  <div key={h} className="grid grid-cols-[80px_1fr] border-b border-theme-border min-h-[60px]">
                    <div className="border-r border-theme-border px-3 py-2 text-xs text-theme-muted font-bold">
                      {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                    </div>
                    <div className="p-1 space-y-1">
                      {dayEvts.map(e => (
                        <div key={e.id}
                          onClick={() => setSelected(e)}
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-white cursor-pointer"
                          style={{ background: getEventColor(e) }}>
                          <div className="font-bold">{e.title}</div>
                          <div className="text-[11px] opacity-80">{dayjs(e.start_time).format("h:mm A")} – {dayjs(e.end_time).format("h:mm A")}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Event detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-2xl border border-theme-border bg-theme-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: getEventColor(selected) }} />
                <h2 className="text-lg font-black text-theme-fg">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-theme-muted hover:text-theme-fg transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-theme-muted">
                <Clock className="h-4 w-4 shrink-0" />
                {selected.all_day
                  ? `All day · ${dayjs(selected.start_time).format("MMM D, YYYY")}`
                  : `${dayjs(selected.start_time).format("MMM D, YYYY · h:mm A")} – ${dayjs(selected.end_time).format("h:mm A")}`}
              </div>
              {selected.location && (
                <div className="flex items-center gap-2 text-theme-muted">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {selected.location}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-theme-muted" />
                <span className={cn(
                  "text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded",
                  selected.calendar_type === "statutory" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" :
                  selected.calendar_type === "department" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" :
                  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                )}>
                  {selected.calendar_type}
                  {selected.department && ` · ${selected.department}`}
                </span>
              </div>
              {selected.description && (
                <p className="text-theme-muted leading-relaxed border-t border-theme-border pt-3">{selected.description}</p>
              )}
              {selected.calendar_type === "statutory" && (
                <div className="flex items-center gap-2 text-red-600 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Compliance deadline — ensure timely completion
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create event modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl border border-theme-border bg-theme-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-theme-fg">New Event</h2>
              <button onClick={() => setShowCreate(false)} className="text-theme-muted hover:text-theme-fg transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1 block">Title *</label>
                <input value={newEvt.title} onChange={e => setNewEvt(p => ({...p, title: e.target.value}))}
                  className="w-full h-11 rounded-xl border border-theme-border bg-theme-page px-3 text-sm text-theme-fg focus:outline-none focus:border-indigo-500"
                  placeholder="Event title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1 block">Date</label>
                  <input type="date" value={newEvt.date} onChange={e => setNewEvt(p => ({...p, date: e.target.value}))}
                    className="w-full h-11 rounded-xl border border-theme-border bg-theme-page px-3 text-sm text-theme-fg focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1 block">Type</label>
                  <select value={newEvt.type} onChange={e => setNewEvt(p => ({...p, type: e.target.value as any}))}
                    className="w-full h-11 rounded-xl border border-theme-border bg-theme-page px-3 text-sm text-theme-fg focus:outline-none focus:border-indigo-500">
                    <option value="personal">Personal</option>
                    {isAdmin && <option value="department">Department</option>}
                    {user?.role === "admin" && <option value="statutory">Statutory</option>}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1 block">Start Time</label>
                  <input type="time" value={newEvt.startTime} onChange={e => setNewEvt(p => ({...p, startTime: e.target.value}))}
                    className="w-full h-11 rounded-xl border border-theme-border bg-theme-page px-3 text-sm text-theme-fg focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1 block">End Time</label>
                  <input type="time" value={newEvt.endTime} onChange={e => setNewEvt(p => ({...p, endTime: e.target.value}))}
                    className="w-full h-11 rounded-xl border border-theme-border bg-theme-page px-3 text-sm text-theme-fg focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1 block">Location</label>
                <input value={newEvt.location} onChange={e => setNewEvt(p => ({...p, location: e.target.value}))}
                  className="w-full h-11 rounded-xl border border-theme-border bg-theme-page px-3 text-sm text-theme-fg focus:outline-none focus:border-indigo-500"
                  placeholder="Room / link (optional)" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1 block">Description</label>
                <textarea value={newEvt.description} onChange={e => setNewEvt(p => ({...p, description: e.target.value}))} rows={2}
                  className="w-full rounded-xl border border-theme-border bg-theme-page px-3 py-2.5 text-sm text-theme-fg focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Optional notes" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 h-11 rounded-xl border border-theme-border text-sm font-bold text-theme-muted hover:text-theme-fg transition-colors">
                  Cancel
                </button>
                <button onClick={createEvent} disabled={!newEvt.title}
                  className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" /> Create Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
