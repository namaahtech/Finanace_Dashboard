"use client";

import { useState, useMemo, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useToast } from "@/components/ui/Toast";
import { cn, formatCurrency } from "@/lib/utils";
import { 
  Folder, Users, CheckCircle2, CircleDashed, Clock, Building2, Search, Zap, 
  X, TrendingUp, Plus, FileText, ChevronDown, CalendarDays, Tag, ShieldCheck,
  MoreVertical, Edit2, Trash2, LayoutGrid, List, ArrowRightLeft, Target
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

// â”€â”€â”€â”€ MOCK REGISTRY â”€â”€â”€â”€
const CLIENTS = [
  { id: "c1", name: "Nexus Holdings", lead: "Arthur Clarke" },
  { id: "c2", name: "Axiom Aerospace", lead: "Elon Reeve" },
  { id: "c3", name: "Vertex Logistics", lead: "Sarah Connor" },
];

const ORG_TEAMS = [
  { id: "t1", name: "Alpha Engineering" },
  { id: "t2", name: "Delta Operations" },
  { id: "t3", name: "Omega Security" },
  { id: "t4", name: "Nexus Deployment Hub" }
];

type ProjectPhase = "SCOPING" | "IMPLEMENTATION" | "REVIEW" | "COMPLETED";

interface Project {
  id: string;
  name: string;
  description: string;
  budget: number;
  clientId: string;
  teamIds: string[];
  phase: ProjectPhase;
  dueDate: string;
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Titan Server Migration",
    description: "Complete overhaul of the Axiom backend infrastructure to hybrid cloud.",
    budget: 4500000,
    clientId: "c2",
    teamIds: ["t1", "t3"],
    phase: "IMPLEMENTATION",
    dueDate: "2026-11-15",
  },
  {
    id: "p2",
    name: "Nexus Frontend Rewrite",
    description: "Deploying the V3 web portal.",
    budget: 1200000,
    clientId: "c1",
    teamIds: ["t4"],
    phase: "SCOPING",
    dueDate: "2027-01-30",
  },
  {
    id: "p3",
    name: "Logistics Optimization AI",
    description: "Neural net routing map integration.",
    budget: 850000,
    clientId: "c3",
    teamIds: ["t2"],
    phase: "REVIEW",
    dueDate: "2026-12-05",
  },
];

const B = "#FBFBFA"; // Documentarian BG
const ROW_HOVER = "hover:bg-black/[0.02]";

