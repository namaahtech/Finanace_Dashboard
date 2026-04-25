"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import { cn } from "@/lib/utils";
import { GripHorizontal, Calendar, User, AlertCircle, CheckCircle2 } from "lucide-react";
import dayjs from "dayjs";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "COMPLETED";
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
  REVIEW: { label: "In Review", color: "bg-amber-500", bgLight: "bg-amber-100", textColor: "text-amber-700" },
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
    REVIEW: [],
    COMPLETED: [],
  });
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
          assignee:employees!assigned_to(id, name)
        `)
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Group by status
      const grouped: Record<string, Task[]> = {
        TODO: [],
        IN_PROGRESS: [],
        REVIEW: [],
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

      {/* Footer Info */}
      <div className="rounded-xl border border-theme-border/40 bg-theme-page/30 p-3">
        <p className="text-[10px] text-theme-muted">
          💡 Drag tasks between columns to update their status. Changes sync in real-time across all connected panels.
        </p>
      </div>
    </div>
  );
}
