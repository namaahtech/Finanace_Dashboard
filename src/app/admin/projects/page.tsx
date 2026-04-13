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
  Trash2, SearchCode, ShieldCheck, Tag, LayoutGrid, Building
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import dayjs from "dayjs";

type ProjectPhase = "SCOPING" | "IMPLEMENTATION" | "REVIEW" | "COMPLETED";

interface Client {
  id: string;
  name: string;
  lead_name: string;
}

interface Team {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  budget: number;
  clientId: string;
  teamIds: string[];
  phase: ProjectPhase;
  dueDate: string;
  is_active: boolean;
  client?: Client;
  teams?: Team[];
}

const PHASE_CONFIG: Record<ProjectPhase, { label: string; bg: string; text: string; icon: any; variant: any }> = {
  SCOPING: { label: "Scoping & Proposal", bg: "bg-amber-500/10", text: "text-amber-600", icon: Target, variant: "warning" },
  IMPLEMENTATION: { label: "Implementation", bg: "bg-sky-500/10", text: "text-sky-600", icon: Zap, variant: "info" },
  REVIEW: { label: "Quality Review", bg: "bg-purple-500/10", text: "text-purple-600", icon: ArrowRightLeft, variant: "purple" },
  COMPLETED: { label: "Completed", bg: "bg-emerald-500/10", text: "text-emerald-600", icon: CheckCircle2, variant: "success" },
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
function RowMenu({ project, onRefresh, onEdit, isLast, setDeleteConfirm }: { 
  project: Project; 
  onRefresh: () => void; 
  onEdit: () => void;
  isLast?: boolean; 
  setDeleteConfirm: (p: Project) => void;
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
            <Edit2 size={13} className="text-theme-muted group-hover:text-theme-primary transition-colors" /> Edit Project
          </button>
          <button onClick={toggleStatus}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
            <Clock size={13} className="text-sky-500" /> {project.is_active ? "Archive Project" : "Activate Project"}
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
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "archived">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null);
  
  const [form, setForm] = useState({
    name: "", description: "", budget: "",
    client_id: "", phase: "SCOPING", due_date: "",
    team_ids: [] as string[]
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
    const [cRes, tRes] = await Promise.all([
      axios.get("/api/config/clients"),
      supabase.from("teams").select("id, name")
    ]);
    setClients(cRes.data.clients || []);
    setTeams(tRes.data || []);
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
      due_date: dayjs().add(3, "month").format("YYYY-MM-DD"),
      team_ids: []
    });
    setShowForm(true);
  }

  function handleEdit(p: Project) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      budget: String(p.budget),
      client_id: p.clientId,
      phase: p.phase,
      due_date: p.dueDate,
      team_ids: p.teamIds || []
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
      // loadData is handled by real-time subscription
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
                      <tr key={p.id} className="group hover:bg-theme-raised/30 transition-all duration-300">
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
                          <RowMenu project={p} onRefresh={() => loadData(search || undefined)} onEdit={() => handleEdit(p)} isLast={idx >= filteredProjects.length - 2} setDeleteConfirm={setDeleteConfirm} />
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

                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-primary">Operational Units (Team Assignment)</label>
                    <MultiSelect 
                        icon={<LayoutGrid size={14} className="text-theme-primary" />}
                        placeholder="Assign Teams to Cluster..."
                        value={form.team_ids}
                        onChange={(v) => setForm({...form, team_ids: v})}
                        options={(teams || []).map(t => ({ label: t.name, value: t.id }))}
                        label="Assigned Teams"
                    />
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
    </DashboardShell>
  );
}
