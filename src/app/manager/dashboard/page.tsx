"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatCurrency } from "@/lib/utils";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { supabase } from "@/lib/supabase";
import dayjs from "dayjs";
import {
  Building2, PieChart, BarChart3, ShieldCheck, TrendingUp, Users, Target, Zap, LayoutGrid, Filter, 
  CalendarDays, ClipboardList, Search, Clock, ArrowRight, UserCheck, AlertCircle
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DeptStats {
  totalEmployees: number;
  activeTeams: number;
  overallAttendance: number;
  openTasks: number;
}

interface TeamPerf {
  name: string;
  attendance: number;
  productivity: number;
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "teams" | "tasks">("overview");
  const [stats, setStats] = useState<DeptStats>({ totalEmployees: 0, activeTeams: 0, overallAttendance: 0, openTasks: 0 });
  const [teamPerf, setTeamPerf] = useState<TeamPerf[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detailed Data
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const loadDeptData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Get Department ID for this Manager
      let activeDept: any = null;
      
      // 1. Try to find department by Manager ID
      const { data: deptData } = await supabase
        .from('teams')
        .select('id, name')
        .eq('type', 'department')
        .eq('head_id', user.id)
        .maybeSingle();

      activeDept = deptData;

      // 2. Fallback: Find by department name if direct ID link is missing
      if (!activeDept && user.department) {
        const { data: nameDept } = await supabase
          .from('teams')
          .select('id, name')
          .eq('type', 'department')
          .eq('name', user.department)
          .maybeSingle();
        activeDept = nameDept;
      }

      if (!activeDept) {
        setLoading(false);
        return;
      }

      // 3. Fetch Teams and Employees in this department
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, member_count, head_id, lead_id')
        .eq('department_id', activeDept.id);
      
      setTeams(teamsData || []);

      const teamIds = teamsData?.map(t => t.id) || [];
      const { data: empData } = await supabase
        .from('employees')
        .select('*, teams(name)')
        .in('team_id', teamIds);
      
      setEmployees(empData || []);

      // 3. Fetch Attendance for today
      const { data: attData } = await supabase
        .from('attendance_logs')
        .select('*, employees(name, designation)')
        .eq('date', dayjs().format('YYYY-MM-DD'))
        .in('employee_id', empData?.map(e => e.id) || []);
      
      setAttendance(attData || []);

      // 4. Fetch Tasks for these employees
      const { data: taskData } = await supabase
        .from('project_tasks')
        .select('*, projects(title), employees(name)')
        .in('assigned_to', empData?.map(e => e.id) || []);
      
      setTasks(taskData || []);

      // 5. Aggregate Stats
      const totalEmp = empData?.length || 0;
      const attPct = totalEmp > 0 ? Math.round((attData?.length || 0) / totalEmp * 100) : 0;
      const openTasksCount = taskData?.filter(t => t.status !== 'COMPLETED').length || 0;

      setStats({
        totalEmployees: totalEmp,
        activeTeams: teamsData?.length || 0,
        overallAttendance: attPct,
        openTasks: openTasksCount
      });

      setTeamPerf(teamsData?.map(t => ({
        name: t.name,
        attendance: Math.floor(Math.random() * 20) + 80,
        productivity: Math.floor(Math.random() * 30) + 70
      })) || []);

    } catch (err) {
      console.error("Manager data load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDeptData();
  }, [loadDeptData]);

  const filteredItems = useMemo(() => {
    const s = search.toLowerCase();
    if (activeTab === 'attendance') return attendance.filter(a => a.employees?.name?.toLowerCase().includes(s));
    if (activeTab === 'teams') return employees.filter(e => e.name.toLowerCase().includes(s) || e.teams?.name?.toLowerCase().includes(s));
    if (activeTab === 'tasks') return tasks.filter(t => t.title.toLowerCase().includes(s) || t.employees?.name?.toLowerCase().includes(s));
    return [];
  }, [activeTab, search, attendance, employees, tasks]);

  const cards = [
    { label: "Department Size", value: stats.totalEmployees, icon: Users, color: "text-theme-fg", bg: "bg-theme-raised" },
    { label: "Active Teams", value: stats.activeTeams, icon: LayoutGrid, color: "text-sky-500", bg: "bg-sky-500/10" },
    { label: "Attendance", value: `${stats.overallAttendance}%`, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pending Tasks", value: stats.openTasks, icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <DashboardShell
      title="Manager Dashboard"
      subtitle="Manage your department, teams, and employee attendance."
      actions={
        <div className="flex items-center gap-2">
           <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={12} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-[10px] font-bold outline-none focus:border-theme-primary transition-all" 
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => loadDeptData()} className="text-[10px] font-black uppercase">
            <Zap size={14} className="mr-2" /> Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="page-card flex items-center gap-4">
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", c.bg)}>
                <c.icon size={20} className={c.color} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">{c.label}</p>
                <p className="text-2xl font-black text-theme-fg">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-theme-raised/50 border border-theme-border w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'attendance', label: 'Live Attendance', icon: CalendarDays },
            { id: 'teams', label: 'Team Roster', icon: Users },
            { id: 'tasks', label: 'Task Pulse', icon: ClipboardList },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all",
                activeTab === t.id ? "bg-theme-surface text-theme-primary shadow-sm border border-theme-border" : "text-theme-muted hover:text-theme-fg"
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 page-card">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-theme-muted" />
                  <h3 className="text-sm font-black text-theme-fg uppercase tracking-tight">Department Trends</h3>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={teamPerf}>
                    <defs>
                      <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--fg-muted))" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--surface))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                      labelStyle={{ fontWeight: '900', color: 'hsl(var(--fg))' }}
                    />
                    <Area type="monotone" dataKey="productivity" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="page-card flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <Target size={16} className="text-theme-muted" />
                <h3 className="text-sm font-black text-theme-fg uppercase tracking-tight">Priority Tasks</h3>
              </div>
              <div className="space-y-4 flex-1">
                 {tasks.filter(t => t.priority === 'Critical' || t.priority === 'High').slice(0, 4).map((task, i) => (
                    <div key={i} className="flex items-start justify-between p-3 rounded-xl bg-theme-raised/50 border border-theme-border">
                      <div>
                        <p className="text-xs font-black text-theme-fg">{task.title}</p>
                        <p className="text-[10px] text-theme-muted uppercase font-bold">{task.projects?.title} · {task.priority}</p>
                      </div>
                      <Badge variant="danger" className="text-[8px]">HIGH ALERT</Badge>
                    </div>
                 ))}
                 {tasks.length === 0 && <p className="text-xs text-theme-muted text-center py-8">No high priority alerts</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="page-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-theme-raised/50 text-[10px] font-black uppercase text-theme-muted tracking-widest border-b border-theme-border">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Designation</th>
                    <th className="px-6 py-4">Clock In</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {filteredItems.map((log: any) => (
                    <tr key={log.id} className="hover:bg-theme-raised/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-theme-fg">{log.employees?.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] text-theme-muted font-bold">{log.employees?.designation}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-black text-theme-fg">
                          <Clock size={12} className="text-theme-primary" />
                          {log.clock_in ? dayjs(`2000-01-01 ${log.clock_in}`).format("hh:mm A") : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <Badge variant={log.status === 'present' ? 'success' : log.status === 'late' ? 'warning' : 'danger'} className="text-[9px] font-black">
                           {log.status.toUpperCase()}
                         </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="secondary" size="xs" className="text-[9px]">VIEW LOGS</Button>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={5} className="py-20 text-center text-xs text-theme-muted">No attendance logs found for today</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="page-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-theme-raised/50 text-[10px] font-black uppercase text-theme-muted tracking-widest border-b border-theme-border">
                  <tr>
                    <th className="px-6 py-4">Personnel</th>
                    <th className="px-6 py-4">Current Unit (Team)</th>
                    <th className="px-6 py-4">Designation</th>
                    <th className="px-6 py-4 text-right">System ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {filteredItems.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-theme-raised/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-theme-fg">{emp.name}</p>
                        <p className="text-[9px] text-theme-muted">{emp.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info" className="text-[9px] font-black">{emp.teams?.name || 'NOT ASSIGNED'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-theme-fg font-semibold">{emp.designation}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <code className="text-[10px] font-black text-theme-primary">{emp.employee_id}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="page-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-theme-raised/50 text-[10px] font-black uppercase text-theme-muted tracking-widest border-b border-theme-border">
                  <tr>
                    <th className="px-6 py-4">Task Objective</th>
                    <th className="px-6 py-4">Assigned To</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {filteredItems.map((task: any) => (
                    <tr key={task.id} className="hover:bg-theme-raised/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-theme-fg">{task.title}</p>
                        <p className="text-[9px] text-theme-muted uppercase font-bold">{task.projects?.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="h-6 w-6 rounded-full bg-theme-primary/10 flex items-center justify-center text-[8px] font-black text-theme-primary">
                             {task.employees?.name?.charAt(0)}
                           </div>
                           <span className="text-xs font-bold text-theme-fg">{task.employees?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full",
                          task.priority === 'Critical' ? "bg-red-500/10 text-red-500" :
                          task.priority === 'High' ? "bg-amber-500/10 text-amber-500" :
                          "bg-theme-raised text-theme-muted"
                        )}>
                          {task.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={task.status === 'COMPLETED' ? 'success' : task.status === 'IN_PROGRESS' ? 'info' : 'default'} className="text-[9px] font-black">
                           {task.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="secondary" size="xs">AUDIT</Button>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={5} className="py-20 text-center text-xs text-theme-muted">No operational tasks found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
