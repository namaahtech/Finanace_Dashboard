"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Loader2, ShieldAlert, CheckCircle2, XCircle, UploadCloud, EyeOff, FileText } from "lucide-react";

// Renders the active lesson and ENFORCES completion rules, reporting readiness
// up via onGateChange:
//   • video (direct file): no forward-seek; must watch ≥95%
//   • reading: must scroll to the end
//   • document (PDF): must open + dwell before "mark as read"
//   • quiz: must score ≥ pass_percent; questions are copy/selection/right-click
//           locked and blurred when the tab loses focus (best-effort anti-capture)
//   • assignment: must upload a submission
const isDirectVideo = (url: string) =>
  /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url) || /\/storage\/v1\/object\/public\/lms\//.test(url);

export function LessonContent({
  lesson, employeeId, alreadyDone, onGateChange,
}: { lesson: any; employeeId: string; alreadyDone: boolean; onGateChange: (ok: boolean) => void }) {
  const type = lesson?.lesson_type as "lesson" | "quiz" | "assignment";
  const kind = lesson?.content_kind as "video" | "document" | "reading" | undefined;
  const enforce = lesson?.enforce_no_skip !== false;

  // Reset the gate whenever the lesson changes; already-completed lessons are open.
  const gate = useCallback((ok: boolean) => onGateChange(ok), [onGateChange]);
  useEffect(() => { gate(alreadyDone); /* eslint-disable-next-line */ }, [lesson?.id, alreadyDone]);

  if (!lesson) return null;
  if (type === "quiz") return <QuizRunner lesson={lesson} employeeId={employeeId} alreadyDone={alreadyDone} gate={gate} />;
  if (type === "assignment") return <AssignmentRunner lesson={lesson} employeeId={employeeId} alreadyDone={alreadyDone} gate={gate} />;
  if (kind === "video" || (!kind && lesson.video_url)) return <VideoRunner lesson={lesson} enforce={enforce} alreadyDone={alreadyDone} gate={gate} />;
  if (kind === "document" || (!kind && lesson.attachment_url)) return <DocumentRunner lesson={lesson} enforce={enforce} alreadyDone={alreadyDone} gate={gate} />;
  return <ReadingRunner lesson={lesson} enforce={enforce} alreadyDone={alreadyDone} gate={gate} />;
}

// ── Video: HTML5 no-skip, or embed fallback ────────────────────────────────────
function VideoRunner({ lesson, enforce, alreadyDone, gate }: any) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const maxRef = useRef(0);
  const [pct, setPct] = useState(0);
  const direct = lesson.video_url && isDirectVideo(lesson.video_url);

  useEffect(() => { maxRef.current = 0; setPct(0); if (!enforce || !direct || alreadyDone) gate(true); /* embed can't be enforced */ }, [lesson.id]); // eslint-disable-line

  if (!lesson.video_url) return <div className="p-8 text-center text-zinc-500">No video attached.</div>;
  if (!direct) {
    return (
      <div className="space-y-3">
        <div className="aspect-video w-full bg-black">
          <iframe src={lesson.video_url} className="h-full w-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
        <p className="px-4 text-[11px] text-zinc-500">Embedded video — watch fully before continuing.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="aspect-video w-full bg-black">
        <video
          ref={ref}
          src={lesson.video_url}
          controls
          controlsList="nodownload noplaybackrate"
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full"
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            maxRef.current = Math.max(maxRef.current, v.currentTime);
            if (v.duration) { const p = Math.min(100, Math.round((maxRef.current / v.duration) * 100)); setPct(p); if (p >= 95) gate(true); }
          }}
          onSeeking={(e) => {
            const v = e.currentTarget;
            // Block skipping ahead of what's been watched (small tolerance).
            if (enforce && v.currentTime > maxRef.current + 1.2) v.currentTime = maxRef.current;
          }}
        />
      </div>
      {enforce && (
        <div className="flex items-center gap-2 px-4 text-[11px] text-zinc-400">
          <ShieldAlert size={13} className="text-amber-400" /> No-skip enabled · watched {pct}% (need 95%)
        </div>
      )}
    </div>
  );
}

