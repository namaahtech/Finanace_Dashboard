"use client";

import { useEffect, useState, useRef } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";
import { formatDate, cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import {
  Folder, Plus, Search, X, Building2, Zap, Target, ArrowRightLeft,
  CheckCircle2, Clock, CalendarDays, TrendingUp, MoreVertical, Edit2,
  Trash2, SearchCode, ShieldCheck, Tag, LayoutGrid, Building, User, ChevronDown,
  FileText, Activity, Users, Check, Columns, Database, IndianRupee, AlertCircle, ChevronRight,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { DatePicker } from "@/components/ui/DatePicker";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import dayjs from "dayjs";
import { useAuth } from "@/components/layout/AuthProvider";

type ProjectPhase = "SCOPING" | "IMPLEMENTATION" | "REVIEW" | "COMPLETED";

interface Client {
  id: string;
  name: string;
  lead_name: string;
}

interface Team {
  id: string;
  name: string;
  type?: string;
  parent_id?: string | null;
  head_id?: string | null;
  lead_id?: string | null;
  member_count?: number;
}

interface BudgetData {
  id: string;
  budget_number: string;
  name: string;
  total_amount: number;
  actual_spent: number;
  purchase_spent: number;
  sub_spent: number;
  status: string;
}

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  total_amount: number;
  actual_spent: number;
  status: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  budget: number;
  budget_id: string | null;
  clientId: string;
  teamIds: string[];
  phase: ProjectPhase;
  issued_date: string;
  dueDate: string;
  is_active: boolean;
  progress?: number;
  client?: Client;
  teams?: Team[];
  budget_data?: BudgetData | null;
  department_id?: string | null;
}

interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assigned_to: string | null;
  due_date: string | null;
  assigned_to_employee?: { id: string; name: string; employee_id: string };
  assignee?: { id: string; name: string; role?: string };
  submission_url?: string | null;
  submission_notes?: string | null;
  review_feedback?: string | null;
}

interface TaskComment {
  id: string;
  task_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
}

