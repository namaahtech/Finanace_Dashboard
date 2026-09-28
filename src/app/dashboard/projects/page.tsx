"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { FolderKanban, ChevronRight, CalendarDays, ListChecks } from "lucide-react";

interface MyProject {
  id: string;
  name: string;
  description: string | null;
  progress: number;
  phase: string | null;
  dueDate: string | null;
  role: string;
  tasks: { total: number; completed: number; inProgress: number; todo: number; submitted: number };
}

// My Projects — the list route the sidebar links to (/dashboard/projects). Was
// missing (only /dashboard/projects/[id] existed), so the link 404'd. Lists the
// projects the signed-in employee is on, each opening its Kanban.
export default function MyProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { request } = useApi();
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await request<{ success: boolean; data: MyProject[] }>({
        url: `/api/projects/assigned?employeeId=${user.id}`,
      });
      if (res.success) setProjects(res.data || []);
    } catch { /* handled by useApi */ } finally {
      setLoading(false);
    }
  }, [user?.id, request]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderKanban size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">My Projects</h1>
            <p className="text-sm text-muted-foreground">Projects you&apos;re assigned to, directly or through your team.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
              <FolderKanban size={28} className="text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No projects yet</p>
              <p className="text-xs text-muted-foreground">You haven&apos;t been assigned to any projects. They&apos;ll appear here once you are.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => {
              const pct = Math.max(0, Math.min(100, Math.round(p.progress || 0)));
              return (
                <Card
                  key={p.id}
                  onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                  className="cursor-pointer transition-colors hover:border-primary/40"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                        {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                      </div>
                      <ChevronRight size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] capitalize">{p.role}</Badge>
                      {p.phase && <Badge variant="outline" className="text-[10px] capitalize">{p.phase}</Badge>}
                      {p.dueDate && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CalendarDays size={11} /> {formatDate(p.dueDate)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <ListChecks size={11} /> {p.tasks.completed}/{p.tasks.total} tasks
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-right text-[10px] text-muted-foreground">{pct}%</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
