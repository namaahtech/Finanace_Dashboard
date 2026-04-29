"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  GitBranch,
  ChevronRight,
  Target,
  Trophy,
  Zap,
  Users,
  ShieldCheck,
  Star,
  ArrowUpRight,
  GraduationCap,
  Briefcase
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RefreshCw } from "lucide-react";

interface Level {
  id: string;
  title: string;
  designation: string;
  minExperience: string;
  requirements: string[];
  perks: string[];
  color: string;
}

const CAREER_LADDER: Level[] = [
  {
    id: "l1",
    title: "Level 1",
    designation: "Associate / Intern",
    minExperience: "0-1 Years",
    requirements: ["Core technical proficiency", "Team collaboration", "Basic documentation"],
    perks: ["Mentorship access", "Learning budget", "Flexible hours"],
    color: "bg-blue-500",
  },
  {
    id: "l2",
    title: "Level 2",
    designation: "Junior Engineer",
    minExperience: "1-3 Years",
    requirements: ["Independent task execution", "Code review participation", "Technical contribution"],
    perks: ["Health insurance", "Performance bonus", "Certification support"],
    color: "bg-emerald-500",
  },
  {
    id: "l3",
    title: "Level 3",
    designation: "Senior Specialist",
    minExperience: "3-6 Years",
    requirements: ["System architecture", "Mentoring juniors", "Project ownership"],
    perks: ["Lead incentives", "Conference sponsorship", "Stock options"],
    color: "bg-purple-500",
  },
  {
    id: "l4",
    title: "Level 4",
    designation: "Lead / Manager",
    minExperience: "6+ Years",
    requirements: ["Strategic planning", "Resource management", "Technical visionary"],
    perks: ["Profit sharing", "Executive retreats", "Full autonomy"],
    color: "bg-amber-500",
  },
];