const PHASE_CONFIG: Record<ProjectPhase, { label: string; bg: string; text: string; icon: any; variant: any }> = {
  SCOPING: { label: "Scoping & Proposal", bg: "bg-amber-500/10", text: "text-amber-600", icon: Target, variant: "warning" },
  IMPLEMENTATION: { label: "Implementation", bg: "bg-sky-500/10", text: "text-sky-600", icon: Zap, variant: "info" },
  REVIEW: { label: "Quality Review", bg: "bg-purple-500/10", text: "text-purple-600", icon: ArrowRightLeft, variant: "purple" },
  COMPLETED: { label: "Completed", bg: "bg-emerald-500/10", text: "text-emerald-600", icon: CheckCircle2, variant: "success" },
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const TASK_STATUS_CONFIG = {
  TODO: { label: "To Do", bg: "bg-slate-100 text-slate-600" },
  IN_PROGRESS: { label: "In Progress", bg: "bg-sky-100 text-sky-700" },
  REVIEW: { label: "Review", bg: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Done", bg: "bg-emerald-100 text-emerald-700" },
};

const PRIORITY_CONFIG = {
  Low: "text-slate-400",
  Medium: "text-blue-500",
  High: "text-amber-500",
  Critical: "text-rose-500",
};

// ── Custom Simple Dropdown ───────────────────────────────
function CustomSelect({ value, options, onChange, placeholder, icon, label }: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="space-y-2" ref={ref}>
      {label && <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-theme-muted">{icon}{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-[46px] w-full items-center justify-between rounded-2xl border border-theme-border bg-theme-page px-4 text-sm font-bold text-theme-fg outline-none focus:border-theme-strong transition-all overflow-hidden"
        >
          <span className="flex items-center gap-2 truncate pr-2">
            {!label && icon}
            {selected ? selected.label : <span className="text-theme-muted font-normal">{placeholder}</span>}
          </span>
          <ArrowRightLeft size={14} className={cn("flex-shrink-0 text-theme-muted transition-transform rotate-90", open && "rotate-[270deg]")} />
        </button>

        {open && (
            <div className="absolute top-full z-[8000] mt-1.5 w-full max-h-48 overflow-y-auto rounded-2xl border border-theme-border bg-theme-surface shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-1.5 animate-in slide-in-from-top-1 duration-200">
            {options.length > 0 ? options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                  value === opt.value ? "bg-theme-primary text-theme-surface" : "text-theme-fg hover:bg-theme-raised"
                )}
              >
                <span className="truncate uppercase tracking-tight">{opt.label}</span>
                {value === opt.value && <Badge variant="success" className="h-4 w-4 p-0 flex items-center justify-center rounded-full"><CheckCircle2 size={10} /></Badge>}
              </button>
            )) : (
              <div className="px-3 py-4 text-center text-[10px] uppercase font-black tracking-widest text-theme-muted opacity-50">No Data Options</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Multi-Select Dropdown ───────────────────────────────
function MultiSelect({ value, options, onChange, placeholder, icon, label }: {
    value: string[];
    options: { label: string; value: string }[];
    onChange: (val: string[]) => void;
    placeholder: string;
    icon?: React.ReactNode;
    label?: string;
  }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);
  
    const toggle = (val: string) => {
      if (value.includes(val)) onChange(value.filter(v => v !== val));
      else onChange([...value, val]);
    };
  
    return (
      <div className="space-y-2" ref={ref}>
        {label && <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-theme-muted">{icon}{label}</label>}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex min-h-[46px] w-full items-center justify-between rounded-2xl border border-theme-border bg-theme-page px-4 py-2 text-sm font-bold text-theme-fg outline-none focus:border-theme-strong transition-all overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 items-center pr-2">
                {!label && icon}
                {value.length > 0 ? (
                    value.map(v => {
                        const opt = options.find(o => o.value === v);
                        return (
                            <span key={v} className="bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border border-theme-primary/20">
                                {opt?.label}
                            </span>
                        );
                    })
                ) : <span className="text-theme-muted font-normal">{placeholder}</span>}
            </div>
            <ArrowRightLeft size={14} className={cn("flex-shrink-0 text-theme-muted transition-transform rotate-90", open && "rotate-[270deg]")} />
          </button>
  
          {open && (
              <div className="absolute top-full z-[8000] mt-1.5 w-full max-h-48 overflow-y-auto rounded-2xl border border-theme-border bg-theme-surface shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-1.5 animate-in slide-in-from-top-1 duration-200">
              {options.length > 0 ? options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                    value.includes(opt.value) ? "bg-theme-primary/10 text-theme-primary" : "text-theme-fg hover:bg-theme-raised"
                  )}
                >
                  <span className="truncate uppercase tracking-tight">{opt.label}</span>
                  {value.includes(opt.value) && <CheckCircle2 size={12} className="flex-shrink-0" />}
                </button>
              )) : (
                <div className="px-3 py-4 text-center text-[10px] uppercase font-black tracking-widest text-theme-muted opacity-50">No Data Options</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

// ── 3-Dot Context Menu ──────────────────────────────────
function RowMenu({ project, onRefresh, onEdit, isLast, setDeleteConfirm, onOversight }: { 
  project: Project; 
  onRefresh: () => void; 
  onEdit: () => void;
  isLast?: boolean; 
  setDeleteConfirm: (p: Project) => void;
  onOversight: (p: Project) => void;
}) {
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function toggleStatus() {
     setActing(true);
     setOpen(false);
     try {
       await axios.patch(`/api/projects/${project.id}`, { is_active: !project.is_active });
       showToast(`Project is now ${!project.is_active ? "Active" : "Archived"}`, "success");
       onRefresh();
     } catch (e: any) {
       showToast("Status transition failed.", "error");
     } finally {
       setActing(false);
     }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)} disabled={acting} className="p-1.5 rounded-lg text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors">
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className={cn("absolute z-[1000] w-52 rounded-2xl border border-theme-border bg-theme-surface shadow-2xl p-1.5 animate-in zoom-in-95 duration-150", 
          "right-full mr-2", isLast ? "bottom-0" : "top-0"
        )}>
          <button onClick={() => { onEdit(); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
            <Edit2 size={13} className="text-amber-500" /> Edit Project
          </button>
          <button onClick={toggleStatus}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
            <Clock size={13} className="text-sky-500" /> {project.is_active ? "Archive Project" : "Activate Project"}
          </button>
          <button onClick={() => { onOversight(project); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
            <ShieldCheck size={13} className="text-emerald-500" /> Tracking Matrix
          </button>
          <div className="my-1.5 h-px bg-theme-border/50" />
          <button onClick={() => { setDeleteConfirm(project); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black text-rose-500 hover:bg-rose-500/10 transition-all">
            <Trash2 size={13} /> Terminate Record
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Projects Page ──────────────────────────────────
export default function AdminProjectsPage() {
  const { showToast } = useToast();
  const { request } = useApi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "archived">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [oversightProject, setOversightProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [form, setForm] = useState({
    name: "", description: "", budget: "",
    client_id: "", phase: "SCOPING",
    issued_date: dayjs().format("YYYY-MM-DD"),
    due_date: "",
    team_ids: [] as string[],
    budget_id: "",
    department_id: "",
  });

  async function loadData(q?: string) {
    setLoading(true);
    try {
      const url = `/api/projects?${q ? `search=${q}` : ""}`;
      const res = await request<{ projects: Project[]; total: number }>({ url });
      setProjects(res.projects ?? []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  }
  async function loadMeta() {
    const [cRes, tRes, eRes, bRes] = await Promise.all([
      axios.get("/api/config/clients"),
      supabase.from("teams").select("id, name, type, parent_id"),
      supabase.from("employees").select("id, name, employee_id").eq("is_active", true),
      supabase.from("budgets").select("id, budget_number, name, total_amount, actual_spent, status").eq("status", "active").order("name"),
    ]);
    setClients(cRes.data.clients || []);
    setTeams(tRes.data || []);
    setEmployees(eRes.data || []);
    setBudgets(bRes.data || []);
  }

  useEffect(() => {
    loadData();
    loadMeta();

    // REAL-TIME SYNC
    const channel = supabase
      .channel("projects-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        loadData(search); // Refresh on any project change
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_teams" }, () => {
        loadData(search); // Refresh on team assignment change
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === "Escape") {
        setShowForm(false);
        setDeleteConfirm(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  function handleAdd() {
    setEditingId(null);
    setForm({
      name: "", description: "", budget: "",
      client_id: "", phase: "SCOPING",
      issued_date: dayjs().format("YYYY-MM-DD"),
      due_date: dayjs().add(3, "month").format("YYYY-MM-DD"),
      team_ids: [], budget_id: "",
      department_id: "",
    });
    setShowForm(true);
  }

  function handleEdit(p: Project) {
    setEditingId(p.id);
    setForm({
      name: p.name, description: p.description,
      budget: String(p.budget), client_id: p.clientId,
      phase: p.phase, issued_date: p.issued_date || "",
      due_date: p.dueDate, team_ids: p.teamIds || [],
      budget_id: p.budget_id || "",
      department_id: p.department_id || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await axios.patch(`/api/projects/${editingId}`, form);
        showToast("Project matrix updated successfully.", "success");
      } else {
        await axios.post("/api/projects", form);
        showToast(`Project "${form.name}" initialized in records.`, "success");
      }
      setShowForm(false);
      loadData(search || undefined);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      await axios.delete(`/api/projects/${deleteConfirm.id}`);
      showToast(`Project unit "${deleteConfirm.name}" has been decommissioned.`, "success");
      setDeleteConfirm(null);
      loadData(search || undefined);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredProjects = projects.filter((p) => {
    if (activeTab === "active")   return p.is_active === true;
    if (activeTab === "archived") return p.is_active === false;
    return true;
  });

  const activeCount   = projects.filter((p) => p.is_active).length;
  const archivedCount = projects.filter((p) => !p.is_active).length;
  const totalBudget   = projects.reduce((acc, p) => acc + (p.budget || 0), 0);

  return (
    <DashboardShell
      title="Projects Management"
      subtitle="Architect high-performance delivery cycles and manage client accounts."
      actions={
        <Button variant="primary" size="sm" onClick={handleAdd}>
            <Folder size={14} className="mr-1.5" /> Initialize Project
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Asset Depth", value: total || projects.length, icon: Folder,     color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Active Cycles",    value: activeCount,           icon: Zap,        color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Archived Units",    value: archivedCount,         icon: Clock,      color: "text-rose-500",    bg: "bg-rose-500/10" },
            { label: "Deployment Value",  value: formatCurrency(totalBudget).split('.')[0], icon: TrendingUp, color: "text-sky-500", bg: "bg-sky-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-xs text-theme-muted">{label}</p>
                <p className={cn("text-xl font-bold leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="page-card p-0 shadow-xl border-theme-border/50 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-theme-border/50 px-8 py-6 sm:flex-row sm:items-center sm:justify-between bg-theme-raised/5">
            <div className="flex rounded-2xl border border-theme-border bg-theme-raised p-1 gap-1">
              {([
                { id: "all",      label: "All Records", count: projects.length },
                { id: "active",   label: "Active",      count: activeCount },
                { id: "archived", label: "Archived",    count: archivedCount },
              ] as { id: "all" | "active" | "archived"; label: string; count: number }[]).map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    activeTab === t.id ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg"
                  )}>
                  {t.label} <span className="ml-1 opacity-40">({t.count})</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted" size={14} />
              <input type="text" placeholder="Search project clusters..." value={search}
                onChange={(e) => { setSearch(e.target.value); loadData(e.target.value); }}
                className="h-10 w-72 rounded-lg border border-theme-border bg-theme-page pl-10 pr-4 text-xs text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
            </div>
          </div>

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-page text-left text-xs font-semibold text-theme-muted">
                    <th className="px-5 py-3">Project Asset</th>
                    <th className="px-5 py-3">Client Entity</th>
                    <th className="px-5 py-3">Financial Weight</th>
                    <th className="px-5 py-3">Operational Support</th>
                    <th className="px-5 py-3 text-center">Status Matrix</th>
                    <th className="px-5 py-3 text-right">Action Matrix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/30">
                  {filteredProjects.map((p, idx) => {
                    const phase = PHASE_CONFIG[p.phase];
                    const PhaseIcon = phase.icon;
                    return (
                      <tr key={p.id} className="group hover:bg-theme-raised/30 transition-all duration-300 cursor-pointer" onClick={() => setSelectedProject(p)}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-theme-primary/10 text-theme-primary text-xs font-bold border border-theme-primary/20 shadow-sm"><Folder size={14} /></div>
                            <div>
                              <p className="text-xs font-semibold text-theme-fg">{p.name}</p>
                              <p className="text-[10px] text-theme-muted font-normal max-w-[180px] truncate">{p.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                           <div className="flex items-center gap-2">
                             <Building2 size={12} className="text-theme-muted" />
                             <p className="text-xs font-semibold text-theme-fg">{p.client?.name || "Independent Cluster"}</p>
                           </div>
                           <p className="text-[10px] text-theme-muted ml-5 font-normal">Lead: {p.client?.lead_name || 'System'}</p>
                        </td>
                        <td className="px-5 py-3">
                           <p className="text-xs font-bold text-theme-fg">{formatCurrency(p.budget)}</p>
                           <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted/50 mt-1">CAPEX ALLOCATION</p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {p.teams && p.teams.length > 0 ? p.teams.map(t => (
                                <Badge key={t.id} variant="default" className="text-[9px] px-1.5 py-0 rounded-md bg-theme-raised text-theme-muted border-theme-border/50">
                                    {t.name}
                                </Badge>
                            )) : <span className="text-[10px] text-theme-muted italic">No Teams Assigned</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-tight transition-all", phase.bg, phase.text)}>
                              <PhaseIcon size={10} /> {phase.label}
                          </div>
                          <p className="text-[9px] text-theme-muted mt-1 font-bold">DUE: {formatDate(p.dueDate)}</p>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button
                               onClick={(e) => { e.stopPropagation(); setSelectedProject(p); }}
                               className="px-3 py-1 text-[10px] font-black uppercase text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-all"
                             >
                               Manage Tasks →
                             </button>
                             <div onClick={(e) => e.stopPropagation()}>
                               <RowMenu 
                                 project={p} 
                                 onRefresh={() => loadData(search || undefined)} 
                                 onEdit={() => handleEdit(p)} 
                                 onOversight={() => setOversightProject(p)}
                                 isLast={idx >= filteredProjects.length - 2} 
                                 setDeleteConfirm={setDeleteConfirm} 
                               />
                             </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-2xl rounded-2xl bg-theme-surface shadow-2xl border border-theme-border relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-theme-border bg-theme-surface px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-primary text-theme-surface shadow-sm">
                  {editingId ? <Edit2 size={16} /> : <Folder size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-theme-fg">{editingId ? "Modify Project Unit" : "Initialize Project Cluster"}</h3>
                  <p className="text-xs text-theme-muted mt-0.5">Enterprise Operations Registry</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-theme-muted hover:bg-theme-raised transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pr-3 custom-scrollbar">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Project Identification Name</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Titan Server Migration Layer-4"
                      className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                  </div>
                  
                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Operational Scope (Description)</label>
                    <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Define the structural goals and boundaries..."
                      className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm resize-none" />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Financial Allocation (Budget)</label>
                    <input type="number" required value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Project Cycle Start (Issue Date)</label>
                    <DatePicker value={form.issued_date} onChange={(d) => setForm({ ...form, issued_date: d })} label="" />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Temporal Milestone (Due Date)</label>
                    <DatePicker value={form.due_date} onChange={(d) => setForm({ ...form, due_date: d })} label="" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Client Account Entity</label>
                    <CustomSelect 
                      icon={<Building size={14} className="text-theme-primary" />}
                      placeholder="Select Client..."
                      value={form.client_id} 
                      onChange={(v) => setForm({...form, client_id: v})} 
                      options={clients.map(c => ({ label: c.name, value: c.id }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Project Lifecycle Phase</label>
                    <CustomSelect 
                      icon={<Zap size={14} className="text-theme-primary" />}
                      placeholder="Select Phase..."
                      value={form.phase} 
                      onChange={(v) => setForm({...form, phase: v as ProjectPhase})} 
                      options={Object.entries(PHASE_CONFIG).map(([v, l]) => ({ label: l.label, value: v }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Target Department (Manager Level)</label>
                    <CustomSelect 
                      icon={<Building2 size={14} className="text-amber-500" />}
                      placeholder="Select Department..."
                      value={form.department_id} 
                      onChange={(v) => setForm({...form, department_id: v})} 
                      options={teams.filter(t => t.type === 'department').map(d => ({ label: d.name, value: d.id }))}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-primary">Operational Units (Team Assignment)</label>
                    <MultiSelect
                        icon={<LayoutGrid size={14} className="text-theme-primary" />}
                        placeholder="Assign Teams to Cluster..."
                        value={form.team_ids}
                        onChange={(v) => setForm({...form, team_ids: v})}
                        options={teams.filter(t => t.type === 'team' && (!form.department_id || t.parent_id === form.department_id)).map(t => ({ label: t.name, value: t.id }))}
                        label="Assigned Teams"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">
                      <IndianRupee size={13} className="text-emerald-500" />
                      Link to Budget (optional)
                    </label>
                    <CustomSelect
                      icon={<IndianRupee size={14} className="text-emerald-500" />}
                      placeholder="— No budget linked —"
                      value={form.budget_id}
                      onChange={(v) => setForm({ ...form, budget_id: v })}
                      options={[
                        { label: "— No budget linked —", value: "" },
                        ...budgets.map(b => ({
                          label: `${b.name} (${b.budget_number}) · ₹${(b.total_amount / 1000).toFixed(0)}K`,
                          value: b.id,
                        })),
                      ]}
                    />
                    {form.budget_id && (() => {
                      const b = budgets.find(x => x.id === form.budget_id);
                      if (!b) return null;
                      const pct = b.total_amount > 0 ? Math.min((b.actual_spent / b.total_amount) * 100, 100) : 0;
                      const isOver = b.actual_spent > b.total_amount;
                      return (
                        <div className="rounded-xl border border-theme-border bg-theme-raised p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-semibold">
                            <span className="text-theme-muted">Current utilisation</span>
                            <span className={isOver ? "text-red-500 font-bold" : "text-emerald-600 font-bold"}>
                              {isOver ? "OVER BUDGET" : `${pct.toFixed(0)}%`}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-theme-page overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", isOver ? "bg-red-500" : pct >= 85 ? "bg-amber-500" : "bg-emerald-500")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-theme-subtle">
                            <span>Spent: ₹{(b.actual_spent / 1000).toFixed(1)}K</span>
                            <span>Total: ₹{(b.total_amount / 1000).toFixed(1)}K</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-theme-surface flex justify-end gap-3 border-t border-theme-border pt-4 mt-6">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)} className="px-6">Cancel</Button>
                  <Button type="submit" size="sm" loading={submitting} className="px-6">
                    {editingId ? "Sync Updates" : "Initialize Asset"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION TOAST (PILL DESIGN) */}
      {deleteConfirm && (
        <div className="fixed inset-x-0 top-8 z-[9000] flex justify-center px-4 animate-in slide-in-from-top-8 duration-300">
           <div className="flex items-center gap-6 bg-theme-surface px-6 py-4 shadow-xl rounded-2xl border border-theme-border min-w-[400px]">
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl">
                    <Trash2 size={20} />
                 </div>
                 <div className="flex flex-col">
                    <p className="text-sm font-semibold text-theme-fg tracking-tight">Decommission <span className="text-rose-500 font-bold">"{deleteConfirm.name}"</span>?</p>
                    <p className="text-xs text-theme-muted mt-0.5">Physical records will be permanently purged.</p>
                 </div>
              </div>
              
              <div className="flex items-center gap-3 ml-auto">
                 <Button onClick={() => setDeleteConfirm(null)} disabled={submitting} variant="secondary" size="sm" className="px-4">
                   Cancel
                 </Button>
                 <Button onClick={handleDelete} disabled={submitting} variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white px-5 border-rose-600">
                   {submitting ? "Purging..." : "Confirm Purge"}
                 </Button>
              </div>
           </div>
        </div>
      )}

      {/* PROJECT TASKS DRAWER (NOTION STYLE) */}
      <ProjectTasksDrawer 
        project={selectedProject} 
        onClose={() => setSelectedProject(null)} 
        employees={employees}
      />

      {oversightProject && (
        <OversightModal 
          project={oversightProject} 
          onClose={() => setOversightProject(null)} 
          teams={teams}
        />
      )}
    </DashboardShell>
  );
}

// ── Project Board ─────────────────────────────────────────────────────────────

const DEFAULT_COLUMNS = [
  { id: 'TODO',        label: 'To Do',       dot: 'bg-slate-400',   text: 'text-slate-600'   },
  { id: 'IN_PROGRESS', label: 'In Progress',  dot: 'bg-sky-500',     text: 'text-sky-600'     },
  { id: 'REVIEW',      label: 'Review',       dot: 'bg-amber-500',   text: 'text-amber-600'   },
  { id: 'COMPLETED',   label: 'Done',         dot: 'bg-emerald-500', text: 'text-emerald-600' },
];

const PRIORITY_BADGE: Record<string, string> = {
  Low:      'bg-slate-100 text-slate-500',
  Medium:   'bg-blue-50 text-blue-600',
  High:     'bg-amber-50 text-amber-600',
  Critical: 'bg-rose-50 text-rose-600',
};

const CUSTOM_COLUMN_COLORS = [
  { dot: 'bg-violet-500', text: 'text-violet-600' },
  { dot: 'bg-pink-500',   text: 'text-pink-600'   },
  { dot: 'bg-orange-500', text: 'text-orange-600' },
  { dot: 'bg-teal-500',   text: 'text-teal-600'   },
  { dot: 'bg-indigo-500', text: 'text-indigo-600' },
];

function ProjectTasksDrawer({ project, onClose, employees }: {
  project: Project | null;
  onClose: () => void;
  employees: Employee[];
  // budget_data is read from project.budget_data directly
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [view, setView] = useState<'board' | 'table' | 'list'>('board');

  // ── tasks ────────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(false);

  // ── columns ─────────────────────────────────────────────────────────────────
  const [customCols, setCustomCols] = useState<{ id: string; label: string; dot: string; text: string }[]>([]);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState('');

  // ── inline task add ──────────────────────────────────────────────────────────
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const blankTask = (status = 'TODO'): Partial<ProjectTask> => ({
    title: '', status, priority: 'Medium', assigned_to: null,
    due_date: dayjs().add(7, 'day').format('YYYY-MM-DD'),
  });
  const [newTask, setNewTask] = useState<Partial<ProjectTask>>(blankTask());

  // ── task detail + comments ───────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [detailDraft, setDetailDraft] = useState<Partial<ProjectTask>>({});
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const allColumns = [...DEFAULT_COLUMNS, ...customCols];

  // ── load columns from localStorage ───────────────────────────────────────────
  useEffect(() => {
    if (!project) return;
    try {
      const stored = localStorage.getItem(`board-cols-${project.id}`);
      if (stored) setCustomCols(JSON.parse(stored));
    } catch {}
  }, [project?.id]);

  // ── data fetching ─────────────────────────────────────────────────────────────
  const fetchTasks = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/projects/${project.id}/tasks`);
      const fetched: ProjectTask[] = res.data.tasks || [];
      setTasks(fetched);
      // Keep selected task in sync
      setSelectedTask(prev => prev ? (fetched.find(t => t.id === prev.id) || null) : null);
    } catch {
      showToast("Failed to load board.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (taskId: string) => {
    try {
      const res = await axios.get(`/api/projects/${project!.id}/tasks/${taskId}/comments`);
      setComments(res.data.comments || []);
    } catch {}
  };

  useEffect(() => {
    if (project) {
      fetchTasks();
      const channel = supabase
        .channel(`project-tasks-${project.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks' }, fetchTasks)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, () => {
          if (selectedTask) fetchComments(selectedTask.id);
        })
        // Refresh project (budget bar) when budgets table updates
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'budgets',
          filter: project.budget_id ? `id=eq.${project.budget_id}` : undefined as any,
        }, () => {
          // Trigger parent reload so budget_data refreshes
          supabase.from("budgets")
            .select("id, budget_number, name, total_amount, actual_spent, purchase_spent, sub_spent, status")
            .eq("id", project.budget_id!)
            .single()
            .then(({ data }) => {
              if (data) project.budget_data = data;
            });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      setTasks([]); setSelectedTask(null); setAddingToColumn(null);
    }
  }, [project?.id]);

  // When selected task changes, load comments
  useEffect(() => {
    if (selectedTask) {
      setDetailDraft({ title: selectedTask.title, description: selectedTask.description, status: selectedTask.status, priority: selectedTask.priority, assigned_to: selectedTask.assigned_to, due_date: selectedTask.due_date });
      fetchComments(selectedTask.id);
    } else {
      setComments([]);
    }
  }, [selectedTask?.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  // ── task CRUD ─────────────────────────────────────────────────────────────────
  const handleCreateTask = async () => {
    if (!newTask.title?.trim() || !project) return;
    try {
      await axios.post(`/api/projects/${project.id}/tasks`, newTask);
      setNewTask(blankTask());
      setAddingToColumn(null);
      fetchTasks();
    } catch {
      showToast("Failed to create task.", "error");
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<ProjectTask>) => {
    if (!project) return;
    try {
      await axios.patch(`/api/projects/${project.id}/tasks/${taskId}`, updates);
      fetchTasks();
    } catch {
      showToast("Sync failed.", "error");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!project) return;
    try {
      if (selectedTask?.id === taskId) setSelectedTask(null);
      await axios.delete(`/api/projects/${project.id}/tasks/${taskId}`);
      fetchTasks();
    } catch {
      showToast("Delete failed.", "error");
    }
  };

  // ── detail panel save (on blur) ───────────────────────────────────────────────
  const saveDetail = async (field: keyof ProjectTask, value: string | null) => {
    if (!selectedTask) return;
    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, [field]: value } : t));
    await handleUpdateTask(selectedTask.id, { [field]: value });
  };

  // ── comments ──────────────────────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask || !project) return;
    const content = newComment.trim();
    setNewComment('');
    try {
      await axios.post(`/api/projects/${project.id}/tasks/${selectedTask.id}/comments`, {
        author_name: user?.name || 'Team Member',
        content,
      });
      fetchComments(selectedTask.id);
    } catch {
      showToast("Failed to post comment.", "error");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTask || !project) return;
    try {
      await axios.delete(`/api/projects/${project.id}/tasks/${selectedTask.id}/comments`, {
        data: { commentId },
      });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {}
  };

  // ── drag and drop ─────────────────────────────────────────────────────────────
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (destination.droppableId !== source.droppableId) {
      setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: destination.droppableId } : t));
      if (selectedTask?.id === draggableId) setDetailDraft(d => ({ ...d, status: destination.droppableId }));
      await handleUpdateTask(draggableId, { status: destination.droppableId });
    }
  };

  // ── custom columns ────────────────────────────────────────────────────────────
  const handleAddColumn = () => {
    if (!newColName.trim() || !project) return;
    const colorIdx = customCols.length % CUSTOM_COLUMN_COLORS.length;
    const colId = newColName.trim().toUpperCase().replace(/\s+/g, '_');
    const newCol = { id: colId, label: newColName.trim(), ...CUSTOM_COLUMN_COLORS[colorIdx] };
    const updated = [...customCols, newCol];
    setCustomCols(updated);
    localStorage.setItem(`board-cols-${project.id}`, JSON.stringify(updated));
    setNewColName('');
    setAddingCol(false);
  };

  const handleDeleteColumn = (colId: string) => {
    if (!project) return;
    const updated = customCols.filter(c => c.id !== colId);
    setCustomCols(updated);
    localStorage.setItem(`board-cols-${project.id}`, JSON.stringify(updated));
  };

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-[6000] bg-[#fbfbfa] flex flex-col animate-in fade-in duration-200">

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-black/8 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
            <Folder size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-black tracking-tight truncate">{project.name}</h2>
            <div className="flex items-center gap-0.5">
              <p className="text-[10px] text-black/30 font-medium">{project.client?.name || 'Internal Project'}</p>
            </div>
          </div>

          <div className="h-4 w-px bg-black/5 mx-2" />

          {/* View Switcher */}
          <div className="flex bg-black/5 rounded-lg p-0.5">
            {[
              { id: 'board', icon: Columns, label: 'Board' },
              { id: 'table', icon: Database, label: 'Table' },
              { id: 'list',  icon: LayoutGrid,  label: 'List'  },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tight transition-all",
                  view === v.id ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/60"
                )}
              >
                <v.icon size={11} />
                {v.label}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4 ml-6 border-l border-black/5 pl-6">
            {[
              { label: 'Total',    val: tasks.length,                                                                                            color: 'text-black/50' },
              { label: 'Active',   val: tasks.filter(t => t.status !== 'COMPLETED').length,                                                      color: 'text-sky-600'  },
              { label: 'Done',     val: tasks.filter(t => t.status === 'COMPLETED').length,                                                      color: 'text-emerald-600' },
              { label: 'Overdue',  val: tasks.filter(t => t.due_date && dayjs(t.due_date).isBefore(dayjs()) && t.status !== 'COMPLETED').length, color: 'text-rose-500' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={cn("text-base font-black leading-none", s.color)}>{s.val}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-black/25 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Live Budget Bar ── */}
          {project.budget_data && (() => {
            const b = project.budget_data!;
            const spent   = b.actual_spent || 0;
            const isOver  = spent > b.total_amount;
            const pct     = b.total_amount > 0 ? Math.min((spent / b.total_amount) * 100, 100) : 0;
            const rem     = b.total_amount - spent;
            return (
              <div className="hidden lg:flex items-center gap-3 ml-6 border-l border-black/5 pl-6 min-w-[220px]">
                <IndianRupee size={12} className={isOver ? "text-rose-500 flex-shrink-0" : "text-emerald-500 flex-shrink-0"} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-black/30 truncate max-w-[100px]">{b.name}</span>
                    <span className={cn("text-[9px] font-black", isOver ? "text-rose-500" : pct >= 85 ? "text-amber-500" : "text-emerald-600")}>
                      {isOver ? "OVER" : `${pct.toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", isOver ? "bg-rose-500" : pct >= 85 ? "bg-amber-500" : "bg-emerald-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-black/25 font-semibold">
                    <span>₹{(spent / 1000).toFixed(1)}K spent</span>
                    <span className={isOver ? "text-rose-400" : "text-black/25"}>
                      {isOver ? `₹${(Math.abs(rem) / 1000).toFixed(1)}K over` : `₹${(rem / 1000).toFixed(1)}K left`}
                    </span>
                  </div>
                </div>
                {isOver && <AlertCircle size={13} className="text-rose-500 flex-shrink-0" />}
              </div>
            );
          })()}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setAddingCol(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:opacity-80 active:scale-95 transition-all"
          >
            <Plus size={12} /> Add Column
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-black/30 hover:bg-black/5 hover:text-black transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── View Area + Detail Panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Dynamic View Content */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6 scroll-smooth">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[11px] font-black uppercase tracking-widest text-black/20 animate-pulse">Synchronizing Records…</p>
            </div>
          ) : view === 'board' ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 h-full min-w-max pb-4">

                {allColumns.map((col) => {
                  const colTasks = tasks.filter(t => t.status === col.id);
                  const isCustom = !DEFAULT_COLUMNS.find(d => d.id === col.id);
                  return (
                    <div key={col.id} className="flex-shrink-0 w-[272px] flex flex-col gap-2">

                      {/* Column header */}
                      <div className="flex items-center justify-between px-1 group/colhead">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2.5 h-2.5 rounded-sm", col.dot)} />
                          <span className={cn("text-[13px] font-bold", col.text)}>{col.label}</span>
                          <span className="text-[11px] font-semibold text-black/25 ml-0.5">{colTasks.length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isCustom && (
                            <button
                              onClick={() => handleDeleteColumn(col.id)}
                              className="opacity-0 group-hover/colhead:opacity-100 p-1 hover:bg-rose-50 hover:text-rose-500 rounded text-black/20 transition-all"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                          <button
                            onClick={() => { setAddingToColumn(col.id); setNewTask(blankTask(col.id)); }}
                            className="p-1 hover:bg-black/5 rounded text-black/25 hover:text-black transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Cards */}
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={cn(
                              "flex flex-col gap-2 flex-1 min-h-[120px] rounded-xl p-1.5 transition-colors",
                              snapshot.isDraggingOver ? "bg-black/5" : ""
                            )}
                          >
                            {colTasks.map((task, idx) => (
                              <Draggable key={task.id} draggableId={task.id} index={idx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => setSelectedTask(task)}
                                    className={cn(
                                      "group bg-white border border-black/8 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer",
                                      snapshot.isDragging && "shadow-2xl ring-2 ring-black/10 rotate-[1deg]",
                                      selectedTask?.id === task.id && "ring-2 ring-black/20"
                                    )}
                                  >
                                    <div className="flex items-start gap-2">
                                      <p className="text-[13px] font-semibold text-black/80 leading-snug flex-1 line-clamp-2">{task.title}</p>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 hover:text-rose-500 rounded transition-all text-black/20 flex-shrink-0 -mt-0.5 -mr-0.5"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                    {task.description && (
                                      <p className="text-[11px] text-black/35 mt-1 line-clamp-1">{task.description}</p>
                                    )}
                                    <div className="mt-2.5 flex items-center justify-between gap-2">
                                      <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight", PRIORITY_BADGE[task.priority] || 'bg-slate-100 text-slate-500')}>
                                        {task.priority}
                                      </span>
                                      {task.assigned_to_employee && (
                                        <div className="flex items-center gap-1">
                                          <div className="w-5 h-5 rounded-full bg-slate-100 border border-black/10 flex items-center justify-center text-[8px] font-black text-black/50">
                                            {getInitials(task.assigned_to_employee.name)}
                                          </div>
                                          <span className="text-[10px] font-semibold text-black/35 truncate max-w-[70px]">
                                            {task.assigned_to_employee.name.split(' ')[0]}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {task.due_date && (
                                      <div className={cn(
                                        "mt-1.5 flex items-center gap-1 text-[9px] font-semibold",
                                        dayjs(task.due_date).isBefore(dayjs()) && task.status !== 'COMPLETED' ? "text-rose-500" : "text-black/25"
                                      )}>
                                        <CalendarDays size={9} />
                                        {dayjs(task.due_date).format('DD MMM')}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}

                            {/* Inline add */}
                            {addingToColumn === col.id ? (
                              <div className="bg-white border-2 border-black rounded-xl p-3 space-y-2 shadow-xl shadow-black/5 animate-in fade-in duration-150">
                                <input
                                  autoFocus
                                  placeholder="Task title…"
                                  value={newTask.title}
                                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                                  className="w-full text-[13px] font-semibold outline-none border-b border-black/10 focus:border-black pb-1 transition-all placeholder:text-black/20"
                                />
                                <div className="space-y-1.5 pt-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-black/25 uppercase w-14">Priority</span>
                                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })} className="bg-transparent text-[11px] font-semibold text-black/60 outline-none flex-1">
                                      {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-black/25 uppercase w-14">Assign</span>
                                    <select value={newTask.assigned_to || ""} onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value || null })} className="bg-transparent text-[11px] font-semibold text-black/50 outline-none flex-1">
                                      <option value="">Unassigned</option>
                                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-black/25 uppercase w-14">Due</span>
                                    <input type="date" value={newTask.due_date || ""} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value || null })} className="bg-transparent text-[11px] font-semibold text-black/50 outline-none flex-1" />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1 border-t border-black/5">
                                  <button onClick={handleCreateTask} className="bg-black text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all">
                                    <Check size={10} /> Save
                                  </button>
                                  <button onClick={() => { setAddingToColumn(null); setNewTask(blankTask()); }} className="text-black/35 text-[10px] font-black uppercase hover:text-black transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setAddingToColumn(col.id); setNewTask(blankTask(col.id)); }}
                                className="flex items-center gap-1.5 px-2 py-1.5 text-black/25 hover:bg-black/5 rounded-lg transition-all text-[11px] font-semibold w-full mt-0.5"
                              >
                                <Plus size={13} /> New
                              </button>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}

                {/* Add Column ghost */}
                <div className="flex-shrink-0 w-[272px]">
                  {addingCol ? (
                    <div className="border-2 border-black rounded-xl p-4 bg-white shadow-xl shadow-black/5 animate-in fade-in slide-in-from-right-4 duration-200">
                      <p className="text-[9px] font-black text-black/30 uppercase tracking-widest mb-2">New Column</p>
                      <input
                        autoFocus
                        placeholder="Column name…"
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') { setAddingCol(false); setNewColName(''); } }}
                        className="w-full text-sm font-bold border-b-2 border-black/10 focus:border-black outline-none pb-2 mb-4 transition-all placeholder:text-black/20"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={handleAddColumn} className="bg-black text-white text-[10px] font-black uppercase px-4 py-2 rounded-lg flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all">
                          <Check size={11} /> Add
                        </button>
                        <button onClick={() => { setAddingCol(false); setNewColName(''); }} className="text-black/35 text-[10px] font-black uppercase hover:text-black transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingCol(true)}
                      className="w-full h-10 flex items-center justify-center gap-2 border-2 border-dashed border-black/10 rounded-xl text-[11px] font-bold text-black/25 hover:border-black/20 hover:text-black/40 transition-all"
                    >
                      <Plus size={13} /> Add Column
                    </button>
                  )}
                </div>

              </div>
            </DragDropContext>
          ) : view === 'table' ? (
            <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5 bg-black/1 px-2">
                    <th className="px-5 py-4 text-[10px] font-black text-black/30 uppercase tracking-widest border-r border-black/5">Task Identity</th>
                    <th className="px-5 py-4 text-[10px] font-black text-black/30 uppercase tracking-widest border-r border-black/5">Status</th>
                    <th className="px-5 py-4 text-[10px] font-black text-black/30 uppercase tracking-widest border-r border-black/5">Priority</th>
                    <th className="px-5 py-4 text-[10px] font-black text-black/30 uppercase tracking-widest border-r border-black/5">Milestone</th>
                    <th className="px-5 py-4 text-[10px] font-black text-black/30 uppercase tracking-widest">Assignee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {tasks.map(task => (
                    <tr 
                      key={task.id} 
                      onClick={() => setSelectedTask(task)}
                      className={cn(
                        "group hover:bg-black/[0.01] cursor-pointer transition-all transition-duration-200",
                        selectedTask?.id === task.id && "bg-black/[0.02]"
                      )}
                    >
                      <td className="px-5 py-3 border-r border-black/5">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 size={12} className={cn("mt-0.5", task.status === 'COMPLETED' ? "text-emerald-500" : "text-black/10")} />
                          <span className="text-[13px] font-bold text-black/80">{task.title}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 border-r border-black/5 uppercase">
                        <span className={cn("text-[9px] font-black", allColumns.find(c => c.id === task.status)?.text)}>{allColumns.find(c => c.id === task.status)?.label}</span>
                      </td>
                      <td className="px-5 py-3 border-r border-black/5">
                         <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight", PRIORITY_BADGE[task.priority])}>
                            {task.priority}
                         </span>
                      </td>
                      <td className="px-5 py-3 border-r border-black/5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-black/40">
                          {task.due_date ? dayjs(task.due_date).format('DD MMM YYYY') : '--'}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {task.assigned_to_employee ? (
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-black/40 uppercase">
                                {getInitials(task.assigned_to_employee.name)}
                             </div>
                             <span className="text-[11px] font-bold text-black/60">{task.assigned_to_employee.name}</span>
                          </div>
                        ) : <span className="text-[11px] text-black/20 font-medium italic">Unassigned</span>}
                      </td>
                    </tr>
                  ))}
                  {/* Inline Ghost Row */}
                  <tr 
                    onClick={() => { setView('board'); setAddingToColumn('TODO'); }}
                    className="group hover:bg-black/5 transition-all cursor-pointer border-t border-dashed border-black/10"
                  >
                    <td colSpan={5} className="px-5 py-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-black/25 uppercase tracking-widest group-hover:text-black transition-all">
                        <Plus size={14} /> Add New Operational Row
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-8 pb-20">
              {allColumns.map(col => {
                const colTasks = tasks.filter(t => t.status === col.id);
                if (colTasks.length === 0) return null;
                return (
                  <div key={col.id} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                       <div className={cn("w-2 h-2 rounded-full", col.dot)} />
                       <h3 className={cn("text-xs font-black uppercase tracking-widest", col.text)}>{col.label}</h3>
                       <span className="text-[10px] font-bold text-black/20">{colTasks.length} Units</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {colTasks.map(task => (
                        <div 
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="bg-white border border-black/5 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col gap-2 group"
                        >
                          <div className="flex justify-between items-start">
                             <h4 className="text-[13px] font-black text-black/80 leading-tight group-hover:text-black transition-colors">{task.title}</h4>
                             <span className={cn("px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight", PRIORITY_BADGE[task.priority])}>
                                {task.priority}
                             </span>
                          </div>
                          {task.description && <p className="text-[11px] text-black/40 line-clamp-2">{task.description}</p>}
                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/[0.02]">
                             <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-black/25">
                                <CalendarDays size={10} /> {task.due_date ? dayjs(task.due_date).format('MMM DD') : 'TBD'}
                             </div>
                             {task.assigned_to_employee && (
                               <div className="flex -space-x-1">
                                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-black text-black/40 shadow-sm" title={task.assigned_to_employee.name}>
                                    {getInitials(task.assigned_to_employee.name)}
                                  </div>
                               </div>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Task Detail Panel ──────────────────────────────────────────────── */}
        {selectedTask && (
          <div className="w-[400px] flex-shrink-0 bg-white border-l border-black/8 flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 ease-out">

            {/* Detail header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/8">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/30">Task Detail</span>
              <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-black/5 rounded text-black/25 hover:text-black transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* Title */}
              <div className="px-5 pt-5 pb-4 border-b border-black/5">
                <textarea
                  value={detailDraft.title || ''}
                  onChange={(e) => setDetailDraft(d => ({ ...d, title: e.target.value }))}
                  onBlur={() => { if (detailDraft.title !== selectedTask.title) saveDetail('title', detailDraft.title || ''); }}
                  rows={2}
                  className="w-full text-lg font-black text-black/85 outline-none resize-none bg-transparent placeholder:text-black/20 leading-snug"
                  placeholder="Task title…"
                />
              </div>

              {/* Properties */}
              <div className="px-5 py-4 space-y-3 border-b border-black/5">
                {[
                  {
                    label: 'Status',
                    content: (
                      <select
                        value={detailDraft.status || 'TODO'}
                        onChange={(e) => { setDetailDraft(d => ({ ...d, status: e.target.value })); saveDetail('status', e.target.value); }}
                        className="bg-transparent text-[12px] font-semibold text-black/70 outline-none w-full"
                      >
                        {allColumns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    )
                  },
                  {
                    label: 'Priority',
                    content: (
                      <select
                        value={detailDraft.priority || 'Medium'}
                        onChange={(e) => { setDetailDraft(d => ({ ...d, priority: e.target.value as any })); saveDetail('priority', e.target.value); }}
                        className="bg-transparent text-[12px] font-semibold text-black/70 outline-none w-full"
                      >
                        {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )
                  },
                  {
                    label: 'Assigned To',
                    content: (
                      <select
                        value={detailDraft.assigned_to || ''}
                        onChange={(e) => { setDetailDraft(d => ({ ...d, assigned_to: e.target.value || null })); saveDetail('assigned_to', e.target.value || null); }}
                        className="bg-transparent text-[12px] font-semibold text-black/70 outline-none w-full"
                      >
                        <option value="">Unassigned</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    )
                  },
                  {
                    label: 'Due Date',
                    content: (
                      <input
                        type="date"
                        value={detailDraft.due_date || ''}
                        onChange={(e) => { setDetailDraft(d => ({ ...d, due_date: e.target.value || null })); saveDetail('due_date', e.target.value || null); }}
                        className="bg-transparent text-[12px] font-semibold text-black/70 outline-none w-full"
                      />
                    )
                  },
                ].map(({ label, content }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-black/25 w-20 flex-shrink-0">{label}</span>
                    <div className="flex-1">{content}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="px-5 py-4 border-b border-black/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-black/25 mb-2">Description</p>
                <textarea
                  value={detailDraft.description || ''}
                  onChange={(e) => setDetailDraft(d => ({ ...d, description: e.target.value }))}
                  onBlur={() => { if (detailDraft.description !== selectedTask.description) saveDetail('description', detailDraft.description || null); }}
                  rows={3}
                  placeholder="Add a description…"
                  className="w-full text-[13px] text-black/60 outline-none resize-none bg-transparent placeholder:text-black/20 leading-relaxed"
                />
              </div>

              {/* Comments */}
              <div className="px-5 py-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-black/25 mb-3">
                  Comments <span className="text-black/40">{comments.length > 0 ? `· ${comments.length}` : ''}</span>
                </p>
                {comments.length === 0 ? (
                  <p className="text-[11px] text-black/20 italic">No comments yet. Be the first to add one.</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="group flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[8px] font-black text-white flex-shrink-0 mt-0.5">
                          {c.author_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black text-black/50">{c.author_name}</span>
                            <span className="text-[9px] text-black/20">{dayjs(c.created_at).format('DD MMM, HH:mm')}</span>
                          </div>
                          <p className="text-[12px] text-black/70 leading-relaxed">{c.content}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 hover:text-rose-500 rounded transition-all text-black/20 flex-shrink-0"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Comment input */}
            <div className="px-5 py-3 border-t border-black/8 bg-white flex-shrink-0">
              <div className="flex items-center gap-2 bg-black/3 rounded-xl px-3 py-2">
                <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-[7px] font-black text-white flex-shrink-0">
                  {(user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  placeholder="Add a comment… (Enter to send)"
                  className="flex-1 bg-transparent text-[12px] text-black/70 outline-none placeholder:text-black/20"
                />
                {newComment.trim() && (
                  <button onClick={handleAddComment} className="p-1 bg-black text-white rounded-lg hover:opacity-80 transition-all flex-shrink-0">
                    <Check size={11} />
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ── Tracking Matrix Modal ──────────────────────────────────
function OversightModal({ project, onClose, teams }: { project: Project; onClose: () => void; teams: Team[] }) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const department = teams.find(t => t.id === project.department_id);

  useEffect(() => {
    async function loadOversight() {
      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          *,
          assignee:employees(id, name, role)
        `)
        .eq("project_id", project.id);
      
      if (!error) setTasks(data || []);
      setLoading(false);
    }
    loadOversight();
  }, [project.id]);

  const projectTeams = teams.filter(t => project.teamIds?.includes(t.id));

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-[85vh] rounded-3xl bg-theme-surface shadow-2xl border border-theme-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme-border bg-theme-raised/30 px-8 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-theme-surface shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-theme-fg tracking-tight">Oversight Matrix</h3>
              <p className="text-xs text-theme-muted font-bold uppercase tracking-widest flex items-center gap-2">
                {project.name} <ChevronRight size={12} /> {department?.name || "Global Assignment"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2.5 text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col h-full items-center justify-center gap-4 text-theme-muted">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-primary border-t-transparent" />
              <p className="text-sm font-bold animate-pulse">Synchronizing Node Data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Team Breakdown */}
              <div className="lg:col-span-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                    <Users size={14} className="text-theme-primary" /> Operational Hierarchy
                  </h4>
                  <div className="text-[10px] font-bold px-2 py-1 rounded-lg bg-theme-raised border border-theme-border">
                    {projectTeams.length} Active Units
                  </div>
                </div>

                <div className="space-y-6">
                  {projectTeams.length > 0 ? projectTeams.map(team => {
                    const teamTasks = tasks.filter(t => t.assignee?.id && /* logic to check if assignee is in team */ true); 
                    // Note: for now showing all project tasks under each team if assigned to anyone
                    // In a real app we'd filter by team membership
                    
                    return (
                      <div key={team.id} className="rounded-2xl border border-theme-border bg-theme-raised/40 p-6 space-y-4 hover:border-theme-primary/30 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-theme-surface border border-theme-border flex items-center justify-center">
                              <LayoutGrid size={18} className="text-theme-primary" />
                            </div>
                            <div>
                              <h5 className="text-sm font-black text-theme-fg">{team.name}</h5>
                              <p className="text-[10px] text-theme-muted font-bold flex items-center gap-1.5">
                                <User size={10} /> Lead Assigned
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black text-theme-primary bg-theme-primary/10 px-2.5 py-1 rounded-lg uppercase">Team Status</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {tasks.length > 0 ? tasks.map(task => (
                            <div key={task.id} className="bg-theme-surface rounded-xl border border-theme-border p-4 shadow-sm hover:shadow-md transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                                  task.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-600" :
                                  task.status === 'SUBMITTED' ? "bg-amber-500/10 text-amber-600" :
                                  "bg-blue-500/10 text-blue-600"
                                )}>
                                  {task.status}
                                </span>
                                <span className="text-[10px] text-theme-muted font-bold">
                                  {task.priority}
                                </span>
                              </div>
                              <h6 className="text-xs font-bold text-theme-fg truncate">{task.title}</h6>
                              <div className="mt-3 flex items-center justify-between border-t border-theme-border/50 pt-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-theme-primary/20 flex items-center justify-center text-[8px] font-black">
                                    {task.assignee?.name?.charAt(0)}
                                  </div>
                                  <span className="text-[10px] font-bold text-theme-muted">{task.assignee?.name || "Unassigned"}</span>
                                </div>
                                {task.submission_url && (
                                  <button className="text-[10px] font-black text-theme-primary hover:underline">View Work</button>
                                )}
                              </div>
                            </div>
                          )) : (
                            <div className="col-span-2 text-center py-6 border-2 border-dashed border-theme-border rounded-xl">
                              <p className="text-xs text-theme-muted font-bold italic">No tasks delegated to this unit yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-12 bg-theme-raised/40 rounded-3xl border-2 border-dashed border-theme-border">
                      <p className="text-sm text-theme-muted font-bold">No organizational units assigned to this project.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Key Metrics & Timeline */}
              <div className="lg:col-span-4 space-y-6">
                 <div className="rounded-2xl border border-theme-border bg-theme-primary/5 p-6 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-theme-muted">Health Matrix</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-theme-fg">Completion progress</span>
                          <span className="text-theme-primary">{project.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-theme-border rounded-full overflow-hidden">
                          <div className="h-full bg-theme-primary rounded-full transition-all duration-500" style={{ width: `${project.progress}%` }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-theme-surface border border-theme-border rounded-xl p-3 text-center">
                          <p className="text-[9px] font-black text-theme-muted uppercase">Open Tasks</p>
                          <p className="text-lg font-black text-theme-fg">{tasks.filter(t => t.status !== 'COMPLETED').length}</p>
                        </div>
                        <div className="bg-theme-surface border border-theme-border rounded-xl p-3 text-center">
                          <p className="text-[9px] font-black text-theme-muted uppercase">Pending Reviews</p>
                          <p className="text-lg font-black text-amber-500">{tasks.filter(t => t.status === 'SUBMITTED').length}</p>
                        </div>
                      </div>
                    </div>
                 </div>

                 <div className="rounded-2xl border border-theme-border bg-theme-raised/40 p-6 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-theme-muted">Node Intelligence</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                        <p className="text-[11px] leading-relaxed text-theme-fg">
                          Project initiated by <strong>Admin Registry</strong> on {dayjs(project.issued_date).format("MMM DD, YYYY")}
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                        <p className="text-[11px] leading-relaxed text-theme-fg">
                          Flowing through <strong>{department?.name || "General"}</strong> department for operational oversight.
                        </p>
                      </div>
                      {tasks.length > 0 && (
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          <p className="text-[11px] leading-relaxed text-theme-fg">
                            {tasks.filter(t => t.status === 'SUBMITTED').length} submissions awaiting backward approval from team leads.
                          </p>
                        </div>
                      )}
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
