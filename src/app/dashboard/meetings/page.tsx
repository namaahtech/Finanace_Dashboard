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

const MY_MEETINGS = [
  { id: 1, title: "Team Synapse: Sync Check", type: "Virtual", time: "10:30 AM - 11:30 AM", date: "Today", host: "Team Lead", status: "scheduled", link: "https://meet.pulse/team-sync" },
  { id: 2, title: "Architecture Audit", type: "Office Node B", time: "02:00 PM - 03:00 PM", date: "Today", host: "Systems Architect", status: "scheduled", link: "#" },
  { id: 3, title: "1-on-1 Performance Sync", type: "Virtual", time: "09:00 AM - 09:30 AM", date: "Tomorrow", host: "Manager", status: "scheduled", link: "https://meet.pulse/hr-sync" },
];

export default function EmployeeMeetingsPage() {
  return (
    <DashboardShell 
      title="Scheduled Synapses" 
      subtitle="Your personal chronological coordination and tactical alignment rituals"
      actions={
        <button className="flex items-center gap-2 rounded-xl bg-card border border-default px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:border-sky-500/30 transition-all text-muted hover:text-foreground">
          <Calendar size={16} />
          Full Schedule
        </button>
      }
    >
      <div className="flex flex-col gap-10">
         {/* Daily Roadmap */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
               <h3 className="text-[11px] font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-3 px-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Chronological Logic: Today
               </h3>
               
               <div className="space-y-4">
                  {MY_MEETINGS.filter(m => m.date === 'Today').map(m => (
                     <div key={m.id} className="page-card !mb-0 p-8 border border-default hover:border-sky-500/20 shadow-xl group transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                           {m.type === 'Virtual' ? <Video size={100} /> : <MapPin size={100} />}
                        </div>
                        
                        <div className="flex justify-between items-start mb-8 relative z-10">
                           <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 shadow-inner">
                              {m.type === 'Virtual' ? <Video size={28} strokeWidth={2.5} /> : <MapPin size={28} strokeWidth={2.5} />}
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-1">Epoch Slot</p>
                              <div className="flex items-center gap-2 text-sm font-black text-foreground tracking-tight">
                                 <Clock size={16} className="text-sky-600" />
                                 {m.time}
                              </div>
                           </div>
                        </div>

                        <div className="mb-10 relative z-10">
                           <h4 className="text-lg font-black text-foreground uppercase tracking-tight leading-tight mb-2 group-hover:text-sky-600 transition-colors">{m.title}</h4>
                           <p className="text-[10px] font-black text-muted uppercase tracking-[0.4em]">Host: {m.host}</p>
                        </div>

                        <div className="flex justify-between items-center relative z-10 pt-6 border-t border-default">
                           <span className="text-[9px] font-black text-muted uppercase tracking-widest bg-default/10 px-3 py-1.5 rounded-lg border border-default/50">
                              {m.type}
                           </span>
                           {m.type === 'Virtual' ? (
                              <a href={m.link} className="flex items-center gap-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
                                 Authorize Entry <CheckCircle2 size={14} strokeWidth={3} />
                              </a>
                           ) : (
                              <button className="text-[9px] font-black text-sky-600 hover:text-sky-700 transition-colors uppercase tracking-[0.3em]">Locate Terminal</button>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Horizon Calendar Summary */}
            <div className="page-card !mb-0 p-10 border border-default bg-[hsl(var(--surface-raised))] flex flex-col items-center justify-center gap-10">
                <div className="text-center">
                   <div className="w-20 h-20 rounded-3xl bg-background border border-default flex items-center justify-center mx-auto mb-6 shadow-2xl group hover:scale-110 transition-transform">
                      <Calendar size={40} className="text-sky-600" />
                   </div>
                   <h3 className="text-sm font-black text-foreground uppercase tracking-[0.4em] mb-2">Temporal Outlook</h3>
                   <p className="text-[10px] font-black text-muted uppercase tracking-widest opacity-60">You have 12 rituals scheduled this week</p>
                </div>

                <div className="w-full grid grid-cols-7 gap-3">
                   {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                      <div key={i} className="flex flex-col items-center gap-4">
                         <span className="text-[9px] font-black text-muted uppercase tracking-widest">{day}</span>
                         <div className={`w-full aspect-square rounded-xl border border-default flex items-center justify-center text-[10px] font-black ${
                            i === 2 ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/30' : 'bg-background text-foreground opacity-40'
                         }`}>
                            {8 + i}
                         </div>
                      </div>
                   ))}
                </div>

                <div className="w-full space-y-4 pt-10 border-t border-default/30">
                   <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-background border border-default">
                      <span className="text-[10px] font-black text-muted uppercase tracking-widest">Next Synapse: Tomorrow</span>
                      <span className="text-[10px] font-black text-foreground uppercase tracking-widest">09:00 AM</span>
                   </div>
                </div>
            </div>
         </div>
      </div>
    </DashboardShell>
  );
}
