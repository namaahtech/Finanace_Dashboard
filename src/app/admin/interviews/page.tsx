"use client";

import { useState, useEffect } from "react";
import {
  Video, Mic, Settings, Users, Activity, Zap, Clock, X, AlertCircle, Copy, Check,
  Sliders, Plus, Calendar, CheckCircle2, ChevronRight, FileText, User, Radar, BrainCircuit, Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Realtime Logic ─────────────────────────────────────────────────────── */
function useInterviewsRealtime(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('interviews-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => onUpdate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => onUpdate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'talent_analysis' }, () => onUpdate())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}

/* ─── Schedule Modal ──────────────────────────────────────────────────────── */
function ScheduleModal({ 
  candidate, 
  onClose, 
  onConfirm 
}: { 
  candidate: any; 
  onClose: () => void; 
  onConfirm: (date: string, time: string) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!date || !time) return;
    setLoading(true);
    await onConfirm(date, time);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-theme-border bg-theme-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-bold text-theme-fg">Schedule Interview</h3>
              <p className="text-xs text-theme-muted">{candidate?.applicant_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-fg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-theme-fg uppercase tracking-wider">Select Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-theme-raised border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-fg focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-theme-fg uppercase tracking-wider">Select Time</label>
            <input 
              type="time" 
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-theme-raised border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-fg focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
            />
          </div>
          
          <div className="pt-4 space-y-3">
            <button 
              disabled={!date || !time || loading}
              onClick={handleSubmit}
              className="w-full py-3 bg-theme-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-theme-primary/20"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
              Generate Link & Schedule
            </button>
            <p className="text-[10px] text-theme-muted text-center uppercase tracking-widest">Candidate will receive an automated email</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Score Badge ─────────────────────────────────────────────────────────── */
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

/* ─── Analysis Drawer ─────────────────────────────────────────────────────── */
function AnalysisDrawer({ 
  candidateId, 
  allCandidates, 
  onClose,
  onViewResume,
  onSchedule
}: { 
  candidateId: string | null; 
  allCandidates: any[]; 
  onClose: () => void;
  onViewResume: (path: string) => void;
  onSchedule: (id: string) => void;
}) {
  const candidate = allCandidates.find(c => c.application_id === candidateId);
  if (!candidate) return null;

  const analysisArr = candidate.talent_analysis;
  const analysis = Array.isArray(analysisArr) ? analysisArr[0] : analysisArr;
  
  const score = analysis?.scoring?.match_score || 0;
  const breakdown = analysis?.scoring?.breakdown || {};
  
  const pros: string[] = analysis?.recommendations?.pros || [];
  const cons: string[] = analysis?.gap_analysis?.cons || [];
  const matchedSkills: string[] = (analysis?.recommendations?.matched_skills || []).filter((s: string) => s.toLowerCase() !== 'none');
  const missingSkills: string[] = (analysis?.gap_analysis?.missing_skills || []).filter((s: string) => s.toLowerCase() !== 'none');
  const questions: any[] = analysis?.interview_questions || [];
  const profile = analysis?.resume_profile || {};
  
  const summary = profile.summary || "No summary provided";
  const overview = profile.overview || summary;
  const education = profile.education || "Education audit data pending.";
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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onSchedule(candidate.application_id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm"
            >
              <Video size={12} /> Schedule
            </button>
            <button 
              onClick={() => onViewResume(candidate.resume_file_path)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-theme-primary text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
            >
              <FileText size={12} /> Resume
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all">
              <X size={20} />
            </button>
          </div>
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
              <div className="flex items-center gap-4 p-5 bg-theme-card border border-theme-border rounded-2xl shadow-sm">
                <div className="h-16 w-16 rounded-2xl bg-theme-raised border border-theme-border flex items-center justify-center flex-shrink-0">
                  <User size={32} className="text-theme-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xl text-theme-fg">{candidate.applicant_name}</p>
                  <p className="text-xs text-theme-muted truncate">{candidate.applicant_email}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <ScoreBadge score={score} />
                  </div>
                </div>
              </div>

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

              <div className="space-y-2">
                <p className="section-label text-theme-fg">Executive Summary</p>
                <p className="text-sm text-theme-fg leading-relaxed bg-theme-card p-4 rounded-xl border border-theme-border italic">
                  "{summary}"
                </p>
              </div>

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
             <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="p-5 bg-theme-card border border-theme-border rounded-2xl">
                   <p className="section-label flex items-center gap-2 text-emerald-500 mb-4"><CheckCircle2 size={14} /> Core Competencies Identified</p>
                   <div className="flex flex-wrap gap-2">
                     {matchedSkills.length > 0 ? matchedSkills.map(s => (
                       <span key={s} className="px-3 py-1 bg-theme-primary/10 text-theme-primary border border-theme-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-tight">{s}</span>
                     )) : <p className="text-xs text-theme-muted italic">No specific skills detected.</p>}
                   </div>
                </div>

                <div className="p-5 bg-theme-card border border-theme-border rounded-2xl">
                   <p className="section-label flex items-center gap-2 text-rose-500 mb-4"><AlertCircle size={14} /> Missing Required Skills</p>
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
                { label: "Education & Academy", value: education, icon: BrainCircuit },
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

/* ─── Resume Preview Overlay ──────────────────────────────────────────────── */
function ResumePreview({ path, onClose }: { path: string | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (path) {
      const { data } = supabase.storage.from("resumes").getPublicUrl(path);
      setUrl(data.publicUrl);
    }
  }, [path]);

  if (!path || !url) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-10 bg-black/80 backdrop-blur-md">
      <div className="relative w-full h-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-theme-card border-b border-theme-border">
          <p className="text-sm font-bold text-theme-fg uppercase tracking-widest">Resume Document Preview</p>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all">
            <X size={24} />
          </button>
        </div>
        <iframe src={url} className="w-full flex-1" />
      </div>
    </div>
  );
}

/* ─── Video preview placeholder ──────────────────────────────────────────── */
function VideoPreview({ meetingLink, candidateName, interviewId }: { meetingLink?: string | null; candidateName?: string; interviewId?: string | null }) {
  return (
    <div className="relative h-full bg-theme-overlay rounded-xl overflow-hidden border border-theme-border group">
      {meetingLink && interviewId && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center z-20">
          <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-4">Host Room: {candidateName}</p>
          <a
            href={`/meet/${interviewId}?role=admin`}
            className="px-6 py-3 bg-emerald-500 text-black text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
          >
            <Video size={16} /> Join Video Call
          </a>
        </div>
      )}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface/80 backdrop-blur-sm border border-theme-border rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-semibold text-theme-muted">Live · Connected</span>
      </div>
      <div className="h-full flex items-center justify-center">
        <div className="h-24 w-24 rounded-full bg-theme-raised border border-theme-border flex items-center justify-center text-theme-muted">
          <Users size={40} strokeWidth={1.2} />
        </div>
      </div>
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-8">
        {[3, 6, 10, 14, 10, 6, 14, 10, 6, 3, 6, 10, 14, 8, 4].map((h, i) => (
          <div key={i} className="w-1 rounded-full bg-theme-primary/40" style={{ height: h }} />
        ))}
      </div>
      <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/20 to-transparent flex items-center justify-center gap-3">
        <button className="h-9 w-9 rounded-full bg-theme-surface/50 border border-theme-border flex items-center justify-center text-theme-muted hover:text-theme-fg transition-all">
          <Mic size={14} />
        </button>
        <button className="h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all">
          <X size={16} />
        </button>
        <button className="h-9 w-9 rounded-full bg-theme-surface/50 border border-theme-border flex items-center justify-center text-theme-muted hover:text-theme-fg transition-all">
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Session Card ────────────────────────────────────────────────────────── */
function SessionCard({ session, onSelect, onScheduleClick }: { session: any; onSelect: () => void; onScheduleClick: () => void }) {
  const analysis = session.talent_analysis?.[0] || session.talent_analysis;
  const score = analysis?.scoring?.match_score || 0;
  const interview = session.interviews?.[0];
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (interview?.meeting_link) {
      navigator.clipboard.writeText(interview.meeting_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      className="group bg-theme-card border border-theme-border hover:border-theme-strong rounded-xl p-4 transition-all hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-1.5 flex-shrink-0">
            <span className={cn(
              "h-2.5 w-2.5 rounded-full block",
              interview?.status === "scheduled"
                ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-theme-muted/40",
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-base text-theme-fg truncate">{session.applicant_name}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-theme-primary/10 text-theme-primary border border-theme-primary/20 uppercase">
                {score}% Match
              </span>
            </div>
            <p className="text-[11px] text-theme-muted mt-0.5 font-medium">{session.applied_cluster_id}</p>
            
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-theme-muted uppercase tracking-widest">Scheduled Time</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-theme-fg font-bold">
                    <Clock size={12} className="text-theme-primary" />
                    {interview ? (
                      new Date(interview.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    ) : (
                      <span className="text-rose-500 italic font-medium">Not Scheduled Yet</span>
                    )}
                  </div>
                </div>
                
                {interview?.meeting_link ? (
                  <a
                    href={`/meet/${interview.interview_id}?role=admin`}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10"
                  >
                    <Video size={12} /> Join Interview
                  </a>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onScheduleClick(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:opacity-90 transition-all shadow-lg shadow-theme-primary/10"
                  >
                    <Calendar size={12} /> Schedule Now
                  </button>
                )}
              </div>

              {/* Copy Link Section */}
              {interview?.meeting_link && (
                <div className="flex items-center gap-2 max-w-sm">
                   <div className="flex-1 px-3 py-1.5 bg-theme-raised border border-theme-border rounded-lg text-[10px] text-theme-muted truncate font-mono">
                     {interview.meeting_link}
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                     className="h-7 w-7 rounded-lg bg-theme-surface border border-theme-border flex items-center justify-center text-theme-fg hover:bg-theme-raised transition-all shrink-0"
                     title="Copy Meeting Link"
                   >
                     {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex -space-x-1.5">
            {["JD", "KP"].map((init, i) => (
              <div
                key={i}
                className="h-7 w-7 rounded-full border-2 border-theme-surface bg-theme-raised flex items-center justify-center text-[9px] font-bold text-theme-muted"
              >
                {init}
              </div>
            ))}
          </div>
          <button 
            onClick={onSelect}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-theme-surface border border-theme-border hover:border-theme-strong hover:text-theme-primary transition-all"
          >
            Audit Report <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Scorecard ───────────────────────────────────────────────────────────── */
function Scorecard({ metrics }: { metrics: { label: string; value: number; color: string }[] }) {
  return (
    <div className="bg-theme-card border border-theme-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-theme-muted" />
          <span className="text-sm font-semibold text-theme-fg">Evaluation Scorecard</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-theme-raised border border-theme-border text-theme-muted uppercase tracking-tighter">
          Intelligence Audio Active
        </span>
      </div>

      <div className="space-y-4">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-theme-muted">{m.label}</span>
              <span className="text-xs font-semibold text-theme-fg tabular-nums">{m.value}%</span>
            </div>
            <div className="h-1.5 bg-theme-raised rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", m.color)}
                style={{ width: `${m.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-5 flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-primary text-white text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-theme-primary/20">
        <CheckCircle2 size={13} /> Complete Final Audit
      </button>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function InterviewsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "archived">("upcoming");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [isSchedulingId, setIsSchedulingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`*, talent_analysis(*), interviews(*)`)
        .eq("decision", "accepted")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useInterviewsRealtime(fetchSessions);

  const handleSchedule = (id: string) => {
    setIsSchedulingId(id);
  };

  const submitSchedule = async (date: string, time: string) => {
    if (!isSchedulingId) return;
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      showToast("Generating secure meeting link...", "info");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required to schedule interviews.");

      const res = await fetch("/api/admin/recruitment/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          application_id: isSchedulingId, 
          scheduled_at: scheduledAt,
          interviewer_id: user.id 
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      showToast("Interview scheduled! Invitation sent.", "success");
      setIsSchedulingId(null);
      fetchSessions();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const metrics = [
    { label: "Technical Proficiency", value: 0, color: "bg-theme-primary" },
    { label: "Role Alignment",         value: 0, color: "bg-emerald-500" },
    { label: "Communication Flow",    value: 0, color: "bg-amber-500" },
  ];

  const TABS = ["upcoming", "completed", "archived"] as const;

  return (
    <DashboardShell
      title="Recruitment Interviews"
      subtitle="Autonomous Talent Assessment & Live Audits"
      actions={
        <button
          onClick={() => showToast("Interview scheduling coming soon", "info")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={13} /> Manual Schedule
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left: Sessions ─────────────────────────────────────────── */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Accepted Candidates", value: sessions.length, icon: <User size={14} />, color: "text-theme-primary" },
              { label: "Live Audits",         value: "0", icon: <Activity size={14} />, color: "text-emerald-500" },
              { label: "Total Recruited",     value: "0", icon: <CheckCircle2 size={14} />, color: "text-theme-muted" },
            ].map((s) => (
              <div key={s.label} className="bg-theme-card border border-theme-border rounded-xl p-3.5">
                <div className={cn("mb-2", s.color)}>{s.icon}</div>
                <p className="text-xl font-black text-theme-fg tabular-nums">{s.value}</p>
                <p className="text-[11px] text-theme-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-theme-raised rounded-lg p-0.5 w-fit">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all",
                  activeTab === tab
                    ? "bg-theme-surface text-theme-fg shadow-sm"
                    : "text-theme-muted hover:text-theme-fg",
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Session list */}
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-25rem)] scrollbar-hide">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin mx-auto text-theme-muted" />
                <p className="text-xs text-theme-muted mt-2">Syncing talent pool...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-20 text-center bg-theme-card border border-dashed border-theme-border rounded-2xl">
                 <Users size={32} className="mx-auto text-theme-muted opacity-20 mb-3" />
                 <p className="text-sm font-bold text-theme-fg">No Accepted Candidates</p>
                 <p className="text-xs text-theme-muted">Go to ATS Scanner to verify and accept talent.</p>
              </div>
            ) : (
              sessions.map((session) => (
                <SessionCard 
                  key={session.application_id} 
                  session={session} 
                  onSelect={() => setSelectedId(session.application_id)}
                  onScheduleClick={() => setIsSchedulingId(session.application_id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-theme-card border border-theme-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-theme-raised border border-theme-border flex items-center justify-center text-theme-muted">
                  <Video size={13} />
                </div>
                <span className="text-sm font-semibold text-theme-fg">Interview Room</span>
              </div>
            </div>
            <div className="h-64">
              {(() => {
                const focused = selectedId
                  ? sessions.find(s => s.application_id === selectedId)
                  : sessions.find(s => s.interviews?.[0]?.meeting_link);
                const iv = focused?.interviews?.[0];
                return (
                  <VideoPreview
                    meetingLink={iv?.meeting_link}
                    interviewId={iv?.interview_id}
                    candidateName={focused?.applicant_name}
                  />
                );
              })()}
            </div>
          </div>
          <Scorecard metrics={metrics} />
        </div>
      </div>

      {/* Analysis Drawer */}
      <AnimatePresence>
        {selectedId && (
          <AnalysisDrawer 
            key="analysis-drawer"
            candidateId={selectedId} 
            allCandidates={sessions} 
            onClose={() => setSelectedId(null)}
            onViewResume={(path) => setResumePath(path)}
            onSchedule={handleSchedule}
          />
        )}
      </AnimatePresence>

      {/* Resume Preview */}
      <AnimatePresence>
        {resumePath && (
          <ResumePreview 
            key="resume-preview"
            path={resumePath} 
            onClose={() => setResumePath(null)} 
          />
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      <AnimatePresence>
        {isSchedulingId && (
          <ScheduleModal 
            candidate={sessions.find(s => s.application_id === isSchedulingId)}
            onClose={() => setIsSchedulingId(null)}
            onConfirm={submitSchedule}
          />
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
