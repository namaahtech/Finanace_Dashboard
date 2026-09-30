"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  CheckCircle2, 
  FileText, 
  HelpCircle,
  Clock,
  Layout,
  MessageSquare,
  ArrowLeft,
  Award,
  Lock,
  Loader2,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/ButtonLegacy";
import { Badge } from "@/components/ui/BadgeLegacy";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LessonContent } from "@/components/lms/LessonContent";
import { useAuth, getDashboardForRole, type Role } from "@/components/layout/AuthProvider";

export default function CoursePlayerPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, permissions, loading: authLoading } = useAuth();

  // Permission guard — this page is a full-screen player so it doesn't use
  // DashboardShell. Manually enforce my_academy view permission.
  useEffect(() => {
    if (authLoading || !user || !permissions) return;
    // Accessible via either academy key; a MISSING or false permission both mean
    // no access (blocks direct-URL entry, not just a hidden link). Admin always allowed.
    const canView = user.role === "admin" || !!permissions["my_academy"]?.can_view || !!permissions["training_academy"]?.can_view;
    if (!canView) router.replace(getDashboardForRole(user.role as Role));
  }, [authLoading, user, permissions, router]);
  const [course, setCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [reminders, setReminders] = useState<string[]>([]);
  const [gateOk, setGateOk] = useState(false);

  const fetchCourseContent = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!id || !user?.id) return;

    try {
      // 1. Fetch Course with Modules and Lessons
      const { data: courseData, error: courseErr } = await supabase
        .from('lms_courses')
        .select(`
          *,
          lms_modules (
            *,
            lms_lessons (*)
          )
        `)
        .eq('id', id)
        .single();

      if (courseErr) throw courseErr;

      // 2. Fetch/Create Enrollment
      let { data: enrollData, error: enrollErr } = await supabase
        .from('lms_enrollments')
        .select('*')
        .eq('course_id', id)
        .eq('employee_id', user.id)
        .single();

      if (enrollErr && enrollErr.code === 'PGRST116') {
        // Create enrollment if not exists
        const { data: newEnroll, error: createErr } = await supabase
          .from('lms_enrollments')
          .insert({ course_id: id, employee_id: user.id })
          .select()
          .single();
        if (!createErr) enrollData = newEnroll;
      }

      setCourse(courseData);
      setEnrollment(enrollData);

      // Which lessons this learner has already completed (drives the checkmarks
      // + progress; the DB trigger recomputes % and auto-issues the certificate).
      const { data: prog } = await supabase
        .from('lms_lesson_progress')
        .select('lesson_id')
        .eq('employee_id', user.id);
      setCompletedIds(new Set((prog || []).map((p: any) => p.lesson_id)));

      // Which deadline reminders have already fired (for the mandatory-detail log).
      if (enrollData?.id) {
        const { data: rem } = await supabase
          .from('lms_reminders').select('kind').eq('enrollment_id', enrollData.id);
        setReminders((rem || []).map((r: any) => r.kind));
      }

      // Set first lesson as active if none set
      if (!activeLesson && courseData.lms_modules?.[0]?.lms_lessons?.[0]) {
        setActiveLesson(courseData.lms_modules[0].lms_lessons[0]);
      }
    } catch (err) {
      console.error("Course Player Error:", err);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, activeLesson]);

  useEffect(() => {
    fetchCourseContent();

    // Real-time progress sync
    const channel = supabase.channel(`course_${id}_sync`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lms_enrollments', filter: `id=eq.${enrollment?.id}` }, () => fetchCourseContent(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCourseContent, id, enrollment?.id]);

  // All lessons flattened in curriculum order — used to advance to the next one.
  const orderedLessons: any[] = (course?.lms_modules || [])
    .slice()
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .flatMap((m: any) => (m.lms_lessons || []).slice().sort((a: any, b: any) => a.order_index - b.order_index));

  const goTo = (delta: number) => {
    const idx = orderedLessons.findIndex((l) => l.id === activeLesson?.id);
    const next = orderedLessons[idx + delta];
    if (next) setActiveLesson(next);
  };

  async function markComplete() {
    if (!activeLesson || !user?.id || marking) return;
    setMarking(true);
    try {
      // Upsert lesson completion — the DB trigger recomputes enrollment progress
      // and auto-issues the certificate when the last lesson lands.
      const { error } = await supabase
        .from('lms_lesson_progress')
        .upsert({ lesson_id: activeLesson.id, employee_id: user.id }, { onConflict: 'lesson_id,employee_id' });
      if (error) throw error;
      setCompletedIds((prev) => new Set(prev).add(activeLesson.id));
      const idx = orderedLessons.findIndex((l) => l.id === activeLesson.id);
      const isLast = idx === orderedLessons.length - 1;
      if (!isLast) goTo(1);
      await fetchCourseContent(true); // refresh % (and certificate state) from the trigger
      toast.success(isLast ? "Course complete — certificate issued!" : "Lesson completed");
    } catch (e: any) {
      toast.error(e.message || "Couldn't mark complete");
    } finally {
      setMarking(false);
    }
  }

  const activeDone = activeLesson ? completedIds.has(activeLesson.id) : false;
  const activeIdx = orderedLessons.findIndex((l) => l.id === activeLesson?.id);
  const isComplete = (enrollment?.progress_percent || 0) >= 100;

  if (loading && !course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-theme-muted">
        <Loader2 className="animate-spin mr-2" size={24} /> Loading Course...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-theme-muted gap-4">
        <p>Course not found.</p>
        <Button onClick={() => router.push('/dashboard/academy')}>Back to Academy</Button>
      </div>
    );
  }

  const totalLessons = course.lms_modules?.reduce((acc: number, mod: any) => acc + (mod.lms_lessons?.length || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-theme-primary/30 flex flex-col">
      
      {/* Top Bar */}
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/academy")}
            className="h-8 w-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-bold truncate max-w-md">{course.title}</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest leading-none mb-1">Your Progress</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-theme-primary transition-all duration-1000" style={{ width: `${enrollment?.progress_percent || 0}%` }} />
              </div>
              <span className="text-[10px] font-bold text-zinc-500">{enrollment?.progress_percent || 0}%</span>
            </div>
          </div>
          <Button
            disabled={!isComplete}
            onClick={() => router.push('/dashboard/academy/certificates')}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[10px] uppercase px-4 h-9 disabled:opacity-50"
          >
            <Award size={13} className="mr-1.5" /> {isComplete ? "View Certificate" : "Certificate Locked"}
          </Button>
        </div>
      </header>

      {/* Mandatory / department deadline banner — countdown, due date, and the
          reminder log (what's fired vs still scheduled) so "mandatory" feels real. */}
      {enrollment?.due_date && !isComplete && (() => {
        const dLeft = Math.ceil((new Date(enrollment.due_date).getTime() - Date.now()) / 86_400_000);
        const overdue = dLeft < 0;
        const REM = [{ k: "due_7d", label: "7 days" }, { k: "due_3d", label: "3 days" }, { k: "due_1d", label: "1 day" }];
        return (
          <div className={cn("border-b px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2", overdue ? "bg-rose-500/10 border-rose-500/30" : "bg-amber-500/10 border-amber-500/30")}>
            <div className="flex items-center gap-2">
              <Clock size={15} className={overdue ? "text-rose-400" : "text-amber-400"} />
              <span className="text-xs font-bold text-white">
                {overdue ? `${Math.abs(dLeft)} day(s) overdue` : dLeft === 0 ? "Due today" : `${dLeft} day(s) left`}
              </span>
              <span className="text-[11px] text-zinc-400">· due {new Date(enrollment.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Reminders</span>
              {REM.map((r) => (
                <span key={r.k} className={cn("text-[10px] font-semibold", reminders.includes(r.k) ? "text-emerald-400" : "text-zinc-500")}>
                  {reminders.includes(r.k) ? "✓" : "○"} {r.label}
                </span>
              ))}
            </div>
            {overdue && <span className="text-[11px] text-rose-400 font-semibold">Escalates to your manager</span>}
          </div>
        );
      })()}

      <div className="flex-1 flex overflow-hidden">

        {/* Main Player Area */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 flex flex-col">
          {/* Lesson header */}
          <div className="max-w-3xl mx-auto pt-8 px-8 w-full space-y-3">
            <Badge className="bg-theme-primary/10 text-theme-primary border-theme-primary/20 uppercase">{activeLesson?.lesson_type || "lesson"}</Badge>
            <h2 className="text-3xl font-black">{activeLesson?.title}</h2>
            <div className="flex items-center gap-6 text-zinc-500 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2"><Clock size={14} /> {activeLesson?.duration_minutes || 0} Mins</span>
            </div>
          </div>

          {/* Enforced lesson content (video no-skip / read-all / quiz / assignment) */}
          {activeLesson && user?.id && (
            <div className="w-full">
              <LessonContent
                lesson={activeLesson}
                employeeId={user.id}
                alreadyDone={activeDone}
                onGateChange={setGateOk}
              />
            </div>
          )}

          {/* Interaction Buttons */}
          <div className="max-w-3xl mx-auto px-8 w-full">
            <div className="flex items-center justify-between gap-4 py-10 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => goTo(-1)}
                disabled={activeIdx <= 0}
                className="text-zinc-500 hover:text-white flex items-center gap-2 disabled:opacity-40"
              >
                <ChevronLeft size={18} /> Previous
              </Button>
              <div className="flex flex-col items-end gap-1">
                <Button
                  onClick={markComplete}
                  disabled={marking || activeDone || !gateOk}
                  className={cn(
                    "font-black px-8 py-6 rounded-2xl flex items-center gap-2",
                    activeDone ? "bg-emerald-500/20 text-emerald-400" : "bg-white text-black hover:bg-zinc-200",
                  )}
                >
                  {marking ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                    : activeDone ? <><CheckCircle2 size={18} /> Completed</>
                    : <>Mark complete &amp; continue <ChevronRight size={18} /></>}
                </Button>
                {!activeDone && !gateOk && (
                  <span className="text-[11px] text-zinc-500">Finish this {activeLesson?.lesson_type === "quiz" ? "quiz" : "lesson"} to continue</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Course Sidebar */}
        <aside className={cn(
          "w-80 border-l border-white/5 bg-zinc-950 flex flex-col transition-all duration-300 overflow-hidden",
          !sidebarOpen && "w-0"
        )}>
          <div className="p-6 border-b border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Course Curriculum</h3>
            <p className="text-[10px] text-zinc-600 font-bold">{totalLessons} Lessons • {course.lms_modules?.length || 0} Modules</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {course.lms_modules?.sort((a: any, b: any) => a.order_index - b.order_index).map((mod: any, midx: number) => (
              <div key={mod.id} className="border-b border-white/5">
                <div className="px-6 py-4 bg-zinc-900/30 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Module {midx + 1}: {mod.title}</span>
                  <ChevronDown size={12} className="text-zinc-600" />
                </div>
                <div className="py-2">
                  {mod.lms_lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((les: any) => (
                    <div 
                      key={les.id}
                      onClick={() => setActiveLesson(les)}
                      className={cn(
                        "px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer group relative",
                        les.id === activeLesson?.id && "bg-theme-primary/5"
                      )}
                    >
                      {les.id === activeLesson?.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-primary" />}
                      
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        completedIds.has(les.id) ? "bg-emerald-500/15 text-emerald-400"
                          : les.id === activeLesson?.id ? "bg-theme-primary/20 text-theme-primary shadow-lg shadow-theme-primary/10"
                          : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700"
                      )}>
                        {completedIds.has(les.id)
                          ? <CheckCircle2 size={14} />
                          : <Play size={14} fill={les.id === activeLesson?.id ? "currentColor" : "none"} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-bold truncate transition-colors",
                          les.id === activeLesson?.id ? "text-theme-primary" : "text-zinc-300 group-hover:text-white"
                        )}>
                          {les.title}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-bold mt-0.5">{les.duration_minutes} Mins</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-zinc-900/20">
            <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Award size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Graduation</p>
                <p className="text-[9px] text-zinc-500 leading-tight">Complete all modules to unlock certificate.</p>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
