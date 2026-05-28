"use client";

import { useState, useEffect } from "react";
import {
  Video, Mic, Settings, Users, Activity, Zap, Clock, X, AlertCircle, Copy, Check,
  Sliders, Plus, Calendar, CheckCircle2, ChevronRight, FileText, User, Radar, BrainCircuit, Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

function initials(name?: string) {
  return (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

/* ─── Schedule Modal ──────────────────────────────────────────────────────── */
function ScheduleModal({
  candidate,
  open,
  onClose,
  onConfirm
}: {
  candidate: any;
  open: boolean;
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
            <Calendar size={18} />
          </div>
          <div className="flex-1 text-left">
            <DialogTitle className="text-sm font-semibold">Schedule Interview</DialogTitle>
            <DialogDescription className="text-xs">{candidate?.applicant_name}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground text-center">The candidate will receive an automated email invitation.</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" disabled={!date || !time || loading} onClick={handleSubmit}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
            Generate Link & Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Score Badge ─────────────────────────────────────────────────────────── */
function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-end">
      <span className={cn(
        "text-2xl font-bold tabular-nums leading-none",
        score >= 80 ? "text-emerald-500"
          : score >= 50 ? "text-amber-500"
            : score > 0 ? "text-rose-500"
              : "text-muted-foreground",
      )}>
        {score}%
      </span>
      <span className="text-[10px] text-muted-foreground mt-1">Match Score</span>
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

  const analysisArr = candidate?.talent_analysis;
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

  if (!candidate) return null;

  return (
    <Sheet open={!!candidateId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 gap-0">
        <SheetHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-border px-6 py-4">
          <div>
            <SheetTitle className="text-base">Intelligence Audit Report</SheetTitle>
            <SheetDescription className="text-xs">Gemma-4 Cognitive Output</SheetDescription>
          </div>
          <div className="flex items-center gap-2 mr-8">
            <Button type="button" size="sm" className="bg-emerald-500 hover:bg-emerald-500/90" onClick={() => onSchedule(candidate.application_id)}>
              <Video size={12} /> Schedule
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onViewResume(candidate.resume_file_path)}>
              <FileText size={12} /> Resume
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-6 mt-3 grid grid-cols-4">
            <TabsTrigger value="overview" className="text-xs gap-1.5"><Radar size={12} /> Overview</TabsTrigger>
            <TabsTrigger value="skills" className="text-xs gap-1.5"><BrainCircuit size={12} /> Skills</TabsTrigger>
            <TabsTrigger value="details" className="text-xs gap-1.5"><FileText size={12} /> Deep Dive</TabsTrigger>
            <TabsTrigger value="questions" className="text-xs gap-1.5"><Zap size={12} /> Interview</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="overview" className="space-y-6 mt-0">
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <Avatar className="h-16 w-16 rounded-xl">
                    <AvatarFallback className="rounded-xl"><User size={32} className="text-muted-foreground" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xl text-foreground">{candidate.applicant_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{candidate.applicant_email}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <ScoreBadge score={score} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground">Strategic Match Reliability</p>
                  {[
                    { label: "Technical Skills", value: breakdown.skills || 0, color: "bg-indigo-500", weight: "40%" },
                    { label: "Experience", value: breakdown.experience || 0, color: "bg-blue-500", weight: "30%" },
                    { label: "Projects", value: breakdown.projects || 0, color: "bg-emerald-500", weight: "20%" },
                    { label: "Education", value: breakdown.education || 0, color: "bg-amber-500", weight: "10%" },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">{item.label} <span className="text-[10px] text-muted-foreground">({item.weight})</span></span>
                        <span className="text-muted-foreground tabular-nums">{item.value}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          className={cn("h-full rounded-full", item.color)}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Executive Summary</p>
                <p className="text-sm text-foreground leading-relaxed bg-muted/40 p-4 rounded-lg border border-border italic">
                  &ldquo;{summary}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-2"><CheckCircle2 size={12} /> Strengths</p>
                  {pros.length > 0 ? pros.map((p, i) => (
                    <p key={i} className="text-xs text-foreground leading-snug">• {p}</p>
                  )) : <p className="text-xs text-muted-foreground italic">No specific strengths listed.</p>}
                </div>
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-2"><AlertCircle size={12} /> Gaps</p>
                  {cons.length > 0 ? cons.map((c, i) => (
                    <p key={i} className="text-xs text-foreground leading-snug">• {c}</p>
                  )) : <p className="text-xs text-muted-foreground italic">No significant gaps identified.</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="skills" className="space-y-6 mt-0">
              <Card>
                <CardContent className="p-5 space-y-3">
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-2"><CheckCircle2 size={14} /> Core Competencies Identified</p>
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.length > 0 ? matchedSkills.map(s => (
                      <Badge key={s} variant="outline" className="text-primary border-primary/20 bg-primary/10">{s}</Badge>
                    )) : <p className="text-xs text-muted-foreground italic">No specific skills detected.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-2"><AlertCircle size={14} /> Missing Required Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {missingSkills.length > 0 ? missingSkills.map(s => (
                      <Badge key={s} variant="outline" className="text-rose-600 border-rose-500/20 bg-rose-500/10">{s}</Badge>
                    )) : <p className="text-xs text-muted-foreground italic">No critical skill gaps found.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-6 mt-0">
              {[
                { label: "Professional Overview", value: overview, icon: User },
                { label: "Education & Academy", value: education, icon: BrainCircuit },
                { label: "Projects & Portfolio", value: projects, icon: Zap },
                { label: "Work Experience", value: experience, icon: FileText },
                { label: "Impact & Achievements", value: achievements, icon: Radar },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-2"><item.icon size={12} /> {item.label}</p>
                  <div className="p-4 bg-muted/40 border border-border rounded-lg">
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {item.value || "No detailed data extracted for this section."}
                    </p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="questions" className="space-y-4 mt-0">
              <p className="text-xs font-semibold text-primary flex items-center gap-2">
                <BrainCircuit size={14} /> AI-Generated Interview Questions
              </p>
              <p className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">
                These questions are tailored by Gemma to probe weaknesses and verify complex claims in this resume.
              </p>
              <div className="space-y-4">
                {questions.length > 0 ? questions.map((q: any, i: number) => (
                  <Card key={i} className="group transition-colors hover:border-primary/30">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary">Tricky Question {i + 1}</span>
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Zap size={10} />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
                      <Separator />
                      <p className="text-xs text-muted-foreground italic">
                        <span className="font-semibold text-foreground not-italic mr-2">Audit Rationale:</span> {q.reason}
                      </p>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="py-20 text-center space-y-3">
                    <Loader2 size={32} className="mx-auto text-muted-foreground animate-spin" />
                    <p className="text-xs text-muted-foreground">Generating intelligence questions…</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
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

  return (
    <Dialog open={!!path} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-5xl h-[85vh] !grid-rows-[auto_1fr] !grid p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-sm">Resume Document Preview</DialogTitle>
        </DialogHeader>
        {url && <iframe src={url} className="w-full h-full" />}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Live room presence hook ────────────────────────────────────────────── */
interface RoomParticipant {
  identity: string;
  name: string;
  joinedAt: number;
  isPublishing: boolean;
}

function useRoomPresence(roomId?: string | null) {
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setParticipants([]);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/livekit/participants?room=${encodeURIComponent(roomId)}`);
        const data = await res.json();
        if (!cancelled) setParticipants(data.participants || []);
      } catch {
        if (!cancelled) setParticipants([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    poll();
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [roomId]);

  return { participants, loading };
}

/* ─── Video preview placeholder ──────────────────────────────────────────── */
function VideoPreview({ meetingLink, candidateName, interviewId }: { meetingLink?: string | null; candidateName?: string; interviewId?: string | null }) {
  const { participants, loading } = useRoomPresence(meetingLink ? interviewId : null);
  const isLive = participants.length > 0;

  return (
    <div className="relative h-full bg-zinc-900 rounded-xl overflow-hidden border border-border group">
      {meetingLink && interviewId && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center z-20">
          <p className="text-xs font-medium text-white mb-4">Host Room: {candidateName}</p>
          <Button asChild size="sm" className="bg-emerald-500 text-black hover:bg-emerald-400">
            <a href={`/meet/${interviewId}?role=admin`}>
              <Video size={16} /> Join Video Call
            </a>
          </Button>
        </div>
      )}

      {/* Live presence indicator */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full">
        <span className={cn("h-1.5 w-1.5 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : "bg-white/30")} />
        <span className="text-[10px] font-medium text-white/80">
          {!meetingLink ? "No room yet" : isLive ? `${participants.length} in room` : "Room empty"}
        </span>
      </div>

      {/* Participant roster */}
      <div className="h-full flex flex-col items-center justify-center gap-4 px-4">
        {!meetingLink ? (
          <>
            <div className="h-24 w-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
              <Users size={40} strokeWidth={1.2} />
            </div>
            <p className="text-xs text-white/40 text-center">Schedule an interview to open a room.</p>
          </>
        ) : isLive ? (
          <div className="w-full max-w-xs space-y-2">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider text-center mb-3">In this room</p>
            {participants.map((p) => (
              <div key={p.identity} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[11px] font-semibold text-emerald-300">
                    {initials(p.name)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{p.name}</p>
                  <p className="text-[10px] text-white/40">{p.isPublishing ? "Camera / mic on" : "Connected"}</p>
                </div>
                <Mic size={12} className={p.isPublishing ? "text-emerald-400" : "text-white/30"} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="h-24 w-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
              {loading ? <Loader2 size={32} className="animate-spin" /> : <Users size={40} strokeWidth={1.2} />}
            </div>
            <p className="text-xs text-white/40 text-center">
              {loading ? "Checking room…" : "No one has joined yet."}
            </p>
          </>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-center gap-3">
        <button className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
          <Mic size={14} />
        </button>
        <button className="h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors">
          <X size={16} />
        </button>
        <button className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
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
    <Card className="group p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-1.5 flex-shrink-0">
            <span className={cn(
              "h-2.5 w-2.5 rounded-full block",
              interview?.status === "scheduled"
                ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-muted-foreground/40",
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-base text-foreground truncate">{session.applicant_name}</p>
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">{score}% Match</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{session.applied_cluster_id}</p>

            <div className="flex flex-col gap-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">Scheduled Time</span>
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                    <Clock size={12} className="text-primary" />
                    {interview ? (
                      new Date(interview.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    ) : (
                      <span className="text-rose-500 italic">Not scheduled yet</span>
                    )}
                  </div>
                </div>

                {interview?.meeting_link ? (
                  <Button asChild size="sm" className="bg-emerald-500 text-black hover:bg-emerald-400">
                    <a href={`/meet/${interview.interview_id}?role=admin`}>
                      <Video size={12} /> Join Interview
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); onScheduleClick(); }}>
                    <Calendar size={12} /> Schedule Now
                  </Button>
                )}
              </div>

              {interview?.meeting_link && (
                <div className="flex items-center gap-2 max-w-sm">
                  <div className="flex-1 px-3 py-1.5 bg-muted/50 border border-border rounded-md text-[10px] text-muted-foreground truncate tabular-nums">
                    {interview.meeting_link}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                    title="Copy meeting link"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex -space-x-1.5">
            {["JD", "KP"].map((init, i) => (
              <Avatar key={i} className="h-7 w-7 border-2 border-card">
                <AvatarFallback className="text-[9px]">{init}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onSelect}>
            Audit Report <ChevronRight size={11} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Scorecard ───────────────────────────────────────────────────────────── */
function Scorecard({ metrics }: { metrics: { label: string; value: number; color: string }[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Evaluation Scorecard</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">Intelligence Audio Active</Badge>
        </div>

        <div className="space-y-4">
          {metrics.map((m) => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                <span className="text-xs font-semibold text-foreground tabular-nums">{m.value}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", m.color)}
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full mt-5" size="sm">
          <CheckCircle2 size={13} /> Complete Final Audit
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function InterviewsPage() {
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
      toast.error(err.message);
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
      toast.info("Generating secure meeting link…");

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

      toast.success("Interview scheduled! Invitation sent.");
      setIsSchedulingId(null);
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const metrics = [
    { label: "Technical Proficiency", value: 0, color: "bg-primary" },
    { label: "Role Alignment", value: 0, color: "bg-emerald-500" },
    { label: "Communication Flow", value: 0, color: "bg-amber-500" },
  ];

  const stats = [
    { label: "Accepted Candidates", value: sessions.length, icon: <User size={14} />, color: "text-primary" },
    { label: "Live Audits", value: "0", icon: <Activity size={14} />, color: "text-emerald-500" },
    { label: "Total Recruited", value: "0", icon: <CheckCircle2 size={14} />, color: "text-muted-foreground" },
  ];

  return (
    <DashboardShell
      moduleKey="interviews"
      title="Recruitment Interviews"
      subtitle="Autonomous talent assessment & live audits"
      actions={
        <Button size="sm" onClick={() => toast.info("Interview scheduling coming soon")}>
          <Plus size={13} /> Manual Schedule
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Sessions */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-3.5">
                  <div className={cn("mb-2", s.color)}>{s.icon}</div>
                  <p className="text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="upcoming" className="text-xs capitalize">Upcoming</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs capitalize">Completed</TabsTrigger>
              <TabsTrigger value="archived" className="text-xs capitalize">Archived</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Session list */}
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-25rem)]">
            {loading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
            ) : sessions.length === 0 ? (
              <div className="py-20 text-center bg-card border border-dashed border-border rounded-xl">
                <Users size={32} className="mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm font-semibold text-foreground">No accepted candidates</p>
                <p className="text-xs text-muted-foreground">Go to ATS Scanner to verify and accept talent.</p>
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

        {/* Right: Room + Scorecard */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground">
                    <Video size={13} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Interview Room</span>
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
            </CardContent>
          </Card>
          <Scorecard metrics={metrics} />
        </div>
      </div>

      {/* Analysis Drawer */}
      <AnalysisDrawer
        candidateId={selectedId}
        allCandidates={sessions}
        onClose={() => setSelectedId(null)}
        onViewResume={(path) => setResumePath(path)}
        onSchedule={handleSchedule}
      />

      {/* Resume Preview */}
      <ResumePreview path={resumePath} onClose={() => setResumePath(null)} />

      {/* Schedule Modal */}
      <ScheduleModal
        candidate={sessions.find(s => s.application_id === isSchedulingId)}
        open={!!isSchedulingId}
        onClose={() => setIsSchedulingId(null)}
        onConfirm={submitSchedule}
      />
    </DashboardShell>
  );
}
