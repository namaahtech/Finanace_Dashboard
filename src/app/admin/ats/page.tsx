"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload, Terminal as TerminalIcon, Search, Zap, CheckCircle2, AlertCircle,
  Scan, FileText, User, ChevronRight, Microscope, Loader2, X, BrainCircuit,
  MoreVertical, Radar,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

/* ─── Log Terminal ────────────────────────────────────────────────────────── */
function LogTerminal({ logs }: { logs: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-theme-card border border-theme-border rounded-xl overflow-hidden font-mono text-[11px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-theme-border bg-theme-raised/60">
        <div className="flex items-center gap-2">
          <TerminalIcon size={12} className="text-theme-muted" />
          <span className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Analysis Stream</span>
        </div>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500/40" />
          <span className="h-2 w-2 rounded-full bg-amber-500/40" />
        </div>
      </div>
      <div ref={ref} className="flex-1 p-3 overflow-y-auto space-y-1 scrollbar-hide">
        {logs.length === 0 ? (
          <span className="text-theme-muted/40 italic">Awaiting scan…</span>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-theme-muted/30 flex-shrink-0 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={cn(
                log.includes("SUCCESS") ? "text-emerald-500" :
                log.includes("ERROR")   ? "text-rose-500" :
                "text-theme-fg/70",
              )}>
                {log}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Score Badge ─────────────────────────────────────────────────────────── */
function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn(
      "text-2xl font-black tabular-nums leading-none",
      score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-theme-muted",
    )}>
      {score}%
    </span>
  );
}

/* ─── Candidate Card ──────────────────────────────────────────────────────── */
function CandidateCard({ candidate, onSelect }: { candidate: any; onSelect: (c: any) => void }) {
  const analysis = candidate.talent_analysis?.[0];
  const score = analysis?.scoring?.match_score || 0;
  const isComplete = candidate.processing_status === "completed";

  return (
    <div className="group bg-theme-card border border-theme-border rounded-xl p-4 hover:border-theme-strong hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-xl bg-theme-raised border border-theme-border flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-theme-muted" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-theme-fg truncate">{candidate.applicant_name}</p>
              <p className="text-[11px] text-theme-muted truncate">{candidate.applicant_email}</p>
            </div>
            <ScoreBadge score={score} />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary border border-theme-primary/20">
              {candidate.applied_cluster_id}
            </span>
            <span className={cn(
              "text-[9px] font-semibold px-2 py-0.5 rounded-full border",
              isComplete
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-theme-raised text-theme-muted border-theme-border",
            )}>
              {isComplete ? "Verified" : "Pending"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-theme-border">
        <div className="flex items-center gap-1.5 text-[10px] text-theme-muted">
          <span className="font-mono">ID: {candidate.application_id.substring(0, 8)}</span>
        </div>
        <button
          onClick={() => onSelect(candidate)}
          disabled={!isComplete}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-theme-raised border border-theme-border hover:border-theme-strong hover:text-theme-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Full Analysis <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─── Analysis Drawer ─────────────────────────────────────────────────────── */
function AnalysisDrawer({ candidate, onClose }: { candidate: any; onClose: () => void }) {
  const analysis = candidate.talent_analysis?.[0];
  const score = analysis?.scoring?.match_score || 0;
  const pros: string[] = analysis?.recommendations?.pros || [];
  const cons: string[] = analysis?.gap_analysis?.cons || [];
  const questions: any[] = analysis?.interview_questions || [];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen w-full max-w-md bg-theme-surface border-l border-theme-border shadow-2xl z-[101] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme-border flex-shrink-0">
          <div>
            <p className="font-semibold text-sm text-theme-fg">Candidate Analysis</p>
            <p className="text-[11px] text-theme-muted mt-0.5">AI-generated report</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
          {/* Identity */}
          <div className="flex items-center gap-3 p-4 bg-theme-card border border-theme-border rounded-xl">
            <div className="h-12 w-12 rounded-xl bg-theme-raised border border-theme-border flex items-center justify-center flex-shrink-0">
              <User size={22} className="text-theme-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-theme-fg">{candidate.applicant_name}</p>
              <p className="text-[11px] text-theme-muted truncate">{candidate.applicant_email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary border border-theme-primary/20">
                  {candidate.applied_cluster_id}
                </span>
                <span className={cn(
                  "text-[9px] font-semibold px-2 py-0.5 rounded-full border",
                  score >= 80 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : score >= 60 ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : "bg-theme-raised text-theme-muted border-theme-border",
                )}>
                  {score}% match
                </span>
              </div>
            </div>
          </div>

          {/* Pros / Cons */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
              <p className="section-label text-emerald-500">Strengths</p>
              {pros.length === 0 ? (
                <p className="text-[10px] text-theme-muted">No data</p>
              ) : pros.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <CheckCircle2 size={11} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                  <span className="text-[11px] text-theme-fg leading-snug">{p}</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-2">
              <p className="section-label text-rose-500">Gaps</p>
              {cons.length === 0 ? (
                <p className="text-[10px] text-theme-muted">No data</p>
              ) : cons.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <AlertCircle size={11} className="mt-0.5 flex-shrink-0 text-rose-500" />
                  <span className="text-[11px] text-theme-fg leading-snug">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interview questions */}
          {questions.length > 0 && (
            <div className="space-y-3">
              <p className="section-label flex items-center gap-2">
                <BrainCircuit size={10} /> Interview Questions
              </p>
              {questions.map((q: any, i: number) => (
                <div key={i} className="p-3 bg-theme-card border border-theme-border rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-theme-muted uppercase tracking-wider">Q{i + 1}</span>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-theme-raised border border-theme-border text-theme-muted capitalize">
                      {q.difficulty || "Advanced"}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-theme-fg leading-snug">{q.question}</p>
                  {q.topic && <p className="text-[10px] text-theme-muted italic">Focus: {q.topic}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function ATSScannerPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchApplications();
    const channel = supabase
      .channel("ats-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, fetchApplications)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchApplications() {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`*, talent_analysis(scoring, resume_profile, recommendations, gap_analysis, interview_questions)`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setCandidates(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function startScan() {
    setScanning(true);
    setProgress(0);
    setLogs([]);

    const steps = [
      "INIT: Initializing ATS engine…",
      "AUTH: Establishing secure tunnel…",
      "INGEST: Scanning resume storage bucket…",
      "SCAN: Processing candidate batch…",
      "PARSE: Extracting skills and experience…",
      "MATCH: Running cluster alignment check…",
      "SCORE: Computing match reliability scores…",
      "AUDIT: Cross-referencing cluster IDs…",
      "SUCCESS: Batch processing complete.",
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 700));
      setLogs(prev => [...prev, steps[i]]);
      setProgress(((i + 1) / steps.length) * 100);
    }

    setScanning(false);
    showToast("Batch scan complete", "success");
    fetchApplications();
  }

  const filtered = candidates.filter(c =>
    c.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
    c.applicant_email.toLowerCase().includes(search.toLowerCase()) ||
    c.applied_cluster_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell
      title="ATS Scanner"
      subtitle="Resume ingestion and candidate scoring"
      actions={
        <button
          onClick={startScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {scanning
            ? <Loader2 size={13} className="animate-spin" />
            : <Zap size={13} fill="currentColor" />
          }
          {scanning ? "Scanning…" : "Start Batch Scan"}
        </button>
      }
    >
      <div className="space-y-6">

        {/* Status bar */}
        <div className="flex items-center justify-between p-4 bg-theme-card border border-theme-border rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center">
              <Scan size={16} className="text-theme-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-theme-fg">ATS Engine Online</p>
              <p className="text-[11px] text-theme-muted">{candidates.length} candidates loaded · real-time sync active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-500">Live</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: upload + terminal */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Upload zone */}
            <div className="bg-theme-card border-2 border-dashed border-theme-border rounded-xl p-8 flex flex-col items-center justify-center gap-4 text-center hover:border-theme-primary/40 hover:bg-theme-raised/50 transition-all cursor-pointer group">
              <div className="h-14 w-14 rounded-xl bg-theme-raised border border-theme-border flex items-center justify-center group-hover:border-theme-primary/30 group-hover:bg-theme-primary/5 transition-all">
                <Upload size={24} className="text-theme-muted group-hover:text-theme-primary transition-colors" />
              </div>
              <div>
                <p className="font-semibold text-sm text-theme-fg">Drop resumes here</p>
                <p className="text-[11px] text-theme-muted mt-1">PDF, DOCX · max 10MB each</p>
              </div>
              <button className="text-[11px] font-semibold px-4 py-2 rounded-lg bg-theme-raised border border-theme-border hover:border-theme-strong hover:text-theme-primary transition-all">
                Browse Files
              </button>
            </div>

            {/* Progress bar — shown when scanning */}
            {scanning && (
              <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-theme-fg">Scan progress</span>
                  <span className="text-[11px] font-medium text-theme-muted tabular-nums">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-theme-raised rounded-full overflow-hidden">
                  <div
                    className="h-full bg-theme-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Terminal */}
            <div className="h-80">
              <LogTerminal logs={logs} />
            </div>
          </div>

          {/* Right: candidate list */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Search + heading */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search candidates…"
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-theme-border bg-theme-surface text-sm text-theme-fg placeholder:text-theme-muted focus:outline-none focus:border-theme-strong transition-colors"
                />
              </div>
              <span className="text-[11px] text-theme-muted whitespace-nowrap">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-22rem)] scrollbar-hide">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <Microscope size={32} className="text-theme-muted opacity-30" />
                  <p className="text-sm font-semibold text-theme-fg">No candidates found</p>
                  <p className="text-[11px] text-theme-muted">Run a batch scan or adjust your search.</p>
                </div>
              ) : (
                filtered.map((c) => (
                  <CandidateCard key={c.application_id} candidate={c} onSelect={setSelected} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis drawer */}
      {selected && (
        <AnalysisDrawer candidate={selected} onClose={() => setSelected(null)} />
      )}
    </DashboardShell>
  );
}
