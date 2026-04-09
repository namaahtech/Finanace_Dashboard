"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import {
  CreditCard,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Users,
  IndianRupee,
  X,
  Tag,
} from "lucide-react";
import { useState } from "react";

interface Subscription {
  id: number;
  name: string;
  team: string;
  category: string;
  seats: number;
  cost: number;
  cycle: "Monthly" | "Annual";
  renewalDate: string;
  status: "active" | "expiring" | "inactive";
}

const SUBSCRIPTIONS: Subscription[] = [
  { id: 1, name: "Google Workspace",    team: "Operations",  category: "Productivity",   seats: 85, cost: 12000, cycle: "Monthly", renewalDate: "Apr 28, 2026", status: "active" },
  { id: 2, name: "AWS Production",      team: "Engineering", category: "Infrastructure", seats: 12, cost: 85000, cycle: "Monthly", renewalDate: "Apr 22, 2026", status: "expiring" },
  { id: 3, name: "Slack Enterprise",    team: "All Teams",   category: "Communication",  seats: 82, cost: 45000, cycle: "Monthly", renewalDate: "May 05, 2026", status: "active" },
  { id: 4, name: "Zoom Pro",            team: "Sales",       category: "Meetings",       seats: 15, cost: 8500,  cycle: "Monthly", renewalDate: "Apr 15, 2026", status: "expiring" },
  { id: 5, name: "Adobe Creative Cloud",team: "Marketing",   category: "Creative",       seats: 5,  cost: 18000, cycle: "Annual",  renewalDate: "Jun 12, 2026", status: "active" },
  { id: 6, name: "Figma Professional",  team: "Product",     category: "Design",         seats: 8,  cost: 9500,  cycle: "Monthly", renewalDate: "Apr 20, 2026", status: "inactive" },
  { id: 7, name: "GitHub Enterprise",   team: "Engineering", category: "Development",    seats: 20, cost: 22000, cycle: "Monthly", renewalDate: "May 10, 2026", status: "active" },
  { id: 8, name: "Notion Team",         team: "Product",     category: "Productivity",   seats: 30, cost: 7500,  cycle: "Monthly", renewalDate: "May 18, 2026", status: "active" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Productivity:   "bg-sky-500/10 text-sky-600",
  Infrastructure: "bg-purple-500/10 text-purple-600",
  Communication:  "bg-emerald-500/10 text-emerald-600",
  Meetings:       "bg-blue-500/10 text-blue-600",
  Creative:       "bg-pink-500/10 text-pink-600",
  Design:         "bg-orange-500/10 text-orange-600",
  Development:    "bg-amber-500/10 text-amber-600",
};

const STATUS_BADGE: Record<Subscription["status"], "success" | "warning" | "default"> = {
  active:   "success",
  expiring: "warning",
  inactive: "default",
};

const EMPTY_FORM = { name: "", team: "", category: "", seats: "", cost: "", cycle: "Monthly", renewalDate: "" };

export default function SubscriptionsPage() {
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);

  const filtered = SUBSCRIPTIONS.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.team.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || s.status === filter;
    return matchSearch && matchFilter;
  });

  const monthlySpend = SUBSCRIPTIONS.filter((s) => s.status !== "inactive").reduce((sum, s) => {
    return sum + (s.cycle === "Monthly" ? s.cost : Math.round(s.cost / 12));
  }, 0);
  const expiring    = SUBSCRIPTIONS.filter((s) => s.status === "expiring").length;
  const active      = SUBSCRIPTIONS.filter((s) => s.status === "active").length;
  const totalSeats  = SUBSCRIPTIONS.filter((s) => s.status !== "inactive").reduce((s, sub) => s + sub.seats, 0);

  return (
    <DashboardShell
      title="Subscriptions"
      subtitle="Track all software subscriptions, team usage, and renewal dates."
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1.5" /> Add Subscription
        </Button>
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Monthly Spend",  value: formatCurrency(monthlySpend), icon: IndianRupee,   color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Active",         value: active,                        icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Expiring Soon",  value: expiring,                      icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-500/10" },
            { label: "Total Seats",    value: totalSeats,                    icon: Users,         color: "text-sky-600",     bg: "bg-sky-500/10" },
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

        {/* Table */}
        <div className="page-card overflow-hidden p-0">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
              {[
                { id: "all",      label: "All" },
                { id: "active",   label: "Active" },
                { id: "expiring", label: "Expiring" },
                { id: "inactive", label: "Inactive" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    filter === t.id ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subscriptions…"
                className="h-8 w-48 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Team</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold text-center">Seats</th>
                  <th className="px-5 py-3 font-semibold">Cost</th>
                  <th className="px-5 py-3 font-semibold">Renewal</th>
                  <th className="px-5 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-theme-subtle">No subscriptions found</td></tr>
                ) : filtered.map((sub) => (
                  <tr key={sub.id} className="group transition-colors hover:bg-theme-raised/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg", sub.status === "expiring" ? "bg-amber-500/10" : sub.status === "inactive" ? "bg-theme-raised" : "bg-sky-500/10")}>
                          <CreditCard size={13} className={sub.status === "expiring" ? "text-amber-600" : sub.status === "inactive" ? "text-theme-subtle" : "text-sky-600"} />
                        </div>
                        <p className="text-xs font-semibold text-theme-fg">{sub.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-theme-muted">{sub.team}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold", CATEGORY_COLORS[sub.category] ?? "bg-theme-raised text-theme-muted")}>
                        <Tag size={10} />
                        {sub.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-theme-muted">
                        <Users size={11} />
                        {sub.seats}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs font-bold text-theme-fg">{formatCurrency(sub.cost)}</p>
                      <p className="text-[10px] text-theme-subtle">/{sub.cycle}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} className={sub.status === "expiring" ? "text-amber-500" : "text-theme-subtle"} />
                        <span className={cn("text-xs", sub.status === "expiring" ? "font-semibold text-amber-600" : "text-theme-muted")}>
                          {sub.renewalDate}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge variant={STATUS_BADGE[sub.status]}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
            <span className="text-xs text-theme-subtle">{filtered.length} subscription{filtered.length !== 1 ? "s" : ""}</span>
            <span className="text-xs text-theme-subtle">
              Monthly total: <span className="font-bold text-theme-fg">{formatCurrency(monthlySpend)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Add Subscription Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface border border-theme-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-theme-muted" />
                <h3 className="text-sm font-bold text-theme-fg">Add Subscription</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-theme-muted hover:bg-theme-raised transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Service Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Notion Team" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Team</label>
                  <input value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} placeholder="e.g. Engineering" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Productivity" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Cost (₹)</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Seats</label>
                  <input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} placeholder="0" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Billing Cycle</label>
                  <select value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all cursor-pointer">
                    <option value="Monthly">Monthly</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Renewal Date</label>
                  <input type="date" value={form.renewalDate} onChange={(e) => setForm({ ...form, renewalDate: e.target.value })} className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t border-theme-border px-6 py-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Add Subscription</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
