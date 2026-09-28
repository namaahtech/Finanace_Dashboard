"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, UploadCloud, Plus, Trash2, Video, FileText, BookOpen, HelpCircle, FileUp, Check,
} from "lucide-react";

type LessonType = "lesson" | "quiz" | "assignment";
interface QQ { id?: string; question: string; options: string[]; correct_index: number; explanation: string }

// Full lesson authoring — opens from the pencil in the course builder.
//  • lesson: video (embed/upload) | document (upload/URL) | reading (rich text),
//            with an optional no-skip / must-read enforcement flag.
//  • quiz:   inline question builder + passing score.
//  • assignment: instructions the learner must submit against.
export function LessonEditor({
  lessonId, lessonType, onClose, onSaved,
}: { lessonId: string; lessonType: LessonType; onClose: () => void; onSaved?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // shared
  const [duration, setDuration] = useState(5);
  // lesson
  const [contentKind, setContentKind] = useState<"video" | "document" | "reading">("video");
  const [videoUrl, setVideoUrl] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [reading, setReading] = useState("");
  const [enforce, setEnforce] = useState(true);
  // quiz / assignment
  const [passPercent, setPassPercent] = useState(70);
  const [questions, setQuestions] = useState<QQ[]>([]);
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    (async () => {
      const { data: les } = await supabase.from("lms_lessons").select("*").eq("id", lessonId).single();
      if (les) {
        setDuration(les.duration_minutes ?? 5);
        setContentKind((les.content_kind as any) || (les.attachment_url ? "document" : les.video_url ? "video" : "reading"));
        setVideoUrl(les.video_url || "");
        setAttachmentUrl(les.attachment_url || "");
        setReading(les.content || "");
        setInstructions(les.content || "");
        setEnforce(les.enforce_no_skip ?? true);
        setPassPercent(les.pass_percent ?? 70);
      }
      if (lessonType === "quiz") {
        const { data: qs } = await supabase.from("lms_quiz_questions").select("*").eq("lesson_id", lessonId).order("order_index");
        setQuestions((qs || []).map((q: any) => ({
          id: q.id, question: q.question, options: Array.isArray(q.options) && q.options.length ? q.options : ["", ""],
          correct_index: q.correct_index ?? 0, explanation: q.explanation || "",
        })));
      }
      setLoading(false);
    })();
  }, [lessonId, lessonType]);

  async function uploadFile(file: File, kind: "video" | "document") {
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${lessonId}/${kind}-${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("lms").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("lms").getPublicUrl(path);
      if (kind === "video") setVideoUrl(data.publicUrl);
      else setAttachmentUrl(data.publicUrl);
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed (is the 'lms' storage bucket created?)");
    } finally {
      setUploading(false);
    }
  }

  // ── Quiz helpers ────────────────────────────────────────────────────────────
  const addQ = () => setQuestions((q) => [...q, { question: "", options: ["", ""], correct_index: 0, explanation: "" }]);
  const delQ = (i: number) => setQuestions((q) => q.filter((_, x) => x !== i));
  const setQ = (i: number, patch: Partial<QQ>) => setQuestions((q) => q.map((x, xi) => xi === i ? { ...x, ...patch } : x));
  const setOpt = (qi: number, oi: number, v: string) => setQuestions((q) => q.map((x, xi) => xi === qi ? { ...x, options: x.options.map((o, ox) => ox === oi ? v : o) } : x));
  const addOpt = (qi: number) => setQuestions((q) => q.map((x, xi) => xi === qi ? { ...x, options: [...x.options, ""] } : x));
  const delOpt = (qi: number, oi: number) => setQuestions((q) => q.map((x, xi) => xi === qi ? { ...x, options: x.options.filter((_, ox) => ox !== oi), correct_index: Math.min(x.correct_index, x.options.length - 2) } : x));

  async function save() {
    // Validate quiz.
    if (lessonType === "quiz") {
      if (questions.length === 0) return toast.error("Add at least one question.");
      for (const [i, q] of questions.entries()) {
        if (!q.question.trim()) return toast.error(`Question ${i + 1} is empty.`);
        const opts = q.options.filter((o) => o.trim());
        if (opts.length < 2) return toast.error(`Question ${i + 1} needs at least 2 options.`);
      }
    }
    setSaving(true);
    try {
      const patch: any = { duration_minutes: duration };
      if (lessonType === "lesson") {
        patch.content_kind = contentKind;
        patch.video_url = contentKind === "video" ? videoUrl : null;
        patch.attachment_url = contentKind === "document" ? attachmentUrl : null;
        patch.content = contentKind === "reading" ? reading : null;
        patch.enforce_no_skip = enforce;
      } else if (lessonType === "assignment") {
        patch.content = instructions;
      } else if (lessonType === "quiz") {
        patch.pass_percent = passPercent;
      }
      const { error } = await supabase.from("lms_lessons").update(patch).eq("id", lessonId);
      if (error) throw error;

      if (lessonType === "quiz") {
        // Replace the question set (attempts reference the lesson, not questions).
        await supabase.from("lms_quiz_questions").delete().eq("lesson_id", lessonId);
        const rows = questions.map((q, i) => ({
          lesson_id: lessonId, question: q.question.trim(),
          options: q.options.filter((o) => o.trim()),
          correct_index: Math.min(q.correct_index, q.options.filter((o) => o.trim()).length - 1),
          explanation: q.explanation || null, order_index: i,
        }));
        if (rows.length) { const { error: qe } = await supabase.from("lms_quiz_questions").insert(rows); if (qe) throw qe; }
      }
      toast.success("Saved");
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const TypeIcon = lessonType === "quiz" ? HelpCircle : lessonType === "assignment" ? FileUp : Video;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize"><TypeIcon size={16} /> Edit {lessonType}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-4">
            {/* ── LESSON ─────────────────────────────────────────── */}
            {lessonType === "lesson" && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {([["video", Video, "Video"], ["document", FileText, "Document"], ["reading", BookOpen, "Reading"]] as const).map(([k, Icon, label]) => (
                    <button key={k} type="button" onClick={() => setContentKind(k)}
                      className={cn("flex flex-col items-center gap-1 rounded-xl border p-3 transition-all",
                        contentKind === k ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border hover:border-primary/40")}>
                      <Icon size={18} className={contentKind === k ? "text-primary" : "text-muted-foreground"} />
                      <span className="text-xs font-semibold">{label}</span>
                    </button>
                  ))}
                </div>

                {contentKind === "video" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Video</Label>
                    <div className="flex gap-2">
                      <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste a video URL (direct .mp4 for no-skip, or embed URL)" className="text-sm" />
                      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} Upload
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Uploaded (or direct .mp4/.webm) videos are played with no-skip enforcement. Embed links (YouTube/Vimeo) can&apos;t be seek-locked.</p>
                  </div>
                )}
                {contentKind === "document" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Document (PDF)</Label>
                    <div className="flex gap-2">
                      <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="Paste a PDF URL or upload" className="text-sm" />
                      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} Upload
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">The learner must scroll through the whole document before it can be marked complete.</p>
                  </div>
                )}
                {contentKind === "reading" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Reading content</Label>
                    <textarea value={reading} onChange={(e) => setReading(e.target.value)} rows={8}
                      placeholder="Write the reading material (HTML allowed)…"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y" />
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={enforce} onChange={(e) => setEnforce(e.target.checked)} />
                  Enforce no-skip / read-all before completion
                </label>

                <input ref={fileRef} type="file" hidden accept={contentKind === "video" ? "video/*" : "application/pdf,image/*"}
                  onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) uploadFile(f, contentKind === "video" ? "video" : "document"); }} />
              </>
            )}

            {/* ── QUIZ ───────────────────────────────────────────── */}
            {lessonType === "quiz" && (
              <>
                <div className="flex items-center gap-3">
                  <Label className="text-xs">Passing score</Label>
                  <Input type="number" min={0} max={100} value={passPercent} onChange={(e) => setPassPercent(parseInt(e.target.value) || 0)} className="w-24 text-sm" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="space-y-3">
                  {questions.map((q, qi) => (
                    <div key={qi} className="rounded-xl border border-border p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 text-xs font-bold text-muted-foreground">Q{qi + 1}</span>
                        <textarea value={q.question} onChange={(e) => setQ(qi, { question: e.target.value })} rows={2}
                          placeholder="Question text" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm resize-y" />
                        <button onClick={() => delQ(qi)} className="mt-1 text-rose-500 hover:text-rose-600"><Trash2 size={15} /></button>
                      </div>
                      <div className="space-y-1.5 pl-6">
                        {q.options.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button type="button" onClick={() => setQ(qi, { correct_index: oi })} title="Mark correct"
                              className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", q.correct_index === oi ? "border-emerald-500 bg-emerald-500 text-white" : "border-border")}>
                              {q.correct_index === oi && <Check size={12} />}
                            </button>
                            <Input value={o} onChange={(e) => setOpt(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="text-sm" />
                            {q.options.length > 2 && <button onClick={() => delOpt(qi, oi)} className="text-muted-foreground hover:text-rose-500"><Trash2 size={13} /></button>}
                          </div>
                        ))}
                        <button onClick={() => addOpt(qi)} className="text-[11px] font-semibold text-primary inline-flex items-center gap-1"><Plus size={11} /> Option</button>
                      </div>
                      <Input value={q.explanation} onChange={(e) => setQ(qi, { explanation: e.target.value })} placeholder="Explanation (optional, shown after answering)" className="text-xs ml-6 w-[calc(100%-1.5rem)]" />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addQ}><Plus size={14} className="mr-1.5" /> Add question</Button>
                </div>
              </>
            )}

            {/* ── ASSIGNMENT ─────────────────────────────────────── */}
            {lessonType === "assignment" && (
              <div className="space-y-1">
                <Label className="text-xs">Instructions</Label>
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6}
                  placeholder="What should the learner submit?" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y" />
                <p className="text-[11px] text-muted-foreground">Learners must upload a submission before this can be marked complete.</p>
              </div>
            )}

            <div className="flex items-center gap-3 border-t border-border pt-3">
              <Label className="text-xs">Duration (min)</Label>
              <Input type="number" min={1} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 1)} className="w-24 text-sm" />
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={save} disabled={saving || uploading}>
                  {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Check size={14} className="mr-1.5" />} Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
