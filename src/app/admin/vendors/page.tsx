"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  ShoppingCart,
  Plus,
  Search,
  IndianRupee,
  Clock,
  CheckCircle2,
  Tag,
  X,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";

interface Purchase {
  id: string;
  vendor: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  status: "pending" | "paid" | "cancelled";
}

const PURCHASES: Purchase[] = [
  { id: "PUR-001", vendor: "AWS India",           description: "EC2 + S3 monthly bill",        category: "Infrastructure", amount: 85000,  date: "2026-04-05", status: "paid" },
  { id: "PUR-002", vendor: "Apex Supplies",        description: "Office furniture — 3 desks",   category: "Equipment",      amount: 42000,  date: "2026-04-03", status: "paid" },
  { id: "PUR-003", vendor: "Green Facilities",     description: "Monthly office maintenance",    category: "Facilities",     amount: 18000,  date: "2026-04-01", status: "pending" },
  { id: "PUR-004", vendor: "Titan Legal",          description: "Compliance audit Q1 2026",     category: "Legal",          amount: 125000, date: "2026-03-28", status: "paid" },
  { id: "PUR-005", vendor: "Prompt Logistics",     description: "Delivery fleet service",       category: "Logistics",      amount: 31000,  date: "2026-03-25", status: "pending" },
  { id: "PUR-006", vendor: "Quantum Advertising",  description: "Social media ad spend",        category: "Marketing",      amount: 55000,  date: "2026-03-20", status: "paid" },
  { id: "PUR-007", vendor: "Stationary Hub",       description: "Office supplies — bulk order", category: "Supplies",       amount: 8500,   date: "2026-03-15", status: "cancelled" },
  { id: "PUR-008", vendor: "Cloud Vision IT",      description: "Laptop × 4 units",             category: "Equipment",      amount: 220000, date: "2026-03-10", status: "paid" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Infrastructure: "bg-sky-500/10 text-sky-600",
  Equipment:      "bg-purple-500/10 text-purple-600",
  Facilities:     "bg-emerald-500/10 text-emerald-600",
  Legal:          "bg-amber-500/10 text-amber-600",
  Logistics:      "bg-orange-500/10 text-orange-600",
  Marketing:      "bg-pink-500/10 text-pink-600",
  Supplies:       "bg-theme-raised text-theme-muted",
};

const STATUS_BADGE: Record<Purchase["status"], "default" | "success" | "danger"> = {
  pending:   "default",
  paid:      "success",
  cancelled: "danger",
};

const EMPTY_FORM = { vendor: "", description: "", category: "", amount: "", date: "" };

export default function PurchasesPage() {
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);

  const filtered = PURCHASES.filter((p) => {
    const matchSearch = p.vendor.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  const totalSpend = PURCHASES.reduce((s, p) => s + p.amount, 0);
  const thisMonth  = PURCHASES.filter((p) => p.date.startsWith("2026-04")).reduce((s, p) => s + p.amount, 0);
  const pending    = PURCHASES.filter((p) => p.status === "pending").length;
  const paidCount  = PURCHASES.filter((p) => p.status === "paid").length;

  const categories = ["All", ...Array.from(new Set(PURCHASES.map((p) => p.category)))];

  return (
    <DashboardShell
      title="Purchases"
      subtitle="Record and track all company purchases and vendor payments."
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1.5" /> Add Purchase
        </Button>
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Spend",   value: formatCurrency(totalSpend), icon: IndianRupee,  color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "This Month",    value: formatCurrency(thisMonth),  icon: ShoppingCart, color: "text-sky-600",     bg: "bg-sky-500/10" },
            { label: "Pending",       value: pending,                    icon: Clock,        color: "text-amber-600",   bg: "bg-amber-500/10" },
            { label: "Paid",          value: paidCount,                  icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
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
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5 flex-wrap">
              {[
                { id: "all",       label: "All" },
                { id: "pending",   label: "Pending" },
                { id: "paid",      label: "Paid" },
                { id: "cancelled", label: "Cancelled" },
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
                placeholder="Search purchases…"
                className="h-8 w-48 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Vendor</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-theme-subtle">No purchases found</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-theme-raised/40">
                    <td className="px-5 py-3">
                      <p className="text-xs font-semibold text-theme-fg">{p.vendor}</p>
                      <p className="text-[10px] text-theme-subtle font-mono">{p.id}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-theme-muted max-w-[200px]">{p.description}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold", CATEGORY_COLORS[p.category] ?? "bg-theme-raised text-theme-muted")}>
                        <Tag size={10} />
                        {p.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-red-500">−{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-3 text-xs text-theme-muted">{formatDate(p.date)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_BADGE[p.status]}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
            <span className="text-xs text-theme-subtle">{filtered.length} purchase{filtered.length !== 1 ? "s" : ""}</span>
            <span className="text-xs text-theme-subtle">
              Total: <span className="font-bold text-theme-fg">{formatCurrency(filtered.reduce((s, p) => s + p.amount, 0))}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Add Purchase Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface border border-theme-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-2">
                <ShoppingCart size={15} className="text-theme-muted" />
                <h3 className="text-sm font-bold text-theme-fg">Add Purchase</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-theme-muted hover:bg-theme-raised transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Vendor</label>
                  <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. AWS India" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Description</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was purchased?" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Equipment" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Amount (₹)</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Purchase Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t border-theme-border px-6 py-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Add Purchase</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
