"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import { cn } from "@/lib/utils";
import { GripHorizontal, Calendar, User, AlertCircle, CheckCircle2, X, Send, ShieldCheck, MessageSquare, ExternalLink } from "lucide-react";
import dayjs from "dayjs";
import { useAuth } from "@/components/layout/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED";
  submission_notes?: string;
  submission_url?: string;
  review_feedback?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  assignee?: { id: string; name: string };
  due_date?: string;
  estimated_hours?: number;
  spent_hours?: number;
}

interface KanbanProps {
  projectId: string;
  projectName: string;
  progress: number;
  onClose?: () => void;
}

const statusConfig = {
  TODO: { label: "To Do", color: "bg-slate-500", bgLight: "bg-slate-100", textColor: "text-slate-700" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-500", bgLight: "bg-blue-100", textColor: "text-blue-700" },
  SUBMITTED: { label: "Awaiting Review", color: "bg-amber-500", bgLight: "bg-amber-100", textColor: "text-amber-700" },
  COMPLETED: { label: "Completed", color: "bg-emerald-500", bgLight: "bg-emerald-100", textColor: "text-emerald-700" },
};

const priorityConfig = {
  Low: "text-slate-600",
  Medium: "text-amber-600",
  High: "text-orange-600",
  Critical: "text-red-600",
};

export function ProjectKanban({ projectId, projectName, progress, onClose }: KanbanProps) {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    TODO: [],
    IN_PROGRESS: [],
    SUBMITTED: [],
    COMPLETED: [],
  });
  const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const { user } = useAuth(); // Assume we have useAuth or similar
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          estimated_hours,
          spent_hours,
          submission_notes,
          submission_url,
          review_feedback,
          assignee:employees!assigned_to(id, name)
        `)
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Group by status
      const grouped: Record<string, Task[]> = {
        TODO: [],
        IN_PROGRESS: [],
        SUBMITTED: [],
        COMPLETED: [],
      };

      data?.forEach((task: any) => {
        grouped[task.status].push(task);
      });

      setTasks(grouped);
    } catch (err) {
      console.error("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`tasks:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [projectId, fetchTasks]);

  const handleDragStart = (task: Task, status: string) => {
    setDraggedTask(task);
    setDragSource(status);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStatus: string) => {
    if (!draggedTask || !dragSource || dragSource === targetStatus) return;

    try {
      // Update task status in API
      await axios.put(`/api/tasks/${draggedTask.id}/status`, {
        status: targetStatus,
      });

      // Update local state optimistically
      const updatedTasks = { ...tasks };
      updatedTasks[dragSource] = updatedTasks[dragSource].filter((t) => t.id !== draggedTask.id);
      updatedTasks[targetStatus as keyof typeof tasks] = [
        { ...draggedTask, status: targetStatus as any },
        ...updatedTasks[targetStatus as keyof typeof tasks],
      ];
      setTasks(updatedTasks);
    } catch (err) {
      console.error("Update task error:", err);
      fetchTasks(); // Revert on error
    } finally {
      setDraggedTask(null);
      setDragSource(null);
    }
  };

  const Column = ({ status, tasks: columnTasks }: { status: string; tasks: Task[] }) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const count = columnTasks.length;

    return (
      <div
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(status)}
        className="flex flex-col gap-0 rounded-2xl border border-theme-border bg-theme-page/50 overflow-hidden"
      >
        {/* Column Header */}
        <div className={cn("px-4 py-3 border-b border-theme-border", config.bgLight)}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", config.color)} />
              <span className="text-xs font-black text-theme-fg uppercase tracking-wide">{config.label}</span>
            </div>
            <span className={cn("text-xs font-bold px-2 py-1 rounded-full", config.bgLight, config.textColor)}>
              {count}
            </span>
          </div>
        </div>

        {/* Tasks Container */}
        <div className="flex-1 overflow-y-auto space-y-2 p-3 min-h-[300px]">
          {columnTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <AlertCircle size={20} className="text-theme-subtle/40" />
              <p className="text-xs text-theme-muted">No tasks</p>
            </div>
          ) : (
            columnTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(task, status)}
                className="group p-3 rounded-xl bg-theme-surface border border-theme-border hover:border-theme-primary/40 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
              >
                {/* Task Header */}
                <div className="flex items-start gap-2 mb-2">
                  <GripHorizontal size={14} className="text-theme-muted opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5" />
                  <h4 className="text-xs font-semibold text-theme-fg flex-1 leading-snug">{task.title}</h4>
                </div>

                {/* Priority Badge */}
                <div className="mb-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wide", priorityConfig[task.priority])}>
                    {task.priority}
                  </span>
                </div>

                {/* Task Meta */}
                <div className="space-y-1.5">
                  {task.assignee && (
                    <div className="flex items-center gap-1.5 text-[10px] text-theme-muted">
                      <User size={12} />
                      <span>{task.assignee.name}</span>
                    </div>
                  )}

                  {task.due_date && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Calendar size={12} />
                      <span className={dayjs(task.due_date).isBefore(dayjs()) ? "text-red-600" : "text-theme-muted"}>
                        {dayjs(task.due_date).format("MMM DD")}
                      </span>
                    </div>
                  )}

                  {task.estimated_hours && (
                    <div className="flex items-center gap-1.5 text-[10px] text-theme-muted">
                      <span>⏱️ {task.estimated_hours}h est.</span>
                      {task.spent_hours && <span className="text-sky-600">({task.spent_hours}h spent)</span>}
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-theme-border/50 flex flex-col gap-2">
                   {task.status === 'IN_PROGRESS' && task.assignee?.id === user?.id && (
                      <button 
                        onClick={() => setSubmittingTask(task)}
                        className="w-full text-[9px] font-black uppercase text-theme-primary hover:bg-theme-primary/10 py-1.5 rounded-lg border border-theme-primary/20 transition-all"
                      >
                        Submit for Review
                      </button>
                   )}
                   {task.status === 'SUBMITTED' && (user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'LEAD') && (
                      <button 
                        onClick={() => setReviewingTask(task)}
                        className="w-full text-[9px] font-black uppercase text-amber-600 hover:bg-amber-600/10 py-1.5 rounded-lg border border-amber-600/20 transition-all"
                      >
                        Audit Submission
                      </button>
                   )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-theme-raised animate-pulse rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-theme-raised animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-theme-fg">{projectName}</h2>
          <p className="text-xs text-theme-muted mt-1">Kanban Board</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-theme-muted uppercase tracking-wide font-bold">Overall Progress</p>
            <p className="text-2xl font-black text-theme-fg">{progress}%</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-theme-primary/20 to-transparent border-2 border-theme-primary/30 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs font-bold text-theme-muted">Progress</p>
              <p className="text-lg font-black text-theme-primary">{progress}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-theme-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-theme-primary to-theme-primary/70 transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-theme-muted text-right">
          {Object.values(tasks)
            .flat()
            .filter((t) => t.status === "COMPLETED").length} of {Object.values(tasks).flat().length} tasks completed
        </p>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([status, _]) => (
          <Column key={status} status={status} tasks={tasks[status as keyof typeof tasks] || []} />
        ))}
      </div>

      {/* Modals */}
      {submittingTask && (
        <SubmissionModal 
          task={submittingTask} 
          onClose={() => setSubmittingTask(null)} 
          onSuccess={fetchTasks} 
        />
      )}
      {reviewingTask && (
        <AuditModal 
          task={reviewingTask} 
          onClose={() => setReviewingTask(null)} 
          onSuccess={fetchTasks} 
        />
      )}
    </div>
  );
}

