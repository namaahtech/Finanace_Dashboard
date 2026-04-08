"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Building2, Users, Plus, Search, MoreHorizontal, Crown } from "lucide-react";
import { useState } from "react";
import { CORPORATE_TEAMS as TEAMS } from "@/constants/teams";

const DEPT_COLORS: Record<string, string> = {
  Engineering: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  Product:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Sales:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Marketing:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Operations:  "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  Finance:     "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  People:      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Legal:       "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  const departments = ["All", ...Array.from(new Set(TEAMS.map((t) => t.department)))];
  const filtered = TEAMS.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.lead.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || t.department === deptFilter;
    return matchSearch && matchDept;
  });

  const totalMembers = TEAMS.reduce((s, t) => s + t.members, 0);
  const totalBudget = TEAMS.reduce((s, t) => s + t.budget, 0);

  return (
    <DashboardShell
      title="Teams"
      subtitle="Manage all 21 teams across departments"
      actions={
        <button className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors">
          <Plus size={15} /> New Team
        </button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        {[
          { label: "Total Teams", value: TEAMS.length, icon: Building2, color: "text-sky-600" },
          { label: "Total Members", value: totalMembers, icon: Users, color: "text-emerald-600" },
          { label: "Departments", value: departments.length - 1, icon: Building2, color: "text-purple-600" },
          { label: "Monthly Budget", value: `₹${(totalBudget / 100000).toFixed(1)}L`, icon: Building2, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-muted">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="page-card mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams or leads…"
              className="field pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  deptFilter === d
                    ? "bg-sky-600 text-white"
                    : "bg-[hsl(var(--surface-raised))] text-muted hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Teams grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((team) => (
          <div key={team.id} className="page-card hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30 text-sky-600 font-bold text-sm">
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{team.name}</p>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${DEPT_COLORS[team.department]}`}>
                    {team.department}
                  </span>
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[hsl(var(--surface-raised))] transition-all">
                <MoreHorizontal size={16} className="text-muted" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mb-3 text-xs text-muted">
              <Crown size={11} className="text-amber-500" />
              <span>{team.lead}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-default">
              <div className="flex items-center gap-1 text-muted">
                <Users size={12} />
                <span className="font-medium text-foreground">{team.members}</span> members
              </div>
              <span className="text-muted">Budget: <span className="font-medium text-foreground">₹{(team.budget / 1000).toFixed(0)}K</span></span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 size={40} className="text-muted mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground">No teams found</p>
          <p className="text-xs text-muted mt-1">Try a different search or department filter</p>
        </div>
      )}
    </DashboardShell>
  );
}
