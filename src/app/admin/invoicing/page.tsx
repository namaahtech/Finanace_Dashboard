"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  FileText, Plus, Search, Download, IndianRupee, Clock,
  CheckCircle2, AlertCircle, X, Send, Eye, Mail,
  Building2, Folder, Users, Trash2, ChevronDown,
  Printer, Share2, MoreVertical,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  id:          string;
  description: string;
  hsn_sac:     string;
  quantity:    number;
  rate:        number;
  gst_rate:    number;
  amount:      number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total:       number;
}

interface Invoice {
  id:              string;
  invoice_number:  string;
  client_id:       string | null;
  project_id:      string | null;
  team_id:         string | null;
  issued_date:     string | null;
  due_date:        string | null;
  status:          "draft" | "sent" | "paid" | "overdue";
  subtotal:        number;
  cgst:            number;
  sgst:            number;
  igst:            number;
  tax:             number;
  total:           number;
  amount:          number;
  notes:           string | null;
  terms:           string | null;
  bank_details:    string | null;
  billing_address: string | null;
  client_gstin:    string | null;
  client_email:    string | null;
  place_of_supply: string | null;
  clients?:        { id: string; name: string; email: string; company: string } | null;
  projects?:       { id: string; name: string } | null;
  teams?:          { id: string; name: string } | null;
  invoice_items?:  LineItem[];
}

interface Client { id: string; name: string; email?: string; company?: string; lead_name?: string; }
interface Project { id: string; name: string; client_id?: string; }
interface Team    { id: string; name: string; }

