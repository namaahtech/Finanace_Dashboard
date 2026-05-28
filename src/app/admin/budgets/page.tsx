"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/ButtonLegacy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";
import {
  BarChart3, Search, IndianRupee, TrendingUp, TrendingDown,
  AlertCircle, ChevronDown, Plus, Pencil, Trash2, X, Check,
  Building2, Users, Globe, Calendar, Tag, Layers, RefreshCw,
  ChevronRight, LayoutList,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface BudgetAllocation {
  id: string;
  budget_id: string;
  category: string;
  label: string | null;
  allocated: number;
  linked_sub_id: string | null;
  sort_order: number;
  subscriptions?: { name: string; sub_number: string; category: string } | null;
}

interface Budget {
  id: string;
  budget_number: string;
  name: string;
  scope_type: "department" | "team" | "company";
  department_name: string | null;
  team_id: string | null;
  fiscal_year: number;
  fiscal_month: number | null;
  total_amount: number;
  category: string;
  notes: string | null;
  status: "active" | "closed" | "draft";
  created_by_name: string | null;
  created_by_emp_id: string | null;
  created_at: string;
  teams?: { name: string } | null;
  budget_allocations?: BudgetAllocation[];
  // computed
  actual_spent?: number;
  purchase_spent?: number;
  sub_spent?: number;
}

interface Team { id: string; name: string; department?: string }

/* ─── Constants ─────────────────────────────────────────────────────────── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const BUDGET_CATEGORIES = [
  "General","Technology","Marketing","Operations","HR","Finance",
  "Legal","Infrastructure","Product","Research","Sales","Other",
];

const SCOPE_STYLES: Record<string, string> = {
  department: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  team:       "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  company:    "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const SCOPE_ICONS: Record<string, React.ElementType> = {
  department: Building2,
  team:       Users,
  company:    Globe,
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  closed: "bg-gray-400/10 text-gray-500",
  draft:  "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const ALLOC_CATEGORIES = [
  "Salaries","Software","Infrastructure","Marketing","Travel","Training",
  "Subscriptions","Office","Legal","Research","Miscellaneous",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function utilColor(pct: number, isOver: boolean) {
  if (isOver) return { bar: "bg-red-500",    text: "text-red-500" };
  if (pct >= 85) return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-emerald-500", text: "text-emerald-600" };
}

function CustomTooltip({ active, payload, label }: {active?: boolean; payload?: {name:string;value:number;color:string}[]; label?: string}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-theme-border bg-theme-surface p-3 shadow-lg text-xs">
      <p className="mb-2 font-bold text-theme-fg">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-theme-muted">{p.name}</span>
          </div>
          <span className="font-semibold text-theme-fg">{formatCurrency(p.value * 1000)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Custom Dropdown ────────────────────────────────────────────────────── */
function BudgetDropdown({
  label, value, onChange, options, placeholder, icon: Icon, searchable = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string; sub?: string }[];
  placeholder: string;
  icon?: React.ElementType;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = searchable && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-muted">{label}</label>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery(""); }}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border bg-theme-raised px-3 text-sm outline-none transition-all",
          open ? "border-theme-strong" : "border-theme-border",
          selected ? "text-theme-fg" : "text-theme-muted"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon size={13} className="flex-shrink-0 text-theme-muted" />}
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={12} className={cn("flex-shrink-0 text-theme-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-[200] mt-1 w-full rounded-xl border border-theme-border bg-theme-surface shadow-xl overflow-hidden animate-in slide-in-from-top-1 duration-150">
          {searchable && (
            <div className="border-b border-theme-border px-3 py-2">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full bg-transparent text-xs text-theme-fg outline-none placeholder:text-theme-muted"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] text-theme-subtle">No options found</div>
            ) : filtered.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(""); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-all",
                  value === opt.value
                    ? "bg-theme-primary/10 text-theme-primary font-semibold"
                    : "text-theme-fg hover:bg-theme-raised font-medium"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {opt.sub && <span className="ml-2 flex-shrink-0 text-[10px] text-theme-subtle">{opt.sub}</span>}
                {value === opt.value && <Check size={11} className="ml-2 flex-shrink-0 text-theme-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function BudgetsPage() {
  /* tabs */
  const [activeTab, setActiveTab] = useState<"budgets" | "allocations">("budgets");

  /* data */
  const [budgets, setBudgets]     = useState<Budget[]>([]);
  const [teams, setTeams]         = useState<Team[]>([]);
  const [loading, setLoading]     = useState(true);

  /* filters */
  const [search, setSearch]       = useState("");
  const [filterScope, setFilterScope] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterYear, setFilterYear]     = useState(String(CURRENT_YEAR));

  /* selected budget for allocations tab */
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  /* add/edit modal */
  const [showModal, setShowModal]   = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [saving, setSaving]         = useState(false);

  /* delete confirm */
  const [confirmDelete, setConfirmDelete] = useState<Budget | null>(null);
  const [deleting, setDeleting]     = useState(false);

  /* allocation modal */
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [allocBudget, setAllocBudget]       = useState<Budget | null>(null);
  const [allocations, setAllocations]       = useState<BudgetAllocation[]>([]);
  const [loadingAllocs, setLoadingAllocs]   = useState(false);

  /* new allocation form */
  const [newAllocCat, setNewAllocCat]       = useState("General");
  const [newAllocLabel, setNewAllocLabel]   = useState("");
  const [newAllocAmt, setNewAllocAmt]       = useState("");
  const [savingAlloc, setSavingAlloc]       = useState(false);

  /* form fields */
  const [fName, setFName]         = useState("");
  const [fScope, setFScope]       = useState<"department"|"team"|"company">("department");
  const [fDept, setFDept]         = useState("");
  const [fTeamId, setFTeamId]     = useState("");
  const [fYear, setFYear]         = useState(String(CURRENT_YEAR));
  const [fMonth, setFMonth]       = useState("");
  const [fAmount, setFAmount]     = useState("");
  const [fCategory, setFCategory] = useState("General");
  const [fNotes, setFNotes]       = useState("");
  const [fStatus, setFStatus]     = useState<"active"|"closed"|"draft">("active");

  /* ── fetch ── */
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)      params.set("search", search);
    if (filterScope) params.set("scope_type", filterScope);
    if (filterStatus) params.set("status", filterStatus);
    if (filterYear)  params.set("year", filterYear);
    const res = await fetch(`/api/budgets?${params}`);
    const json = await res.json();
    setBudgets(json.budgets || []);
    setLoading(false);
  }, [search, filterScope, filterStatus, filterYear]);

  const fetchTeams = useCallback(async () => {
    const { data } = await supabase.from("teams").select("id, name, department").order("name");
    setTeams(data || []);
  }, [supabase]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);
  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  /* realtime */
  useEffect(() => {
    const channel = supabase
      .channel("budgets-rt-v1")
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets" }, () => fetchBudgets())
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_allocations" }, () => {
        fetchBudgets();
        if (allocBudget) fetchAllocations(allocBudget.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchBudgets, allocBudget]);

  /* ── allocations fetch ── */
  const fetchAllocations = async (budgetId: string) => {
    setLoadingAllocs(true);
    const res = await fetch(`/api/budgets/${budgetId}/allocations`);
    const json = await res.json();
    setAllocations(json.allocations || []);
    setLoadingAllocs(false);
  };

  /* ── open modal ── */
  const openAdd = () => {
    setEditingBudget(null);
    setFName(""); setFScope("department"); setFDept(""); setFTeamId("");
    setFYear(String(CURRENT_YEAR)); setFMonth(""); setFAmount("");
    setFCategory("General"); setFNotes(""); setFStatus("active");
    setShowModal(true);
  };

  const openEdit = (b: Budget) => {
    setEditingBudget(b);
    setFName(b.name); setFScope(b.scope_type);
    setFDept(b.department_name || ""); setFTeamId(b.team_id || "");
    setFYear(String(b.fiscal_year)); setFMonth(b.fiscal_month ? String(b.fiscal_month) : "");
    setFAmount(String(b.total_amount)); setFCategory(b.category);
    setFNotes(b.notes || ""); setFStatus(b.status);
    setShowModal(true);
  };

  /* ── save ── */
  const handleSave = async () => {
    if (!fName.trim()) return;
    setSaving(true);
    const payload = {
      name: fName.trim(), scope_type: fScope,
      department_name: fScope === "department" ? fDept || null : null,
      team_id: fScope === "team" ? fTeamId || null : null,
      fiscal_year: parseInt(fYear) || CURRENT_YEAR,
      fiscal_month: fMonth ? parseInt(fMonth) : null,
      total_amount: parseFloat(fAmount) || 0,
      category: fCategory, notes: fNotes || null, status: fStatus,
    };
    if (editingBudget) {
      await fetch(`/api/budgets/${editingBudget.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setSaving(false);
    setShowModal(false);
    fetchBudgets();
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await fetch(`/api/budgets/${confirmDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    setConfirmDelete(null);
    fetchBudgets();
  };

  /* ── allocations ── */
  const openAllocations = (b: Budget) => {
    setAllocBudget(b);
    fetchAllocations(b.id);
    if (activeTab !== "allocations") setActiveTab("allocations");
    setSelectedBudget(b);
  };

  const handleAddAlloc = async () => {
    if (!allocBudget || !newAllocAmt) return;
    setSavingAlloc(true);
    await fetch(`/api/budgets/${allocBudget.id}/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newAllocCat, label: newAllocLabel || null, allocated: parseFloat(newAllocAmt) }),
    });
    setNewAllocCat("General"); setNewAllocLabel(""); setNewAllocAmt("");
    setSavingAlloc(false);
    fetchAllocations(allocBudget.id);
  };

  const handleDeleteAlloc = async (allocId: string) => {
    if (!allocBudget) return;
    await fetch(`/api/budgets/${allocBudget.id}/allocations?allocId=${allocId}`, { method: "DELETE" });
    fetchAllocations(allocBudget.id);
  };

  /* ── computed stats ── */
  const totalBudget  = budgets.reduce((s, b) => s + b.total_amount, 0);
  const totalSpent   = budgets.reduce((s, b) => s + (b.actual_spent || 0), 0);
  const remaining    = totalBudget - totalSpent;
  const overCount    = budgets.filter(b => (b.actual_spent || 0) > b.total_amount).length;

  /* ── chart data ── */
  const chartData = budgets.slice(0, 8).map(b => ({
    name: b.name.split(" ")[0].slice(0, 8),
    Budget: Math.round(b.total_amount / 1000),
    Spent:  Math.round((b.actual_spent || 0) / 1000),
  }));

  /* ── departments from teams table (real source) ── */
  const departments = [...new Set(teams.filter(t => t.department).map(t => t.department!))].sort();

  /* ── teams filtered by selected department (for team-scope budgets) ── */
  const teamsForDept = fDept
    ? teams.filter(t => t.department === fDept)
    : teams;

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <DashboardShell
      moduleKey="budgets"
      title="Budgets"
      subtitle="Plan and monitor spend across departments, teams, and the company."
      actions={
        <div className="flex items-center gap-2">
          <button onClick={fetchBudgets} className="flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-raised text-theme-muted hover:text-theme-fg transition-colors">
            <RefreshCw size={13} />
          </button>
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={13} className="mr-1" />New Budget
          </Button>
        </div>
      }
    >
      {/* ── Delete confirm bar ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-16 bg-transparent pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-theme-border bg-theme-surface px-5 py-3 shadow-2xl">
            <Trash2 size={15} className="text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium text-theme-fg">
              Delete <span className="font-bold">"{confirmDelete.name}"</span>?
            </span>
            <div className="flex items-center gap-2 ml-2">
              <button onClick={() => setConfirmDelete(null)} className="flex h-7 items-center gap-1 rounded-lg border border-theme-border bg-theme-raised px-3 text-xs font-semibold text-theme-muted hover:text-theme-fg transition-colors">
                <X size={11} />Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex h-7 items-center gap-1 rounded-lg bg-red-500 px-3 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
                <Trash2 size={11} />{deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Budget",  value: formatCurrency(totalBudget), icon: IndianRupee,  color: "text-theme-fg",     bg: "bg-theme-raised" },
            { label: "Total Spent",   value: formatCurrency(totalSpent),  icon: TrendingDown, color: "text-sky-600",      bg: "bg-sky-500/10" },
            { label: "Remaining",     value: formatCurrency(Math.max(remaining, 0)), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Over Budget",   value: overCount,                   icon: AlertCircle,  color: "text-red-500",      bg: "bg-red-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={15} className={color} />
              </div>
              <div>
                <p className="text-[11px] text-theme-muted">{label}</p>
                <p className={cn("text-xl font-black leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Chart ── */}
        {chartData.length > 0 && (
          <div className="page-card">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-theme-muted" />
                <span className="text-sm font-semibold text-theme-fg">Budget vs Spend</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-theme-muted">
                {[{ dot: "bg-sky-500", label: "Budget" }, { dot: "bg-emerald-500", label: "Spent" }].map(({ dot, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full flex-shrink-0", dot)} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barCategoryGap="30%" barGap={3}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="4 0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--fg-muted))" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₹${v}K`} tick={{ fontSize: 11, fill: "hsl(var(--fg-muted))" }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--surface-raised))", radius: 6 }} />
                <Bar dataKey="Budget" fill="#0ea5e9" radius={[4,4,0,0]} />
                <Bar dataKey="Spent"  fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Tab Switcher + Table ── */}
        <div className="page-card overflow-hidden p-0">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
              {[
                { id: "budgets",     label: "Budgets",     icon: IndianRupee },
                { id: "allocations", label: "Allocations", icon: LayoutList },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    activeTab === t.id ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg"
                  )}
                >
                  <t.icon size={11} />{t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterYear || "all"} onValueChange={(v) => setFilterYear(v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterScope || "all"} onValueChange={(v) => setFilterScope(v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 w-[130px]"><SelectValue placeholder="Scope" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search budgets…"
                  className="h-8 w-44 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all" />
              </div>
            </div>
          </div>

          {/* ── BUDGETS TAB ── */}
          {activeTab === "budgets" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                    <th className="px-5 py-3 font-semibold">Budget</th>
                    <th className="px-5 py-3 font-semibold">Scope</th>
                    <th className="px-5 py-3 font-semibold">Period</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Spent</th>
                    <th className="px-5 py-3 font-semibold">Remaining</th>
                    <th className="px-5 py-3 font-semibold">Utilisation</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j} className="px-5 py-3">
                            <div className="h-3 rounded bg-theme-raised animate-pulse" style={{ width: j === 0 ? 140 : j === 6 ? 80 : 70 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : budgets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-sm text-theme-subtle">
                        No budgets yet — click <span className="font-semibold text-theme-fg">New Budget</span> to create one.
                      </td>
                    </tr>
                  ) : budgets.map(b => {
                    const spent   = b.actual_spent || 0;
                    const isOver  = spent > b.total_amount;
                    const pct     = b.total_amount > 0 ? Math.min((spent / b.total_amount) * 100, 100) : 0;
                    const rem     = b.total_amount - spent;
                    const { bar, text } = utilColor(pct, isOver);
                    const ScopeIcon = SCOPE_ICONS[b.scope_type];

                    return (
                      <tr key={b.id} className="group transition-colors hover:bg-theme-raised/40">
                        <td className="px-5 py-3">
                          <div>
                            <p className="text-xs font-semibold text-theme-fg">{b.name}</p>
                            <p className="text-[10px] text-theme-subtle tabular-nums">{b.budget_number}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", SCOPE_STYLES[b.scope_type])}>
                            <ScopeIcon size={9} />
                            {b.scope_type === "department" ? b.department_name || "Dept"
                             : b.scope_type === "team"     ? (b.teams?.name || "Team")
                             : "Company"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 text-[11px] text-theme-muted">
                            <Calendar size={10} />
                            {b.fiscal_month ? `${MONTHS[b.fiscal_month - 1].slice(0,3)} ${b.fiscal_year}` : `FY ${b.fiscal_year}`}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-theme-muted">{formatCurrency(b.total_amount)}</td>
                        <td className="px-5 py-3 text-xs font-semibold text-theme-fg">{formatCurrency(spent)}</td>
                        <td className={cn("px-5 py-3 text-xs font-semibold", isOver ? "text-red-500" : "text-emerald-600")}>
                          {isOver ? `−${formatCurrency(Math.abs(rem))}` : formatCurrency(rem)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-theme-raised">
                              <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={cn("text-[10px] font-bold tabular-nums", text)}>
                              {isOver ? `${((spent / b.total_amount) * 100).toFixed(0)}%` : `${pct.toFixed(0)}%`}
                              {isOver && <AlertCircle size={9} className="inline ml-0.5 text-red-500" />}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", STATUS_STYLES[b.status])}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openAllocations(b)} title="Allocations"
                              className="flex h-6 w-6 items-center justify-center rounded-md text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors">
                              <Layers size={12} />
                            </button>
                            <button onClick={() => openEdit(b)} title="Edit"
                              className="flex h-6 w-6 items-center justify-center rounded-md text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => setConfirmDelete(b)} title="Delete"
                              className="flex h-6 w-6 items-center justify-center rounded-md text-theme-muted hover:bg-red-500/10 hover:text-red-500 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loading && budgets.length > 0 && (
                <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
                  <span className="text-xs text-theme-subtle">{budgets.length} budget{budgets.length !== 1 ? "s" : ""}</span>
                  <span className="text-xs text-theme-subtle">
                    Overall utilisation: <span className="font-bold text-theme-fg">
                      {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}%` : "—"}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── ALLOCATIONS TAB ── */}
          {activeTab === "allocations" && (
            <div>
              {/* Budget picker */}
              <div className="border-b border-theme-border bg-theme-page px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-theme-muted">Budget:</span>
                  <Select
                    value={allocBudget?.id || ""}
                    onValueChange={(v) => {
                      const b = budgets.find(x => x.id === v);
                      if (b) { setAllocBudget(b); setSelectedBudget(b); fetchAllocations(b.id); }
                    }}
                  >
                    <SelectTrigger className="h-7 w-[280px]"><SelectValue placeholder="— Select a budget —" /></SelectTrigger>
                    <SelectContent>
                      {budgets.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.budget_number})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {allocBudget && (
                    <span className="text-xs text-theme-muted">
                      Total: <span className="font-bold text-theme-fg">{formatCurrency(allocBudget.total_amount)}</span>
                      {" · "}Allocated: <span className="font-bold text-theme-fg">{formatCurrency(allocations.reduce((s, a) => s + a.allocated, 0))}</span>
                      {" · "}Remaining: <span className={cn("font-bold", allocations.reduce((s, a) => s + a.allocated, 0) > allocBudget.total_amount ? "text-red-500" : "text-emerald-600")}>
                        {formatCurrency(allocBudget.total_amount - allocations.reduce((s, a) => s + a.allocated, 0))}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {!allocBudget ? (
                <div className="py-16 text-center text-sm text-theme-subtle">Select a budget to view and manage its allocations.</div>
              ) : (
                <>
                  {/* Add allocation row */}
                  <div className="flex items-center gap-2 border-b border-theme-border bg-theme-raised/30 px-5 py-3">
                    <Select value={newAllocCat} onValueChange={setNewAllocCat}>
                      <SelectTrigger className="h-7 w-[160px] flex-shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALLOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <input value={newAllocLabel} onChange={e => setNewAllocLabel(e.target.value)} placeholder="Line-item label (optional)"
                      className="h-7 flex-1 rounded-lg border border-theme-border bg-theme-raised px-3 text-xs text-theme-fg outline-none focus:border-theme-strong" />
                    <input value={newAllocAmt} onChange={e => setNewAllocAmt(e.target.value)} placeholder="Amount" type="number" min={0}
                      className="h-7 w-32 rounded-lg border border-theme-border bg-theme-raised px-3 text-xs text-theme-fg outline-none focus:border-theme-strong" />
                    <button onClick={handleAddAlloc} disabled={savingAlloc || !newAllocAmt}
                      className="flex h-7 items-center gap-1 rounded-lg bg-theme-primary px-3 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                      <Plus size={11} />{savingAlloc ? "Adding…" : "Add"}
                    </button>
                  </div>

                  {/* Allocations table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                          <th className="px-5 py-3 font-semibold">Category</th>
                          <th className="px-5 py-3 font-semibold">Label</th>
                          <th className="px-5 py-3 font-semibold">Linked Subscription</th>
                          <th className="px-5 py-3 font-semibold text-right">Allocated</th>
                          <th className="px-5 py-3 font-semibold w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border">
                        {loadingAllocs ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i}>
                              {[140, 180, 120, 80, 30].map((w, j) => (
                                <td key={j} className="px-5 py-3">
                                  <div className="h-3 rounded bg-theme-raised animate-pulse" style={{ width: w }} />
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : allocations.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-sm text-theme-subtle">
                              No allocations yet — add one above.
                            </td>
                          </tr>
                        ) : allocations.map(a => (
                          <tr key={a.id} className="group transition-colors hover:bg-theme-raised/40">
                            <td className="px-5 py-3">
                              <span className="rounded-full bg-theme-raised px-2 py-0.5 text-[10px] font-semibold text-theme-fg">{a.category}</span>
                            </td>
                            <td className="px-5 py-3 text-xs text-theme-muted">{a.label || <span className="text-theme-subtle italic">—</span>}</td>
                            <td className="px-5 py-3 text-xs text-theme-muted">
                              {a.subscriptions
                                ? <span className="font-medium text-theme-fg">{a.subscriptions.name} <span className="text-theme-subtle tabular-nums">{a.subscriptions.sub_number}</span></span>
                                : <span className="text-theme-subtle italic">—</span>}
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-bold text-theme-fg">{formatCurrency(a.allocated)}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDeleteAlloc(a.id)}
                                  className="flex h-6 w-6 items-center justify-center rounded-md text-theme-muted hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {!loadingAllocs && allocations.length > 0 && (
                        <tfoot>
                          <tr className="border-t-2 border-theme-border bg-theme-raised/50">
                            <td colSpan={3} className="px-5 py-2.5 text-xs font-semibold text-theme-muted">Total Allocated</td>
                            <td className="px-5 py-2.5 text-right text-xs font-black text-theme-fg">
                              {formatCurrency(allocations.reduce((s, a) => s + a.allocated, 0))}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Budget Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-theme-border bg-theme-surface shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-theme-fg">{editingBudget ? "Edit Budget" : "New Budget"}</h2>
                <p className="text-xs text-theme-muted mt-0.5">{editingBudget ? "Update budget details below." : "Create a new budget plan."}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="grid grid-cols-2 gap-5 px-6 py-5">
              {/* Left col */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-muted">Budget Name *</label>
                  <input value={fName} onChange={e => setFName(e.target.value)} placeholder="e.g. Engineering Q1 2025"
                    className="h-9 w-full rounded-lg border border-theme-border bg-theme-raised px-3 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-muted">Scope</label>
                  <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
                    {(["department","team","company"] as const).map(s => (
                      <button key={s} onClick={() => { setFScope(s); setFDept(""); setFTeamId(""); }}
                        className={cn("flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all",
                          fScope === s ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {fScope === "department" && (
                  <BudgetDropdown
                    label="Department"
                    value={fDept}
                    onChange={setFDept}
                    placeholder="— Select department —"
                    icon={Building2}
                    searchable
                    options={departments.map(d => ({
                      label: d,
                      value: d,
                      sub: `${teams.filter(t => t.department === d).length} team${teams.filter(t => t.department === d).length !== 1 ? "s" : ""}`,
                    }))}
                  />
                )}
                {fScope === "team" && (
                  <div className="space-y-3">
                    <BudgetDropdown
                      label="Department (filter)"
                      value={fDept}
                      onChange={v => { setFDept(v); setFTeamId(""); }}
                      placeholder="— All departments —"
                      icon={Building2}
                      options={[
                        { label: "All departments", value: "" },
                        ...departments.map(d => ({ label: d, value: d })),
                      ]}
                    />
                    <BudgetDropdown
                      label="Team *"
                      value={fTeamId}
                      onChange={setFTeamId}
                      placeholder="— Select team —"
                      icon={Users}
                      searchable
                      options={teamsForDept.map(t => ({
                        label: t.name,
                        value: t.id,
                        sub: t.department || undefined,
                      }))}
                    />
                  </div>
                )}
                <BudgetDropdown
                  label="Category"
                  value={fCategory}
                  onChange={setFCategory}
                  placeholder="— Select category —"
                  icon={Tag}
                  options={BUDGET_CATEGORIES.map(c => ({ label: c, value: c }))}
                />
              </div>

              {/* Right col */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-muted">Fiscal Year</label>
                    <Select value={fYear} onValueChange={setFYear}>
                      <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-muted">Month (opt.)</label>
                    <Select value={fMonth || "all"} onValueChange={(v) => setFMonth(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Full Year" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Full Year</SelectItem>
                        {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m.slice(0,3)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-muted">Total Budget Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-theme-muted">₹</span>
                    <input value={fAmount} onChange={e => setFAmount(e.target.value)} type="number" min={0} placeholder="0"
                      className="h-9 w-full rounded-lg border border-theme-border bg-theme-raised pl-7 pr-3 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-muted">Status</label>
                  <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
                    {(["active","draft","closed"] as const).map(s => (
                      <button key={s} onClick={() => setFStatus(s)}
                        className={cn("flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all",
                          fStatus === s ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-muted">Notes</label>
                  <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={3} placeholder="Optional notes…"
                    className="w-full resize-none rounded-lg border border-theme-border bg-theme-raised px-3 py-2 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-theme-border px-6 py-4">
              <div className="text-[11px] text-theme-subtle">
                {fAmount && !isNaN(parseFloat(fAmount)) && parseFloat(fAmount) > 0
                  ? <><span className="font-bold text-theme-fg">{formatCurrency(parseFloat(fAmount))}</span> total budget</>
                  : "Enter an amount to continue"}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowModal(false)} className="h-8 rounded-lg border border-theme-border bg-theme-raised px-4 text-xs font-semibold text-theme-muted hover:text-theme-fg transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving || !fName.trim()}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-theme-primary px-4 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                  <Check size={12} />{saving ? "Saving…" : editingBudget ? "Save Changes" : "Create Budget"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
