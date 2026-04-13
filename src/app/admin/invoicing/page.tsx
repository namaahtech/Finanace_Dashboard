"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import {
  FileText,
  Plus,
  Search,
  Download,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
} from "lucide-react";
import { useState } from "react";

interface Invoice {
  id: string;
  client: string;
  amount: number;
  issuedDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue";
}

const INVOICES: Invoice[] = [
  { id: "INV-2026-001", client: "Google Cloud India",    amount: 450000, issuedDate: "Apr 05, 2026", dueDate: "May 05, 2026", status: "paid" },
  { id: "INV-2026-002", client: "HackerRank Enterprise", amount: 125000, issuedDate: "Apr 02, 2026", dueDate: "May 02, 2026", status: "sent" },
  { id: "INV-2026-003", client: "Microsoft Azure",       amount: 890000, issuedDate: "Mar 28, 2026", dueDate: "Apr 28, 2026", status: "overdue" },
  { id: "INV-2026-004", client: "Razorpay Solutions",    amount: 65000,  issuedDate: "Mar 25, 2026", dueDate: "Apr 25, 2026", status: "paid" },
  { id: "INV-2026-005", client: "Swiggy B2B",            amount: 38000,  issuedDate: "Mar 20, 2026", dueDate: "Apr 20, 2026", status: "draft" },
  { id: "INV-2026-006", client: "Zepto Tech",            amount: 210000, issuedDate: "Mar 15, 2026", dueDate: "Apr 15, 2026", status: "sent" },
  { id: "INV-2026-007", client: "CRED FinTech",          amount: 175000, issuedDate: "Mar 10, 2026", dueDate: "Apr 10, 2026", status: "paid" },
];

const STATUS_BADGE: Record<Invoice["status"], "default" | "info" | "success" | "warning" | "danger"> = {
  draft:   "default",
  sent:    "info",
  paid:    "success",
  overdue: "danger",
};

const EMPTY_FORM = { client: "", amount: "", issuedDate: "", dueDate: "", notes: "" };

export default function InvoicingPage() {
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);

  const filtered = INVOICES.filter((inv) => {
    const matchSearch = inv.id.toLowerCase().includes(search.toLowerCase()) || inv.client.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || inv.status === filter;
    return matchSearch && matchFilter;
  });

  const totalReceivable = INVOICES.reduce((s, i) => s + i.amount, 0);
  const paid     = INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = INVOICES.filter((i) => i.status === "sent").reduce((s, i) => s + i.amount, 0);
  const overdue  = INVOICES.filter((i) => i.status === "overdue").length;

  return (
    <DashboardShell
      title="Invoicing"
      subtitle="Manage customer invoices, track payments, and monitor receivables."
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1.5" /> Create Invoice
        </Button>
      }
    >
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Receivable", value: formatCurrency(totalReceivable), icon: IndianRupee,   color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Collected",        value: formatCurrency(paid),            icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Outstanding",      value: formatCurrency(outstanding),     icon: Clock,         color: "text-sky-600",     bg: "bg-sky-500/10" },
            { label: "Overdue",          value: overdue,                         icon: AlertCircle,   color: "text-red-500",     bg: "bg-red-500/10" },
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
                { id: "all",     label: "All" },
                { id: "draft",   label: "Draft" },
                { id: "sent",    label: "Sent" },
                { id: "paid",    label: "Paid" },
                { id: "overdue", label: "Overdue" },
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
                placeholder="Search invoicesâ€¦"
                className="h-8 w-48 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Invoice ID</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Issued</th>
                  <th className="px-5 py-3 font-semibold">Due Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-theme-subtle">No invoices found</td></tr>
                ) : filtered.map((inv) => (
                  <tr key={inv.id} className="group transition-colors hover:bg-theme-raised/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-theme-raised">
                          <FileText size={13} className="text-theme-muted" />
                        </div>
                        <span className="text-xs font-semibold text-theme-fg font-mono">{inv.id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-theme-fg">{inv.client}</td>
                    <td className="px-5 py-3 text-sm font-bold text-emerald-600">{formatCurrency(inv.amount)}</td>
                    <td className="px-5 py-3 text-xs text-theme-muted">{inv.issuedDate}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs", inv.status === "overdue" ? "font-semibold text-red-500" : "text-theme-muted")}>
                        {inv.dueDate}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_BADGE[inv.status]}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status === "draft" && (
                          <Button size="sm" variant="primary">
                            <Send size={11} className="mr-1" /> Send
                          </Button>
                        )}
                        <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-theme-border bg-theme-raised text-theme-muted hover:text-theme-fg transition-colors">
                          <Download size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
            <span className="text-xs text-theme-subtle">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
            <span className="text-xs text-theme-subtle">
              Showing total: <span className="font-bold text-theme-fg">{formatCurrency(filtered.reduce((s, i) => s + i.amount, 0))}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface border border-theme-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-theme-muted" />
                <h3 className="text-sm font-bold text-theme-fg">Create Invoice</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-theme-muted hover:bg-theme-raised transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Client Name</label>
                <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="e.g. Acme Corp" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Amount (â‚¹)</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Issue Date</label>
                  <input type="date" value={form.issuedDate} onChange={(e) => setForm({ ...form, issuedDate: e.target.value })} className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any additional notesâ€¦" className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all resize-none" />
              </div>
            </div>
            <div className="flex gap-3 border-t border-theme-border px-6 py-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Create Invoice</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
