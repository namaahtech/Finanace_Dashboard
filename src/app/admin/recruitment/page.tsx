"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Users, Search, CheckCircle2, XCircle, Clock, Briefcase,
  TrendingUp, BrainCircuit, Plus, Loader2, RefreshCw, X, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { SlideOver } from "@/components/ui/SlideOver";
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

/* ─── Score bar ───────────────────────────────────────────────────────────── */
function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-theme-raised rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500",
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-theme-fg tabular-nums">{score}%</span>
    </div>
  );
}

/* ─── Decision badge ──────────────────────────────────────────────────────── */
function DecisionBadge({ decision }: { decision: Candidate["decision"] }) {
  return (
    <span className={cn(
      "text-[9px] font-semibold px-2 py-0.5 rounded-full border capitalize",
      decision === "accepted" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
      decision === "rejected" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
      "bg-theme-raised text-theme-muted border-theme-border",
    )}>
      {decision}
    </span>
  );
}

/* ─── Candidate detail panel ──────────────────────────────────────────────── */
function DetailPanel({ candidate, onClose, onDecision }: {
  candidate: Candidate;
  onClose: () => void;
  onDecision: (id: string, d: Candidate["decision"]) => void;
}) {
  return (
    <div className="flex flex-col h-full bg-theme-card border border-theme-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border bg-theme-raised/40 flex-shrink-0">
        <div>
          <p className="font-semibold text-sm text-theme-fg">Candidate Analysis</p>
          <p className="text-[11px] text-theme-muted mt-0.5">{candidate.name}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {candidate.status !== "completed" ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Loader2 size={28} className="animate-spin text-theme-primary" />
            <p className="text-sm font-semibold text-theme-fg">Analysis in progress</p>
            <p className="text-[11px] text-theme-muted">AI audit is running, check back shortly.</p>
          </div>
        ) : (
          <>
            {/* Score summary */}
            <div className="p-3 rounded-xl bg-theme-primary/5 border border-theme-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-theme-primary">Match Score</span>
                <span className="text-xl font-black text-theme-primary tabular-nums">{candidate.score}%</span>
              </div>
              {candidate.analysis?.summary && (
                <p className="text-[11px] text-theme-fg leading-snug">{candidate.analysis.summary}</p>
              )}
            </div>

            {/* Pros / Cons */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="section-label text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 size={9} /> Strengths
                </p>
                {(candidate.analysis?.pros || []).map((p, i) => (
                  <p key={i} className="text-[11px] text-theme-fg pl-2 border-l-2 border-emerald-500/30 leading-snug">{p}</p>
                ))}
              </div>
              <div className="space-y-2">
                <p className="section-label text-rose-500 flex items-center gap-1">
                  <XCircle size={9} /> Gaps
                </p>
                {(candidate.analysis?.cons || []).map((c, i) => (
                  <p key={i} className="text-[11px] text-theme-fg pl-2 border-l-2 border-rose-500/30 leading-snug">{c}</p>
                ))}
              </div>
            </div>

            {/* Questions */}
            {(candidate.analysis?.questions || []).length > 0 && (
              <div className="space-y-2">
                <p className="section-label flex items-center gap-1"><BrainCircuit size={9} /> Interview Questions</p>
                {candidate.analysis!.questions.map((q: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-theme-raised border border-theme-border">
                    <p className="text-xs font-medium text-theme-fg leading-snug">{q.question}</p>
                    {q.reason && <p className="text-[10px] text-theme-muted mt-1 italic">{q.reason}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {candidate.analysis?.education_match && (
              <div>
                <p className="section-label mb-1">Education fit</p>
                <p className="text-xs text-theme-fg">{candidate.analysis.education_match}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onDecision(candidate.id, "accepted")}
                className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => onDecision(candidate.id, "rejected")}
                className="flex-1 py-2 rounded-lg border border-rose-500/30 text-rose-500 text-xs font-semibold hover:bg-rose-500/10 transition-colors"
              >
                Reject
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const defaultJobForm = {
  cluster_id: "",
  company: "Namaah Tech",
  job_title_variants: "",
  experience_requirements: { years_required: 0, seniority_levels: ["Junior"] },
  education: { required: "Bachelor's", preferred: "Master's" },
  match_weights: { technical_skills: 40, domain_knowledge: 25, experience_years: 20, education: 15 },
  gemma_keywords: "",
  mandatory_skills: [] as any[],
  preferred_skills: [] as any[],
  domain_knowledge: [] as any[],
  active: true,
};

const inputCls = "w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-fg placeholder:text-theme-muted focus:outline-none focus:border-theme-strong transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-theme-muted">{label}</label>
      {children}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function RecruitmentHubPage() {
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

  return (
    <DashboardShell
      title="Recruitment Hub"
      subtitle="Candidate pipeline and hiring decisions"
      actions={
        <button
          onClick={() => { setJobForm(defaultJobForm); setPostJobOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={13} /> Post New Job
        </button>
      }
    >
      <div className="space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Active openings", value: "12", icon: <Briefcase size={15} />, color: "text-theme-primary", bg: "bg-theme-primary/10" },
            { label: "Total applicants", value: String(candidates.length), icon: <Users size={15} />, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Accepted", value: String(candidates.filter(c => c.decision === "accepted").length), icon: <CheckCircle2 size={15} />, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Avg. match score", value: `${avgScore}%`, icon: <TrendingUp size={15} />, color: "text-violet-500", bg: "bg-violet-500/10" },
          ].map((s) => (
            <div key={s.label} className="bg-theme-card border border-theme-border rounded-xl p-4 flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", s.bg, s.color)}>
                {s.icon}
              </div>
              <div>
                <p className="text-lg font-black text-theme-fg tabular-nums leading-none">{s.value}</p>
                <p className="text-[11px] text-theme-muted mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={cn("flex gap-5 transition-all", selected ? "items-start" : "")}>

          {/* Table section */}
          <div className={cn("min-w-0 transition-all", selected ? "flex-1" : "w-full")}>

            {/* Search + badges */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search candidates…"
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-theme-border bg-theme-surface text-sm text-theme-fg placeholder:text-theme-muted focus:outline-none focus:border-theme-strong transition-colors"
                />
              </div>
              <span className="text-[11px] text-theme-muted whitespace-nowrap hidden sm:block">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Table */}
            <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-theme-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Users size={32} className="text-theme-muted opacity-30" />
                  <p className="text-sm font-semibold text-theme-fg">No candidates found</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme-border bg-theme-raised/60">
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Candidate</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-theme-muted hidden md:table-cell">Score</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-theme-muted hidden sm:table-cell">Decision</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {filtered.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className={cn(
                          "hover:bg-theme-raised/50 transition-colors cursor-pointer",
                          selected?.id === c.id && "bg-theme-primary/5 border-l-2 border-theme-primary",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center text-[10px] font-bold text-theme-primary flex-shrink-0">
                              {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-theme-fg truncate">{c.name}</p>
                              <p className="text-[11px] text-theme-muted truncate">{c.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <ScoreBar score={c.score} />
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <DecisionBadge decision={c.decision} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); triggerScan(c.application_id); }}
                            className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all"
                          >
                            <RefreshCw size={13} className={c.status === "processing" ? "animate-spin" : ""} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-80 flex-shrink-0 sticky top-4 h-[calc(100vh-14rem)]">
              <DetailPanel
                candidate={selected}
                onClose={() => setSelected(null)}
                onDecision={handleDecision}
              />
            </div>
          )}
        </div>
      </div>

      {/* Post Job slide-over */}
      <SlideOver
        isOpen={postJobOpen}
        onClose={() => setPostJobOpen(false)}
        title="Post New Job"
        subtitle="Create a job cluster to start receiving and scoring applications"
      >
        <form onSubmit={handlePostJob} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cluster ID">
              <input
                required
                value={jobForm.cluster_id}
                onChange={(e) => setJobForm({ ...jobForm, cluster_id: e.target.value })}
                placeholder="e.g. NAMAAH-FRONTEND"
                className={inputCls}
              />
            </Field>
            <Field label="Company">
              <input
                required
                value={jobForm.company}
                onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Job title variants (comma-separated)">
            <input
              required
              value={jobForm.job_title_variants}
              onChange={(e) => setJobForm({ ...jobForm, job_title_variants: e.target.value })}
              placeholder="Frontend Developer, React Engineer, UI Lead"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Required experience (years)">
              <input
                type="number"
                min={0}
                value={jobForm.experience_requirements.years_required}
                onChange={(e) => setJobForm({
                  ...jobForm,
                  experience_requirements: {
                    ...jobForm.experience_requirements,
                    years_required: parseInt(e.target.value) || 0,
                  },
                })}
                className={inputCls}
              />
            </Field>
            <Field label="Required education">
              <input
                value={jobForm.education.required}
                onChange={(e) => setJobForm({ ...jobForm, education: { ...jobForm.education, required: e.target.value } })}
                placeholder="Bachelor's"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="AI matching keywords (comma-separated)">
            <textarea
              required
              value={jobForm.gemma_keywords}
              onChange={(e) => setJobForm({ ...jobForm, gemma_keywords: e.target.value })}
              placeholder="react, typescript, node.js, system design"
              rows={3}
              className={cn(inputCls, "resize-none")}
            />
          </Field>

          <div className="grid grid-cols-4 gap-3">
            {(["technical_skills", "domain_knowledge", "experience_years", "education"] as const).map((key) => (
              <Field key={key} label={`${key.replace(/_/g, " ")} %`}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={(jobForm.match_weights as any)[key]}
                  onChange={(e) => setJobForm({
                    ...jobForm,
                    match_weights: { ...jobForm.match_weights, [key]: parseInt(e.target.value) || 0 },
                  })}
                  className={inputCls}
                />
              </Field>
            ))}
          </div>
          <p className="text-[10px] text-theme-muted -mt-2">Match weights should add up to 100%.</p>

          <div className="pt-4 border-t border-theme-border">
            <button
              type="submit"
              disabled={savingJob}
              className="w-full py-2.5 rounded-lg bg-theme-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {savingJob ? "Posting…" : "Post Job"}
            </button>
          </div>
        </form>
      </SlideOver>
    </DashboardShell>
  );
}
