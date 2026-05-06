"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload, Terminal as TerminalIcon, Search, Zap, CheckCircle2, AlertCircle,
  Scan, FileText, User, ChevronRight, Microscope, Loader2, X, BrainCircuit,
  MoreVertical, Radar, Trash2, RefreshCw
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

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
/* ─── Helpers ────────────────────────────────────────────────────────────── */
const getTimestamp = () => {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'short' });
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `[${day} ${date} ${time}]`;
};

/* ─── Realtime Logic ─────────────────────────────────────────────────────── */
function useRecruitmentRealtime(onUpdate: () => void, onLog: (msg: string | string[]) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        async (payload: any) => {
          onUpdate();
          if (payload.new && payload.new.processing_status === 'completed') {
             onLog(`${getTimestamp()} [SYSTEM] Syncing final intelligence for ${payload.new.applicant_name}...`);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'talent_analysis' },
        async (payload: any) => {
          onUpdate();
          if (payload.new) {
            // Fetch application name for the log
            const { data: app } = await supabase.from('applications').select('applicant_name, applied_cluster_id').eq('application_id', payload.new.application_id).single();
            
            const metrics = payload.new.resume_profile?.metrics || {};
            const score = payload.new.scoring?.match_score || 0;
            const source = payload.new.application_id.startsWith("CAR-") ? "Career Portal" : "Manual Upload";
            const ts = getTimestamp();
            
            const box = [
              `${ts} ------------------------------------------------`,
              `${ts} [AUDIT_SUCCESS]`,
              `${ts} CANDIDATE : ${app?.applicant_name || 'Unknown'}`,
              `${ts} ROLE      : ${app?.applied_cluster_id || 'Unknown'}`,
              `${ts} SOURCE    : ${source}`,
              `${ts} AI MODEL  : ${metrics.model || 'gemma4:e4b'}`,
              `${ts} METRICS   : Tokens: ${metrics.prompt_tokens + metrics.completion_tokens || 0} | Score: ${score}%`,
              `${ts} ------------------------------------------------`
            ];
            onLog(box);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate, onLog]);
}

/* ─── Components ─────────────────────────────────────────────────────────── */
function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-end">
      <span className={cn(
        "text-2xl font-black tabular-nums leading-none",
        score >= 80 ? "text-emerald-500" 
        : score >= 50 ? "text-amber-500" 
        : score > 0 ? "text-rose-500"
        : "text-theme-muted",
      )}>
        {score}%
      </span>
      <span className="text-[9px] font-bold text-theme-muted mt-1 uppercase tracking-tighter">Match Score</span>
    </div>
  );
}

