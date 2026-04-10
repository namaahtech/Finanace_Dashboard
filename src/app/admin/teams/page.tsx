"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Users,
  Plus,
  Search,
  Crown,
  X,
  GitMerge,
  Edit2,
  Trash2,
  Settings2
} from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator } from "@/components/ui/Select";
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type ViewMode = "grid" | "table";

export default function TeamsPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "created_at">("name");
  const [loading, setLoading] = useState(true);
  
  // Realtime Supabase Data
  const [teamsData, setTeamsData] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  
  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);

  // Form State
  const [form, setForm] = useState({ 
    id: "",
    name: "", 
    type: "department", 
    parent_id: "none", 
    head_designation: "" 
  });

  const [configForm, setConfigForm] = useState({
    company_name: "",
    founder_name: "",
    founder_designation: ""
  });

  async function fetchData() {
    try {
      setLoading(true);
      const [teamsRes, configRes] = await Promise.all([
        axios.get('/api/teams'),
        supabase.from('system_config').select('*').limit(1).single()
      ]);
      
      if (teamsRes.data.teams) setTeamsData(teamsRes.data.teams);
      if (configRes.data) {
        setConfig(configRes.data);
        setConfigForm({
          company_name: configRes.data.company_name || "",
          founder_name: configRes.data.founder_name || "",
          founder_designation: configRes.data.founder_designation || ""
        });
      }
    } catch (e: any) {
      console.error("Fetch Fault:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Structural Processing Logic
  const departments = useMemo(() => teamsData.filter(t => t.type === 'department'), [teamsData]);
  const subTeams = useMemo(() => teamsData.filter(t => t.type === 'team'), [teamsData]);
  const deptFilters = ["All", ...departments.map(d => d.name)];

  const finalArrangement = useMemo(() => {
    const filtered = teamsData.filter((t: any) => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
      if (typeFilter !== "All" && t.type !== typeFilter.toLowerCase()) return false;
      if (deptFilter !== "All") {
        if (t.type === 'department' && t.name !== deptFilter) return false;
        if (t.type === 'team') {
          const parent = teamsData.find((d: any) => d.id === t.parent_id);
          if (parent?.name !== deptFilter) return false;
        }
      }
      return matchSearch;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // If filtering by a specific type, show flat list (teams have parent_id so tree from null misses them)
    // Otherwise build the full tree
    if (typeFilter !== "All") {
      return sorted;
    }

    const buildTree = (parentId: string | null): any[] => {
      return sorted
        .filter(t => t.parent_id === parentId)
        .reduce((acc: any[], item: any) => [...acc, item, ...buildTree(item.id)], []);
    };

    return buildTree(null);
  }, [teamsData, search, deptFilter, typeFilter, sortBy]);

  async function handleSaveEntity() {
    if (!form.name || !form.head_designation) {
      showToast("Identity breakdown required.", "warning");
      return;
    }

    try {
      const payload: any = {
        name: form.name,
        type: form.type,
        head_designation: form.head_designation,
        department: form.type === 'department' ? form.name : "Sub-Team"
      };

      if (form.type === "team" && form.parent_id !== "none") {
        payload.parent_id = form.parent_id;
        const parent = teamsData.find((d: any) => d.id === form.parent_id);
        if (parent) payload.department = parent.name;
      }

      let res;
      if (editingItem) {
        res = await axios.patch(`/api/teams`, { id: editingItem.id, ...payload });
      } else {
        res = await axios.post('/api/teams', payload);
      }
      
      if (res.data.error) throw new Error(res.data.error);
      
      showToast(`Node '${form.name}' synchronized to the cloud.`, "success");
      setShowForm(false);
      setEditingItem(null);
      setForm({ id: "", name: "", type: "department", parent_id: "none", head_designation: "" });
      fetchData();
    } catch (e: any) {
      showToast("Sync Interrupted: " + (e.response?.data?.error || e.message), "error");
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;
    try {
      const res = await axios.delete(`/api/teams?id=${id}`);
      if (res.data.error) throw new Error(res.data.error);
      showToast(`Node '${name}' purged from architecture.`, "success");
      setDeleteConfirm(null);
      fetchData();
    } catch (e: any) {
      showToast("Purge Failed: " + e.message, "error");
    }
  }

  async function handleUpdateConfig() {
    try {
      const { error } = await supabase
        .from('system_config')
        .update(configForm)
        .eq('id', config.id);
      
      if (error) throw error;
      showToast("Root Identity recalibrated.", "success");
      setShowConfigForm(false);
      fetchData();
    } catch (e: any) {
      showToast("Config Fail: " + e.message, "error");
    }
  }

  return (
    <DashboardShell
      title="Architecture Matrix"
      subtitle="Administrative management of the enterprise-grade organizational tree."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConfigForm(true)}>
            <Settings2 size={14} className="mr-1.5" /> Root Node
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setEditingItem(null); setForm({ id: "", type: 'department', name: "", head_designation: "", parent_id: "none" }); setShowForm(true); }}>
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Architecture Nodes", value: teamsData.length, icon: GitMerge, color: "text-theme-fg", bg: "bg-theme-raised" },
            { label: "Departments", value: departments.length, icon: Building2, color: "text-amber-600", bg: "bg-amber-500/10" },
            { label: "Operational Teams", value: subTeams.length, icon: Users, color: "text-sky-600", bg: "bg-sky-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-4 border border-theme-border h-full">
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={17} className={color} />
              </div>
              <div>
                <p className="text-xs text-theme-muted font-bold tracking-tight">{label}</p>
                <p className={cn("text-2xl font-black leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {deptFilters.map((d: any) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border border-transparent",
                  deptFilter === d
                    ? "bg-theme-primary text-theme-surface shadow-sm border-theme-strong/20"
                    : "bg-theme-raised text-theme-muted hover:text-theme-fg hover:border-theme-border"
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
             <div className="w-36">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-[10px] bg-theme-raised border-theme-border font-black uppercase">
                    <SelectValue placeholder="All Units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Entities</SelectItem>
                    <SelectItem value="department">Departments</SelectItem>
                    <SelectItem value="team">Teams</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="w-40">
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-8 text-[10px] bg-theme-raised border-theme-border font-black uppercase">
                    <SelectValue placeholder="Sort Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Alphabetical</SelectItem>
                    <SelectItem value="created_at">Recently Added</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
               <input
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search tree…"
                 className="h-8 w-44 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all"
               />
             </div>
          </div>
        </div>

        {loading ? (
          <div className="text-theme-muted text-sm text-center py-10 animate-pulse font-black uppercase tracking-widest">Hydrating Pulse Matrix...</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {finalArrangement.map((item: any) => {
              const isDept = item.type === "department";
              const parent = item.parent_id ? teamsData.find(t => t.id === item.parent_id) : null;

              return (
                <div 
                  key={item.id} 
                  className={cn(
                    "page-card group relative overflow-hidden transition-all hover:shadow-md border flex flex-col h-full", 
                    isDept 
                      ? "border-amber-500/20 bg-amber-500/[0.02]" 
                      : "border-theme-border",
                  )}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xs font-black", isDept ? "bg-amber-500/10 text-amber-600" : "bg-theme-primary text-theme-surface")}>
                        {isDept ? <Building2 size={16} /> : <Users size={16} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-[13px] font-bold text-theme-fg">{item.name}</h4>
                        <Badge variant={isDept ? "warning" : "default"} className="mt-1 text-[8px] tracking-widest px-1.5">
                          {isDept ? 'Department' : 'Operational Unit'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingItem(item); setForm({ ...item, parent_id: item.parent_id || "none" }); setShowForm(true); }}
                        className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-colors"
                      >
                         <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({ id: item.id, name: item.name })}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-theme-muted hover:text-red-500 transition-colors"
                      >
                         <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-theme-raised px-3 py-2.5">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-theme-page border border-theme-border shadow-sm">
                      <Crown size={11} className="text-theme-muted" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-widest text-theme-muted opacity-60">Lead Designation</p>
                      <p className="text-[11px] font-bold text-theme-fg truncate">{item.head_designation}</p>
                    </div>
                  </div>

                  {!isDept && parent && (
                    <div className="text-[10px] flex items-center gap-1 mt-auto pt-4 text-theme-subtle">
                       <GitMerge size={12} className="shrink-0" /> 
                       <span className="truncate">Reports to: <span className="font-semibold text-theme-fg">{parent.name}</span></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-theme-surface shadow-2xl border border-theme-border overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-theme-raised flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white shadow-md">
                   {editingItem ? <Edit2 size={14} /> : <Plus size={14} />}
                </div>
                <div>
                  <h3 className="text-[13px] uppercase tracking-widest font-black text-theme-fg">
                    {editingItem ? `Calibrate ${editingItem.name}` : `Establish New Node`}
                  </h3>
                  <p className="text-[10px] font-medium text-theme-muted mt-0.5">
                    Define the structural properties of this organizational unit.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-page hover:text-theme-fg transition-colors"><X size={16} /></button>
            </div>

            <div className="p-6 bg-theme-page/50">
              <div className="space-y-4">
                <div className="bg-theme-surface border border-theme-border p-4 rounded-xl space-y-4 shadow-sm">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-theme-muted">Unit Category</label>
                    <Select onValueChange={(v) => setForm({ ...form, type: v, parent_id: "none" })} value={form.type} required>
                      <SelectTrigger className="font-bold border-theme-border bg-theme-page h-9 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="department">Department</SelectItem>
                          <SelectItem value="team">Team</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.type === "team" && (
                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-theme-muted">Hierarchical Parent</label>
                      <Select onValueChange={(v) => setForm({ ...form, parent_id: v })} value={form.parent_id} required>
                        <SelectTrigger className="font-bold border-theme-border bg-theme-page h-9 text-xs"><SelectValue placeholder="Attach to node" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectGroup>
                            <SelectItem value="none">Set as Independent</SelectItem>
                            <SelectLabel>Departments</SelectLabel>
                            {departments.map((d: any) => (
                              <SelectItem key={d.id} value={d.id}>{d.name} (Dept)</SelectItem>
                            ))}
                            <SelectSeparator />
                            <SelectLabel>Existing Teams</SelectLabel>
                            {subTeams.map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>{t.name} (Team)</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-theme-muted">Entity Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sales Division"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="field h-10 px-4"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-theme-muted">Lead Designation</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. General Manager"
                      value={form.head_designation}
                      onChange={(e) => setForm({ ...form, head_designation: e.target.value })}
                      className="field h-10 px-4"
                    />
                  </div>
                </div>

                <div className="bg-theme-raised flex items-center justify-end border-theme-border pt-4 gap-3">
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="font-bold border-theme-border">Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleSaveEntity} className="font-bold bg-black text-white px-6">
                    {editingItem ? 'Update Architecture' : 'Commit to Matrix'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROOT CONFIG MODAL */}
      {showConfigForm && (
        <div className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-theme-surface shadow-2xl border border-theme-border overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-theme-raised flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white shadow-md">
                   <Settings2 size={14} />
                </div>
                <div>
                  <h3 className="text-[13px] uppercase tracking-widest font-black text-theme-fg">Root Node Identity</h3>
                  <p className="text-[10px] font-medium text-theme-muted mt-0.5">Edit major company profile metadata.</p>
                </div>
              </div>
              <button onClick={() => setShowConfigForm(false)} className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-page hover:text-theme-fg transition-colors"><X size={16} /></button>
            </div>
            <div className="p-6 bg-theme-page/50 space-y-4">
               <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-theme-muted">Company Name (Tree Root)</label>
                  <input
                    type="text"
                    value={configForm.company_name}
                    onChange={(e) => setConfigForm({ ...configForm, company_name: e.target.value })}
                    className="field h-10 px-4"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-theme-muted">Founder / CEO</label>
                    <input
                      type="text"
                      value={configForm.founder_name}
                      onChange={(e) => setConfigForm({ ...configForm, founder_name: e.target.value })}
                      className="field h-10 px-4"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-theme-muted">Designation</label>
                    <input
                      type="text"
                      value={configForm.founder_designation}
                      onChange={(e) => setConfigForm({ ...configForm, founder_designation: e.target.value })}
                      className="field h-10 px-4"
                    />
                  </div>
               </div>
               <div className="bg-theme-raised flex items-center justify-end pt-4 gap-3">
                  <Button variant="outline" size="sm" onClick={() => setShowConfigForm(false)} className="font-bold border-theme-border">Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleUpdateConfig} className="font-bold bg-black text-white px-8">Save Identity</Button>
               </div>
            </div>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION TOAST (PILL DESIGN) */}
      {deleteConfirm && (
        <div className="fixed inset-x-0 top-8 z-[9000] flex justify-center px-4 animate-in slide-in-from-top-8 duration-300">
           <div className="flex items-center gap-6 bg-white px-8 py-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-full border border-zinc-200 min-w-[420px]">
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 flex items-center justify-center bg-rose-50 text-rose-600 rounded-full">
                    <Trash2 size={20} />
                 </div>
                 <div className="flex flex-col">
                    <p className="text-sm font-bold text-zinc-900">Delete <span className="text-red-600">"{deleteConfirm.name}"</span> node?</p>
                    <p className="text-[11px] font-medium text-zinc-500">This action cannot be undone.</p>
                 </div>
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                 <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="px-5 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={handleDelete}
                    className="px-7 py-2.5 bg-red-600 hover:bg-red-700 text-sm font-bold text-white rounded-full shadow-lg shadow-red-200 transition-all"
                 >
                    Delete Now
                 </button>
              </div>
           </div>
        </div>
      )}
    </DashboardShell>
  );
}
