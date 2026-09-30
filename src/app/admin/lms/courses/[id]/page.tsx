"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/ButtonLegacy";
import { supabase } from "@/lib/supabase";
import { toast, Toaster } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Save, Plus, Trash2, Video, FileText, Loader2, Eye, ArrowLeft, BookOpen,
} from "lucide-react";

interface Lesson { id: string; title: string; video_url: string | null; content: string | null; order_index: number; }
interface Module { id: string; title: string; order_index: number; lms_lessons: Lesson[]; }

// Course editor — loads an existing course and edits its details, assignment
// model and curriculum with live DB writes (add/rename/delete apply immediately,
// so the admin board reflects changes in real time). Publish/unpublish here
// triggers the same data-layer auto-assignment as the builder.
export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("lms_courses")
      .select("*, lms_modules(*, lms_lessons(*))")
      .eq("id", id)
      .single();
    if (error || !data) { toast.error("Course not found"); setLoading(false); return; }
    const mods = (data.lms_modules || [])
      .slice()
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((m: any) => ({ ...m, lms_lessons: (m.lms_lessons || []).slice().sort((a: any, b: any) => a.order_index - b.order_index) }));
    setCourse(data);
    setModules(mods);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Details save (metadata + assignment + status) ──────────────────────────
  async function saveDetails(nextStatus?: "draft" | "published") {
    if (!course) return;
    if (!course.title?.trim()) { toast.error("Title is required"); return; }
    if (course.assignment_type === "department_required" && !course.target_department?.trim()) {
      toast.error("Pick a target department"); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("lms_courses").update({
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        assignment_type: course.assignment_type ?? "optional",
        target_department: course.assignment_type === "department_required" ? (course.target_department || null) : null,
        deadline_days: course.assignment_type === "optional" ? null : (course.deadline_days ? parseInt(String(course.deadline_days), 10) : null),
        status: nextStatus ?? course.status,
        updated_at: new Date().toISOString(),
      }).eq("id", course.id);
      if (error) throw error;
      if (nextStatus) setCourse({ ...course, status: nextStatus });
      toast.success(nextStatus === "published" ? "Published" : nextStatus === "draft" ? "Unpublished (draft)" : "Saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Curriculum: live DB writes ─────────────────────────────────────────────
  async function addModule() {
    const { data, error } = await supabase.from("lms_modules")
      .insert({ course_id: id, title: "New Module", order_index: modules.length }).select().single();
    if (error) return toast.error(error.message);
    setModules([...modules, { ...(data as any), lms_lessons: [] }]);
  }
  async function renameModule(mId: string, title: string) {
    await supabase.from("lms_modules").update({ title }).eq("id", mId);
  }
  async function deleteModule(mId: string) {
    if (!confirm("Delete this module and its lessons?")) return;
    const { error } = await supabase.from("lms_modules").delete().eq("id", mId);
    if (error) return toast.error(error.message);
    setModules(modules.filter((m) => m.id !== mId));
    toast.success("Module deleted");
  }
  async function addLesson(mId: string, type: "video" | "text") {
    const mod = modules.find((m) => m.id === mId);
    const { data, error } = await supabase.from("lms_lessons").insert({
      module_id: mId, title: "New Lesson", order_index: mod?.lms_lessons.length ?? 0,
      content: type === "text" ? "" : null, video_url: type === "video" ? "" : null,
    }).select().single();
    if (error) return toast.error(error.message);
    setModules(modules.map((m) => m.id === mId ? { ...m, lms_lessons: [...m.lms_lessons, data as any] } : m));
  }
  async function updateLesson(lId: string, patch: Partial<Lesson>) {
    await supabase.from("lms_lessons").update(patch).eq("id", lId);
  }
  async function deleteLesson(mId: string, lId: string) {
    const { error } = await supabase.from("lms_lessons").delete().eq("id", lId);
    if (error) return toast.error(error.message);
    setModules(modules.map((m) => m.id === mId ? { ...m, lms_lessons: m.lms_lessons.filter((l) => l.id !== lId) } : m));
  }

  if (loading) {
    return <DashboardShell moduleKey="lms_courses" title="Edit Course"><div className="flex items-center gap-2 text-sm text-theme-muted"><Loader2 className="animate-spin" size={16} /> Loading…</div></DashboardShell>;
  }
  if (!course) {
    return <DashboardShell moduleKey="lms_courses" title="Edit Course"><p className="text-sm text-theme-muted">Course not found.</p></DashboardShell>;
  }

  return (
    <DashboardShell
      moduleKey="lms_courses"
      title="Edit Course"
      subtitle={course.title}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => (window.location.href = "/admin/lms")}><ArrowLeft size={14} className="mr-1.5" /> Back</Button>
          <Button variant="outline" onClick={() => (window.location.href = `/dashboard/academy/${course.id}`)}><Eye size={14} className="mr-1.5" /> Preview</Button>
          {course.status === "published"
            ? <Button variant="outline" onClick={() => saveDetails("draft")} disabled={saving}>Unpublish</Button>
            : <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold" onClick={() => saveDetails("published")} disabled={saving}>Publish</Button>}
          <Button className="bg-theme-primary text-black font-bold" onClick={() => saveDetails()} disabled={saving}>
            {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />} Save
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Details */}
        <div className="page-card space-y-4">
          <div className="flex items-center gap-2"><BookOpen size={15} className="text-theme-muted" /><h3 className="text-sm font-bold text-theme-fg">Details</h3>
            <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", course.status === "published" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>{course.status}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-theme-muted tracking-widest block mb-2">Title</label>
              <input value={course.title || ""} onChange={(e) => setCourse({ ...course, title: e.target.value })}
                className="w-full bg-theme-page border border-theme-border rounded-xl h-11 px-4 text-sm font-bold text-theme-fg focus:outline-none focus:ring-1 focus:ring-theme-primary" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-theme-muted tracking-widest block mb-2">Category</label>
              <Select value={course.category || "Engineering"} onValueChange={(v) => setCourse({ ...course, category: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{["Engineering", "Sales", "Marketing", "Compliance", "Design"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-theme-muted tracking-widest block mb-2">Level</label>
              <Select value={course.level || "beginner"} onValueChange={(v) => setCourse({ ...course, level: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{["beginner", "intermediate", "advanced"].map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-theme-muted tracking-widest block mb-2">Description</label>
              <textarea value={course.description || ""} onChange={(e) => setCourse({ ...course, description: e.target.value })}
                className="w-full bg-theme-page border border-theme-border rounded-xl p-4 text-sm text-theme-fg focus:outline-none focus:ring-1 focus:ring-theme-primary h-24 resize-none" />
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="page-card space-y-4">
          <h3 className="text-sm font-bold text-theme-fg">Assignment</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-[10px] font-black uppercase text-theme-muted tracking-widest block mb-2">Type</label>
              <Select value={course.assignment_type || "optional"} onValueChange={(v) => setCourse({ ...course, assignment_type: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="optional">Optional</SelectItem>
                  <SelectItem value="mandatory">Mandatory (everyone)</SelectItem>
                  <SelectItem value="department_required">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {course.assignment_type === "department_required" && (
              <div>
                <label className="text-[10px] font-black uppercase text-theme-muted tracking-widest block mb-2">Target Department</label>
                <input value={course.target_department || ""} onChange={(e) => setCourse({ ...course, target_department: e.target.value })}
                  placeholder="e.g. Systems & Engineering"
                  className="w-full bg-theme-page border border-theme-border rounded-xl h-11 px-4 text-sm text-theme-fg focus:outline-none focus:ring-1 focus:ring-theme-primary" />
              </div>
            )}
            {course.assignment_type !== "optional" && (
              <div>
                <label className="text-[10px] font-black uppercase text-theme-muted tracking-widest block mb-2">Deadline (days)</label>
                <input type="number" min={1} value={course.deadline_days ?? ""} onChange={(e) => setCourse({ ...course, deadline_days: e.target.value })}
                  placeholder="e.g. 14"
                  className="w-full bg-theme-page border border-theme-border rounded-xl h-11 px-4 text-sm text-theme-fg focus:outline-none focus:ring-1 focus:ring-theme-primary" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-theme-muted">Publishing (or changing type) re-runs auto-assignment at the data layer. Save details to apply.</p>
        </div>

        {/* Curriculum — live edits */}
        <div className="page-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-theme-fg">Curriculum</h3>
            <Button variant="outline" size="sm" onClick={addModule}><Plus size={13} className="mr-1.5" /> Add Module</Button>
          </div>
          {modules.length === 0 && <p className="text-xs text-theme-muted">No modules yet. Add one to start building.</p>}
          <div className="space-y-3">
            {modules.map((m, mi) => (
              <div key={m.id} className="rounded-xl border border-theme-border bg-theme-raised p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-black uppercase text-theme-muted">Module {mi + 1}</span>
                  <input defaultValue={m.title} onBlur={(e) => renameModule(m.id, e.target.value)}
                    className="flex-1 bg-transparent text-sm font-bold text-theme-fg focus:outline-none border-b border-transparent focus:border-theme-primary" />
                  <button onClick={() => deleteModule(m.id)} className="text-rose-500 hover:text-rose-600"><Trash2 size={15} /></button>
                </div>
                <div className="space-y-2 pl-4">
                  {m.lms_lessons.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 rounded-lg border border-theme-border/60 bg-theme-page px-3 py-2">
                      {l.video_url !== null ? <Video size={13} className="text-sky-500 shrink-0" /> : <FileText size={13} className="text-amber-500 shrink-0" />}
                      <input defaultValue={l.title} onBlur={(e) => updateLesson(l.id, { title: e.target.value })}
                        className="flex-1 bg-transparent text-xs font-medium text-theme-fg focus:outline-none" />
                      <button onClick={() => deleteLesson(m.id, l.id)} className="text-theme-muted hover:text-rose-500"><Trash2 size={13} /></button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => addLesson(m.id, "video")} className="text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:text-theme-primary inline-flex items-center gap-1"><Plus size={11} /> Video</button>
                    <button onClick={() => addLesson(m.id, "text")} className="text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:text-theme-primary inline-flex items-center gap-1"><Plus size={11} /> Reading</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </DashboardShell>
  );
}
