"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  CheckCircle2, 
  FileText, 
  HelpCircle,
  Clock,
  Layout,
  MessageSquare,
  ArrowLeft,
  Award,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const MOCK_COURSE_CONTENT = {
  id: "1",
  title: "Engineering Excellence: Code Standards",
  description: "Master the architecture and coding patterns that drive Namaah Pulse.",
  modules: [
    {
      id: "m1",
      title: "Foundations",
      lessons: [
        { id: "l1", title: "Introduction to Core Principles", type: "video", duration: "10:24", status: "completed" },
        { id: "l2", title: "The Namaah Tech Stack", type: "video", duration: "15:45", status: "completed" },
        { id: "l3", title: "Security & Privacy Protocols", type: "video", duration: "08:12", status: "current" },
      ]
    },
    {
      id: "m2",
      title: "Backend Architecture",
      lessons: [
        { id: "l4", title: "Supabase Realtime Hooks", type: "video", duration: "22:10", status: "locked" },
        { id: "l5", title: "Edge Functions & Cron", type: "video", duration: "18:30", status: "locked" },
        { id: "l6", title: "Final Backend Quiz", type: "quiz", duration: "5:00", status: "locked" },
      ]
    }
  ]
};

export default function CoursePlayerPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeLesson, setActiveLesson] = useState(MOCK_COURSE_CONTENT.modules[0].lessons[2]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-theme-primary/30 flex flex-col">
      
      {/* Top Bar */}
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/academy")}
            className="h-8 w-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-bold truncate max-w-md">{MOCK_COURSE_CONTENT.title}</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest leading-none mb-1">Your Progress</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-theme-primary" style={{ width: '45%' }} />
              </div>
              <span className="text-[10px] font-bold text-zinc-500">45%</span>
            </div>
          </div>
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[10px] uppercase px-4 h-9">
            Claim Certificate
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Player Area */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 flex flex-col">
          {/* Video Placeholder */}
          <div className="aspect-video w-full bg-zinc-900 relative group overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
              className="w-full h-full object-cover opacity-40 blur-sm scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative group/play cursor-pointer">
                <div className="absolute inset-0 bg-theme-primary rounded-full blur-2xl opacity-20 group-hover/play:opacity-40 transition-opacity" />
                <div className="h-20 w-20 rounded-full bg-theme-primary flex items-center justify-center text-black shadow-2xl relative transition-transform group-hover/play:scale-110">
                  <Play size={32} fill="currentColor" />
                </div>
              </div>
            </div>

            {/* Video Overlays */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-white hover:bg-white/10">
                    <Play size={20} fill="currentColor" />
                  </Button>
                  <div className="h-1 w-64 bg-white/20 rounded-full relative overflow-hidden">
                    <div className="h-full bg-theme-primary" style={{ width: '30%' }} />
                  </div>
                  <span className="text-xs font-bold font-mono">04:12 / 10:24</span>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-white hover:bg-white/10">
                    1.5x Speed
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Lesson Description */}
          <div className="max-w-3xl mx-auto py-12 px-8 w-full space-y-8">
            <div className="space-y-4">
              <Badge className="bg-theme-primary/10 text-theme-primary border-theme-primary/20">Module 1 • Lesson 3</Badge>
              <h2 className="text-4xl font-black">{activeLesson.title}</h2>
              <div className="flex items-center gap-6 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2"><Clock size={14} /> {activeLesson.duration} Mins</span>
                <span className="flex items-center gap-2"><MessageSquare size={14} /> 12 Discussions</span>
              </div>
            </div>

            <div className="prose prose-invert max-w-none text-zinc-400 leading-relaxed">
              <p className="text-lg text-zinc-300">In this lesson, we dive deep into the security protocols that keep Namaah's data safe. We'll cover everything from RLS (Row Level Security) to AES-256 encryption at the edge.</p>
              <h3 className="text-white font-bold mt-8 mb-4">Key Takeaways:</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                    <CheckCircle2 size={12} />
                  </div>
                  Understanding the difference between Auth policies and RLS.
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                    <CheckCircle2 size={12} />
                  </div>
                  How to implement JWT-based session validation in Edge Functions.
                </li>
              </ul>
            </div>

            {/* Interaction Buttons */}
            <div className="flex items-center justify-between pt-12 border-t border-white/5">
              <Button variant="ghost" className="text-zinc-500 hover:text-white flex items-center gap-2">
                <ChevronLeft size={18} /> Previous Lesson
              </Button>
              <Button className="bg-white text-black hover:bg-zinc-200 font-black px-8 py-6 rounded-2xl flex items-center gap-2">
                Next: The Tech Stack <ChevronRight size={18} />
              </Button>
            </div>
          </div>
        </div>

        {/* Course Sidebar (Navigator) */}
        <aside className={cn(
          "w-80 border-l border-white/5 bg-zinc-950 flex flex-col transition-all duration-300 overflow-hidden",
          !sidebarOpen && "w-0"
        )}>
          <div className="p-6 border-b border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Course Curriculum</h3>
            <p className="text-[10px] text-zinc-600 font-bold">12 Lessons • 3h 45m Total</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {MOCK_COURSE_CONTENT.modules.map((mod, midx) => (
              <div key={mod.id} className="border-b border-white/5">
                <div className="px-6 py-4 bg-zinc-900/30 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Module {midx + 1}: {mod.title}</span>
                  <ChevronDownIcon size={12} className="text-zinc-600" />
                </div>
                <div className="py-2">
                  {mod.lessons.map((les) => (
                    <div 
                      key={les.id}
                      onClick={() => les.status !== 'locked' && setActiveLesson(les)}
                      className={cn(
                        "px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer group relative",
                        les.id === activeLesson.id && "bg-theme-primary/5",
                        les.status === 'locked' && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {les.id === activeLesson.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-primary" />}
                      
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        les.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : 
                        les.id === activeLesson.id ? "bg-theme-primary/20 text-theme-primary shadow-lg shadow-theme-primary/10" : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700"
                      )}>
                        {les.status === 'completed' ? <CheckCircle2 size={14} strokeWidth={3} /> : 
                         les.status === 'locked' ? <Lock size={14} /> : 
                         les.type === 'video' ? <Play size={14} fill={les.id === activeLesson.id ? "currentColor" : "none"} /> : <HelpCircle size={14} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-bold truncate transition-colors",
                          les.id === activeLesson.id ? "text-theme-primary" : "text-zinc-300 group-hover:text-white"
                        )}>
                          {les.title}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-bold mt-0.5">{les.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-zinc-900/20">
            <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Award size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Graduation</p>
                <p className="text-[9px] text-zinc-500 leading-tight">Complete all modules to unlock certificate.</p>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

function ChevronDownIcon({ size, className }: { size: number, className?: string }) {
  return <ChevronDown size={size} className={className} />;
}

function ChevronDown({ size, className }: { size: number, className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>;
}