const PHASE_CONFIG: Record<ProjectPhase, { label: string; bg: string; text: string; icon: any }> = {
  SCOPING: { label: "Scoping & Proposal", bg: "bg-amber-50 border-amber-100", text: "text-amber-700", icon: Target },
  IMPLEMENTATION: { label: "Implementation", bg: "bg-sky-50 border-sky-100", text: "text-sky-700", icon: Zap },
  REVIEW: { label: "Quality Review", bg: "bg-purple-50 border-purple-100", text: "text-purple-700", icon: ArrowRightLeft },
  COMPLETED: { label: "Completed", bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
};

export default function ProjectsPage() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [search, setSearch] = useState("");
  
  // Centered Modal State
  const [showOverlay, setShowOverlay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  
  const [form, setForm] = useState<Partial<Project>>({
    name: "", description: "", budget: 0, clientId: "", teamIds: [], phase: "SCOPING", dueDate: ""
  });

  const activeCount = projects.filter(p => p.phase !== "COMPLETED").length;
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);

  const filtered = useMemo(() => {
    return projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || getClientName(p.clientId).toLowerCase().includes(search.toLowerCase()));
  }, [projects, search]);

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.clientId || (form.teamIds?.length ?? 0) === 0) {
      showToast("Architecture incomplete. Assign Project Name, Client, and Team.", "warning");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      if (editingId) {
        // Update existing project
        setProjects(projects.map(p => p.id === editingId ? { ...p, ...form } as Project : p));
      } else {
        // Create new project
        const newProject: Project = {
          id: `PROJ-${Date.now()}`,
          name: form.name!,
          description: form.description || "",
          budget: form.budget || 0,
          clientId: form.clientId!,
          teamIds: form.teamIds || [],
          phase: form.phase as ProjectPhase || "SCOPING",
          dueDate: form.dueDate || new Date().toISOString().split('T')[0],
        };
        setProjects([newProject, ...projects]);
      }
      
      closeOverlay();
    }, 400);
  };

  const handleStartEdit = (project: Project) => {
    setForm({ ...project });
    setEditingId(project.id);
    setShowOverlay(true);
  };

  const closeOverlay = () => {
    setShowOverlay(false);
    setSubmitting(false);
    setEditingId(null);
    setForm({ name: "", description: "", budget: 0, clientId: "", teamIds: [], phase: "SCOPING", dueDate: "" });
  };

  const deleteProject = (id: string, name: string) => {
    if (confirm(`Deprovision project unit: ${name}?`)) {
      setProjects(prev => prev.filter(p => p.id !== id));
      showToast("Unit deprovisioned successfully.", "success");
    }
  };

  const toggleTeam = (id: string) => {
    setForm(prev => {
      const current = prev.teamIds || [];
      return { ...prev, teamIds: current.includes(id) ? current.filter(t => t !== id) : [...current, id] };
    });
  };

  function getClientName(id: string) { return CLIENTS.find(c => c.id === id)?.name || "Unknown Entity"; }
  function getTeamName(id: string) { return ORG_TEAMS.find(t => t.id === id)?.name || id; }

  const InputCls = "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black/90 outline-none focus:border-sky-500 transition-all shadow-sm";
  const LabelCls = "mb-1 flex items-center gap-1.5 text-xs font-bold text-black/50 uppercase tracking-widest";

  // Escape listener matching the employee overlay
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") closeOverlay(); };
    if (showOverlay) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showOverlay]);

  // Project More actions Dropdown
  const ProjectActions = ({ project }: { project: Project }) => (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/5 transition-all text-black/40 hover:text-black">
          <MoreVertical size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="min-w-[160px] bg-white border border-black/5 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-1.5 z-50 animate-in fade-in zoom-in duration-200" sideOffset={5} align="end">
          <DropdownMenu.Item onClick={() => handleStartEdit(project)} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-black/70 hover:bg-black/5 outline-none cursor-pointer rounded-lg transition-colors">
            <Edit2 size={12} className="text-black/40" /> Edit Project
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="h-[1px] bg-black/5 my-1" />
          <DropdownMenu.Item onClick={() => deleteProject(project.id, project.name || "Unknown Project")} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 outline-none cursor-pointer rounded-lg transition-colors">
            <Trash2 size={12} /> Delete Project
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  return (
    <DashboardShell 
      title="Projects Management" 
      subtitle="Track your company's projects, assigned teams, and budgets."
      actions={
        <button 
          onClick={() => { setEditingId(null); setForm({ name: "", description: "", budget: 0, clientId: "", teamIds: [], phase: "SCOPING", dueDate: "" }); setShowOverlay(true); }}
          className="flex items-center gap-2 rounded-lg bg-black text-white px-5 py-2.5 text-[11px] font-black uppercase tracking-widest hover:bg-black/80 transition-all shadow-md"
        >
          <Plus size={14} /> Add Project
        </button>
      }
    >
      <div className="flex flex-col gap-6 -m-8 p-8 min-h-full" style={{ background: B }}>
        
        {/* HUD */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-black/5 p-4 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-black/[0.04] flex items-center justify-center"><Folder size={16} className="text-black/60" /></div>
            <div><p className="text-[10px] uppercase font-black tracking-widest text-black/40">Total Projects</p><p className="text-xl font-black text-black/80">{projects.length}</p></div>
          </div>
          <div className="bg-white border border-black/5 p-4 rounded-xl flex items-center gap-3 shadow-sm">
             <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Zap size={16} className="text-emerald-600" /></div>
            <div><p className="text-[10px] uppercase font-black tracking-widest text-black/40">Active Projects</p><p className="text-xl font-black text-emerald-600">{activeCount}</p></div>
          </div>
          <div className="bg-white border border-black/5 p-4 rounded-xl flex items-center gap-3 shadow-sm">
             <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><TrendingUp size={16} className="text-purple-600" /></div>
            <div><p className="text-[10px] uppercase font-black tracking-widest text-black/40">Total Budget</p><p className="text-xl font-black text-purple-700 tracking-tight">{formatCurrency(totalBudget)}</p></div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-black/5">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
            <input type="text" placeholder="Search projects or clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-4 py-2 rounded-lg border border-black/5 bg-black/[0.02] text-xs font-bold w-full outline-none focus:bg-white focus:border-black/20 transition-all"/>
          </div>
        </div>

        {/* DATABASE TABLE VIEW STRICT */}
        <div className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs font-semibold text-theme-muted">
                  <th className="px-5 py-3 whitespace-nowrap">Project Name</th>
                  <th className="px-5 py-3 whitespace-nowrap">Client</th>
                  <th className="px-5 py-3 whitespace-nowrap">Budget</th>
                  <th className="px-5 py-3 whitespace-nowrap">Assigned Teams</th>
                  <th className="px-5 py-3 whitespace-nowrap">Project Phase</th>
                  <th className="px-5 py-3 whitespace-nowrap text-right">Due Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filtered.map(project => {
                  const phaseData = PHASE_CONFIG[project.phase];
                  const PhaseIcon = phaseData.icon;
                  return (
                    <tr key={project.id} className={cn("transition-colors group", ROW_HOVER)}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-theme-fg">{project.name}</p>
                        <p className="text-xs text-theme-muted mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">{project.description}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-theme-muted font-medium">
                          <Building2 size={13} /> {getClientName(project.clientId)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-theme-fg">{formatCurrency(project.budget)}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {project.teamIds.map(tid => (
                            <span key={tid} className="px-2 py-0.5 rounded-md bg-theme-raised text-theme-muted text-xs font-medium">
                              {getTeamName(tid)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md border", phaseData.bg, phaseData.text)}>
                          <PhaseIcon size={12} /> {phaseData.label}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="text-xs text-theme-muted">{new Date(project.dueDate).toLocaleDateString()}</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ProjectActions project={project} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* CENTERED MODAL OVERLAY */}
        {showOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-black/10 overflow-hidden flex flex-col max-h-[90vh] slide-in-from-bottom-2 duration-300">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-black/5 px-6 py-5 bg-black/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white shadow-md">
                    <Folder size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-black/90 tracking-tight uppercase">
                      {editingId ? "Edit Project Details" : "Create New Project"}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                      {editingId ? "Update existing project records" : "Add a new project to your database"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeOverlay}
                  className="rounded-lg p-2 text-black/40 hover:bg-black/5 hover:text-black transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleCreateOrUpdate} id="add-proj-form" className="space-y-6">
                  
                  <div className="space-y-4">
                    <div>
                      <label className={LabelCls}><FileText size={12} /> Project Name</label>
                      <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Website Redesign..." className={InputCls} />
                    </div>
                    <div>
                      <label className={LabelCls}><FileText size={12} /> Description</label>
                      <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional short summary..." className={InputCls} />
                    </div>
                    <div>
                      <label className={LabelCls}><TrendingUp size={12} /> Budget (&#8377;)</label>
                      <input type="number" required value={form.budget || ""} onChange={e => setForm({...form, budget: parseFloat(e.target.value) || 0})} placeholder="0" className={cn(InputCls, "font-mono font-bold tracking-tight")} />
                    </div>
                  </div>

                  <div className="my-6 border-t border-black/5" />

                  {/* Relational Bindings */}
                  <div className="space-y-6 bg-black/[0.02] border border-black/5 p-4 rounded-xl">
                    <p className="text-[10px] font-black uppercase text-black/40 tracking-widest -mt-1"><Tag size={10} className="inline mr-1"/> Links and Teams</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={LabelCls}><Building2 size={12} /> Select Client</label>
                        <div className="relative">
                          <select required value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} className={cn(InputCls, "appearance-none bg-white cursor-pointer")}>
                            <option value="" disabled>-- Select a Client --</option>
                            {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className={LabelCls}><CalendarDays size={12} /> Due Date</label>
                        <input type="date" required value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className={InputCls} />
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <label className={LabelCls} style={{ marginBottom: 0 }}><ShieldCheck size={12} /> Assign Teams</label>
                      </div>
                      
                      {/* Multi-Select Dropdown Trigger */}
                      <button 
                        type="button" 
                        onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                        className={cn(InputCls, "flex justify-between items-center bg-white cursor-pointer relative")}
                      >
                        <span className={cn("text-sm", form.teamIds?.length ? "text-black/90 font-bold" : "text-black/50")}>
                          {form.teamIds?.length 
                            ? `${form.teamIds.length} Team${form.teamIds.length > 1 ? 's' : ''} Selected` 
                            : "-- Select Teams --"}
                        </span>
                        <ChevronDown size={14} className="text-black/30" />
                      </button>

                      {/* Dropdown Body */}
                      {teamDropdownOpen && (
                        <div className="absolute top-[100%] mt-2 left-0 w-full z-10 bg-white border border-black/10 shadow-xl rounded-xl p-2 max-h-48 overflow-y-auto">
                          <div className="flex flex-col gap-1">
                            {ORG_TEAMS.map(team => {
                              const isAssigned = form.teamIds?.includes(team.id);
                              return (
                                <button
                                  type="button" key={team.id}
                                  onClick={() => toggleTeam(team.id)}
                                  className={cn(
                                    "flex justify-between items-center p-2.5 rounded-lg border border-transparent transition-all text-left",
                                    isAssigned ? "bg-black/[0.04] text-black" : "hover:bg-black/5"
                                  )}
                                >
                                  <span className={cn("text-xs font-bold tracking-tight", isAssigned ? "text-black" : "text-black/70")}>{team.name}</span>
                                  {isAssigned && <CheckCircle2 size={14} className="text-emerald-500" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Rendered Selected Badges Underneath */}
                      {form.teamIds && form.teamIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 p-3 bg-white border border-black/5 rounded-lg">
                          {form.teamIds.map(tid => (
                            <div key={tid} className="flex items-center gap-1.5 px-2.5 py-1 bg-black text-white rounded text-[10px] font-black uppercase tracking-widest shadow-sm">
                              {getTeamName(tid)}
                              <X 
                                size={12} 
                                className="cursor-pointer text-white/50 hover:text-white transition-colors" 
                                onClick={() => toggleTeam(tid)} 
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="my-6 border-t border-black/5" />

                  {/* Operational Phase Matrix */}
                  <div>
                    <label className={LabelCls}><Zap size={12} /> Project Phase</label>
                    <div className="relative">
                      <select value={form.phase} onChange={e => setForm({...form, phase: e.target.value as ProjectPhase})} className={cn(InputCls, "appearance-none cursor-pointer font-bold")}>
                        <option value="SCOPING">Scoping & Proposal</option>
                        <option value="IMPLEMENTATION">Implementation</option>
                        <option value="REVIEW">Quality Review</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
                    </div>
                  </div>

                </form>
              </div>

              {/* Footer */}
              <div className="border-t border-black/5 p-5 bg-black/[0.01] flex justify-end gap-3 z-10">
                <button type="button" onClick={closeOverlay} className="px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-black/50 hover:bg-black/5 transition-all outline-none">
                  Cancel
                </button>
                <button form="add-proj-form" type="submit" disabled={submitting} className="flex items-center gap-2 rounded-lg bg-black text-white px-8 py-2.5 text-[11px] font-black uppercase tracking-widest hover:bg-black/80 transition-all shadow-md disabled:opacity-50 outline-none">
                  {submitting ? "Saving..." : editingId ? "Update Project" : "Add Project"}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