// ── Reading: must scroll to the end ────────────────────────────────────────────
function ReadingRunner({ lesson, enforce, alreadyDone, gate }: any) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!enforce || alreadyDone) { gate(true); return; }
    const el = ref.current; if (!el) return;
    // Short content that doesn't scroll counts as read.
    if (el.scrollHeight <= el.clientHeight + 8) gate(true);
  }, [lesson.id]); // eslint-disable-line
  return (
    <div
      ref={ref}
      onScroll={(e) => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) gate(true); }}
      className="prose prose-invert max-w-none max-h-[60vh] overflow-y-auto px-6 py-6 text-zinc-300 leading-relaxed"
    >
      {lesson.content
        ? <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
        : <p className="text-zinc-400">No reading content.</p>}
      {enforce && <p className="mt-6 text-[11px] text-zinc-500">Scroll to the end to continue.</p>}
    </div>
  );
}

// ── Document: open + dwell before "mark as read" ──────────────────────────────
function DocumentRunner({ lesson, enforce, alreadyDone, gate }: any) {
  const [canAck, setCanAck] = useState(!enforce || alreadyDone);
  const [ack, setAck] = useState(alreadyDone);
  useEffect(() => {
    setAck(alreadyDone); setCanAck(!enforce || alreadyDone);
    if (!enforce || alreadyDone) { gate(true); return; }
    const t = setTimeout(() => setCanAck(true), 6000); // minimum dwell
    return () => clearTimeout(t);
  }, [lesson.id]); // eslint-disable-line
  if (!lesson.attachment_url) return <div className="p-8 text-center text-zinc-500">No document attached.</div>;
  return (
    <div className="space-y-3">
      <div className="h-[62vh] w-full bg-zinc-900">
        <iframe src={lesson.attachment_url} className="h-full w-full border-none" title="document" />
      </div>
      <label className={cn("flex items-center gap-2 px-4 text-xs", canAck ? "text-zinc-300" : "text-zinc-600")}>
        <input type="checkbox" disabled={!canAck} checked={ack} onChange={(e) => { setAck(e.target.checked); gate(e.target.checked); }} />
        <FileText size={13} /> I have read the entire document {!canAck && "(please review it first…)"}
      </label>
    </div>
  );
}

// ── Assignment: require an uploaded submission ────────────────────────────────
function AssignmentRunner({ lesson, employeeId, alreadyDone, gate }: any) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(alreadyDone);
  useEffect(() => { setDone(alreadyDone); gate(alreadyDone); }, [lesson.id]); // eslint-disable-line
  async function upload(file: File) {
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { error } = await supabase.storage.from("lms").upload(`submissions/${lesson.id}/${employeeId}-${Date.now()}-${safe}`, file, { upsert: true });
      if (error) throw error;
      setDone(true); gate(true); toast.success("Submission uploaded");
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploading(false); }
  }
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
      <div className="prose prose-invert max-w-none text-zinc-300">
        {lesson.content ? <div dangerouslySetInnerHTML={{ __html: lesson.content }} /> : <p className="text-zinc-400">Complete the assignment described by your instructor.</p>}
      </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 py-8 text-sm text-zinc-400 hover:border-theme-primary/40">
        {uploading ? <Loader2 size={16} className="animate-spin" /> : done ? <><CheckCircle2 size={16} className="text-emerald-400" /> Submitted — you can re-upload to replace</> : <><UploadCloud size={16} /> Upload your submission</>}
        <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) upload(f); }} />
      </label>
    </div>
  );
}