const STATUS_BADGE: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
  draft: "default", sent: "info", paid: "success", overdue: "danger",
};
const GST_RATES = [0, 5, 12, 18, 28];

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── GST Preview ─────────────────────────────────────────────────────────────
function GSTPreview({ inv, items, clients, projects }: {
  inv: any; items: LineItem[]; clients: Client[]; projects: Project[];
}) {
  const client  = clients.find(c => c.id === inv.client_id);
  const project = projects.find(p => p.id === inv.project_id);
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const cgst     = items.reduce((s, i) => s + i.cgst_amount, 0);
  const sgst     = items.reduce((s, i) => s + i.sgst_amount, 0);
  const igst     = items.reduce((s, i) => s + i.igst_amount, 0);
  const total    = subtotal + cgst + sgst + igst;

  return (
    <div id="gst-invoice-preview" className="bg-white text-gray-800 font-sans" style={{ width: "100%", minHeight: "100%" }}>
      {/* Blue Header */}
      <div className="bg-gradient-to-br from-blue-800 to-blue-500 text-white px-8 py-7">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black tracking-tight">TAX INVOICE</h1>
            <p className="text-blue-200 text-xs font-bold mt-1 uppercase tracking-widest">GST Compliant · Original Copy</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black">{inv.invoice_number || "INV-PREVIEW"}</p>
            <p className="text-blue-200 text-xs mt-1">Issued: {inv.issued_date || "—"}</p>
            <p className="text-blue-200 text-xs mt-0.5">Due: {inv.due_date || "—"}</p>
          </div>
        </div>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-200">
        <div className="px-8 py-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">From</p>
          <p className="font-black text-gray-900 text-base">Namaah Technologies</p>
          <p className="text-xs text-gray-500 mt-1">GSTIN: 29ABCDE1234F1Z5</p>
          <p className="text-xs text-gray-500 mt-0.5">Bangalore, Karnataka — 560001</p>
        </div>
        <div className="px-8 py-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Bill To</p>
          <p className="font-black text-gray-900 text-base">{client?.name || inv.client_name || "—"}</p>
          {inv.client_gstin && <p className="text-xs text-gray-500 mt-1">GSTIN: {inv.client_gstin}</p>}
          {inv.billing_address && <p className="text-xs text-gray-500 mt-0.5">{inv.billing_address}</p>}
          {project && <p className="text-xs text-blue-600 font-semibold mt-1">Project: {project.name}</p>}
        </div>
      </div>

      {/* Items Table */}
      <div className="px-8 py-5">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-200">
              <th className="text-left px-3 py-2.5 font-black text-gray-500 uppercase tracking-wide text-[10px]">#</th>
              <th className="text-left px-3 py-2.5 font-black text-gray-500 uppercase tracking-wide text-[10px]">Description / HSN-SAC</th>
              <th className="text-center px-3 py-2.5 font-black text-gray-500 uppercase tracking-wide text-[10px]">Qty</th>
              <th className="text-right px-3 py-2.5 font-black text-gray-500 uppercase tracking-wide text-[10px]">Rate</th>
              <th className="text-center px-3 py-2.5 font-black text-gray-500 uppercase tracking-wide text-[10px]">GST%</th>
              <th className="text-right px-3 py-2.5 font-black text-gray-500 uppercase tracking-wide text-[10px]">Taxable</th>
              <th className="text-right px-3 py-2.5 font-black text-gray-500 uppercase tracking-wide text-[10px]">CGST</th>
              <th className="text-right px-3 py-2.5 font-black text-gray-500 uppercase tracking-wide text-[10px]">SGST</th>
              <th className="text-right px-3 py-2.5 font-black text-gray-500 uppercase tracking-wide text-[10px] bg-blue-50">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length > 0 ? items.map((item, i) => (
              <tr key={item.id} className="hover:bg-gray-50/50">
                <td className="px-3 py-2.5 text-gray-400 font-semibold">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-gray-800">{item.description || "—"}</p>
                  {item.hsn_sac && <p className="text-gray-400 text-[10px]">HSN/SAC: {item.hsn_sac}</p>}
                </td>
                <td className="px-3 py-2.5 text-center text-gray-700">{item.quantity}</td>
                <td className="px-3 py-2.5 text-right text-gray-700">{fmt(item.rate)}</td>
                <td className="px-3 py-2.5 text-center text-gray-700">{item.gst_rate}%</td>
                <td className="px-3 py-2.5 text-right text-gray-700">{fmt(item.amount)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{fmt(item.cgst_amount)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{fmt(item.sgst_amount)}</td>
                <td className="px-3 py-2.5 text-right font-bold text-gray-900 bg-blue-50/30">{fmt(item.total)}</td>
              </tr>
            )) : (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-400">No items added</td></tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-4">
          <div className="w-64 space-y-1.5 border-t border-gray-200 pt-3">
            <div className="flex justify-between text-xs text-gray-600"><span>Subtotal</span><span className="font-semibold">{fmt(subtotal)}</span></div>
            {cgst > 0 && <div className="flex justify-between text-xs text-gray-600"><span>CGST</span><span>{fmt(cgst)}</span></div>}
            {sgst > 0 && <div className="flex justify-between text-xs text-gray-600"><span>SGST</span><span>{fmt(sgst)}</span></div>}
            {igst > 0 && <div className="flex justify-between text-xs text-gray-600"><span>IGST</span><span>{fmt(igst)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="text-sm font-black text-gray-900">Total Amount</span>
              <span className="text-sm font-black text-blue-700">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bank + Notes */}
      {(inv.bank_details || inv.notes) && (
        <div className="grid grid-cols-2 gap-4 px-8 pb-5">
          {inv.bank_details && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Bank Details</p>
              <p className="text-xs text-gray-600 whitespace-pre-line">{inv.bank_details}</p>
            </div>
          )}
          {inv.notes && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Notes</p>
              <p className="text-xs text-blue-700 whitespace-pre-line">{inv.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Terms */}
      {inv.terms && (
        <div className="px-8 pb-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Terms & Conditions</p>
          <p className="text-[11px] text-gray-500 whitespace-pre-line">{inv.terms}</p>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 text-center">
        <p className="text-[11px] text-gray-400">This is a computer-generated invoice and does not require a physical signature.</p>
        <p className="text-[10px] text-gray-300 mt-1">Namaah Technologies · Bangalore, Karnataka</p>
      </div>
    </div>
  );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────
function Dropdown({ label, value, options, onChange, icon: Icon, placeholder }: {
  label: string; value: string; options: { label: string; value: string }[];
  onChange: (v: string) => void; icon?: any; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} className="space-y-1.5">
      <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">{label}</label>
      <div className="relative">
        <button type="button" onClick={() => setOpen(!open)}
          className="flex h-10 w-full items-center justify-between rounded-xl border border-theme-border bg-theme-page px-3 text-xs font-semibold text-theme-fg hover:border-theme-strong transition-all">
          <span className="flex items-center gap-2 truncate">
            {Icon && <Icon size={13} className="text-theme-muted flex-shrink-0" />}
            <span className={cn("truncate", !selected && "text-theme-muted font-normal")}>{selected ? selected.label : placeholder}</span>
          </span>
          <ChevronDown size={13} className={cn("flex-shrink-0 text-theme-muted transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute top-full z-[9999] mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-theme-border bg-theme-surface shadow-xl p-1">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className="flex w-full items-center px-3 py-2 rounded-lg text-xs text-theme-muted hover:bg-theme-raised transition-all">
              — {placeholder}
            </button>
            {options.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn("flex w-full items-center px-3 py-2 rounded-lg text-xs font-semibold transition-all", value === o.value ? "bg-theme-primary text-white" : "text-theme-fg hover:bg-theme-raised")}>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create / Edit Invoice Modal ─────────────────────────────────────────────
function InvoiceModal({ onClose, onSaved, clients, projects, teams }: {
  onClose: () => void; onSaved: () => void;
  clients: Client[]; projects: Project[]; teams: Team[];
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

  const [form, setForm] = useState({
    client_id: "", project_id: "", team_id: "",
    issued_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    client_gstin: "", billing_address: "", client_email: "",
    place_of_supply: "", notes: "", terms: "Payment due within 30 days.\nLate payment may attract 1.5% monthly interest.",
    bank_details: "Bank: HDFC Bank\nAccount No: XXXXXXXX\nIFSC: HDFC0000XXX\nBranch: Bangalore",
    status: "draft" as const,
  });

  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", hsn_sac: "", quantity: 1, rate: 0, gst_rate: 18, amount: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, total: 0 },
  ]);

  const calcItem = (item: Partial<LineItem>): LineItem => {
    const qty    = Number(item.quantity) || 0;
    const rate   = Number(item.rate)     || 0;
    const gstR   = Number(item.gst_rate) || 0;
    const amount = qty * rate;
    const cgst   = amount * (gstR / 2) / 100;
    const sgst   = amount * (gstR / 2) / 100;
    return { ...item, amount, cgst_amount: cgst, sgst_amount: sgst, igst_amount: 0, total: amount + cgst + sgst } as LineItem;
  };

  const updateItem = (id: string, field: keyof LineItem, val: any) => {
    setItems(prev => prev.map(it => it.id === id ? calcItem({ ...it, [field]: val }) : it));
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: String(Date.now()), description: "", hsn_sac: "", quantity: 1, rate: 0, gst_rate: 18, amount: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(prev => prev.filter(it => it.id !== id));
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const totalCgst = items.reduce((s, i) => s + i.cgst_amount, 0);
  const totalSgst = items.reduce((s, i) => s + i.sgst_amount, 0);
  const totalIgst = items.reduce((s, i) => s + i.igst_amount, 0);
  const total = subtotal + totalCgst + totalSgst + totalIgst;

  const selectedClient  = clients.find(c => c.id === form.client_id);
  const selectedProject = projects.find(p => p.id === form.project_id);

  useEffect(() => {
    if (selectedClient) {
      setForm(f => ({ ...f, client_email: selectedClient.email || "", billing_address: selectedClient.company || "" }));
    }
  }, [form.client_id]);

  const handleSave = async (status: "draft" | "sent" = "draft") => {
    if (!form.client_id) { showToast("Please select a client", "error"); return; }
    if (items.every(i => !i.description)) { showToast("Add at least one line item", "error"); return; }
    setSaving(true);
    try {
      await axios.post("/api/invoices", {
        ...form, status,
        subtotal, cgst: totalCgst, sgst: totalSgst, igst: totalIgst,
        tax: totalCgst + totalSgst + totalIgst, total, amount: total,
        items,
      });
      showToast("Invoice created successfully", "success");
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-[80vw] max-h-[90vh] flex flex-col rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-theme-border px-7 py-4 bg-theme-surface flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-theme-fg">Create GST Invoice</h3>
              <p className="text-[10px] text-theme-muted mt-0.5">Tax compliant invoice with real-time preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab toggle */}
            <div className="flex rounded-lg border border-theme-border bg-theme-raised p-0.5">
              {(["form", "preview"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === t ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
                  {t === "form" ? "Form" : "Preview"}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* ── Form Panel ── */}
          <div className={cn("flex flex-col overflow-y-auto custom-scrollbar transition-all duration-300", activeTab === "preview" ? "w-0 opacity-0 overflow-hidden" : "w-full")}
            style={{ display: activeTab === "preview" ? "none" : "flex" }}>
            <div className="p-7 space-y-6 flex-1">

              {/* ── Section 1: Parties ── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3 flex items-center gap-2">
                  <Building2 size={12} /> Invoice Parties
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <Dropdown label="Client *" value={form.client_id} placeholder="Select client"
                    options={clients.map(c => ({ label: c.name, value: c.id }))}
                    onChange={v => setForm(f => ({ ...f, client_id: v }))} icon={Building2} />
                  <Dropdown label="Project" value={form.project_id} placeholder="Select project"
                    options={projects.map(p => ({ label: p.name, value: p.id }))}
                    onChange={v => setForm(f => ({ ...f, project_id: v }))} icon={Folder} />
                  <Dropdown label="Team" value={form.team_id} placeholder="Select team"
                    options={teams.map(t => ({ label: t.name, value: t.id }))}
                    onChange={v => setForm(f => ({ ...f, team_id: v }))} icon={Users} />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Client GSTIN</label>
                    <input value={form.client_gstin} onChange={e => setForm(f => ({ ...f, client_gstin: e.target.value }))}
                      placeholder="29ABCDE1234F1Z5"
                      className="h-10 w-full rounded-xl border border-theme-border bg-theme-page px-3 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Client Email</label>
                    <input value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))}
                      placeholder="accounts@client.com" type="email"
                      className="h-10 w-full rounded-xl border border-theme-border bg-theme-page px-3 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Place of Supply</label>
                    <input value={form.place_of_supply} onChange={e => setForm(f => ({ ...f, place_of_supply: e.target.value }))}
                      placeholder="Karnataka"
                      className="h-10 w-full rounded-xl border border-theme-border bg-theme-page px-3 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all" />
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Billing Address</label>
                  <input value={form.billing_address} onChange={e => setForm(f => ({ ...f, billing_address: e.target.value }))}
                    placeholder="123 Business Park, City, State — 560001"
                    className="h-10 w-full rounded-xl border border-theme-border bg-theme-page px-3 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all" />
                </div>
              </div>

              {/* ── Section 2: Dates ── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3 flex items-center gap-2">
                  <Clock size={12} /> Invoice Dates
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Issue Date *", key: "issued_date" },
                    { label: "Due Date *",   key: "due_date" },
                  ].map(({ label, key }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">{label}</label>
                      <input type="date" value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="h-10 w-full rounded-xl border border-theme-border bg-theme-page px-3 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all" />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Section 3: Line Items ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                    <FileText size={12} /> Line Items
                  </p>
                  <button type="button" onClick={addItem}
                    className="flex items-center gap-1.5 rounded-lg border border-theme-border bg-theme-raised px-3 py-1.5 text-[10px] font-black text-theme-fg hover:bg-theme-surface transition-all">
                    <Plus size={10} /> Add Item
                  </button>
                </div>

                <div className="rounded-xl border border-theme-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-theme-raised border-b border-theme-border">
                        <th className="px-3 py-2.5 text-left font-black text-theme-muted uppercase text-[9px] tracking-wide">Description</th>
                        <th className="px-3 py-2.5 text-left font-black text-theme-muted uppercase text-[9px] tracking-wide w-24">HSN/SAC</th>
                        <th className="px-3 py-2.5 text-center font-black text-theme-muted uppercase text-[9px] tracking-wide w-16">Qty</th>
                        <th className="px-3 py-2.5 text-right font-black text-theme-muted uppercase text-[9px] tracking-wide w-28">Rate (₹)</th>
                        <th className="px-3 py-2.5 text-center font-black text-theme-muted uppercase text-[9px] tracking-wide w-20">GST %</th>
                        <th className="px-3 py-2.5 text-right font-black text-theme-muted uppercase text-[9px] tracking-wide w-24">Total</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border">
                      {items.map((item) => (
                        <tr key={item.id} className="group">
                          <td className="px-2 py-1.5">
                            <input value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)}
                              placeholder="Service / Product description"
                              className="w-full bg-transparent outline-none text-theme-fg text-xs focus:ring-0 placeholder:text-theme-muted/50" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={item.hsn_sac} onChange={e => updateItem(item.id, "hsn_sac", e.target.value)}
                              placeholder="998314"
                              className="w-full bg-transparent outline-none text-theme-fg text-xs placeholder:text-theme-muted/50" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={item.quantity} min={1}
                              onChange={e => updateItem(item.id, "quantity", Number(e.target.value))}
                              className="w-full bg-transparent outline-none text-center text-theme-fg text-xs" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={item.rate} min={0}
                              onChange={e => updateItem(item.id, "rate", Number(e.target.value))}
                              className="w-full bg-transparent outline-none text-right text-theme-fg text-xs" />
                          </td>
                          <td className="px-2 py-1.5">
                            <select value={item.gst_rate} onChange={e => updateItem(item.id, "gst_rate", Number(e.target.value))}
                              className="w-full bg-theme-page border border-theme-border rounded-lg px-1.5 py-1 text-xs text-theme-fg outline-none text-center">
                              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-right font-bold text-theme-fg">{fmt(item.total)}</td>
                          <td className="px-1">
                            <button type="button" onClick={() => removeItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-theme-muted hover:text-red-500 transition-all">
                              <Trash2 size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="flex justify-end mt-3">
                  <div className="w-56 space-y-1 text-xs">
                    <div className="flex justify-between text-theme-muted"><span>Subtotal</span><span className="font-semibold text-theme-fg">{fmt(subtotal)}</span></div>
                    <div className="flex justify-between text-theme-muted"><span>CGST</span><span>{fmt(totalCgst)}</span></div>
                    <div className="flex justify-between text-theme-muted"><span>SGST</span><span>{fmt(totalSgst)}</span></div>
                    <div className="flex justify-between border-t border-theme-border pt-1.5 mt-1.5">
                      <span className="font-black text-theme-fg text-sm">Total</span>
                      <span className="font-black text-blue-600 text-sm">{fmt(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 4: Notes & Terms ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Bank Details</label>
                  <textarea rows={4} value={form.bank_details} onChange={e => setForm(f => ({ ...f, bank_details: e.target.value }))}
                    className="w-full rounded-xl border border-theme-border bg-theme-page px-3 py-2 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all resize-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Terms & Conditions</label>
                  <textarea rows={4} value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                    className="w-full rounded-xl border border-theme-border bg-theme-page px-3 py-2 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all resize-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Notes (optional)</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes for the client..."
                  className="w-full rounded-xl border border-theme-border bg-theme-page px-3 py-2 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all resize-none" />
              </div>

            </div>
          </div>

          {/* ── Preview Panel ── */}
          {activeTab === "preview" && (
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-100">
              <GSTPreview inv={{ ...form, invoice_number: "INV-PREVIEW", client_name: selectedClient?.name, project_name: selectedProject?.name }} items={items} clients={clients} projects={projects} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-theme-border px-7 py-4 bg-theme-surface flex-shrink-0">
          <span className="text-xs text-theme-muted">
            {items.filter(i => i.description).length} item{items.filter(i => i.description).length !== 1 ? "s" : ""} · Total: <span className="font-black text-theme-fg">{fmt(total)}</span>
          </span>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="secondary" size="sm" loading={saving} onClick={() => handleSave("draft")}>
              <FileText size={13} className="mr-1.5" /> Save as Draft
            </Button>
            <Button variant="primary" size="sm" loading={saving} onClick={() => handleSave("sent")}
              className="bg-blue-600 hover:bg-blue-700 border-blue-600">
              <Send size={13} className="mr-1.5" /> Create & Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Preview Modal ────────────────────────────────────────────────────
function PreviewModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { showToast } = useToast();
  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState(invoice.client_email || "");
  const [shareMsg, setShareMsg]   = useState("Please find the attached invoice for your reference.");
  const [sharing, setSharing]     = useState(false);

  const handlePrint = () => {
    const content = document.getElementById("gst-invoice-preview-full");
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoice.invoice_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; }
        @media print { @page { margin: 0; size: A4; } }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  const handleShare = async () => {
    if (!shareEmail) { showToast("Enter recipient email", "error"); return; }
    setSharing(true);
    try {
      await axios.post("/api/invoices/share", {
        to: shareEmail,
        subject: `Invoice ${invoice.invoice_number}`,
        message: shareMsg,
        invoice: {
          invoiceNumber: invoice.invoice_number,
          issuedDate: invoice.issued_date,
          dueDate: invoice.due_date,
          clientName: invoice.clients?.name,
          clientGstin: invoice.client_gstin,
          billingAddress: invoice.billing_address,
          projectName: invoice.projects?.name,
          bankDetails: invoice.bank_details,
          notes: invoice.notes,
          subtotal: invoice.subtotal,
          cgst: invoice.cgst, sgst: invoice.sgst, igst: invoice.igst,
          total: invoice.total,
          items: invoice.invoice_items || [],
        },
      });
      showToast(`Invoice sent to ${shareEmail}`, "success");
      setShowShare(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to send email", "error");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-[75vw] max-h-[92vh] flex flex-col rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme-border px-6 py-3.5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-blue-600" />
            <div>
              <p className="text-sm font-black text-theme-fg">{invoice.invoice_number}</p>
              <p className="text-[10px] text-theme-muted">{invoice.clients?.name || "—"} · {fmt(invoice.total)}</p>
            </div>
            <Badge variant={STATUS_BADGE[invoice.status]}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShare(s => !s)}
              className="flex items-center gap-1.5 rounded-lg border border-theme-border bg-theme-raised px-3 py-2 text-[10px] font-black text-theme-fg hover:bg-theme-surface transition-all">
              <Share2 size={12} /> Share
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-theme-border bg-theme-raised px-3 py-2 text-[10px] font-black text-theme-fg hover:bg-theme-surface transition-all">
              <Printer size={12} /> Download PDF
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised transition-colors"><X size={15} /></button>
          </div>
        </div>

        {/* Share dropdown */}
        {showShare && (
          <div className="border-b border-theme-border bg-blue-50/50 px-6 py-4 flex-shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Share Invoice via Email</p>
            <div className="flex gap-3 items-start">
              <div className="flex-1 space-y-2">
                <input value={shareEmail} onChange={e => setShareEmail(e.target.value)}
                  placeholder="recipient@example.com" type="email"
                  className="h-9 w-full rounded-lg border border-theme-border bg-white px-3 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all" />
                <textarea rows={2} value={shareMsg} onChange={e => setShareMsg(e.target.value)}
                  className="w-full rounded-lg border border-theme-border bg-white px-3 py-2 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all resize-none" />
              </div>
              <Button variant="primary" size="sm" loading={sharing} onClick={handleShare}
                className="bg-blue-600 hover:bg-blue-700 border-blue-600 mt-0.5">
                <Mail size={12} className="mr-1.5" /> Send Email
              </Button>
            </div>
          </div>
        )}

        {/* Invoice Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div id="gst-invoice-preview-full">
            <GSTPreview
              inv={{ ...invoice, invoice_number: invoice.invoice_number, client_name: invoice.clients?.name, project_name: invoice.projects?.name }}
              items={invoice.invoice_items || []}
              clients={[]}
              projects={[]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InvoicingPage() {
  const { showToast } = useToast();
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [previewInv, setPreviewInv] = useState<Invoice | null>(null);
  const [invoices, setInvoices]  = useState<Invoice[]>([]);
  const [loading, setLoading]    = useState(true);
  const [clients,  setClients]   = useState<Client[]>([]);
  const [projects, setProjects]  = useState<Project[]>([]);
  const [teams,    setTeams]     = useState<Team[]>([]);

  const loadInvoices = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/invoices?status=${filter}&search=${search}`);
      // Fetch items for each invoice in preview
      const invs = data.invoices || [];
      setInvoices(invs);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  const loadMeta = useCallback(async () => {
    const [cRes, pRes, tRes] = await Promise.all([
      axios.get("/api/config/clients"),
      axios.get("/api/projects"),
      axios.get("/api/teams"),
    ]);
    setClients(cRes.data.clients || []);
    setProjects(pRes.data.projects || []);
    setTeams(tRes.data.teams || []);
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("invoices-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, loadInvoices)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadInvoices]);

  const handlePreview = async (inv: Invoice) => {
    // Fetch line items
    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", inv.id)
      .order("sort_order");
    setPreviewInv({ ...inv, invoice_items: items || [] });
  };

  const handleDownload = async (inv: Invoice) => {
    await handlePreview(inv);
    // Preview modal opens; user prints from there
  };

  const filtered = invoices.filter(inv => {
    const s = search.toLowerCase();
    return (!s || inv.invoice_number?.toLowerCase().includes(s) || inv.clients?.name?.toLowerCase().includes(s))
      && (filter === "all" || inv.status === filter);
  });

  const totalReceivable = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const paid       = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const outstanding = invoices.filter(i => i.status === "sent").reduce((s, i) => s + (i.total || 0), 0);
  const overdue    = invoices.filter(i => i.status === "overdue").length;

  return (
    <DashboardShell
      title="Invoicing"
      subtitle="Manage GST invoices, track payments, and monitor receivables."
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1.5" /> Create Invoice
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Receivable", value: fmt(totalReceivable), icon: IndianRupee,  color: "text-theme-fg",     bg: "bg-theme-raised" },
            { label: "Collected",        value: fmt(paid),            icon: CheckCircle2, color: "text-emerald-600",  bg: "bg-emerald-500/10" },
            { label: "Outstanding",      value: fmt(outstanding),     icon: Clock,        color: "text-sky-600",      bg: "bg-sky-500/10" },
            { label: "Overdue",          value: String(overdue),      icon: AlertCircle,  color: "text-red-500",      bg: "bg-red-500/10" },
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
          <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
              {["all","draft","sent","paid","overdue"].map(id => (
                <button key={id} onClick={() => setFilter(id)}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-all capitalize",
                    filter === id ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
                  {id === "all" ? "All" : id.charAt(0).toUpperCase() + id.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search invoices…"
                className="h-8 w-52 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                  <th className="px-5 py-3 font-semibold">Invoice</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Project</th>
                  <th className="px-5 py-3 font-semibold">Team</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Issued</th>
                  <th className="px-5 py-3 font-semibold">Due Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  <tr><td colSpan={9} className="py-12 text-center text-xs text-theme-muted">Loading invoices…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-xs text-theme-muted">No invoices found</td></tr>
                ) : filtered.map(inv => (
                  <tr key={inv.id} className="group transition-colors hover:bg-theme-raised/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                          <FileText size={13} className="text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-theme-fg font-mono">{inv.invoice_number}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-theme-fg">{inv.clients?.name || "—"}</td>
                    <td className="px-5 py-3 text-xs text-theme-muted">{inv.projects?.name || "—"}</td>
                    <td className="px-5 py-3 text-xs text-theme-muted">{inv.teams?.name || "—"}</td>
                    <td className="px-5 py-3 text-sm font-bold text-emerald-600">{fmt(inv.total)}</td>
                    <td className="px-5 py-3 text-xs text-theme-muted">{inv.issued_date || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs", inv.status === "overdue" ? "font-semibold text-red-500" : "text-theme-muted")}>
                        {inv.due_date || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_BADGE[inv.status]}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handlePreview(inv)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-theme-border bg-theme-raised text-theme-muted hover:text-blue-600 hover:border-blue-300 transition-colors"
                          title="Preview Invoice">
                          <Eye size={12} />
                        </button>
                        <button onClick={() => handleDownload(inv)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-theme-border bg-theme-raised text-theme-muted hover:text-theme-fg transition-colors"
                          title="Download PDF">
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
              Showing total: <span className="font-bold text-theme-fg">{fmt(filtered.reduce((s, i) => s + (i.total || 0), 0))}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showForm && (
        <InvoiceModal
          onClose={() => setShowForm(false)}
          onSaved={loadInvoices}
          clients={clients}
          projects={projects}
          teams={teams}
        />
      )}

      {/* Preview Modal */}
      {previewInv && (
        <PreviewModal invoice={previewInv} onClose={() => setPreviewInv(null)} />
      )}
    </DashboardShell>
  );
}
