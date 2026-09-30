"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/layout/AuthProvider";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, ChevronRight, ShieldAlert, Building2, Sparkles } from "lucide-react";

// "My Learning" — the employee's assigned learning in strict priority order:
// Mandatory (red) → Department (amber) → Optional (neutral), with an urgency
// banner summarising anything time-sensitive. Reads the same enrollments/courses
// the admin board reads (one shared model, two views).
interface Enrollment {
  id: string;
  progress_percent: number;
  completed_at: string | null;
  due_date: string | null;
  assigned_via: string | null;
  course: { id: string; title: string; category: string | null; assignment_type: string | null } | null;
}

type Bucket = "mandatory" | "department" | "optional";

function bucketOf(e: Enrollment): Bucket {
  const t = e.course?.assignment_type;
  if (e.assigned_via === "mandatory" || t === "mandatory") return "mandatory";
  if (e.assigned_via === "department" || t === "department_required") return "department";
  return "optional";
}

function daysLeft(due: string | null): number | null {
  if (!due) return null;
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
}

const SECTION_META: Record<Bucket, { label: string; icon: any; tone: string; ring: string; chip: string }> = {
  mandatory:  { label: "Mandatory",  icon: ShieldAlert, tone: "text-rose-500",  ring: "border-rose-500/30",  chip: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  department: { label: "Department", icon: Building2,   tone: "text-amber-500", ring: "border-amber-500/30", chip: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  optional:   { label: "Optional",   icon: Sparkles,    tone: "text-theme-muted", ring: "border-theme-border", chip: "bg-theme-raised text-theme-muted border-theme-border" },
};

export function MyLearningBoard() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("lms_enrollments")
      .select("id, progress_percent, completed_at, due_date, assigned_via, course:course_id(id, title, category, assignment_type)")
      .eq("employee_id", user.id);
    setRows((data as any) || []);
    setLoaded(true);
  }, [user?.id]);

  useEffect(() => {
    load();
    if (!user?.id) return;
    const ch = supabase
      .channel("my_learning_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "lms_enrollments", filter: `employee_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, user?.id]);

  // Nothing assigned and nothing self-enrolled → don't clutter the catalog.
  if (!loaded || rows.length === 0) return null;

  const buckets: Record<Bucket, Enrollment[]> = { mandatory: [], department: [], optional: [] };
  for (const e of rows) buckets[bucketOf(e)].push(e);

  // Urgency: incomplete mandatory/department items due within 7 days or overdue.
  const urgent = rows.filter((e) => {
    if (e.completed_at || (e.progress_percent || 0) >= 100) return false;
    const b = bucketOf(e);
    if (b === "optional") return false;
    const d = daysLeft(e.due_date);
    return d !== null && d <= 7;
  });
  const overdue = urgent.filter((e) => (daysLeft(e.due_date) ?? 99) < 0).length;

  const order: Bucket[] = ["mandatory", "department", "optional"];

  return (
    <div className="space-y-4">
      {urgent.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 px-5 py-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
          <div>
            <p className="text-sm font-bold text-theme-fg">
              You have {urgent.length} course{urgent.length > 1 ? "s" : ""} due soon
              {overdue > 0 && <span className="text-rose-500"> · {overdue} overdue</span>}
            </p>
            <p className="text-xs text-theme-muted mt-0.5">Finish your required training before the deadline to stay compliant.</p>
          </div>
        </div>
      )}

      {order.map((b) => {
        const items = buckets[b];
        if (items.length === 0) return null;
        const meta = SECTION_META[b];
        const Icon = meta.icon;
        return (
          <div key={b} className={cn("page-card overflow-hidden p-0 border", meta.ring)}>
            <div className="flex items-center gap-2 border-b border-theme-border px-5 py-3">
              <Icon size={15} className={meta.tone} />
              <h3 className="text-sm font-bold text-theme-fg">{meta.label}</h3>
              <span className="text-[11px] text-theme-muted">({items.length})</span>
              {b === "mandatory" && <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-rose-500">Required</span>}
              {b === "optional" && <span className="ml-auto text-[10px] text-theme-muted">Certificate on completion</span>}
            </div>
            <div className="divide-y divide-theme-border">
              {items.map((e) => {
                const d = daysLeft(e.due_date);
                const done = !!e.completed_at || (e.progress_percent || 0) >= 100;
                return (
                  <button
                    key={e.id}
                    onClick={() => e.course && router.push(`/dashboard/academy/${e.course.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-theme-raised"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-theme-fg">{e.course?.title || "Course"}</p>
                        {done && <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-theme-raised">
                          <div className={cn("h-full rounded-full", done ? "bg-emerald-500" : "bg-theme-primary")} style={{ width: `${e.progress_percent || 0}%` }} />
                        </div>
                        <span className="text-[10px] text-theme-muted">{e.progress_percent || 0}%</span>
                      </div>
                    </div>
                    {!done && b !== "optional" && d !== null && (
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", d < 0 ? "bg-rose-500/15 text-rose-500 border-rose-500/30" : meta.chip)}>
                        <Clock size={10} className="mr-1 inline" />
                        {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : `${d}d left`}
                      </span>
                    )}
                    <ChevronRight size={16} className="shrink-0 text-theme-muted" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
