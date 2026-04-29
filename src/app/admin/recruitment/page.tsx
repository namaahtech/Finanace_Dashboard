"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  TrendingUp,
  BrainCircuit,
  Plus,
  Mail,
  Phone,
  FileText,
  Loader2,
  RefreshCw
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

import { supabase } from "@/lib/supabase";

interface Candidate {
  id: string;
  application_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "pending" | "processing" | "completed" | "failed";
  decision: "pending" | "accepted" | "rejected";
  score: number;
  appliedDate: string;
  cluster_id: string;
  analysis?: {
    summary: string;
    education_match: string;
    pros: string[];
    cons: string[];
    questions: any[];
  };
}

export default function RecruitmentHubPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchCandidates();
    
    // Realtime subscription
    const channel = supabase
      .channel('recruitment-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchCandidates();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'talent_analysis' }, () => {
        fetchCandidates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchCandidates() {
    try {
      const { data: apps, error: appError } = await supabase
        .from("applications")
        .select(`
          *,
          talent_analysis (
            scoring,
            resume_profile,
            recommendations,
            gap_analysis,
            interview_questions
          )
        `)
        .order("created_at", { ascending: false });

      if (appError) throw appError;

      const formatted: Candidate[] = apps.map((app: any) => ({
        id: app.id.toString(),
        application_id: app.application_id,
        name: app.applicant_name,
        email: app.applicant_email,
        phone: app.applicant_phone,
        role: app.applied_cluster_id.replace(/-/g, ' '),
        status: app.processing_status,
        decision: app.decision,
        score: app.talent_analysis?.[0]?.scoring?.match_score || 0,
        appliedDate: new Date(app.created_at).toLocaleDateString(),
        cluster_id: app.applied_cluster_id,
        analysis: app.talent_analysis?.[0] ? {
            summary: app.talent_analysis[0].resume_profile?.summary || "",
            education_match: app.talent_analysis[0].resume_profile?.education_match || "",
            pros: app.talent_analysis[0].recommendations?.pros || [],
            cons: app.talent_analysis[0].gap_analysis?.cons || [],
            questions: app.talent_analysis[0].interview_questions || []
        } : undefined
      }));

      setCandidates(formatted);
    } catch (err) {
      console.error("Error fetching candidates:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDecision = async (id: string, decision: Candidate["decision"]) => {
    try {
      const { error } = await supabase
        .from("applications")
        .update({ decision })
        .eq("id", id);

      if (error) throw error;
      showToast(`Candidate decision updated to ${decision}`, "success");
      fetchCandidates();
      if (selectedCandidate?.id === id) {
        setSelectedCandidate(prev => prev ? { ...prev, decision } : null);
      }
    } catch (err) {
      showToast("Failed to update decision", "error");
    }
  };

  const triggerScan = async (appId: string) => {
    showToast("Triggering Neural Audit...", "info");
    try {
      const { error } = await supabase
        .from("applications")
        .update({ processing_status: "pending" })
        .eq("application_id", appId);
      
      if (error) throw error;
    } catch (err) {
       showToast("Failed to trigger scan", "error");
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardShell
      title="Recruitment Intelligence Hub"
      subtitle="Autonomous talent acquisition and candidate decision matrix."
      actions={
        <Button variant="primary" size="sm">
          <Plus size={14} className="mr-2" /> Post New Job
        </Button>
      }
    >
      <div className="flex gap-6 relative">
        <div className={cn("transition-all duration-500", selectedCandidate ? "w-2/3" : "w-full")}>
           <div className="space-y-6">
             {/* Stats Grid */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {[
                 { label: "Active Openings", value: "12", icon: Briefcase, color: "text-theme-primary", bg: "bg-theme-primary/10" },
                 { label: "Total Applicants", value: candidates.length.toString(), icon: Users, color: "text-sky-600", bg: "bg-sky-500/10" },
                 { label: "Proceeding", value: candidates.filter(c => c.decision === 'accepted').length.toString(), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                 { label: "Avg. Match Score", value: candidates.length > 0 ? Math.round(candidates.reduce((a, b) => a + b.score, 0) / candidates.length) + "%" : "0%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-500/10" },
               ].map((stat, i) => (
                 <div key={i} className="page-card flex items-center gap-4">
                   <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                     <stat.icon size={18} className={stat.color} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">{stat.label}</p>
                     <p className="text-xl font-black text-theme-fg">{stat.value}</p>
                   </div>
                 </div>
               ))}
             </div>

             {/* Search & Filters */}
             <div className="page-card py-3 px-4 flex flex-col md:flex-row items-center gap-4 border-theme-border/50">
               <div className="relative flex-1 w-full">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={16} />
                 <input 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder="Search candidates..."
                   className="h-10 w-full rounded-xl border border-theme-border bg-theme-page pl-10 pr-4 text-sm font-medium text-theme-fg outline-none focus:border-theme-primary transition-all"
                 />
               </div>
               <div className="flex items-center gap-2">
                  <Badge variant="success">{candidates.filter(c => c.decision === 'accepted').length} Accepted</Badge>
                  <Badge variant="danger">{candidates.filter(c => c.decision === 'rejected').length} Rejected</Badge>
               </div>
             </div>

             {/* Candidate Matrix */}
             <div className="page-card p-0 overflow-hidden border-theme-border/50">
                <div className="overflow-x-auto">
                   <table className="w-full text-sm">
                     <thead>
                       <tr className="border-b border-theme-border bg-theme-raised/5 text-left text-[10px] font-black uppercase tracking-widest text-theme-muted">
                         <th className="px-6 py-4">Candidate Profile</th>
                         <th className="px-6 py-4">Neural Score</th>
                         <th className="px-6 py-4">Decision</th>
                         <th className="px-6 py-4 text-right">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-theme-border">
                       {filteredCandidates.map(candidate => (
                         <tr 
                           key={candidate.id} 
                           onClick={() => setSelectedCandidate(candidate)}
                           className={cn(
                             "hover:bg-theme-raised/20 transition-colors group cursor-pointer",
                             selectedCandidate?.id === candidate.id && "bg-theme-primary/5 border-l-2 border-theme-primary"
                           )}
                         >
                           <td className="px-6 py-5">
                             <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary font-black text-xs border border-theme-primary/20">
                                  {candidate.name.split(" ").map(n => n[0]).join("")}
                               </div>
                               <div className="flex flex-col min-w-0">
                                 <span className="text-sm font-black text-theme-fg truncate">{candidate.name}</span>
                                 <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wide mt-0.5">{candidate.role}</span>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                 <div className="h-1.5 w-12 bg-theme-raised rounded-full overflow-hidden">
                                    <div 
                                      className={cn("h-full", candidate.score >= 80 ? "bg-emerald-500" : candidate.score >= 60 ? "bg-amber-500" : "bg-rose-500")}
                                      style={{ width: `${candidate.score}%` }}
                                    />
                                 </div>
                                 <span className="text-xs font-black text-theme-fg">{candidate.score}%</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <Badge variant={
                                candidate.decision === "accepted" ? "success" : 
                                candidate.decision === "rejected" ? "danger" : "secondary"
                              }>
                                {candidate.decision}
                              </Badge>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <Button 
                                variant="secondary" 
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerScan(candidate.application_id);
                                }}
                              >
                                 <RefreshCw size={12} className={candidate.status === "processing" ? "animate-spin" : ""} />
                              </Button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
             </div>
           </div>
        </div>

        {/* Side Panel */}
        {selectedCandidate && (
          <div className="w-1/3 sticky top-0 h-[calc(100vh-200px)] animate-in slide-in-from-right duration-300">
             <div className="page-card h-full flex flex-col border-theme-primary/20 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-raised/5">
                   <div>
                      <h3 className="text-lg font-black text-theme-fg tracking-tighter">Neural Breakdown</h3>
                      <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mt-1">Gemma 4 Cognitive Audit</p>
                   </div>
                   <button onClick={() => setSelectedCandidate(null)} className="text-theme-muted hover:text-theme-fg transition-colors">
                      <XCircle size={20} />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                   {selectedCandidate.status !== "completed" ? (
                      <div className="py-20 text-center flex flex-col items-center">
                         <Loader2 size={32} className="animate-spin text-theme-primary mb-4" />
                         <p className="text-sm font-bold text-theme-fg">Analysis Pending</p>
                         <p className="text-xs text-theme-muted mt-1">Audit active on Mac Mini neural grid...</p>
                      </div>
                   ) : (
                      <>
                        <div className="p-4 rounded-xl bg-theme-primary/5 border border-theme-primary/10">
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-theme-primary">Match Score</span>
                              <span className="text-2xl font-black text-theme-primary">{selectedCandidate.score}%</span>
                           </div>
                           <p className="text-xs text-theme-fg leading-relaxed bg-white/50 p-3 rounded-lg border border-theme-primary/5">
                              {selectedCandidate.analysis?.summary}
                           </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                                 <CheckCircle2 size={10} /> Pros
                              </span>
                              {selectedCandidate.analysis?.pros.map((p, i) => (
                                 <p key={i} className="text-[11px] text-theme-fg pl-3 border-l border-emerald-500/30">{p}</p>
                              ))}
                           </div>
                           <div className="space-y-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1">
                                 <XCircle size={10} /> Cons
                              </span>
                              {selectedCandidate.analysis?.cons.map((c, i) => (
                                 <p key={i} className="text-[11px] text-theme-fg pl-3 border-l border-rose-500/30">{c}</p>
                              ))}
                           </div>
                        </div>

                        <div className="space-y-4">
                           <span className="text-[10px] font-black uppercase tracking-widest text-theme-primary flex items-center gap-1">
                              <BrainCircuit size={10} /> Tricky Project Questions
                           </span>
                           {selectedCandidate.analysis?.questions.map((q, i) => (
                              <div key={i} className="p-3 rounded-xl bg-theme-raised/30 border border-theme-border">
                                 <p className="text-xs font-bold text-theme-fg leading-snug">{q.question}</p>
                                 <p className="text-[10px] text-theme-muted mt-2 italic">Logic: {q.reason}</p>
                              </div>
                           ))}
                        </div>

                        <div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Academic Alignment</span>
                           <p className="text-xs font-bold text-theme-fg mt-1">{selectedCandidate.analysis?.education_match}</p>
                        </div>

                        <div className="pt-4 flex gap-2">
                           <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border-none" onClick={() => handleDecision(selectedCandidate.id, "accepted")}>Accept</Button>
                           <Button variant="secondary" className="flex-1 text-rose-500 hover:bg-rose-500/10" onClick={() => handleDecision(selectedCandidate.id, "rejected")}>Reject</Button>
                        </div>
                      </>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
