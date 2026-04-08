"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  Calendar, 
  Plus, 
  Search, 
  Video, 
  Clock, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Link2,
  MapPin,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";

const UPCOMING_MEETINGS = [
  { id: 1, title: "Synergy Alignment: Q2 Targets", type: "Virtual", time: "10:00 AM - 11:00 AM", date: "Today, Apr 08", host: "Super Admin", attendees: 12, status: "scheduled", link: "https://meet.pulse/synergy-q2" },
  { id: 2, title: "Yield Architecture Audit", type: "Conference Room A", time: "02:00 PM - 03:30 PM", date: "Today, Apr 08", host: "Accounts Lead", attendees: 5, status: "scheduled", link: "#" },
  { id: 3, title: "Strategic Growth Synapse", type: "Virtual", time: "09:30 AM - 10:30 AM", date: "Tomorrow, Apr 09", host: "Sales Head", attendees: 18, status: "scheduled", link: "https://meet.pulse/growth-sync" },
  { id: 4, title: "Infrastructure Review", type: "Engineering Hub", time: "11:00 AM - 12:00 PM", date: "Apr 10", host: "Lead Engineer", attendees: 8, status: "scheduled", link: "#" },
];

export default function MeetingsPage() {
  const [view, setView] = useState("calendar");

  return (
    <DashboardShell 
      title="Temporal Coordination" 
      subtitle="Synchronize organizational rituals, strategic synapses, and tactical reviews"
      actions={
        <button className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
          <Plus size={16} strokeWidth={3} />
          Schedule Ritual
        </button>
      }
    >
      <div className="flex flex-col gap-10">
         {/* Calendar Navigation */}
         <div className="flex flex-col lg:row-row justify-between items-center gap-6">
            <div className="flex items-center gap-6 bg-card border border-default p-2 rounded-2xl shadow-sm">
               <button className="p-3 hover:bg-default rounded-xl transition-colors"><ChevronLeft size={20} /></button>
               <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em]">April 2026</h3>
               <button className="p-3 hover:bg-default rounded-xl transition-colors"><ChevronRight size={20} /></button>
            </div>
            <div className="flex gap-4 p-2 bg-card border border-default rounded-2xl">
               <button 
                 onClick={() => setView("calendar")}
                 className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                   view === "calendar" ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg' : 'text-muted hover:text-foreground'
                 }`}
               >
                  Horizon View
               </button>
               <button 
                 onClick={() => setView("list")}
                 className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                   view === "list" ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg' : 'text-muted hover:text-foreground'
                 }`}
               >
                  Tactical List
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main Calendar View */}
            <div className="lg:col-span-2 page-card !mb-0 p-8 border border-default shadow-2xl bg-[hsl(var(--surface-raised))]">
               <div className="grid grid-cols-7 gap-px bg-default/20 border border-default/30 rounded-3xl overflow-hidden shadow-inner">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                     <div key={day} className="bg-background/50 p-4 text-[9px] font-black text-muted uppercase tracking-[0.3em] text-center border-b border-default">
                        {day}
                     </div>
                  ))}
                  {Array.from({ length: 31 }).map((_, i) => (
                     <div key={i} className={`bg-background/80 min-h-[120px] p-4 group hover:bg-sky-500/[0.03] transition-colors border-r border-b border-default last:border-r-0 ${
                        i + 1 === 8 ? 'ring-2 ring-inset ring-sky-500' : ''
                     }`}>
                        <span className={`text-[10px] font-black ${i + 1 === 8 ? 'text-sky-600' : 'text-muted/60'}`}>{i + 1}</span>
                        {i + 1 === 8 && (
                           <div className="mt-2 space-y-1">
                              <div className="p-1 px-2 rounded-md bg-sky-500/10 text-sky-600 text-[8px] font-black uppercase tracking-tighter truncate border border-sky-500/10">10:00 Synergy...</div>
                              <div className="p-1 px-2 rounded-md bg-purple-500/10 text-purple-600 text-[8px] font-black uppercase tracking-tighter truncate border border-purple-500/10">14:00 Yield A...</div>
                           </div>
                        )}
                        {i + 1 === 12 && (
                           <div className="mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus size={14} className="mx-auto text-sky-600" />
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            </div>

            {/* Tactical Feed */}
            <div className="flex flex-col gap-6">
               <h3 className="text-[11px] font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-3 px-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Upcoming Synapse
               </h3>
               
               <div className="space-y-4">
                  {UPCOMING_MEETINGS.map(m => (
                     <div key={m.id} className="page-card !mb-0 p-6 border border-default hover:border-sky-500/20 shadow-lg group transition-all cursor-pointer">
                        <div className="flex justify-between items-start mb-6">
                           <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                              {m.type === 'Virtual' ? <Video size={24} strokeWidth={2.5} /> : <MapPin size={24} strokeWidth={2.5} />}
                           </div>
                           <button className="text-muted hover:text-foreground">
                              <MoreVertical size={16} />
                           </button>
                        </div>

                        <div className="mb-8">
                           <h4 className="text-sm font-black text-foreground uppercase tracking-tight leading-tight mb-2 group-hover:text-sky-600 transition-colors">{m.title}</h4>
                           <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-muted uppercase tracking-widest">
                                 <Clock size={12} strokeWidth={3} />
                                 {m.time}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-muted uppercase tracking-widest">
                                 <Users size={12} strokeWidth={3} />
                                 {m.attendees} PROFILES
                              </div>
                           </div>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-default">
                           <div className="flex flex-col">
                              <p className="text-[8px] font-black text-muted uppercase tracking-widest leading-none mb-1">Coordinated By</p>
                              <p className="text-[10px] font-black text-foreground uppercase tracking-widest">{m.host}</p>
                           </div>
                           {m.type === 'Virtual' ? (
                              <a href={m.link} className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                                 Authorize Entry
                              </a>
                           ) : (
                              <div className="text-[9px] font-black text-muted uppercase tracking-widest bg-default/10 px-3 py-1.5 rounded-lg border border-default/50">
                                 Physical Node
                              </div>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </DashboardShell>
  );
}
