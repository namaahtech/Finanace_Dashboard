"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Building2,
  Users,
  Plus,
  Search,
  Crown,
  TrendingUp,
  IndianRupee,
  ChevronRight,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useState, useEffect } from "react";
import { CORPORATE_TEAMS as TEAMS } from "@/constants/teams";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const DEPT_COLORS: Record<string, "default" | "info" | "success" | "purple" | "warning"> = {
  Engineering: "info",
  Product:     "purple",
  Sales:       "success",
  Marketing:   "default",
  Operations:  "default",
  Finance:     "warning",
  People:      "purple",
  Legal:       "default",
};

type ViewMode = "grid" | "table";

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", department: "", lead: "", members: "", budget: "" });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setShowForm(false); };
    if (showForm) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showForm]);

  const departments = ["All", ...Array.from(new Set(TEAMS.map((t) => t.department)))];

  const filtered = TEAMS.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.lead.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || t.department === deptFilter;
    return matchSearch && matchDept;
  });

  const totalMembers = TEAMS.reduce((s, t) => s + t.members, 0);
  const totalBudget  = TEAMS.reduce((s, t) => s + t.budget, 0);

  return (
    <DashboardShell
      title="Teams"
      subtitle="Manage and organise your functional teams and departments."
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1.5" /> Create Team
        </Button>
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Teams",   value: TEAMS.length,           icon: Building2,   color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Total Members", value: totalMembers,           icon: Users,       color: "text-sky-600",     bg: "bg-sky-500/10" },
            { label: "Departments",   value: departments.length - 1, icon: TrendingUp,  color: "text-purple-600",  bg: "bg-purple-500/10" },
            { label: "Monthly Budget",value: `₹${(totalBudget / 100000).toFixed(1)}L`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={17} className={color} />
              </div>
              <div>
                <p className="text-xs text-theme-muted">{label}</p>
                <p className={cn("text-2xl font-black leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + view toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                  deptFilter === d
                    ? "bg-theme-primary text-theme-surface shadow-sm"
                    : "bg-theme-raised text-theme-muted hover:text-theme-fg"
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams…"
                className="h-8 w-44 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all"
              />
            </div>
            {/* View toggle */}
            <div className="flex rounded-lg border border-theme-border bg-theme-raised p-0.5 gap-0.5">
              {([
                { mode: "grid" as ViewMode, icon: LayoutGrid },
                { mode: "table" as ViewMode, icon: List },
              ]).map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                    viewMode === mode
                      ? "bg-theme-surface text-theme-fg shadow-sm"
                      : "text-theme-muted hover:text-theme-fg"
                  )}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid view */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((team) => (
              <div key={team.id} className="page-card group relative overflow-hidden transition-all hover:shadow-md">
                {/* Header */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-theme-primary text-theme-surface font-black text-sm">
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-theme-fg">{team.name}</h4>
                    <Badge variant={DEPT_COLORS[team.department] ?? "default"} className="mt-0.5">
                      {team.department}
                    </Badge>
                  </div>
                </div>

                {/* Lead */}
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-theme-raised px-3 py-2">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-theme-page border border-theme-border">
                    <Crown size={11} className="text-theme-muted" />
                  </div>
                  <div>
                    <p className="text-[10px] text-theme-muted">Team Lead</p>
                    <p className="text-xs font-semibold text-theme-fg">{team.lead}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-theme-border bg-theme-page px-3 py-2">
                    <p className="text-[10px] text-theme-muted">Members</p>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-theme-fg">{team.members}</span>
                      <Users size={13} className="text-theme-subtle" />
                    </div>
                  </div>
                  <div className="rounded-lg border border-theme-border bg-theme-page px-3 py-2">
                    <p className="text-[10px] text-theme-muted">Budget</p>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-theme-fg">₹{(team.budget / 1000).toFixed(0)}K</span>
                      <IndianRupee size={13} className="text-theme-subtle" />
                    </div>
                  </div>
                </div>

                <button className="mt-3 flex w-full items-center justify-between border-t border-theme-border pt-3 text-xs text-theme-muted hover:text-theme-fg transition-colors group-hover:text-theme-fg">
                  View team details
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center text-sm text-theme-subtle">
                No teams match your search
              </div>
            )}
          </div>
        )}

        {/* Table view */}
        {viewMode === "table" && (
          <div className="page-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                    <th className="px-5 py-3 font-semibold">Team</th>
                    <th className="px-5 py-3 font-semibold">Department</th>
                    <th className="px-5 py-3 font-semibold">Lead</th>
                    <th className="px-5 py-3 font-semibold text-center">Members</th>
                    <th className="px-5 py-3 font-semibold text-right">Monthly Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {filtered.map((team) => (
                    <tr key={team.id} className="hover:bg-theme-raised/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-theme-primary text-theme-surface text-[11px] font-black">
                            {team.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-theme-fg">{team.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={DEPT_COLORS[team.department] ?? "default"}>{team.department}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <Crown size={12} className="text-theme-subtle" />
                          <span className="text-xs text-theme-fg">{team.lead}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-xs font-semibold text-theme-fg">{team.members}</td>
                      <td className="px-5 py-3 text-right text-xs font-semibold text-theme-fg">
                        ₹{(team.budget / 1000).toFixed(0)}K
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-theme-subtle">No teams found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-theme-border bg-theme-page px-5 py-2.5 text-xs text-theme-subtle">
              {filtered.length} of {TEAMS.length} teams · {departments.length - 1} departments · {totalMembers} members
            </div>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-theme-surface shadow-2xl border border-theme-border">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-theme-primary text-theme-surface">
                  <Building2 size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-theme-fg">Create New Team</h3>
                  <p className="text-[11px] text-theme-muted">Add a new team to the roster</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "name", label: "Team Name",  placeholder: "e.g. Backend Dev" },
                    { key: "lead", label: "Team Lead",  placeholder: "e.g. Arjun Singh" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="mb-1.5 block text-xs font-semibold text-theme-muted">{label}</label>
                      <input
                        type="text"
                        required
                        placeholder={placeholder}
                        value={(form as Record<string, string>)[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Department</label>
                  <Select onValueChange={(v) => setForm({ ...form, department: v })} value={form.department} required>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Array.from(new Set(TEAMS.map((t) => t.department))).map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Members</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 5"
                      value={form.members}
                      onChange={(e) => setForm({ ...form, members: e.target.value })}
                      className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Monthly Budget (₹)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 100000"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-theme-border pt-4">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="button" onClick={() => setShowForm(false)}>Create Team</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
