"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { 
  Users, Search, Filter, Briefcase, Mail, Phone, 
  MapPin, Calendar, CheckCircle2, XCircle, Clock,
  MoreVertical, FileText, Send, Zap, Plus, Trash2,
  ChevronRight, BrainCircuit, Star, ArrowUpRight,
  Loader2, Sparkles, ShieldCheck, AlertCircle
} from "lucide-react";

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
    questions: string[];
  };
}

const defaultJobForm = {
  company: "Namaah Nexus",
  job_title_variants: "",
  mandatory_skills: {},
  preferred_skills: {},
  domain_knowledge: {},
  experience_requirements: {},
  match_weights: { resume: 40, skills: 30, experience: 30 },
  gemma_keywords: "",
};

export default function RecruitmentHubPage() {
  const { user, permissions } = useAuth();
  const canCreate = permissions?.recruitment?.can_create ?? false;
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [jobForm, setJobForm] = useState(defaultJobForm);
  const [savingJob, setSavingJob] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchCandidates();
    const channel = supabase
      .channel("recruitment-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, fetchCandidates)
      .on("postgres_changes", { event: "*", schema: "public", table: "talent_analysis" }, fetchCandidates)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchCandidates() {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`*, talent_analysis(scoring, resume_profile, recommendations, gap_analysis, interview_questions)`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      setCandidates((data || []).map((app: any) => ({
        id: app.id.toString(),
        application_id: app.application_id,
        name: app.applicant_name,
        email: app.applicant_email,
        phone: app.applicant_phone,
        role: app.applied_cluster_id.replace(/-/g, " "),
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
          questions: app.talent_analysis[0].interview_questions || [],
        } : undefined,
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(id: string, decision: Candidate["decision"]) {
    try {
      const { error } = await supabase.from("applications").update({ decision }).eq("id", id);
      if (error) throw error;
      
      showToast(`Decision updated to ${decision}`, "success");
      
      // AUTO-ONBOARDING: If accepted, trigger employee creation
      if (decision === 'accepted') {
        const candidate = candidates.find(c => c.id === id);
        if (candidate) {
          showToast("Initializing automated onboarding...", "info");
          const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: candidate.name,
              email: candidate.email,
              role: 'employee',
              department: 'General',
              joining_date: new Date().toISOString(),
            }),
          });
          if (res.ok) {
            showToast("Employee record created and synced.", "success");
          } else {
            const errJson = await res.json();
            showToast(`Sync warning: ${errJson.error || 'Check Admin panel'}`, "warning");
          }
        }
      }

      fetchCandidates();
      setSelected(prev => prev?.id === id ? { ...prev, decision } : prev);
    } catch {
      showToast("Failed to update decision", "error");
    }
  }

  async function handlePostJob(e: React.FormEvent) {
    e.preventDefault();
    setSavingJob(true);
    try {
      const payload = {
        ...jobForm,
        job_title_variants: jobForm.job_title_variants.split(",").map(s => s.trim()).filter(Boolean),
        gemma_keywords: jobForm.gemma_keywords.split(",").map(s => s.trim()).filter(Boolean),
      };
      const { error } = await supabase.from("job_clusters").insert(payload);
      if (error) throw error;
      showToast("Job posted successfully", "success");
      setPostJobOpen(false);
      setJobForm(defaultJobForm);
    } catch (err: any) {
      showToast(err.message || "Failed to post job", "error");
    } finally {
      setSavingJob(false);
    }
  }

  async function triggerScan(appId: string) {
    try {
      await supabase.from("applications").update({ processing_status: "pending" }).eq("application_id", appId);
      showToast("Scan triggered", "info");
    } catch {
      showToast("Failed to trigger scan", "error");
    }
  }

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = candidates.length > 0
    ? Math.round(candidates.reduce((a, b) => a + b.score, 0) / candidates.length)
    : 0;

  if (loading) {
    return (
      <DashboardShell moduleKey="recruitment" title="Recruitment Hub" subtitle="...">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-theme-primary" />
          <p className="text-xs font-bold text-theme-muted uppercase tracking-widest animate-pulse">Syncing Candidate Pipeline...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      moduleKey="recruitment"
      title="Recruitment Hub"
      subtitle="Candidate pipeline and hiring decisions"
      actions={
        canCreate ? (
          <button
            onClick={() => { setJobForm(defaultJobForm); setPostJobOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={13} /> Post New Job
          </button>
        ) : null
      }
    >
      <div className="space-y-5">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Pipeline", value: candidates.length, icon: Users, color: "text-sky-500" },
            { label: "Avg Match Score", value: `${avgScore}%`, icon: Star, color: "text-amber-500" },
            { label: "Pending Scan", value: candidates.filter(c=>c.status==='pending').length, icon: Clock, color: "text-zinc-500" },
            { label: "Hired Today", value: candidates.filter(c=>c.decision==='accepted').length, icon: CheckCircle2, color: "text-emerald-500" },
          ].map((s, i) => (
            <div key={i} className="page-card p-4 flex items-center gap-4">
              <div className={cn("p-2 rounded-lg bg-theme-raised shadow-inner", s.color)}>
                <s.icon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">{s.label}</p>
                <p className="text-lg font-black text-theme-fg">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* List Section */}
          <div className="lg:col-span-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={14} />
              <input
                type="text"
                placeholder="Filter candidates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-theme-border bg-theme-raised/50 text-xs font-bold outline-none focus:border-theme-primary transition-all"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    "page-card p-4 cursor-pointer transition-all hover:border-theme-primary/40 group",
                    selected?.id === c.id ? "border-theme-primary bg-theme-primary/5 ring-1 ring-theme-primary/20" : "border-theme-border"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-theme-raised flex items-center justify-center text-[10px] font-black border border-theme-border">
                        {c.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-xs font-black text-theme-fg line-clamp-1">{c.name}</p>
                        <p className="text-[9px] font-bold text-theme-muted uppercase tracking-tighter">{c.role}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                      c.decision === 'accepted' ? "bg-emerald-500/10 text-emerald-500" :
                      c.decision === 'rejected' ? "bg-rose-500/10 text-rose-500" : "bg-zinc-500/10 text-theme-muted"
                    )}>
                      {c.decision}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-theme-raised rounded-full overflow-hidden">
                        <div className="h-full bg-theme-primary" style={{ width: `${c.score}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-theme-fg">{c.score}%</span>
                    </div>
                    <p className="text-[9px] font-bold text-theme-muted">{c.appliedDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail Section */}
          <div className="lg:col-span-8">
            {selected ? (
              <div className="page-card min-h-[600px] flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b border-theme-border bg-theme-raised/20">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-center text-xl font-black text-theme-primary shadow-sm">
                        {selected.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-theme-fg">{selected.name}</h2>
                        <p className="text-xs font-bold text-theme-muted uppercase tracking-widest flex items-center gap-2">
                          <Briefcase size={12} /> {selected.role}
                        </p>
                        <div className="flex gap-3 mt-2">
                          <p className="text-[10px] font-bold text-theme-muted flex items-center gap-1.5"><Mail size={10} /> {selected.email}</p>
                          <p className="text-[10px] font-bold text-theme-muted flex items-center gap-1.5"><Phone size={10} /> {selected.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDecision(selected.id, 'accepted')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all",
                          selected.decision === 'accepted' ? "bg-emerald-500 text-white" : "bg-theme-surface text-theme-fg border border-theme-border hover:border-emerald-500/50"
                        )}
                      >
                        <CheckCircle2 size={14} /> Hire Candidate
                      </button>
                      <button 
                         onClick={() => handleDecision(selected.id, 'rejected')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all",
                          selected.decision === 'rejected' ? "bg-rose-500 text-white" : "bg-theme-surface text-theme-fg border border-theme-border hover:border-rose-500/50"
                        )}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  {selected.analysis ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="text-theme-primary" size={18} />
                          <h3 className="text-sm font-black text-theme-fg uppercase tracking-widest">AI Profile Summary</h3>
                        </div>
                        <p className="text-xs font-bold text-theme-muted leading-relaxed bg-theme-raised/30 p-4 rounded-xl border border-theme-border/50">
                          {selected.analysis.summary}
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={12} /> Key Strengths
                          </p>
                          <div className="space-y-2">
                            {selected.analysis.pros.map((p, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs font-bold text-theme-fg bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                                <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                                <span>{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={12} /> Gap Analysis
                          </p>
                          <div className="space-y-2">
                            {selected.analysis.cons.map((c, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs font-bold text-theme-fg bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                <AlertCircle size={12} className="text-rose-500 mt-0.5 shrink-0" />
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="text-sky-500" size={18} />
                          <h3 className="text-sm font-black text-theme-fg uppercase tracking-widest">Recommended Interview Questions</h3>
                        </div>
                        <div className="grid gap-3">
                          {selected.analysis.questions.map((q: any, i: number) => (
                            <div key={i} className="p-4 rounded-xl bg-theme-raised/50 border border-theme-border group hover:border-sky-500/30 transition-all">
                              <p className="text-xs font-black text-theme-fg mb-1">Q{i+1}: {q.question || q}</p>
                              {q.reason && <p className="text-[10px] font-bold text-theme-muted italic">Focus: {q.reason}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                      {selected.status === 'processing' || selected.status === 'pending' ? (
                        <>
                          <div className="h-12 w-12 rounded-full border-2 border-theme-primary border-t-transparent animate-spin" />
                          <div>
                            <p className="text-sm font-black text-theme-fg">Neural Analysis in Progress</p>
                            <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mt-1">Gemma-4 Engine is auditing resume...</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-16 w-16 rounded-full bg-theme-raised flex items-center justify-center border border-theme-border">
                            <BrainCircuit size={32} className="text-theme-muted" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-theme-fg">No Analysis Ready</p>
                            <button 
                              onClick={() => triggerScan(selected.application_id)}
                              className="mt-4 px-6 py-2 rounded-full bg-theme-primary text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all"
                            >
                              Trigger Audit Scan
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="page-card min-h-[600px] flex flex-col items-center justify-center text-center p-10 opacity-60">
                <div className="h-20 w-20 rounded-3xl bg-theme-raised flex items-center justify-center mb-6 border border-theme-border">
                  <Users size={40} className="text-theme-muted" />
                </div>
                <h3 className="text-lg font-black text-theme-fg mb-2">Personnel Selection Required</h3>
                <p className="text-xs font-bold text-theme-muted max-w-xs leading-relaxed">
                  Select a candidate from the recruitment pipeline to view neural analysis and make hiring decisions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Job Modal */}
      {postJobOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="page-card w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-theme-border bg-theme-raised/30 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-theme-fg">Post New Job Opportunity</h2>
                <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">Global Hiring Matrix</p>
              </div>
              <button onClick={() => setPostJobOpen(false)} className="p-2 hover:bg-theme-surface rounded-full transition-all">
                <XCircle size={20} className="text-theme-muted" />
              </button>
            </div>
            
            <form onSubmit={handlePostJob} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Company</label>
                  <input 
                    required
                    value={jobForm.company}
                    onChange={e => setJobForm({...jobForm, company: e.target.value})}
                    className="w-full h-10 px-4 rounded-lg border border-theme-border bg-theme-raised/50 text-xs font-bold outline-none focus:border-theme-primary" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Job Title / Variants (comma separated)</label>
                  <input 
                    required
                    placeholder="Software Engineer, Backend Developer..."
                    value={jobForm.job_title_variants}
                    onChange={e => setJobForm({...jobForm, job_title_variants: e.target.value})}
                    className="w-full h-10 px-4 rounded-lg border border-theme-border bg-theme-raised/50 text-xs font-bold outline-none focus:border-theme-primary" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Gemma Keywords (comma separated)</label>
                <textarea 
                  required
                  placeholder="Python, React, AWS, Distributed Systems..."
                  value={jobForm.gemma_keywords}
                  onChange={e => setJobForm({...jobForm, gemma_keywords: e.target.value})}
                  className="w-full h-24 p-4 rounded-lg border border-theme-border bg-theme-raised/50 text-xs font-bold outline-none focus:border-theme-primary resize-none" 
                />
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-3">
                <Zap size={16} className="text-amber-500 shrink-0" />
                <p className="text-[10px] font-bold text-amber-600 leading-normal italic">
                  Neural Scanning: Once posted, our Gemma-4 engine will automatically begin scanning incoming resumes against these keywords and title variants using the defined match weights.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
                <button type="button" onClick={() => setPostJobOpen(false)} className="px-6 py-2 rounded-lg text-xs font-black text-theme-muted hover:bg-theme-raised transition-all">Cancel</button>
                <button 
                  type="submit" 
                  disabled={savingJob}
                  className="px-8 py-2 rounded-lg bg-theme-primary text-white text-xs font-black shadow-lg shadow-theme-primary/20 hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingJob ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Publish Cluster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
