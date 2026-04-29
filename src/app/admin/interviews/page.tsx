"use client";

import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Video, 
  Mic, 
  Settings, 
  Users, 
  Activity, 
  Zap, 
  Clock, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  ChevronRight,
  ShieldCheck,
  Heart,
  BarChart3,
  Sliders
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

// ─── Neural Connection Module (Light Mode) ──────────────────────

function NeuralConnectionPreview() {
  return (
    <div className="relative h-full bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 group shadow-2xl">
       {/* Simulated Camera Feed */}
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-50" />
       
       {/* Telemetry Overlays */}
       <div className="absolute top-8 left-8 z-10 space-y-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white/60">NEURAL_LINK: STABLE</span>
          </div>
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2 text-white/20">
                <Heart size={14} className="text-rose-500/60" />
                <span className="text-[10px] font-mono tracking-tighter">HRM: 72 BPM</span>
             </div>
             <div className="flex items-center gap-2 text-white/20">
                <Activity size={14} className="text-cyan-500/60" />
                <span className="text-[10px] font-mono tracking-tighter">SIG_STR: 98%</span>
             </div>
          </div>
       </div>

       {/* Waveform Animation (Bottom) */}
       <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-12 flex items-center justify-center gap-1">
          {[...Array(20)].map((_, i) => (
             <motion.div
               key={i}
               animate={{ 
                  height: [8, 32, 8],
                  opacity: [0.2, 0.6, 0.2]
               }}
               transition={{ 
                  duration: 0.5 + Math.random(), 
                  repeat: Infinity, 
                  delay: i * 0.05 
               }}
               className="w-1 bg-cyan-400/40 rounded-full"
             />
          ))}
       </div>

       {/* Camera Avatar Placeholder */}
       <div className="h-full flex items-center justify-center">
          <div className="relative">
             <div className="absolute -inset-10 bg-cyan-500/10 blur-[80px] rounded-full" />
             <div className="relative h-40 w-40 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/10">
                <Users size={80} strokeWidth={1} />
             </div>
          </div>
       </div>

       {/* HUD Bottom Bar */}
       <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center gap-6">
          <button className="h-12 w-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 transition-all border border-white/5">
             <Mic size={20} />
          </button>
          <button className="h-14 w-14 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.3)] transition-all">
             <XCircle size={24} />
          </button>
          <button className="h-12 w-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 transition-all border border-white/5">
             <Settings size={20} />
          </button>
       </div>
    </div>
  );
}

// ─── Sync Timeline Card (Light Mode) ───────────────────────────

function SyncTimelineCard({ session }: { session: any }) {
  return (
    <div className="group relative bg-white border border-slate-200 hover:border-blue-500/20 transition-all p-8 rounded-[32px] shadow-sm hover:shadow-xl hover:shadow-blue-500/5">
       <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
             <div className={cn(
                "h-3 w-3 rounded-full animate-pulse",
                session.status === "active" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-200"
             )} />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">Target_ID: {session.id}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
             <Clock size={12} className="text-blue-500" />
             <span className="text-[10px] font-black text-slate-500">{session.time}</span>
          </div>
       </div>

       <div className="space-y-2">
          <h4 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">{session.candidate}</h4>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{session.role} • {session.duration}</p>
       </div>

       <div className="mt-8 flex items-center justify-between">
          <div className="flex -space-x-3">
             {[1, 2].map(i => (
                <div key={i} className="h-10 w-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400">
                   JD
                </div>
             ))}
             <div className="h-10 w-10 rounded-full bg-blue-600 text-white border-2 border-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-blue-100">
                +3
             </div>
          </div>
          <Button className="h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-8 shadow-xl shadow-slate-200">
             Synchronize Now <Zap size={14} className="ml-2" />
          </Button>
       </div>
    </div>
  );
}

// ─── Main Interviews Portal (Light Mode) ───────────────────────

export default function InterviewsPortal() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");

  const sessions = [
    { id: "S-1422", candidate: "Aravind Swaminathan", role: "Principal Neural Architect", time: "14:00 GST", duration: "60 MIN", status: "active" },
    { id: "S-1423", candidate: "Priya Kapoor", role: "Sr. Quantum Sync Engineer", time: "16:30 GST", duration: "45 MIN", status: "idle" },
    { id: "S-1424", candidate: "Marcus Chen", role: "AI Ethics Overseer", time: "TOMORROW 09:00", duration: "30 MIN", status: "idle" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-12 font-sans selection:bg-blue-500 selection:text-white flex flex-col gap-12">
      {/* Header HUD (Light) */}
      <header className="flex items-center justify-between">
         <div className="space-y-2">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100">
               <Zap size={14} className="text-blue-600" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Synchronization Portal v4.2</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none mt-2 text-slate-900">Neural Interviews</h1>
         </div>

         <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-6">
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Connection: OPTIMAL</span>
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Lat: 12ms</span>
            </div>
            <Button className="h-14 rounded-[20px] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest px-10 shadow-xl shadow-blue-100">
               Schedule New Sync
            </Button>
         </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-12 min-h-0">
         {/* Left: Timeline & Calendar */}
         <div className="col-span-12 lg:col-span-7 flex flex-col gap-10">
            <div className="flex items-center gap-8 border-b border-slate-200 pb-6">
               {["upcoming", "completed", "archives"].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                       "text-[11px] font-black uppercase tracking-[0.3em] transition-all relative pb-6",
                       activeTab === tab ? "text-blue-600" : "text-slate-300 hover:text-slate-400"
                    )}
                  >
                     {tab}
                     {activeTab === tab && (
                        <motion.div layoutId="tab-underline" className="absolute bottom-0 inset-x-0 h-1 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]" />
                     )}
                  </button>
               ))}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6">
               {sessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                     <SyncTimelineCard session={session} />
                  </motion.div>
               ))}
            </div>
         </div>

         {/* Right: Active Sync HUD */}
         <div className="col-span-12 lg:col-span-5 flex flex-col gap-10">
            <div className="flex-1 flex flex-col gap-8">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-300 shadow-sm">
                        <Video size={20} />
                     </div>
                     <h3 className="text-xl font-bold tracking-tight uppercase text-slate-900">Active Connection</h3>
                  </div>
                  <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">
                     Full Console
                  </Button>
               </div>

               <div className="h-[400px]">
                  <NeuralConnectionPreview />
               </div>

               {/* Cognitive Scorecard (Light) */}
               <div className="bg-white border border-slate-200 p-10 rounded-[32px] space-y-10 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-3">
                        <Sliders size={20} className="text-blue-600" />
                        <h4 className="text-lg font-black tracking-tight uppercase text-slate-900">Cognitive Scorecard</h4>
                     </div>
                     <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
                        <span className="text-[10px] font-black text-blue-600">AUTO_AUDIT: ON</span>
                     </div>
                  </div>

                  <div className="space-y-12">
                     {[
                        { label: "Technical Sync", value: 88, color: "bg-blue-600" },
                        { label: "Cultural Alignment", value: 94, color: "bg-emerald-500" },
                        { label: "Neural Precision", value: 76, color: "bg-cyan-500" }
                     ].map(metric => (
                        <div key={metric.label} className="space-y-4">
                           <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{metric.label}</span>
                              <span className="text-sm font-black text-slate-900">{metric.value}%</span>
                           </div>
                           <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${metric.value}%` }}
                                className={cn("h-full shadow-lg", metric.color)}
                              />
                           </div>
                        </div>
                     ))}
                  </div>

                  <Button className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200">
                     Commit Evaluation
                  </Button>
               </div>
            </div>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      ` }} />
    </div>
  );
}