// ── Submission Modal (Employee Tier) ──────────────────────────────────
function SubmissionModal({ task, onClose, onSuccess }: { task: Task; onClose: () => void; onSuccess: () => void }) {
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({
          status: "SUBMITTED",
          submission_notes: notes,
          submission_url: url,
          updated_at: new Date().toISOString()
        })
        .eq("id", task.id);

      if (error) throw error;
      showToast("Work submitted for review", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg rounded-2xl bg-theme-surface shadow-2xl border border-theme-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-theme-border bg-theme-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-primary text-theme-surface shadow-sm">
              <Send size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-theme-fg uppercase tracking-tight">Submit Work</h3>
              <p className="text-[10px] text-theme-muted font-bold mt-0.5">{task.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-theme-muted hover:bg-theme-raised transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Submission Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you've accomplished..."
              className="w-full h-32 rounded-xl border border-theme-border bg-theme-raised/50 p-4 text-xs font-bold outline-none focus:border-theme-primary transition-all resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Resource URL (Optional)</label>
            <div className="relative">
               <ExternalLink size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
               <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Link to file, repository, or document"
                className="w-full h-10 rounded-xl border border-theme-border bg-theme-raised/50 pl-9 pr-4 text-xs font-bold outline-none focus:border-theme-primary transition-all"
              />
            </div>
          </div>
        </div>
        <div className="bg-theme-raised/50 flex justify-end gap-3 border-t border-theme-border px-6 py-4">
          <Button variant="secondary" size="sm" onClick={onClose} className="text-[10px] font-black uppercase">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} loading={submitting} className="text-[10px] font-black uppercase px-6">
            Dispatch to Lead
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Audit Modal (Lead Tier) ──────────────────────────────────
function AuditModal({ task, onClose, onSuccess }: { task: Task; onClose: () => void; onSuccess: () => void }) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();

  const handleAudit = async (status: "COMPLETED" | "IN_PROGRESS") => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({
          status,
          review_feedback: feedback,
          reviewer_id: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", task.id);

      if (error) throw error;
      showToast(status === 'COMPLETED' ? "Submission Approved" : "Submission Rejected", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || "Audit failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl rounded-2xl bg-theme-surface shadow-2xl border border-theme-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-theme-border bg-theme-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-theme-surface shadow-sm shadow-amber-500/20">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-theme-fg uppercase tracking-tight">Audit Submission</h3>
              <p className="text-[10px] text-theme-muted font-bold mt-0.5">{task.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-theme-muted hover:bg-theme-raised transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-xl border border-theme-border bg-theme-raised/40 p-5 space-y-4">
            <div className="flex items-start gap-3">
               <div className="h-8 w-8 rounded-full bg-theme-primary/10 flex items-center justify-center text-[10px] font-black text-theme-primary">
                 {task.assignee?.name?.charAt(0)}
               </div>
               <div className="flex-1">
                 <p className="text-xs font-black text-theme-fg">{task.assignee?.name}</p>
                 <p className="text-[10px] text-theme-muted font-bold uppercase tracking-widest mt-0.5">Contributor</p>
               </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-theme-muted">Submission Data</label>
              <div className="p-3 rounded-lg bg-theme-surface border border-theme-border text-xs leading-relaxed text-theme-fg font-medium italic">
                {task.submission_notes || "No notes provided."}
              </div>
            </div>
            {task.submission_url && (
               <a 
                href={task.submission_url} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 text-[10px] font-black text-theme-primary hover:underline"
               >
                 <ExternalLink size={12} /> View Submission Resource
               </a>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
               <MessageSquare size={12} className="text-theme-primary" /> Review Feedback
            </label>
            <textarea 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback for the contributor..."
              className="w-full h-24 rounded-xl border border-theme-border bg-theme-raised/50 p-4 text-xs font-bold outline-none focus:border-theme-primary transition-all resize-none"
            />
          </div>
        </div>

        <div className="bg-theme-raised/50 flex justify-end gap-3 border-t border-theme-border px-6 py-4">
          <Button variant="secondary" size="sm" onClick={() => handleAudit('IN_PROGRESS')} loading={submitting} className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-600">
            Request Revision
          </Button>
          <Button size="sm" onClick={() => handleAudit('COMPLETED')} loading={submitting} className="text-[10px] font-black uppercase px-6 bg-emerald-600 hover:bg-emerald-700">
            Approve & Close
          </Button>
        </div>
      </div>
    </div>
  );
}
