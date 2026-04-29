"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatCurrency } from "@/lib/utils";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { supabase } from "@/lib/supabase";
import dayjs from "dayjs";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Briefcase,
  Activity,
  ArrowUpRight,
  UserCheck,
  UserX,
  Coffee
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  is_active: boolean;
  attendance_status?: 'present' | 'absent' | 'late' | 'break';
  clock_in?: string;
}

interface Project {
  id: string;
  name: string;
  progress: number;
  pending_tasks: number;
}

export default function LeadDashboard() {
  const { user } = useAuth();
  const { request } = useApi();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch Team Members and their attendance
      const { data: memberData } = await supabase
        .from('employees')
        .select(`id, name, designation, is_active, team_id`)
        .eq('team_id', (user as any).team_id);

      // Fetch today's attendance for these members
      const today = dayjs().format('YYYY-MM-DD');
      const { data: attendanceData } = await supabase
        .from('attendance_logs')
        .select('employee_id, status, clock_in')
        .eq('date', today);

      const formattedMembers = memberData?.map(m => {
        const att = attendanceData?.find(a => a.employee_id === m.id);
        return {
          ...m,
          attendance_status: att?.status as any || 'absent',
          clock_in: att?.clock_in
        };
      }) || [];

      setMembers(formattedMembers);

      // 2. Fetch Team Projects and pending tasks
      const { data: projectData } = await supabase
        .from('project_teams')
        .select(`project:projects(*)`)
        .eq('team_id', (user as any).team_id);

      // Fetch task stats for these projects
      const projIds = projectData?.map(p => (p.project as any).id) || [];
      const { data: taskData } = await supabase
        .from('project_tasks')
        .select('project_id, status')
        .in('project_id', projIds);

      const formattedProjects = projectData?.map(p => {
        const proj = p.project as any;
        const pTasks = taskData?.filter(t => t.project_id === proj.id) || [];
        return {
          id: proj.id,
          name: proj.name,
          progress: proj.progress || 0,
          pending_tasks: pTasks.filter(t => t.status === 'REVIEW').length
        };
      }) || [];

      setProjects(formattedProjects);
    } catch (err) {
      console.error("Load lead data error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    const channel = supabase.channel('lead_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const stats = [
    { label: "Team Size", value: members.length, icon: Users, color: "text-theme-fg", bg: "bg-theme-raised" },
    { label: "Present Today", value: members.filter(m => m.attendance_status === 'present').length, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Awaiting Review", value: projects.reduce((acc, p) => acc + p.pending_tasks, 0), icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Active Projects", value: projects.length, icon: Briefcase, color: "text-sky-500", bg: "bg-sky-500/10" },
  ];

  return (
    <DashboardShell
      title="Team Operations Hub"
      subtitle="Manage your team's attendance and verify project deliverables."
    >
      <div className="space-y-6">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="page-card flex items-center gap-4">
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", s.bg)}>
                <s.icon size={20} className={s.color} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">{s.label}</p>
                <p className="text-2xl font-black text-theme-fg">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Team Roster */}
          <div className="lg:col-span-2 page-card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-theme-muted" />
                <h3 className="text-sm font-black text-theme-fg uppercase tracking-tight">Team Attendance</h3>
              </div>
              <Badge variant="info" className="text-[10px]">Today, {dayjs().format('MMM DD')}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-theme-raised/50 text-[10px] font-black uppercase text-theme-muted tracking-widest">
                  <tr>
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Clock In</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-theme-raised/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-theme-raised flex items-center justify-center text-[10px] font-black">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-xs font-black text-theme-fg">{member.name}</p>
                            <p className="text-[10px] text-theme-muted">{member.designation}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={
                            member.attendance_status === 'present' ? 'success' : 
                            member.attendance_status === 'absent' ? 'danger' : 
                            'warning'
                          }
                          className="capitalize text-[10px]"
                        >
                          {member.attendance_status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-theme-muted">
                        {member.clock_in ? dayjs(`2000-01-01 ${member.clock_in}`).format('hh:mm A') : '--:--'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification Queue */}
          <div className="page-card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-theme-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-theme-muted" />
                <h3 className="text-sm font-black text-theme-fg uppercase tracking-tight">Review Queue</h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {projects.filter(p => p.pending_tasks > 0).length === 0 ? (
                <div className="py-12 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-xs font-bold text-theme-fg">Inbox Zero</p>
                  <p className="text-[10px] text-theme-muted">No deliverables awaiting review.</p>
                </div>
              ) : (
                projects.filter(p => p.pending_tasks > 0).map((project) => (
                  <div 
                    key={project.id} 
                    onClick={() => { setSelectedProjectId(project.id); setShowProjectModal(true); }}
                    className="p-4 rounded-xl border border-theme-border bg-theme-raised/50 hover:border-amber-500/50 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black text-theme-fg group-hover:text-amber-500 transition-colors">{project.name}</h4>
                      <Badge variant="warning" className="text-[9px] font-black">{project.pending_tasks} PENDING</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-theme-border overflow-hidden">
                        <div className="h-full bg-sky-500" style={{ width: `${project.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-theme-muted">{project.progress}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 bg-theme-raised/30 border-t border-theme-border">
              <Button className="w-full text-[10px] font-black uppercase py-4" variant="secondary">
                View All Projects <ArrowUpRight size={14} className="ml-2" />
              </Button>
            </div>
          </div>

        </div>

      </div>

      <ProjectModal 
        isOpen={showProjectModal} 
        onClose={() => {
          setShowProjectModal(false);
          setSelectedProjectId(null);
        }} 
        projects={[]} // Passed from higher level or fetched in modal
        initialProjectId={selectedProjectId || undefined}
      />
    </DashboardShell>
  );
}