function NeuralAdvisorySection() {
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<any>(null);

  const getAdvice = async () => {
    if (!currentRole || !targetRole) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/career/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentRole, targetRole, skills }),
      });
      const data = await res.json();
      setAdvice(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-card border-theme-border/50 bg-theme-surface p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-theme-primary/10 flex items-center justify-center text-theme-primary">
          <Zap size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black uppercase tracking-widest text-theme-fg">Neural Career Advisory</h3>
          <p className="text-[10px] font-bold text-theme-muted tracking-wide uppercase">AI-Powered Professional Strategist (Gemma 4)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Current Position</label>
              <input 
                value={currentRole} 
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="e.g. Junior Web Dev"
                className="h-11 w-full rounded-xl border border-theme-border bg-theme-page px-4 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Target Ambition</label>
              <input 
                value={targetRole} 
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Solution Architect"
                className="h-11 w-full rounded-xl border border-theme-border bg-theme-page px-4 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Current Skillset</label>
            <textarea 
              value={skills} 
              onChange={(e) => setSkills(e.target.value)}
              placeholder="List your core technologies and competencies..."
              className="h-24 w-full rounded-xl border border-theme-border bg-theme-page p-4 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary transition-all resize-none"
            />
          </div>
          <Button 
            variant="primary" 
            className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-theme-primary/10"
            disabled={loading || !currentRole || !targetRole}
            onClick={getAdvice}
          >
            {loading ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Zap className="mr-2" size={16} />}
            {loading ? "Calibrating Growth Path..." : "Generate Neural Roadmap"}
          </Button>
        </div>

        <div className="relative">
          {!advice && !loading ? (
            <div className="h-full min-h-[200px] rounded-2xl border-2 border-dashed border-theme-border flex flex-col items-center justify-center p-8 text-center bg-theme-raised/5">
              <div className="h-16 w-16 rounded-full bg-theme-page border border-theme-border flex items-center justify-center text-theme-muted mb-4 opacity-50">
                 <GitBranch size={32} />
              </div>
              <p className="text-xs font-bold text-theme-muted uppercase tracking-widest">Awaiting Input Parameters</p>
              <p className="text-[10px] text-theme-subtle mt-1">Configure your current state and target to generate a strategic roadmap.</p>
            </div>
          ) : loading ? (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-8 space-y-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-theme-primary border-t-transparent" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-primary animate-pulse">Syncing with Mac Mini AI...</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
               <div className="space-y-4">
                  {advice.roadmap.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 group">
                       <div className="flex flex-col items-center gap-1">
                          <div className="h-6 w-6 rounded-full bg-theme-primary text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-theme-primary/20">
                             {idx + 1}
                          </div>
                          {idx < 2 && <div className="w-0.5 flex-1 bg-gradient-to-b from-theme-primary to-theme-border opacity-50" />}
                       </div>
                       <div className="flex-1 pb-6">
                          <p className="text-[10px] font-black uppercase tracking-widest text-theme-primary">{item.step}</p>
                          <p className="text-xs font-black text-theme-fg mt-0.5">{item.action}</p>
                          <div className="mt-2 inline-flex items-center gap-2 px-2 py-0.5 rounded bg-theme-raised border border-theme-border text-[9px] font-bold text-theme-muted">
                             <Star size={8} /> {item.skills}
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
               
               <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex gap-3 italic">
                  <Star size={16} className="text-purple-500 shrink-0" />
                  <p className="text-[11px] font-medium text-theme-muted">
                    <span className="font-black text-purple-600 uppercase tracking-widest not-italic mr-2">Strategy Tip:</span>
                    "{advice.mentorTip}"
                  </p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CareerPathPage() {
  const [activeLevel, setActiveLevel] = useState<string>(CAREER_LADDER[0].id);

  const activeData = CAREER_LADDER.find(l => l.id === activeLevel)!;

  return (
    <DashboardShell
      title="Growth Architecture"
      subtitle="Comprehensive professional roadmap and succession planning matrix."
    >
      <div className="space-y-8 animate-in fade-in duration-500">
        <NeuralAdvisorySection />

        {/* Progress Track */}
        <div className="page-card p-10 border-theme-border/50 bg-theme-surface relative overflow-hidden shadow-xl">
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
              <Trophy size={200} />
           </div>

           <div className="relative z-10 flex flex-col items-center">
              <div className="mb-12 flex items-center justify-center gap-2">
                 <Badge variant="success" className="text-[10px] font-black uppercase tracking-widest px-3 py-1">Standardized Track</Badge>
                 <Badge variant="purple" className="text-[10px] font-black uppercase tracking-widest px-3 py-1">Enterprise Ready</Badge>
              </div>

              <div className="relative w-full max-w-4xl h-24 flex items-center">
                 {/* Progress Line */}
                 <div className="absolute left-0 right-0 h-1 bg-theme-border rounded-full" />
                 <div 
                    className="absolute left-0 h-1 bg-theme-primary rounded-full transition-all duration-700" 
                    style={{ width: `${(CAREER_LADDER.findIndex(l => l.id === activeLevel) / (CAREER_LADDER.length - 1)) * 100}%` }}
                 />

                 {/* Milestone Points */}
                 <div className="absolute left-0 right-0 flex justify-between items-center px-2">
                    {CAREER_LADDER.map((level, idx) => {
                       const isActive = level.id === activeLevel;
                       const isPast = CAREER_LADDER.findIndex(l => l.id === activeLevel) >= idx;

                       return (
                          <div key={level.id} className="relative flex flex-col items-center">
                             <button
                                onClick={() => setActiveLevel(level.id)}
                                className={cn(
                                   "z-20 h-12 w-12 rounded-full border-4 flex items-center justify-center transition-all duration-300",
                                   isActive 
                                      ? "bg-theme-surface border-theme-primary scale-125 shadow-xl shadow-theme-primary/20" 
                                      : isPast 
                                      ? "bg-theme-primary border-theme-primary" 
                                      : "bg-theme-surface border-theme-border hover:border-theme-muted"
                                )}
                             >
                                <Star 
                                   size={16} 
                                   className={cn(
                                      "transition-colors",
                                      isActive ? "text-theme-primary animate-pulse" : isPast ? "text-theme-surface" : "text-theme-muted"
                                   )} 
                                />
                             </button>
                             <div className="absolute top-16 whitespace-nowrap text-center">
                                <p className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", isActive ? "text-theme-primary" : "text-theme-muted")}>
                                   {level.title}
                                </p>
                                <p className="text-[9px] font-bold text-theme-subtle mt-0.5">{level.designation}</p>
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </div>
           </div>
        </div>

        {/* Detailed Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Summary Card */}
           <div className="page-card border-theme-border/50 bg-theme-raised/30 p-8 flex flex-col h-full animate-in slide-in-from-left-4 duration-500">
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg", activeData.color)}>
                 <Target size={22} />
              </div>
              <h3 className="text-2xl font-black text-theme-fg tracking-tight">{activeData.designation}</h3>
              <p className="text-sm text-theme-muted mt-2 font-medium">Core mandate and strategic expectations for {activeData.title} professionals.</p>
              
              <div className="mt-8 space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-theme-page border border-theme-border flex items-center justify-center text-theme-muted">
                       <Zap size={14} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Experience Threshold</p>
                       <p className="text-sm font-bold text-theme-fg">{activeData.minExperience}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-theme-page border border-theme-border flex items-center justify-center text-theme-muted">
                       <Users size={14} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-theme-subtle">Peer Alignment</p>
                       <p className="text-sm font-bold text-theme-fg">Internal Grade {activeData.id.toUpperCase()}</p>
                    </div>
                 </div>
              </div>

              <div className="mt-auto pt-8">
                 <div className="rounded-xl border border-theme-primary/20 bg-theme-primary/5 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <ShieldCheck size={18} className="text-theme-primary" />
                       <span className="text-xs font-bold text-theme-fg">Verified Standard</span>
                    </div>
                    <ArrowUpRight size={14} className="text-theme-primary" />
                 </div>
              </div>
           </div>

           {/* Requirements Grid */}
           <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-right-4 duration-500">
              <div className="page-card border-theme-border/50 p-8 h-full">
                 <div className="flex items-center gap-3 mb-8">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                       <GraduationCap size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg">Neural Requirements</h3>
                 </div>
                 <div className="space-y-4">
                    {activeData.requirements.map((req, i) => (
                       <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-theme-border bg-theme-raised/5 hover:bg-theme-page transition-all group">
                          <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-600 mt-0.5 group-hover:scale-110 transition-transform">
                             {i + 1}
                          </div>
                          <p className="text-xs font-semibold text-theme-muted group-hover:text-theme-fg transition-colors leading-relaxed">
                             {req}
                          </p>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="page-card border-theme-border/50 p-8 h-full">
                 <div className="flex items-center gap-3 mb-8">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                       <Briefcase size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-theme-fg">Strategic Perks</h3>
                 </div>
                 <div className="space-y-4">
                    {activeData.perks.map((perk, i) => (
                       <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-theme-border group hover:border-purple-500/30 transition-all">
                          <CheckCircle2 size={16} className="text-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                          <p className="text-xs font-bold text-theme-muted group-hover:text-theme-fg transition-colors">
                             {perk}
                          </p>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function CheckCircle2({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