// ── Quiz: pass-gate + anti-copy + best-effort anti-screenshot ─────────────────
function QuizRunner({ lesson, employeeId, alreadyDone, gate }: any) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(alreadyDone ? { score: 100, passed: true } : null);
  const [hidden, setHidden] = useState(false); // blur when tab loses focus
  const pass = lesson.pass_percent ?? 70;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("lms_quiz_questions").select("*").eq("lesson_id", lesson.id).order("order_index");
      setQuestions(data || []);
      setLoading(false);
    })();
    if (alreadyDone) gate(true);
  }, [lesson.id]); // eslint-disable-line

  // Best-effort anti-capture: blur the quiz when the window/tab is backgrounded
  // (the common moment a screenshot is taken), and block copy/selection/menu.
  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState !== "visible");
    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(false);
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
    };
  }, []);

  async function submit() {
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct_index) correct++; });
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= pass;
    setResult({ score, passed });
    try {
      await supabase.from("lms_quiz_attempts").insert({
        lesson_id: lesson.id, employee_id: employeeId, score_percent: score,
        answers: questions.map((_, i) => answers[i] ?? -1), passed,
      });
    } catch { /* attempt log best-effort */ }
    if (passed) { gate(true); toast.success(`Passed — ${score}%`); }
    else toast.error(`Scored ${score}%. Need ${pass}% to pass.`);
  }

  if (loading) return <div className="flex items-center gap-2 p-8 text-zinc-500"><Loader2 size={15} className="animate-spin" /> Loading quiz…</div>;
  if (questions.length === 0) return <div className="p-8 text-center text-zinc-500">This quiz has no questions yet.</div>;

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="relative mx-auto max-w-2xl px-6 py-8 select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* Anti-capture overlay while the tab is backgrounded */}
      {hidden && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/90 text-zinc-300">
          <EyeOff size={28} /> <p className="text-sm font-semibold">Quiz hidden</p>
          <p className="text-xs text-zinc-500">Return to this tab to continue.</p>
        </div>
      )}

      <div className={cn("space-y-6 transition", hidden && "blur-lg pointer-events-none")}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Quiz · pass mark {pass}%</p>
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400"><ShieldAlert size={11} /> Copy &amp; capture protected</span>
        </div>

        {questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
            <p className="mb-3 text-sm font-bold text-white">{i + 1}. {q.question}</p>
            <div className="space-y-2">
              {(q.options || []).map((opt: string, oi: number) => {
                const chosen = answers[i] === oi;
                const showCorrect = result && q.correct_index === oi;
                const showWrong = result && chosen && q.correct_index !== oi;
                return (
                  <button
                    key={oi}
                    disabled={!!result}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                    className={cn("flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-all",
                      showCorrect ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                        : showWrong ? "border-rose-500 bg-rose-500/10 text-rose-300"
                        : chosen ? "border-theme-primary bg-theme-primary/10 text-white"
                        : "border-white/10 text-zinc-300 hover:border-white/25")}
                  >
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]", chosen ? "border-theme-primary" : "border-white/20")}>{String.fromCharCode(65 + oi)}</span>
                    {opt}
                    {showCorrect && <CheckCircle2 size={15} className="ml-auto text-emerald-400" />}
                    {showWrong && <XCircle size={15} className="ml-auto text-rose-400" />}
                  </button>
                );
              })}
            </div>
            {result && q.explanation && <p className="mt-2 text-[11px] text-zinc-500">{q.explanation}</p>}
          </div>
        ))}

        {!result ? (
          <button onClick={submit} disabled={!allAnswered}
            className="w-full rounded-2xl bg-white py-3 text-sm font-black text-black hover:bg-zinc-200 disabled:opacity-40">
            {allAnswered ? "Submit Quiz" : "Answer all questions to submit"}
          </button>
        ) : result.passed ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm font-bold text-emerald-300">Passed — {result.score}%. You can continue.</div>
        ) : (
          <button onClick={() => { setResult(null); setAnswers({}); }} className="w-full rounded-2xl border border-white/15 py-3 text-sm font-bold text-zinc-200 hover:bg-white/5">
            Scored {result.score}% · Need {pass}% — Retry
          </button>
        )}
      </div>
    </div>
  );
}