/* ─── Candidate Card ──────────────────────────────────────────────────────── */
function CandidateCard({
  candidate,
  onSelect,
  onDelete,
  onRescan,
  onCancelStuck,
  onDecision
}: {
  candidate: any;
  onSelect: (c: any) => void;
  onDelete: (id: string) => void;
  onRescan: (id: string) => void;
  onCancelStuck: (id: string) => void;
  onDecision: (id: string, decision: 'accepted' | 'rejected') => void;
}) {
  // Extract analysis from array or single object
  const analysisArr = candidate.talent_analysis;
  const analysis = Array.isArray(analysisArr) ? analysisArr[0] : analysisArr;
  
  const score = analysis?.scoring?.match_score || 0;
  const isComplete = candidate.processing_status === "completed";
  const isScanning = candidate.processing_status === "pending" || candidate.processing_status === "processing";
  const progressValue = candidate.processing_status === "pending" ? 20 : 75;

  return (
    <div className="group bg-theme-card border border-theme-border rounded-xl p-4 hover:border-theme-strong hover:shadow-sm transition-all relative overflow-hidden">
      {/* Scanning Overlay */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-theme-surface/95 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center"
          >
            <div className="relative mb-3 flex-shrink-0 scale-75 origin-center">
              <div className="h-12 w-12 rounded-full border-4 border-theme-primary/10 border-t-theme-primary animate-spin" />
              <Scan size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-theme-primary animate-pulse" />
            </div>
            
            <div className="w-full max-w-[100px] space-y-1.5 flex-shrink-0">
              <div className="flex items-center justify-between text-[9px] font-bold text-theme-primary tracking-tighter">
                <span>NEURAL SYNC</span>
                <span>{progressValue}%</span>
              </div>
              <div className="h-1 w-full bg-theme-primary/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressValue}%` }}
                  className="h-full bg-theme-primary"
                />
              </div>
            </div>

            <p className="text-[9px] font-black uppercase tracking-widest text-theme-primary mt-3 animate-pulse">Audit Active</p>
            <p className="text-[8px] text-theme-muted mt-1 leading-none">Syncing cognitive signals...</p>
            <button
              onClick={(e) => { e.stopPropagation(); onCancelStuck(candidate.application_id); }}
              className="mt-3 flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
            >
              <X size={9} /> Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div className="flex-shrink-0">
              {isComplete && score === 0 ? (
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-1.5">
                     <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <Loader2 size={12} className="animate-spin text-theme-muted" />
                   </div>
                   <span className="text-[9px] font-black text-theme-muted mt-1 uppercase tracking-tighter">Syncing Score</span>
                </div>
              ) : (
                <ScoreBadge score={score} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary border border-theme-primary/20">
              {candidate.applied_cluster_id}
            </span>
            <span className={cn(
              "text-[9px] font-semibold px-2 py-0.5 rounded-full border",
              candidate.application_id.startsWith("CAR-")
                ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                : "bg-blue-500/10 text-blue-500 border-blue-500/20",
            )}>
              {candidate.application_id.startsWith("CAR-") ? "Career Path" : "Manual"}
            </span>
            <span className={cn(
              "text-[9px] font-semibold px-2 py-0.5 rounded-full border",
              isComplete
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-theme-raised text-theme-muted border-theme-border",
            )}>
              {isComplete ? "Verified" : "Pending"}
            </span>

            {candidate.decision !== 'pending' && (
              <span className={cn(
                "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter",
                candidate.decision === 'accepted'
                  ? "bg-emerald-500 text-white border-emerald-600"
                  : "bg-rose-500 text-white border-rose-600",
              )}>
                {candidate.decision}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-theme-border">
        <div className="flex items-center gap-1.5 text-[10px] text-theme-muted">
          <span className="font-mono">ID: {candidate.application_id.substring(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && candidate.processing_status === 'completed' && (
            <div className="flex items-center gap-1.5 border-r border-theme-border pr-2 mr-1">
              <button 
                onClick={() => onDecision(candidate.application_id, 'accepted')}
                disabled={candidate.decision !== 'pending'}
                title={candidate.decision !== 'pending' ? "Decision already made" : "Accept & Send Selection Mail"}
                className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/10 disabled:hover:text-emerald-500"
              >
                <CheckCircle2 size={12} strokeWidth={2.5} /> ACCEPT
              </button>
              <button 
                onClick={() => onDecision(candidate.application_id, 'rejected')}
                disabled={candidate.decision !== 'pending'}
                title={candidate.decision !== 'pending' ? "Decision already made" : "Reject & Send Rejection Mail"}
                className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-rose-500/10 disabled:hover:text-rose-500"
              >
                <X size={12} strokeWidth={2.5} /> REJECT
              </button>
            </div>
          )}
          
          <button
            onClick={() => onRescan(candidate.application_id)}
            title="Rescan Resume"
            className="p-1.5 rounded-lg text-theme-muted hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => onDelete(candidate.application_id)}
            title="Delete Candidate"
            className="p-1.5 rounded-lg text-theme-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => onSelect(candidate)}
            disabled={!isComplete}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-theme-raised border border-theme-border hover:border-theme-strong hover:text-theme-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-2"
          >
            Full Analysis <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Analysis Drawer ─────────────────────────────────────────────────────── */
function AnalysisDrawer({ 
  candidateId, 
  allCandidates, 
  onClose, 
  onRescan 
}: { 
  candidateId: string | null; 
  allCandidates: any[]; 
  onClose: () => void; 
  onRescan: (id: string) => void 
}) {
  const candidate = allCandidates.find(c => c.application_id === candidateId);
  if (!candidate) return null;

  const analysisArr = candidate.talent_analysis;
  const analysis = Array.isArray(analysisArr) ? analysisArr[0] : analysisArr;
  
  const score = analysis?.scoring?.match_score || 0;
  const breakdown = analysis?.scoring?.breakdown || {};
  
  // Backward compatibility mapping
  const pros: string[] = analysis?.recommendations?.pros || [];
  const cons: string[] = analysis?.gap_analysis?.cons || [];
  const matchedSkills: string[] = (analysis?.recommendations?.matched_skills || []).filter((s: string) => s.toLowerCase() !== 'none');
  const missingSkills: string[] = (analysis?.gap_analysis?.missing_skills || []).filter((s: string) => s.toLowerCase() !== 'none');
  const questions: any[] = analysis?.interview_questions || [];
  const profile = analysis?.resume_profile || {};
  
  // Handle old structure vs new structure
  const summary = profile.summary || analysis?.gemma_raw_response?.summary || "No summary provided";
  const overview = profile.overview || summary;
  const education = profile.education || profile.education_match || "Education audit data pending.";
  const projects = profile.projects || "Project deep-dive pending.";
  const experience = profile.experience || "Experience tenure audit pending.";
  const achievements = profile.achievements || "Achievement quantification pending.";
  
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'details' | 'questions'>('overview');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity",
          candidateId ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: candidateId ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-screen w-full max-w-lg bg-theme-surface border-l border-theme-border shadow-2xl z-[101] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-theme-border flex-shrink-0 bg-theme-card">
          <div>
            <p className="font-bold text-base text-theme-fg uppercase tracking-tight">Intelligence Audit Report</p>
            <p className="text-[11px] text-theme-muted mt-0.5 font-mono uppercase tracking-widest">Gemma-4 Cognitive Output</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 py-2 border-b border-theme-border bg-theme-card gap-4">
          {[
            { id: 'overview', label: 'Overview', icon: Radar },
            { id: 'skills', label: 'Skill Matrix', icon: BrainCircuit },
            { id: 'details', label: 'Deep Dive', icon: FileText },
            { id: 'questions', label: 'Interview', icon: Zap },
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                activeTab === tab.id ? "text-theme-primary border-theme-primary" : "text-theme-muted border-transparent hover:text-theme-fg"
              )}
            >
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Identity Hub */}
              <div className="flex items-center gap-4 p-5 bg-theme-card border border-theme-border rounded-2xl shadow-sm">
                <div className="h-16 w-16 rounded-2xl bg-theme-raised border border-theme-border flex items-center justify-center flex-shrink-0">
                  <User size={32} className="text-theme-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xl text-theme-fg">{candidate.applicant_name}</p>
                  <p className="text-xs text-theme-muted truncate">{candidate.applicant_email}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <ScoreBadge score={score} />
                    <span className="text-[10px] font-black px-3 py-1 rounded-lg bg-theme-primary/10 text-theme-primary border border-theme-primary/20 uppercase tracking-tighter">
                      {analysis?.scoring?.decision || "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Breakdown Bars */}
              <div className="p-5 bg-theme-card border border-theme-border rounded-2xl space-y-4">
                <p className="section-label uppercase tracking-widest font-black text-[10px] text-theme-muted mb-4">Strategic Match Reliability</p>
                {[
                  { label: "Technical Skills", value: breakdown.skills || 0, color: "bg-indigo-500", weight: "40%" },
                  { label: "Experience", value: breakdown.experience || 0, color: "bg-blue-500", weight: "30%" },
                  { label: "Projects", value: breakdown.projects || 0, color: "bg-emerald-500", weight: "20%" },
                  { label: "Education", value: breakdown.education || 0, color: "bg-amber-500", weight: "10%" },
                ].map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-theme-fg">{item.label} <span className="text-[8px] text-theme-muted">({item.weight})</span></span>
                      <span className="text-theme-muted">{item.value}%</span>
                    </div>
                    <div className="h-1.5 bg-theme-raised rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        className={cn("h-full rounded-full", item.color)} 
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <p className="section-label text-theme-fg">Executive Summary</p>
                <p className="text-sm text-theme-fg leading-relaxed bg-theme-card p-4 rounded-xl border border-theme-border italic">
                  "{summary}"
                </p>
              </div>

              {/* Pros / Cons Highlights */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3">
                  <p className="section-label text-emerald-500 flex items-center gap-2"><CheckCircle2 size={12} /> Strengths</p>
                  <div className="space-y-2">
                    {pros.length > 0 ? pros.map((p, i) => (
                      <p key={i} className="text-[11px] text-theme-fg leading-snug">• {p}</p>
                    )) : <p className="text-[11px] text-theme-muted italic">No specific strengths listed.</p>}
                  </div>
                </div>
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-3">
                  <p className="section-label text-rose-500 flex items-center gap-2"><AlertCircle size={12} /> Gaps</p>
                  <div className="space-y-2">
                    {cons.length > 0 ? cons.map((c, i) => (
                      <p key={i} className="text-[11px] text-theme-fg leading-snug">• {c}</p>
                    )) : <p className="text-[11px] text-theme-muted italic">No significant gaps identified.</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'skills' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               <div className="space-y-4">
                  <p className="section-label flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500" /> Matched Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.length > 0 ? matchedSkills.map(s => (
                      <span key={s} className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-tight">{s}</span>
                    )) : <p className="text-xs text-theme-muted italic">No specific skill matches identified.</p>}
                  </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-theme-border">
                  <p className="section-label flex items-center gap-2"><AlertCircle size={12} className="text-rose-500" /> Missing Critical Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {missingSkills.length > 0 ? missingSkills.map(s => (
                      <span key={s} className="px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-[10px] font-bold uppercase tracking-tight">{s}</span>
                    )) : <p className="text-xs text-theme-muted italic">No critical skill gaps found.</p>}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'details' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              {[
                { label: "Professional Overview", value: overview, icon: User },
                { label: "Education & Academy", value: education, icon: Microscope },
                { label: "Projects & Portfolio", value: projects, icon: Zap },
                { label: "Work Experience", value: experience, icon: FileText },
                { label: "Impact & Achievements", value: achievements, icon: Radar },
              ].map((item) => (
                <div key={item.label} className="space-y-3">
                  <p className="section-label flex items-center gap-2"><item.icon size={12} /> {item.label}</p>
                  <div className="p-4 bg-theme-card border border-theme-border rounded-xl">
                    <p className="text-xs text-theme-fg leading-relaxed whitespace-pre-wrap">
                      {item.value || "No detailed data extracted for this section."}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'questions' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <p className="section-label flex items-center gap-2 text-theme-primary">
                <BrainCircuit size={14} /> AI-Generated Tricky Interview Questions
              </p>
              <p className="text-[10px] text-theme-muted uppercase tracking-widest bg-theme-primary/5 p-3 rounded-lg border border-theme-primary/10">
                These questions are specifically tailored by Gemma to probe weaknesses and verify complex claims in this resume.
              </p>
              <div className="space-y-4 mt-6">
                {questions.length > 0 ? questions.map((q: any, i: number) => (
                  <div key={i} className="p-5 bg-theme-card border border-theme-border rounded-2xl space-y-3 hover:border-theme-primary/30 transition-all group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest">TRICKY QUESTION {i + 1}</span>
                      <div className="h-6 w-6 rounded-full bg-theme-raised flex items-center justify-center text-theme-muted group-hover:bg-theme-primary group-hover:text-white transition-colors">
                        <Zap size={10} />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-theme-fg leading-snug">{q.question}</p>
                    <div className="pt-3 border-t border-theme-border">
                      <p className="text-[10px] text-theme-muted italic"><span className="font-bold text-theme-fg uppercase not-italic mr-2">Audit Rationale:</span> {q.reason}</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center space-y-3">
                    <Loader2 size={32} className="mx-auto text-theme-muted animate-spin" />
                    <p className="text-xs text-theme-muted">Generating intelligence questions...</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </motion.div>
    </>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function ATSScannerPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobClusters, setJobClusters] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { showToast } = useToast();

  const cancelScan = () => {
    abortRef.current?.abort();
  };

  useRecruitmentRealtime(
    fetchApplications,
    (msg) => {
      if (Array.isArray(msg)) {
        setLogs(prev => [...prev, ...msg]);
      } else {
        setLogs(prev => [...prev, msg]);
      }
    }
  );

  async function fetchRecentLogs() {
    try {
      const { data } = await supabase
        .from("talent_analysis")
        .select(`*, applications(applicant_name)`)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (data) {
        const history = data.map(item => {
          const metrics = item.resume_profile?.metrics || {};
          return `${getTimestamp()} [HISTORY] ${item.applications?.applicant_name}: ${item.scoring?.match_score}% Match | Tokens: ${metrics.prompt_tokens + metrics.completion_tokens || 'N/A'}`;
        });
        setLogs(history.reverse());
      }
    } catch (err) {}
  }

  useEffect(() => {
    fetchJobClusters();
    fetchApplications();
    fetchRecentLogs();
  }, []);

  async function fetchJobClusters() {
    try {
      const { data, error } = await supabase.from("job_clusters").select("*").eq("active", true);
      if (error) throw error;
      setJobClusters(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  const handleDecision = async (id: string, decision: 'accepted' | 'rejected') => {
    try {
      showToast(`${decision.toUpperCase()} - Processing automation...`, "info");
      
      const res = await fetch("/api/admin/recruitment/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: id, decision })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      showToast(`Candidate ${decision}. Email sent!`, "success");
      fetchApplications();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCluster) return;
    // Reset input so same file can be re-uploaded
    e.target.value = "";

    setScanning(true);
    setProgress(0);
    setLogs([]);

    const generatedAppId = `MAN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      setLogs(prev => [...prev,
        "INIT: Initializing ATS engine…",
        `INGEST: Reading file: ${file.name}…`,
        "OCR: Extracting resume text…",
      ]);
      setProgress(20);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("clusterId", selectedCluster);
      formData.append("appId", generatedAppId);

      setLogs(prev => [...prev, "UPLOAD: Transferring to secure storage…"]);
      setProgress(40);

      await fetchApplications();

      setLogs(prev => [...prev, "NLP: Gemma 4 running cognitive audit…"]);
      setProgress(60);

      const res = await fetch("/api/admin/ats/upload", {
        method: "POST",
        body: formData,
        signal: abort.signal,
      });

      setProgress(85);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload and AI processing failed");

      setLogs(prev => [
        ...prev,
        "SCORE: Match reliability computed.",
        `TEXT: ${data.rawTextLength || 0} chars extracted from resume.`,
        "SUCCESS: Full 360° resume analysis complete.",
        "DATA: Synchronizing intelligence reports…",
      ]);
      setProgress(100);

      await fetchApplications();
      setSelectedId(generatedAppId);
      showToast("Intelligence report generated", "success");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setLogs(prev => [...prev, "CANCELLED: Scan aborted by user."]);
        showToast("Scan cancelled", "info");
        await supabase.from("applications").delete().eq("application_id", generatedAppId);
        await fetchApplications();
      } else {
        setLogs(prev => [...prev, "ERROR: " + err.message]);
        showToast(err.message, "error");
        await supabase.from("applications").delete().eq("application_id", generatedAppId);
      }
    } finally {
      abortRef.current = null;
      setScanning(false);
      setTimeout(() => setProgress(0), 1500);
    }
  };

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

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      setLogs(prev => [...prev, "INIT: Initializing ATS engine…", "INGEST: Scanning for pending candidates…"]);
      setProgress(10);

      const { data: pending } = await supabase
        .from("applications")
        .select("application_id, applicant_name, raw_resume_text")
        .in("processing_status", ["pending", "failed"])
        .not("raw_resume_text", "eq", "");

      if (!pending || pending.length === 0) {
        setLogs(prev => [...prev, "INFO: No pending candidates with resume text found.", "SUCCESS: Queue is clear."]);
        setProgress(100);
        showToast("No pending candidates to process", "info");
        return;
      }

      setLogs(prev => [...prev, `QUEUE: ${pending.length} candidate(s) queued for AI processing…`]);

      for (let i = 0; i < pending.length; i++) {
        if (abort.signal.aborted) break;

        const app = pending[i];
        const pct = Math.round(((i + 1) / pending.length) * 90) + 10;
        setProgress(pct);
        setLogs(prev => [...prev, `NLP [${i + 1}/${pending.length}]: Processing ${app.applicant_name}…`]);

        const res = await fetch("/api/admin/recruitment/process-application", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: app.application_id }),
          signal: abort.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          setLogs(prev => [...prev, `ERROR [${app.applicant_name}]: ${data.error || "AI failed"}`]);
        } else {
          const score = data.analysis?.scoring?.match_score || 0;
          setLogs(prev => [...prev, `SUCCESS [${app.applicant_name}]: Score ${score}% — analysis stored.`]);
        }
      }

      if (abort.signal.aborted) {
        setLogs(prev => [...prev, "CANCELLED: Batch scan aborted by user."]);
        showToast("Scan cancelled", "info");
      } else {
        setProgress(100);
        setLogs(prev => [...prev, "DATA: Synchronizing intelligence reports…"]);
        showToast(`Batch scan complete — ${pending.length} candidate(s) processed`, "success");
      }

      await fetchApplications();
    } catch (err: any) {
      if (err.name === "AbortError") {
        setLogs(prev => [...prev, "CANCELLED: Scan aborted by user."]);
        showToast("Scan cancelled", "info");
        await fetchApplications();
      } else {
        setLogs(prev => [...prev, "ERROR: " + err.message]);
        showToast(err.message, "error");
      }
    } finally {
      abortRef.current = null;
      setScanning(false);
      setTimeout(() => setProgress(0), 1500);
    }
  }

  const handleCancelStuck = async (appId: string) => {
    try {
      await supabase.from("applications").update({ processing_status: "failed" }).eq("application_id", appId);
      await fetchApplications();
      showToast("Scan cancelled — hit Rescan to retry", "info");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Are you sure you want to delete this candidate?")) return;
    try {
      const { error } = await supabase.from("applications").delete().eq("application_id", appId);
      if (error) throw error;
      showToast("Candidate deleted", "success");
      fetchApplications();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleRescan = async (appId: string) => {
    try {
      showToast("Neural re-audit initiated…", "info");

      // Clear old analysis and mark as pending so the card shows the scanning overlay
      await supabase.from("talent_analysis").delete().eq("application_id", appId);
      await supabase.from("applications").update({ processing_status: "pending" }).eq("application_id", appId);
      await fetchApplications();

      // Call AI directly — no PM2 polling
      const res = await fetch("/api/admin/recruitment/process-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI rescan failed");

      await fetchApplications();
      setSelectedId(appId);
      showToast("Neural re-audit complete", "success");
    } catch (err: any) {
      showToast(err.message, "error");
      // Reset status back so user can retry
      await supabase.from("applications").update({ processing_status: "failed" }).eq("application_id", appId);
      await fetchApplications();
    }
  };

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
        <div className="flex items-center gap-2">
          {scanning && (
            <button
              onClick={cancelScan}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500 hover:text-white transition-all"
            >
              <X size={13} /> Cancel
            </button>
          )}
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
        </div>
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

            {/* Cluster Selection */}
            <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-3">
              <label className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider block">Target Job Cluster</label>
              <select
                value={selectedCluster}
                onChange={(e) => setSelectedCluster(e.target.value)}
                className="w-full bg-theme-raised border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-fg focus:outline-none focus:border-theme-primary transition-colors"
              >
                <option value="">-- Select a Job Cluster --</option>
                {jobClusters.map(c => (
                  <option key={c.cluster_id} value={c.cluster_id}>
                    {c.job_title_variants?.[0] || c.cluster_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload zone */}
            <div className={cn(
              "relative bg-theme-card border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 text-center transition-all group overflow-hidden",
              selectedCluster ? "border-theme-border hover:border-theme-primary/40 hover:bg-theme-raised/50 cursor-pointer" : "border-theme-border/50 opacity-50 cursor-not-allowed"
            )}>
              <div className={cn(
                "h-14 w-14 rounded-xl border flex items-center justify-center transition-all",
                selectedCluster ? "bg-theme-raised border-theme-border group-hover:border-theme-primary/30 group-hover:bg-theme-primary/5" : "bg-theme-raised/50 border-theme-border/50"
              )}>
                <Upload size={24} className={cn("transition-colors", selectedCluster ? "text-theme-muted group-hover:text-theme-primary" : "text-theme-muted/50")} />
              </div>
              <div>
                <p className="font-semibold text-sm text-theme-fg">
                  {selectedCluster ? "Drop resumes here" : "Select a cluster first"}
                </p>
                <p className="text-[11px] text-theme-muted mt-1">PDF, DOCX · max 10MB each</p>
              </div>
              <button disabled={!selectedCluster} className="text-[11px] font-semibold px-4 py-2 rounded-lg bg-theme-raised border border-theme-border hover:border-theme-strong hover:text-theme-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed relative z-10">
                Browse Files
              </button>
              {selectedCluster && (
                <input
                  type="file"
                  accept=".pdf,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  onChange={handleUpload}
                />
              )}
            </div>

            {/* Progress bar — shown when scanning */}
            {scanning && (
              <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-theme-fg">Scan progress</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-theme-muted tabular-nums">{Math.round(progress)}%</span>
                    <button
                      onClick={cancelScan}
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <X size={10} /> Stop
                    </button>
                  </div>
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
                  <CandidateCard
                    key={c.application_id}
                    candidate={c}
                    onSelect={(cand) => setSelectedId(cand.application_id)}
                    onDelete={handleDelete}
                    onRescan={handleRescan}
                    onCancelStuck={handleCancelStuck}
                    onDecision={handleDecision}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis drawer */}
      <AnimatePresence>
        {selectedId && (
          <AnalysisDrawer 
            key="analysis-drawer" 
            candidateId={selectedId} 
            allCandidates={candidates}
            onClose={() => setSelectedId(null)} 
            onRescan={handleRescan}
          />
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
