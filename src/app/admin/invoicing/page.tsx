"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useRef, useCallback, useContext, createContext } from "react";
import {
  FileText, Plus, Search, Download, IndianRupee, Clock,
  CheckCircle2, AlertCircle, X, Send, Eye, Mail,
  Building2, Folder, Users, Trash2, ChevronDown,
  Settings, Shield, Zap,
  FlaskConical, Save, Lock, AlertTriangle, User
} from "lucide-react";
import { validateGSTIN, extractPANFromGSTIN } from "@/lib/gst";

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
  status:          "draft" | "sent" | "paid" | "overdue" | "error";
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
  clients?:           { id: string; name: string; email: string; company: string } | null;
  projects?:          { id: string; name: string } | null;
  teams?:             { id: string; name: string } | null;
  invoice_items?:     LineItem[];
  created_by_emp_id?: string | null;
  created_by_name?:   string | null;
  created_by_dept?:   string | null;
  created_by_team?:   string | null;
  created_by_desig?:  string | null;
}

interface Client  { id: string; name: string; email?: string; company?: string; lead_name?: string; gstin?: string; pan?: string; address?: string; }
interface Project { id: string; name: string; client_id?: string; teamIds?: string[]; issued_date?: string; due_date?: string; }
interface Team    { id: string; name: string; }
interface Employee {
  id: string;
  employee_id: string;
  name: string;
  department: string | null;
  designation: string | null;
  team_id: string | null;
  teams?: { name: string } | null;
}

interface InvoiceSettings {
  id?:                   string;
  // Company Profile
  company_name:          string;
  gstin:                 string;
  pan:                   string;
  address:               string;
  city:                  string;
  state:                 string;
  pincode:               string;
  phone:                 string;
  email:                 string;
  bank_name:             string;
  bank_account:          string;
  bank_ifsc:             string;
  bank_branch:           string;
  default_terms:         string;
  // SMTP
  smtp_host:             string;
  smtp_port:             number;
  smtp_user:             string;
  smtp_pass:             string;
  smtp_from_name:        string;
  smtp_from_email:       string;
  smtp_secure:           boolean;
  // Invoice Rules
  invoice_prefix:        string;
  default_due_days:      number;
  invoice_footer:        string;
  auto_numbering:        boolean;
  show_logo:             boolean;
  default_gst_rate:      number;
  default_place_of_supply: string;
  require_approval:      boolean;
  send_on_create:        boolean;
  // Permissions
  can_create_roles:      string[];
  can_send_roles:        string[];
  can_mark_paid_roles:   string[];
  can_delete_roles:      string[];
  can_edit_roles:        string[];
}

const ALL_ROLES = [
  { value: "super_admin", label: "Super Admin",  color: "bg-purple-100 text-purple-700" },
  { value: "accounts",    label: "Accounts",     color: "bg-blue-100 text-blue-700" },
  { value: "hr",          label: "HR",           color: "bg-emerald-100 text-emerald-700" },
  { value: "lead",        label: "Lead",         color: "bg-amber-100 text-amber-700" },
  { value: "sales",       label: "Sales",        color: "bg-sky-100 text-sky-700" },
  { value: "employee",    label: "Employee",     color: "bg-gray-100 text-gray-600" },
];

// Official GST State/UT Codes (01-37) - Indian Government
const INDIAN_STATES_WITH_CODES = [
  { name: "Jammu & Kashmir", code: "01" },
  { name: "Himachal Pradesh", code: "02" },
  { name: "Punjab", code: "03" },
  { name: "Chandigarh", code: "04" },
  { name: "Uttarakhand", code: "05" },
  { name: "Haryana", code: "06" },
  { name: "Delhi", code: "07" },
  { name: "Rajasthan", code: "08" },
  { name: "Uttar Pradesh", code: "09" },
  { name: "Bihar", code: "10" },
  { name: "Sikkim", code: "11" },
  { name: "Arunachal Pradesh", code: "12" },
  { name: "Nagaland", code: "13" },
  { name: "Manipur", code: "14" },
  { name: "Mizoram", code: "15" },
  { name: "Tripura", code: "16" },
  { name: "Meghalaya", code: "17" },
  { name: "Assam", code: "18" },
  { name: "West Bengal", code: "19" },
  { name: "Jharkhand", code: "20" },
  { name: "Odisha", code: "21" },
  { name: "Chhattisgarh", code: "22" },
  { name: "Madhya Pradesh", code: "23" },
  { name: "Gujarat", code: "24" },
  { name: "Daman and Diu / Dadra and Nagar Haveli", code: "25" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "26" },
  { name: "Maharashtra", code: "27" },
  { name: "Andhra Pradesh (Old)", code: "28" },
  { name: "Karnataka", code: "29" },
  { name: "Goa", code: "30" },
  { name: "Lakshadweep", code: "31" },
  { name: "Kerala", code: "32" },
  { name: "Tamil Nadu", code: "33" },
  { name: "Puducherry", code: "34" },
  { name: "Andaman and Nicobar Islands", code: "35" },
  { name: "Telangana", code: "36" },
  { name: "Andhra Pradesh", code: "37" },
];

const EMPTY_SETTINGS: InvoiceSettings = {
  company_name: "", gstin: "", pan: "", address: "", city: "", state: "", pincode: "", phone: "", email: "",
  bank_name: "", bank_account: "", bank_ifsc: "", bank_branch: "",
  default_terms: "Payment due within 30 days.\nLate payment may attract 1.5% monthly interest.",
  smtp_host: "", smtp_port: 587, smtp_user: "", smtp_pass: "", smtp_from_name: "Namaah Technologies", smtp_from_email: "", smtp_secure: false,
  invoice_prefix: "INV", default_due_days: 30, invoice_footer: "Thank you for your business.", auto_numbering: true, show_logo: true,
  default_gst_rate: 18, default_place_of_supply: "Karnataka", require_approval: false, send_on_create: false,
  can_create_roles: ["super_admin","accounts"], can_send_roles: ["super_admin","accounts"],
  can_mark_paid_roles: ["super_admin","accounts"], can_delete_roles: ["super_admin"], can_edit_roles: ["super_admin","accounts"],
};

const STATUS_BADGE: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
  draft: "default", sent: "info", paid: "success", overdue: "danger", error: "danger",
};
const GST_RATES = [0, 5, 12, 18, 28];

const round = (n: number) => Math.round(n * 100) / 100; // Round to 2 decimals
const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string | null | undefined): string => {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00"); // force local midnight, not UTC shift
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

// ─── Settings sub-components (MUST live outside modal to preserve focus) ──────
function SField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">{label}</label>
      {children}
    </div>
  );
}

function SInput({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className={cn("h-9 w-full rounded-xl border border-theme-border bg-theme-page px-3 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all", className)}
    />
  );
}

function STextarea({ value, onChange, rows = 3, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <textarea
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full rounded-xl border border-theme-border bg-theme-page px-3 py-2 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all resize-none"
    />
  );
}

function SToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-theme-border/50 last:border-0">
      <span className="text-xs font-semibold text-theme-fg">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={cn("relative flex h-6 w-11 items-center rounded-full transition-all duration-200 flex-shrink-0",
          checked ? "bg-blue-600" : "bg-theme-raised border border-theme-border")}>
        <span className={cn("absolute inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}

function SRoleChips({ field, form, onToggle }: {
  field: keyof InvoiceSettings;
  form: InvoiceSettings;
  onToggle: (field: keyof InvoiceSettings, role: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {ALL_ROLES.map(r => {
        const active = (form[field] as string[])?.includes(r.value);
        return (
          <button key={r.value} type="button" onClick={() => onToggle(field, r.value)}
            className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-all",
              active ? r.color + " border-current" : "bg-theme-raised text-theme-muted border-theme-border hover:text-theme-fg")}>
            {r.label} {active ? "✓" : "+"}
          </button>
        );
      })}
    </div>
  );
}

// ─── Invoice Settings Modal ───────────────────────────────────────────────────
function InvoiceSettingsModal({ onClose, initial }: { onClose: (saved?: InvoiceSettings) => void; initial: InvoiceSettings }) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<"company" | "smtp" | "rules" | "permissions">("company");
  const [form, setForm] = useState<InvoiceSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");

  const set = (key: keyof InvoiceSettings, val: any) => setForm(f => ({ ...f, [key]: val }));

  const handleGstinChange = (val: string) => {
    const upperVal = val.toUpperCase();
    set("gstin", upperVal);
    const extractedPan = extractPANFromGSTIN(upperVal);
    if (extractedPan) {
      set("pan", extractedPan);
    }
  };

  const isGstinValid = !form.gstin || validateGSTIN(form.gstin);

  const toggleRole = (field: keyof InvoiceSettings, role: string) => {
    const arr = (form[field] as string[]) || [];
    set(field, arr.includes(role) ? arr.filter(r => r !== role) : [...arr, role]);
  };

  const handleSave = async () => {
    if (form.gstin && !validateGSTIN(form.gstin)) {
      showToast("Invalid Company GSTIN format", "error"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/invoices/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save settings", "error");
      } else {
        showToast("Invoice settings saved successfully", "success");
        onClose(data.settings);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to save settings", "error");
    } finally { setSaving(false); }
  };

  const handleTestSmtp = async () => {
    if (!form.smtp_host || !form.smtp_user || !form.smtp_pass) {
      showToast("Fill SMTP host, user and password first", "error"); return;
    }
    setTesting(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const res = await fetch("/api/invoices/settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, test_to: testTo || form.smtp_user }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "SMTP test failed", "error");
      } else {
        showToast(data.message || "Test email sent! Check your inbox.", "success");
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        showToast("SMTP test timeout - server not responding. Check your SMTP host and port.", "error");
      } else {
        showToast(e.message || "SMTP test failed", "error");
      }
    } finally { setTesting(false); }
  };

  const TABS = [
    { id: "company",     icon: Building2,    label: "Company Profile" },
    { id: "smtp",        icon: Mail,         label: "SMTP / Email" },
    { id: "rules",       icon: Zap,          label: "Invoice Rules" },
    { id: "permissions", icon: Shield,       label: "Permissions" },
  ] as const;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-[72vw] max-h-[88vh] flex flex-col rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme-border px-7 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-raised border border-theme-border">
              <Settings size={18} className="text-theme-fg" />
            </div>
            <div>
              <h3 className="text-sm font-black text-theme-fg">Invoice Settings</h3>
              <p className="text-[10px] text-theme-muted mt-0.5">One-time setup — company profile, SMTP, rules & access control</p>
            </div>
          </div>
          <button onClick={() => onClose()} className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised transition-colors"><X size={16} /></button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-theme-border flex-shrink-0 bg-theme-page">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("flex items-center gap-2 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                  tab === t.id ? "border-blue-600 text-blue-600 bg-theme-surface" : "border-transparent text-theme-muted hover:text-theme-fg")}>
                <Icon size={13} />{t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-7">

          {/* ── Company Profile ── */}
          {tab === "company" && (
            <div className="space-y-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1 flex items-center gap-2"><Building2 size={11}/>Company & GST Identity</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2"><SField label="Company Name"><SInput value={form.company_name} onChange={v => set("company_name", v)} placeholder="Namaah Technologies Pvt. Ltd." /></SField></div>
                <SField label="GSTIN">
                  <div className="relative">
                    <SInput 
                      value={form.gstin} 
                      onChange={handleGstinChange} 
                      placeholder="29ABCDE1234F1Z5" 
                      className={cn(!isGstinValid && "border-red-500 focus:border-red-500 bg-red-50/20")}
                    />
                    {!isGstinValid && (
                      <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-1.5 text-red-500">
                        <AlertTriangle size={12} />
                        <span className="text-[9px] font-black uppercase">Invalid GSTIN</span>
                      </div>
                    )}
                    {form.gstin && isGstinValid && (
                      <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-1.5 text-emerald-500">
                        <CheckCircle2 size={12} />
                        <span className="text-[9px] font-black uppercase">Verified Format</span>
                      </div>
                    )}
                  </div>
                </SField>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <SField label="PAN"><SInput value={form.pan} onChange={v => set("pan", v)} placeholder="ABCDE1234F" /></SField>
                <SField label="Phone"><SInput value={form.phone} onChange={v => set("phone", v)} placeholder="+91 98765 43210" /></SField>
                <SField label="Email"><SInput value={form.email} onChange={v => set("email", v)} placeholder="accounts@company.com" type="email" /></SField>
              </div>
              <SField label="Registered Address"><SInput value={form.address} onChange={v => set("address", v)} placeholder="123 Tech Park, Whitefield" /></SField>
              <div className="grid grid-cols-3 gap-4">
                <SField label="City"><SInput value={form.city} onChange={v => set("city", v)} placeholder="Bangalore" /></SField>
                <StateDropdown
                  label="State"
                  value={form.state || ""}
                  onChange={v => set("state", v)}
                  placeholder="Select State"
                />
                <SField label="Pincode"><SInput value={form.pincode} onChange={v => set("pincode", v)} placeholder="560066" /></SField>
              </div>

              <div className="border-t border-theme-border/50 pt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3 flex items-center gap-2"><IndianRupee size={11}/>Bank Details (shown on invoices)</p>
                <div className="grid grid-cols-2 gap-4">
                  <SField label="Bank Name"><SInput value={form.bank_name} onChange={v => set("bank_name", v)} placeholder="HDFC Bank" /></SField>
                  <SField label="Account Number"><SInput value={form.bank_account} onChange={v => set("bank_account", v)} placeholder="50100XXXXXXXXX" /></SField>
                  <SField label="IFSC Code"><SInput value={form.bank_ifsc} onChange={v => set("bank_ifsc", v)} placeholder="HDFC0001234" /></SField>
                  <SField label="Branch"><SInput value={form.bank_branch} onChange={v => set("bank_branch", v)} placeholder="Whitefield, Bangalore" /></SField>
                </div>
              </div>

              <div className="border-t border-theme-border/50 pt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3">Default Terms & Conditions</p>
                <STextarea value={form.default_terms} onChange={v => set("default_terms", v)} rows={4} placeholder="Payment due within 30 days..." />
              </div>
            </div>
          )}

          {/* ── SMTP / Email ── */}
          {tab === "smtp" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                <Lock size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 font-semibold">SMTP credentials are stored securely and used only for sending invoice emails. Super Admin access only.</p>
              </div>

              <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2"><Mail size={11}/>SMTP Server Configuration</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2"><SField label="SMTP Host"><SInput value={form.smtp_host} onChange={v => set("smtp_host", v)} placeholder="smtp.gmail.com" /></SField></div>
                <SField label="Port"><SInput value={form.smtp_port} onChange={v => set("smtp_port", Number(v))} placeholder="587" type="number" /></SField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SField label="SMTP Username"><SInput value={form.smtp_user} onChange={v => set("smtp_user", v)} placeholder="invoices@yourcompany.com" /></SField>
                <SField label="SMTP Password"><SInput value={form.smtp_pass} onChange={v => set("smtp_pass", v)} placeholder="••••••••••••" type="password" /></SField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SField label="From Name (shown to recipient)"><SInput value={form.smtp_from_name} onChange={v => set("smtp_from_name", v)} placeholder="Namaah Technologies" /></SField>
                <SField label="From Email"><SInput value={form.smtp_from_email} onChange={v => set("smtp_from_email", v)} placeholder="invoices@namaah.co" type="email" /></SField>
              </div>

              <div className="rounded-xl border border-theme-border bg-theme-raised p-4">
                <SToggle checked={form.smtp_secure} onChange={v => set("smtp_secure", v)} label="Use SSL/TLS (enable for port 465)" />
              </div>

              {/* Test connection */}
              <div className="border-t border-theme-border/50 pt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3 flex items-center gap-2"><FlaskConical size={11}/>Test Connection</p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <SField label="Send test email to">
                      <SInput value={testTo} onChange={setTestTo} placeholder="your@email.com or leave blank to use SMTP user" type="email" />
                    </SField>
                  </div>
                  <button type="button" onClick={handleTestSmtp} disabled={testing}
                    className="flex items-center gap-2 h-9 px-5 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 transition-all disabled:opacity-50 flex-shrink-0">
                    {testing ? <><span className="animate-spin">⟳</span> Testing…</> : <><FlaskConical size={12} /> Send Test</>}
                  </button>
                </div>
                <p className="text-[10px] text-theme-muted mt-2">This verifies your SMTP credentials and sends a test email to confirm delivery.</p>
              </div>
            </div>
          )}

          {/* ── Invoice Rules ── */}
          {tab === "rules" && (
            <div className="space-y-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2"><Zap size={11}/>Numbering & Format</p>
              <div className="grid grid-cols-3 gap-4">
                <SField label="Invoice Prefix">
                  <SInput value={form.invoice_prefix} onChange={v => set("invoice_prefix", v)} placeholder="INV" />
                </SField>
                <SField label="Default Due Days">
                  <SInput value={form.default_due_days} onChange={v => set("default_due_days", Number(v))} placeholder="30" type="number" />
                </SField>
                <SField label="Default GST Rate (%)">
                  <select value={form.default_gst_rate} onChange={e => set("default_gst_rate", Number(e.target.value))}
                    className="h-9 w-full rounded-xl border border-theme-border bg-theme-page px-3 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all">
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </SField>
              </div>
              <SField label="Default Place of Supply">
                <SInput value={form.default_place_of_supply} onChange={v => set("default_place_of_supply", v)} placeholder="Karnataka" />
              </SField>
              <SField label="Invoice Footer Text">
                <STextarea value={form.invoice_footer} onChange={v => set("invoice_footer", v)} rows={2} placeholder="Thank you for your business." />
              </SField>

              <div className="border-t border-theme-border/50 pt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3 flex items-center gap-2"><Settings size={11}/>Behaviour Toggles</p>
                <div className="rounded-xl border border-theme-border bg-theme-raised px-4 py-1 space-y-0">
                  <SToggle checked={form.auto_numbering}   onChange={v => set("auto_numbering", v)}   label="Auto-generate invoice numbers (INV-2026-001)" />
                  <SToggle checked={form.show_logo}        onChange={v => set("show_logo", v)}         label="Show company logo on invoice PDF" />
                  <SToggle checked={form.require_approval} onChange={v => set("require_approval", v)} label="Require approval before sending invoice" />
                  <SToggle checked={form.send_on_create}   onChange={v => set("send_on_create", v)}   label="Auto-send invoice to client on creation" />
                </div>
              </div>
            </div>
          )}

          {/* ── Permissions ── */}
          {tab === "permissions" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-start gap-3">
                <Shield size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 font-semibold">Control which roles can perform each invoice action. Super Admin always has full access.</p>
              </div>

              {[
                { field: "can_create_roles",    icon: Plus,         label: "Create Invoice",   desc: "Roles allowed to create new invoices" },
                { field: "can_edit_roles",      icon: FileText,     label: "Edit Invoice",     desc: "Roles allowed to edit draft invoices" },
                { field: "can_send_roles",      icon: Send,         label: "Send Invoice",     desc: "Roles allowed to send invoices to clients" },
                { field: "can_mark_paid_roles", icon: CheckCircle2, label: "Mark as Paid",     desc: "Roles allowed to mark invoices as paid" },
                { field: "can_delete_roles",    icon: Trash2,       label: "Delete Invoice",   desc: "Roles allowed to permanently delete invoices" },
              ].map(({ field, icon: Icon, label, desc }) => (
                <div key={field} className="rounded-xl border border-theme-border bg-theme-raised/30 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={13} className="text-theme-muted" />
                    <span className="text-xs font-black text-theme-fg">{label}</span>
                  </div>
                  <p className="text-[10px] text-theme-muted mb-3">{desc}</p>
                  <SRoleChips field={field as keyof InvoiceSettings} form={form} onToggle={toggleRole} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-theme-border px-7 py-4 bg-theme-surface flex-shrink-0">
          <p className="text-[10px] text-theme-muted">Changes apply immediately to all new invoice creations</p>
          <div className="flex gap-3">
            <button onClick={() => onClose()} className="px-5 py-2 rounded-xl border border-theme-border text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all disabled:opacity-60">
              {saving ? <><span className="animate-spin">⟳</span> Saving…</> : <><Save size={12} /> Save Settings</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GST A4 Invoice ───────────────────────────────────────────────────────────
// A4 = 794 × 1123 px at 96 dpi. We render exactly this size so html2canvas
// captures a pixel-perfect page and jsPDF embeds it without scaling artefacts.
const SettingsCtx = createContext<InvoiceSettings>(EMPTY_SETTINGS);

function toWords(n: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if (n === 0) return "Zero";
  const crores = Math.floor(n / 10000000);
  const lakhs  = Math.floor((n % 10000000) / 100000);
  const thousands = Math.floor((n % 100000) / 1000);
  const hundreds  = Math.floor((n % 1000) / 100);
  const rest      = n % 100;
  let w = "";
  const twoDigit = (x: number) => x < 20 ? ones[x] : tens[Math.floor(x/10)] + (x%10 ? " "+ones[x%10] : "");
  if (crores)   w += twoDigit(crores)   + " Crore ";
  if (lakhs)    w += twoDigit(lakhs)    + " Lakh ";
  if (thousands) w += twoDigit(thousands) + " Thousand ";
  if (hundreds) w += ones[hundreds]     + " Hundred ";
  if (rest)     w += twoDigit(rest);
  return w.trim();
}

function amountInWords(total: number): string {
  const rupees = Math.floor(total);
  const paise  = Math.round((total - rupees) * 100);
  let s = "INR " + toWords(rupees) + " Rupees";
  if (paise > 0) s += " and " + toWords(paise) + " Paise";
  return s + " Only";
}

function A4Invoice({ inv, items, id = "a4-invoice" }: {
  inv: any; items: LineItem[]; id?: string;
}) {
  const s = useContext(SettingsCtx);
  // Calculate with full precision first
  const subtotalExact = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const cgstExact     = items.reduce((sum, i) => sum + (i.cgst_amount || 0), 0);
  const sgstExact     = items.reduce((sum, i) => sum + (i.sgst_amount || 0), 0);
  const igstExact     = items.reduce((sum, i) => sum + (i.igst_amount || 0), 0);

  // Round for display
  const subtotal = round(subtotalExact);
  const cgst     = round(cgstExact);
  const sgst     = round(sgstExact);
  const igst     = round(igstExact);

  // Calculate exact total and round-off
  const totalBeforeRounding = subtotalExact + cgstExact + sgstExact + igstExact;
  const total    = round(totalBeforeRounding);
  const roundOff = total - totalBeforeRounding;
  const isIGST   = igstExact > 0;

  const companyName    = s.company_name || "Your Company Name";
  const companyGstin   = s.gstin        || "—";
  const companyPan     = s.pan          || "—";
  const companyAddr    = [s.address, s.city, s.state, s.pincode].filter(Boolean).join(", ") || "—";
  const companyPhone   = s.phone        || "—";
  const companyEmail   = s.email        || "—";

  // GST summary rows per rate
  const rateMap: Record<number, { taxable: number; cgst: number; sgst: number; igst: number }> = {};
  items.forEach(i => {
    if (!rateMap[i.gst_rate]) rateMap[i.gst_rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    rateMap[i.gst_rate].taxable += i.amount || 0;
    rateMap[i.gst_rate].cgst   += i.cgst_amount || 0;
    rateMap[i.gst_rate].sgst   += i.sgst_amount || 0;
    rateMap[i.gst_rate].igst   += i.igst_amount || 0;
  });

  const cell = "border border-gray-300 px-2 py-1.5";
  const hcell = `${cell} bg-blue-900 text-white font-bold text-[9px] uppercase tracking-wide`;

  // px constants that match the A4 sheet
  const PX = { h: "794px", v: "1123px" };

  return (
    <div
      id={id}
      style={{
        width: PX.h,
        height: PX.v,
        backgroundColor: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "#1a1a2e",
        fontSize: "11px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── HEADER BAND ── */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 65%,#3b82f6 100%)", padding: "18px 28px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1 }}>TAX INVOICE</div>
            <div style={{ fontSize: "8px", color: "#bfdbfe", fontWeight: 700, letterSpacing: "3px", marginTop: "3px", textTransform: "uppercase" }}>
              GST Compliant · Original for Recipient
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "18px", fontWeight: 900, color: "#fff" }}>{inv.invoice_number || "INV-XXXX"}</div>
            <div style={{ fontSize: "9px", color: "#bfdbfe", marginTop: "3px" }}>Date of Issue: <strong>{fmtDate(inv.issued_date)}</strong></div>
            <div style={{ fontSize: "9px", color: "#bfdbfe", marginTop: "2px" }}>Due Date: <strong>{fmtDate(inv.due_date)}</strong></div>
            {inv.place_of_supply && <div style={{ fontSize: "9px", color: "#bfdbfe", marginTop: "2px" }}>Place of Supply: <strong>{inv.place_of_supply}</strong></div>}
          </div>
        </div>
      </div>

      {/* ── SELLER / BUYER ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "2px solid #1d4ed8", flexShrink: 0 }}>
        <div style={{ padding: "10px 16px 10px 28px", borderRight: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "7px", fontWeight: 900, color: "#9ca3af", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>Bill From (Supplier)</div>
          <div style={{ fontSize: "12px", fontWeight: 900, color: "#111827", lineHeight: 1.2 }}>{companyName}</div>
          <div style={{ marginTop: "4px", lineHeight: 1.5, color: "#374151", fontSize: "9px" }}>
            <div>{companyAddr}</div>
            <div>Ph: {companyPhone} | {companyEmail}</div>
            <div style={{ marginTop: "3px" }}><strong>GSTIN:</strong> {companyGstin} &nbsp;|&nbsp; <strong>PAN:</strong> {companyPan}</div>
          </div>
        </div>
        <div style={{ padding: "10px 28px 10px 16px" }}>
          <div style={{ fontSize: "7px", fontWeight: 900, color: "#9ca3af", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>Bill To (Recipient)</div>
          <div style={{ fontSize: "12px", fontWeight: 900, color: "#111827", lineHeight: 1.2 }}>{inv.client_name || "—"}</div>
          <div style={{ marginTop: "4px", lineHeight: 1.5, color: "#374151", fontSize: "9px" }}>
            {inv.billing_address && <div>{inv.billing_address}</div>}
            {inv.client_email && <div>{inv.client_email}</div>}
            {inv.client_gstin && <div><strong>GSTIN:</strong> {inv.client_gstin}</div>}
          </div>
          {inv.project_name && <div style={{ marginTop: "4px", fontSize: "9px", color: "#1d4ed8", fontWeight: 700 }}>Project: {inv.project_name}</div>}
        </div>
      </div>

      {/* ── LINE ITEMS TABLE ── */}
      <div style={{ padding: "10px 28px 0", flexShrink: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
          <thead>
            <tr>
              <th className={hcell} style={{ width: "22px", textAlign: "center" }}>#</th>
              <th className={hcell} style={{ textAlign: "left" }}>Description of Goods / Service</th>
              <th className={hcell} style={{ width: "48px", textAlign: "center" }}>HSN/SAC</th>
              <th className={hcell} style={{ width: "32px", textAlign: "center" }}>Qty</th>
              <th className={hcell} style={{ width: "68px", textAlign: "right" }}>Rate (₹)</th>
              <th className={hcell} style={{ width: "44px", textAlign: "center" }}>GST%</th>
              <th className={hcell} style={{ width: "68px", textAlign: "right" }}>Taxable (₹)</th>
              {isIGST ? (
                <th className={hcell} style={{ width: "68px", textAlign: "right" }}>IGST (₹)</th>
              ) : (
                <>
                  <th className={hcell} style={{ width: "60px", textAlign: "right" }}>CGST (₹)</th>
                  <th className={hcell} style={{ width: "60px", textAlign: "right" }}>SGST (₹)</th>
                </>
              )}
              <th className={hcell} style={{ width: "76px", textAlign: "right", background: "#1e40af" }}>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td className={cell} style={{ textAlign: "center", color: "#9ca3af" }}>{i + 1}</td>
                <td className={cell}>
                  <div style={{ fontWeight: 600, color: "#111827" }}>{item.description || "—"}</div>
                  {item.hsn_sac && <div style={{ fontSize: "8px", color: "#9ca3af" }}>HSN/SAC: {item.hsn_sac}</div>}
                </td>
                <td className={cell} style={{ textAlign: "center", color: "#6b7280" }}>{item.hsn_sac || "—"}</td>
                <td className={cell} style={{ textAlign: "center" }}>{item.quantity}</td>
                <td className={cell} style={{ textAlign: "right" }}>{fmt(item.rate)}</td>
                <td className={cell} style={{ textAlign: "center" }}>{item.gst_rate}%</td>
                <td className={cell} style={{ textAlign: "right" }}>{fmt(item.amount)}</td>
                {isIGST ? (
                  <td className={cell} style={{ textAlign: "right" }}>{fmt(item.igst_amount)}</td>
                ) : (
                  <>
                    <td className={cell} style={{ textAlign: "right" }}>{fmt(round(item.cgst_amount))}</td>
                    <td className={cell} style={{ textAlign: "right" }}>{fmt(round(item.sgst_amount))}</td>
                  </>
                )}
                <td className={cell} style={{ textAlign: "right", fontWeight: 700, background: "#eff6ff" }}>{fmt(item.total)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={isIGST ? 9 : 10} className={cell} style={{ textAlign: "center", color: "#d1d5db", padding: "16px" }}>No line items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── GST SUMMARY + AMOUNT BOX ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 210px", padding: "8px 28px", flexShrink: 0 }}>
        <div style={{ paddingRight: "14px" }}>
          <div style={{ fontSize: "7px", fontWeight: 900, color: "#9ca3af", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "5px" }}>GST Tax Summary</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ border: "1px solid #e5e7eb", padding: "3px 7px", textAlign: "left" }}>GST Rate</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "3px 7px", textAlign: "right" }}>Taxable</th>
                {isIGST
                  ? <th style={{ border: "1px solid #e5e7eb", padding: "3px 7px", textAlign: "right" }}>IGST</th>
                  : <><th style={{ border: "1px solid #e5e7eb", padding: "3px 7px", textAlign: "right" }}>CGST</th><th style={{ border: "1px solid #e5e7eb", padding: "3px 7px", textAlign: "right" }}>SGST</th></>}
                <th style={{ border: "1px solid #e5e7eb", padding: "3px 7px", textAlign: "right" }}>Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rateMap).map(([rate, row]) => (
                <tr key={rate}>
                  <td style={{ border: "1px solid #e5e7eb", padding: "2px 7px" }}>{rate}%</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "2px 7px", textAlign: "right" }}>{fmt(row.taxable)}</td>
                  {isIGST
                    ? <td style={{ border: "1px solid #e5e7eb", padding: "2px 7px", textAlign: "right" }}>{fmt(row.igst)}</td>
                    : <><td style={{ border: "1px solid #e5e7eb", padding: "2px 7px", textAlign: "right" }}>{fmt(row.cgst)}</td><td style={{ border: "1px solid #e5e7eb", padding: "2px 7px", textAlign: "right" }}>{fmt(row.sgst)}</td></>}
                  <td style={{ border: "1px solid #e5e7eb", padding: "2px 7px", textAlign: "right", fontWeight: 600 }}>{fmt(isIGST ? row.igst : row.cgst + row.sgst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ border: "1.5px solid #1d4ed8", borderRadius: "6px", overflow: "hidden", alignSelf: "start" }}>
          <div style={{ background: "#1d4ed8", padding: "5px 10px" }}>
            <div style={{ fontSize: "7px", fontWeight: 900, color: "#bfdbfe", letterSpacing: "2px", textTransform: "uppercase" }}>Amount Summary</div>
          </div>
          <div style={{ padding: "6px 10px", fontSize: "9px" }}>
            {[
              { label: "Subtotal", val: subtotal },
              ...(!isIGST && cgst > 0 ? [{ label: "CGST", val: cgst }] : []),
              ...(!isIGST && sgst > 0 ? [{ label: "SGST", val: sgst }] : []),
              ...(isIGST && igst > 0  ? [{ label: "IGST", val: igst }] : []),
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #e5e7eb" }}>
                <span style={{ color: "#6b7280" }}>{r.label}</span>
                <span style={{ fontWeight: 600 }}>{fmt(r.val)}</span>
              </div>
            ))}
            {roundOff !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #fca5a5", color: "#ea580c" }}>
                <span style={{ fontSize: "8px" }}>Round Off</span>
                <span style={{ fontWeight: 600, fontSize: "8px" }}>{fmt(roundOff)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 2px", marginTop: "2px" }}>
              <span style={{ fontWeight: 900, fontSize: "11px", color: "#111827" }}>Grand Total</span>
              <span style={{ fontWeight: 900, fontSize: "12px", color: "#1d4ed8" }}>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── AMOUNT IN WORDS ── */}
      <div style={{ margin: "0 28px", padding: "6px 10px", background: "#eff6ff", borderRadius: "5px", border: "1px solid #bfdbfe", fontSize: "9px", flexShrink: 0 }}>
        <strong>Amount in Words:</strong> {amountInWords(total)}
      </div>

      {/* ── MIDDLE GROW SECTION: BANK + NOTES + TERMS ── fills remaining space */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 28px", gap: "8px", overflow: "hidden" }}>
        {/* Bank + Notes */}
        <div style={{ display: "grid", gridTemplateColumns: inv.notes ? "1fr 1fr" : "1fr", gap: "10px" }}>
          {inv.bank_details && (
            <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "8px 12px" }}>
              <div style={{ fontSize: "7px", fontWeight: 900, color: "#9ca3af", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>Bank / Payment Details</div>
              <div style={{ fontSize: "9px", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-line" }}>{inv.bank_details}</div>
            </div>
          )}
          {inv.notes && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "8px 12px" }}>
              <div style={{ fontSize: "7px", fontWeight: 900, color: "#1d4ed8", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>Notes / Remarks</div>
              <div style={{ fontSize: "9px", color: "#1e40af", lineHeight: 1.6, whiteSpace: "pre-line" }}>{inv.notes}</div>
            </div>
          )}
        </div>

        {/* Terms */}
        {inv.terms && (
          <div>
            <div style={{ fontSize: "7px", fontWeight: 900, color: "#9ca3af", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "3px" }}>Terms & Conditions</div>
            <div style={{ fontSize: "8px", color: "#6b7280", lineHeight: 1.5, whiteSpace: "pre-line" }}>{inv.terms}</div>
          </div>
        )}

        {/* Spacer pushes signature to bottom of flex area */}
        <div style={{ flex: 1 }} />

        {/* Signature row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #e5e7eb", paddingTop: "8px", gap: "20px" }}>
          <div>
            <div style={{ fontSize: "7px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "22px" }}>Authorised Signatory</div>
            <div style={{ borderTop: "1px solid #6b7280", paddingTop: "3px", fontSize: "8px", color: "#374151" }}>{companyName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "7px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "22px" }}>Recipient Signature</div>
            <div style={{ borderTop: "1px solid #6b7280", paddingTop: "3px", fontSize: "8px", color: "#9ca3af" }}>Received in good condition</div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── pinned to bottom */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)", padding: "8px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: "8px", color: "#bfdbfe" }}>This is a computer-generated invoice and does not require a physical signature.</div>
        <div style={{ fontSize: "8px", color: "#93c5fd", fontWeight: 700 }}>{companyName} · GSTIN: {companyGstin}</div>
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

// ─── Searchable State Dropdown with GST Codes ─────────────────────────────
function StateDropdown({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = INDIAN_STATES_WITH_CODES.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
  );
  const selected = INDIAN_STATES_WITH_CODES.find(s => s.name === value);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  return (
    <div ref={ref} className="space-y-1.5">
      <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">{label}</label>
      <div className="relative">
        <button type="button" onClick={() => { setOpen(!open); setSearch(""); }}
          className="flex h-10 w-full items-center justify-between rounded-xl border border-theme-border bg-theme-page px-3 text-xs font-semibold text-theme-fg hover:border-theme-strong transition-all">
          <span className={cn("truncate", !selected && "text-theme-muted font-normal")}>
            {selected ? `${selected.name} (${selected.code})` : placeholder}
          </span>
          <ChevronDown size={13} className={cn("flex-shrink-0 text-theme-muted transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute top-full z-[9999] mt-1 w-full rounded-xl border border-theme-border bg-theme-surface shadow-xl overflow-hidden">
            <div className="p-2 border-b border-theme-border">
              <input ref={inputRef} type="text" placeholder="Search state or code..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 rounded-lg border border-theme-border bg-theme-page px-2 text-xs text-theme-fg outline-none focus:border-blue-500" />
            </div>
            <div className="max-h-48 overflow-y-auto">
              <button type="button" onClick={() => { onChange(""); setOpen(false); }}
                className="flex w-full items-center px-3 py-2 text-xs text-theme-muted hover:bg-theme-raised">
                — {placeholder}
              </button>
              {filtered.length > 0 ? filtered.map(state => (
                <button key={state.code} type="button" onClick={() => { onChange(state.name); setOpen(false); }}
                  className={cn("flex w-full items-center justify-between px-3 py-2 text-xs", value === state.name ? "bg-blue-600 text-white font-semibold" : "text-theme-fg hover:bg-theme-raised")}>
                  <span>{state.name}</span>
                  <span className={cn("text-[10px] font-black", value === state.name ? "text-white" : "text-theme-muted")}>{state.code}</span>
                </button>
              )) : <div className="px-3 py-3 text-center text-xs text-theme-muted">No states found</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create / Edit Invoice Modal ─────────────────────────────────────────────
function InvoiceModal({ onClose, onSaved, clients, projects, teams, settings }: {
  onClose: () => void; onSaved: () => void;
  clients: Client[]; projects: Project[]; teams: Team[]; settings: InvoiceSettings;
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [log, setLog] = useState({ emp_id: "", name: "", dept: "", team: "", desig: "" });
  const [statusModal, setStatusModal] = useState<{ created: boolean; sent: boolean; invoice_number: string; email?: string } | null>(null);
  const [tempInvoiceForPDF, setTempInvoiceForPDF] = useState<Invoice | null>(null);

  useEffect(() => {
    fetch("/api/employees")
      .then(r => r.json())
      .then(data => setEmployees(data.employees || []))
      .catch(() => {});
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleEmpSelect = (empId: string) => {
    const emp = employees.find(e => e.employee_id === empId);
    if (emp) {
      setLog({
        emp_id: emp.employee_id,
        name:   emp.name,
        dept:   emp.department || "",
        team:   (emp.teams as any)?.name || "",
        desig:  emp.designation || "",
      });
    } else {
      setLog({ emp_id: "", name: "", dept: "", team: "", desig: "" });
    }
  };

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
    const rate   = Number(item.rate)     || 0;  // RATE is INCLUSIVE of GST (final price per unit)
    const gstR   = Number(item.gst_rate) || 0;

    // TOTAL = RATE (inc GST) × QTY — simple multiplication
    const total = qty * rate;  // Keep full precision for now

    // Extract GST amount from total for breakdown at bottom:
    // total = amount + (amount * gstR / 100)
    // amount = total / (1 + gstR / 100)
    const gstMultiplier = 1 + (gstR / 100);
    const amount = total / gstMultiplier;  // Amount excluding GST (full precision)
    const cgst   = amount * (gstR / 2) / 100;  // Don't round yet
    const sgst   = amount * (gstR / 2) / 100;  // Don't round yet

    return {
      ...item,
      rate: round(rate),
      amount: amount,  // Store with full precision for calculation
      cgst_amount: cgst,  // Store with full precision
      sgst_amount: sgst,  // Store with full precision
      igst_amount: 0,
      total: total  // Store with full precision
    } as LineItem;
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

  // Calculate with full precision first
  const subtotalExact = items.reduce((s, i) => s + i.amount, 0);
  const totalCgstExact = items.reduce((s, i) => s + i.cgst_amount, 0);
  const totalSgstExact = items.reduce((s, i) => s + i.sgst_amount, 0);
  const totalIgstExact = items.reduce((s, i) => s + i.igst_amount, 0);

  // Round individual amounts for display only
  const subtotal = round(subtotalExact);
  const totalCgst = round(totalCgstExact);
  const totalSgst = round(totalSgstExact);
  const totalIgst = round(totalIgstExact);

  // Calculate exact total before rounding
  const totalBeforeRounding = subtotalExact + totalCgstExact + totalSgstExact + totalIgstExact;
  // Round to 2 decimals and calculate round-off
  const total = round(totalBeforeRounding);
  const roundOff = total - totalBeforeRounding;

  const selectedClient  = clients.find(c => c.id === form.client_id);
  const selectedProject = projects.find(p => p.id === form.project_id);

  useEffect(() => {
    if (selectedClient) {
      setForm(f => ({ 
        ...f, 
        client_email: selectedClient.email || "", 
        billing_address: selectedClient.address || selectedClient.company || "",
        client_gstin: selectedClient.gstin || ""
      }));
    }
  }, [form.client_id, selectedClient]);

  useEffect(() => {
    if (selectedProject) {
      // Auto-select client if it matches project
      const pClientId = selectedProject.client_id;
      if (pClientId && !form.client_id) {
        setForm(f => ({ ...f, client_id: pClientId }));
      }
      // Auto-select the first team linked to this project
      const pTeamIds = selectedProject.teamIds;
      if (pTeamIds && pTeamIds.length > 0) {
        setForm(f => ({ ...f, team_id: pTeamIds[0] }));
      }
      
      // Auto-populate dates from project
      if (selectedProject.issued_date) {
        setForm(f => ({ ...f, issued_date: selectedProject.issued_date! }));
      }
      if (selectedProject.due_date) {
        setForm(f => ({ ...f, due_date: selectedProject.due_date! }));
      }
    }
  }, [form.project_id, selectedProject]);

  const handleSave = async (status: "draft" | "sent" = "draft") => {
    if (!form.client_id) { showToast("Please select a client", "error"); return; }
    if (form.client_gstin && !validateGSTIN(form.client_gstin)) {
      showToast("Invalid Client GSTIN format", "error"); return;
    }
    if (items.every(i => !i.description)) { showToast("Add at least one line item", "error"); return; }
    setSaving(true);
    try {
      // Step 1: Always create invoice as DRAFT first
      const createRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, status: "draft",  // Always create as draft, update later if email succeeds
          subtotal, cgst: totalCgst, sgst: totalSgst, igst: totalIgst,
          tax: totalCgst + totalSgst + totalIgst, total, amount: total,
          items,
          created_by_emp_id:  log.emp_id  || null,
          created_by_name:    log.name    || null,
          created_by_dept:    log.dept    || null,
          created_by_team:    log.team    || null,
          created_by_desig:   log.desig   || null,
        }),
      });

      if (!createRes.ok) {
        const error = await createRes.json().catch(() => ({ error: `HTTP ${createRes.status}` }));
        throw new Error(error?.error || `API Error: ${createRes.status}`);
      }

      const responseData = await createRes.json();
      const createdInvoice = responseData.invoice;
      const client = clients.find(c => c.id === form.client_id);
      const clientEmail = client?.email;
      const project = projects.find(p => p.id === form.project_id);
      const team = teams.find(t => t.id === form.team_id);

      // Store the created invoice for PDF generation
      setTempInvoiceForPDF(createdInvoice);

      // Show status modal with "created" but not "sent" yet
      setStatusModal({
        created: true,
        sent: false,  // Will update to true only after email succeeds
        invoice_number: createdInvoice.invoice_number,
        email: clientEmail,
      });

      // Handle email sending - update status ONLY after email succeeds
      if (status === "sent" && clientEmail) {
        // Send email asynchronously without awaiting
        (async () => {
          try {
            console.log("[Email Flow] Starting email send process...");

            // Switch to preview to render the invoice
            setActiveTab("preview");
            console.log("[Email Flow] Switched to preview tab, waiting for render...");

            // Wait for the preview to render - increase timeout to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 1200));
            console.log("[Email Flow] Wait complete, searching for DOM element...");

            const el = document.getElementById("a4-invoice-render");
            console.log("[Email Flow] DOM element search result:", el ? "Found" : "Not found");

            if (!el) {
              console.error("[Email Flow] ERROR: a4-invoice-render element not found. Sending email without PDF...");
              // Send email without PDF if element not found
              const shareRes = await fetch("/api/invoices/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: clientEmail,
                  invoice: {
                    invoiceNumber: createdInvoice.invoice_number,
                    clientName: client?.name,
                    projectName: project?.name,
                    issuedDate: createdInvoice.issued_date,
                    dueDate: createdInvoice.due_date,
                    bankDetails: createdInvoice.bank_details,
                    subtotal: createdInvoice.subtotal,
                    cgst: createdInvoice.cgst,
                    sgst: createdInvoice.sgst,
                    igst: createdInvoice.igst,
                    total: createdInvoice.total,
                  },
                  subject: `Invoice ${createdInvoice.invoice_number} from ${settings.company_name}`,
                  message: `Dear ${client?.name || "Valued Client"},\n\nPlease find your invoice attached.`,
                  pdfBase64: null,
                  pdfFileName: null,
                }),
              });

              console.log("[Email Flow] ✓ Fallback email sent:", shareRes.status);
              if (shareRes.ok) {
                // Update invoice status to "sent"
                await fetch(`/api/invoices/update-status`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: createdInvoice.id,
                    status: "sent",
                  }),
                }).catch(() => {});

                setStatusModal(prev => prev ? { ...prev, sent: true } : null);
                showToast("✓ Email sent without PDF (element rendering failed)", "info");
              } else {
                showToast("Failed to send email", "error");
                // Update invoice status to "error"
                await fetch(`/api/invoices/update-status`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: createdInvoice.id,
                    status: "error",
                  }),
                }).catch(() => {});
              }
              return;
            }

            if (el) {
              const SCALE   = 4; // 4K quality - crystal clear text and images for professional PDFs
              const A4_W_PX = 794;
              const A4_H_PX = 1123;
              const html2canvas = (await import("html2canvas")).default;
              const jsPDF = (await import("jspdf")).default;

              // Add timeout to prevent hanging
              const canvasPromise = html2canvas(el, {
                scale: SCALE, useCORS: true, backgroundColor: "#ffffff",
                width: A4_W_PX, height: A4_H_PX, windowWidth: A4_W_PX,
                allowTaint: true, logging: false, imageTimeout: 5000,
              } as any);

              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("PDF generation timeout")), 30000)
              );

              console.log("[Email Flow] Starting canvas rendering (this may take 10-30 seconds)...");
              const startRender = performance.now();

              const rawCanvas = await Promise.race([canvasPromise, timeoutPromise]) as HTMLCanvasElement;

              const renderTime = performance.now() - startRender;
              console.log(`[Email Flow] ✓ Canvas rendering complete (${(renderTime/1000).toFixed(2)}s)`);

              const croppedCanvas = document.createElement("canvas");
              croppedCanvas.width = A4_W_PX * SCALE;
              croppedCanvas.height = A4_H_PX * SCALE;
              croppedCanvas.getContext("2d")!.drawImage(rawCanvas, 0, 0, A4_W_PX * SCALE, A4_H_PX * SCALE, 0, 0, A4_W_PX * SCALE, A4_H_PX * SCALE);

              const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
              const pageW = pdf.internal.pageSize.getWidth();
              const pageH = pdf.internal.pageSize.getHeight();
              const pngImage = croppedCanvas.toDataURL("image/png");
              pdf.addImage(pngImage, "PNG", 0, 0, pageW, pageH);
              const pdfBase64 = pdf.output("datauristring").split(",")[1];
              console.log(`[Email Flow] PDF generated with PNG lossless compression (4K quality, file size: ${(pdfBase64?.length / 1024 / 1024).toFixed(2)}MB)`);

              // Send email with PDF
              console.log(`[Email Flow] Sending email to ${clientEmail} with ${pdfBase64?.length || 0} bytes of PDF...`);
              const startSend = performance.now();

              const shareRes = await fetch("/api/invoices/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: clientEmail,
                  invoice: {
                    invoiceNumber: createdInvoice.invoice_number,
                    clientName: client?.name,
                    projectName: project?.name,
                    issuedDate: createdInvoice.issued_date,
                    dueDate: createdInvoice.due_date,
                    bankDetails: createdInvoice.bank_details,
                    subtotal: createdInvoice.subtotal,
                    cgst: createdInvoice.cgst,
                    sgst: createdInvoice.sgst,
                    igst: createdInvoice.igst,
                    total: createdInvoice.total,
                  },
                  subject: `Invoice ${createdInvoice.invoice_number} from ${settings.company_name}`,
                  message: `Dear ${client?.name || "Valued Client"},\n\nPlease find your invoice attached.`,
                  pdfBase64,
                  pdfFileName: `${createdInvoice.invoice_number}.pdf`,
                }),
              });

              const sendTime = performance.now() - startSend;
              console.log(`[Email Flow] ✓ Share API Response: ${shareRes.status} ${shareRes.statusText} (${(sendTime/1000).toFixed(2)}s)`);

              // Update status modal with final result
              if (shareRes.ok) {
                // Email sent successfully - update invoice status to "sent"
                console.log("[Email Flow] Email sent successfully, updating invoice status...");

                const statusRes = await fetch(`/api/invoices/update-status`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: createdInvoice.id,
                    status: "sent",
                  }),
                });

                if (statusRes.ok) {
                  console.log("[Email Flow] ✓ Invoice status updated to SENT");
                  setStatusModal(prev => prev ? { ...prev, sent: true } : null);
                } else {
                  console.error("[Email Flow] Failed to update invoice status");
                  setStatusModal(prev => prev ? { ...prev, sent: true } : null);
                }
              } else {
                const errData = await shareRes.json().catch(() => ({}));
                console.error("Share API Error:", errData);

                // Update invoice status to ERROR
                await fetch(`/api/invoices/update-status`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: createdInvoice.id,
                    status: "error",
                  }),
                }).catch(() => {});
              }
            }
          } catch (sendErr: any) {
            console.error("[Email Flow] ✗ ERROR:", {
              message: sendErr?.message,
              stack: sendErr?.stack,
              type: sendErr?.name,
            });
            showToast(`Email send error: ${sendErr?.message}`, "error");
            // Keep status modal showing, but sent remains false
          }
        })();
      }

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

              {/* ── Section 0: Created By (mandatory, gates rest of form) ── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3 flex items-center gap-2">
                  <Shield size={12} /> Created By
                  <span className="ml-1 text-[9px] font-semibold text-theme-subtle normal-case tracking-normal">(Internal log · Select to unlock invoice fields)</span>
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Dropdown 
                      label="Employee ID"
                      value={log.emp_id}
                      placeholder="Select Employee ID"
                      icon={User}
                      options={employees.map(e => ({ value: e.employee_id, label: `${e.employee_id} · ${e.name}` }))}
                      onChange={v => handleEmpSelect(v)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Employee Name</label>
                    <div className="h-10 flex items-center rounded-xl border border-theme-border bg-theme-raised px-3 text-xs font-semibold text-theme-fg">
                      {log.name || <span className="text-theme-muted font-normal">Auto-filled on selection</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Department</label>
                    <div className="h-10 flex items-center rounded-xl border border-theme-border bg-theme-raised px-3 text-xs font-semibold text-theme-fg">
                      {log.dept || <span className="text-theme-muted font-normal">—</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Team</label>
                    <div className="h-10 flex items-center rounded-xl border border-theme-border bg-theme-raised px-3 text-xs font-semibold text-theme-fg">
                      {log.team || <span className="text-theme-muted font-normal">—</span>}
                    </div>
                  </div>
                </div>
                {log.desig && (
                  <p className="mt-2 text-[10px] text-theme-muted">Designation: <span className="font-semibold text-theme-fg">{log.desig}</span></p>
                )}
              </div>

              {/* Gate — rest of form only active after emp is selected */}
              <div className={cn("space-y-6 transition-all duration-200", !log.emp_id && "opacity-40 pointer-events-none select-none")}>

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
                    <div className="relative">
                      <input 
                        value={form.client_gstin} 
                        onChange={e => {
                          const val = e.target.value.toUpperCase();
                          setForm(f => ({ ...f, client_gstin: val }));
                        }}
                        placeholder="29ABCDE1234F1Z5"
                        className={cn(
                          "h-10 w-full rounded-xl border bg-theme-page px-3 text-xs text-theme-fg outline-none transition-all",
                          form.client_gstin && !validateGSTIN(form.client_gstin) ? "border-red-500 focus:border-red-500 bg-red-50/10" : "border-theme-border focus:border-blue-500"
                        )} 
                      />
                      {form.client_gstin && !validateGSTIN(form.client_gstin) && (
                        <div className="absolute top-1/2 right-3 -translate-y-1/2 text-red-500 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          <span className="text-[9px] font-black uppercase">Invalid</span>
                        </div>
                      )}
                      {form.client_gstin && validateGSTIN(form.client_gstin) && (
                        <div className="absolute top-1/2 right-3 -translate-y-1/2 text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-theme-muted">Client Email</label>
                    <input value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))}
                      placeholder="accounts@client.com" type="email"
                      className="h-10 w-full rounded-xl border border-theme-border bg-theme-page px-3 text-xs text-theme-fg outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <StateDropdown
                      label="Place of Supply"
                      value={form.place_of_supply || ""}
                      placeholder="Select State"
                      onChange={v => setForm(f => ({ ...f, place_of_supply: v }))}
                    />
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
                        <th className="px-3 py-2.5 text-center font-black text-theme-muted uppercase text-[9px] tracking-wide w-20">GST %</th>
                        <th className="px-3 py-2.5 text-right font-black text-theme-muted uppercase text-[9px] tracking-wide w-28">Rate (₹)</th>
                        <th className="px-3 py-2.5 text-right font-black text-theme-muted uppercase text-[9px] tracking-wide w-32">Total (inc. GST)</th>
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
                            <select value={item.gst_rate} onChange={e => updateItem(item.id, "gst_rate", Number(e.target.value))}
                              className="w-full bg-theme-page border border-theme-border rounded-lg px-1.5 py-1 text-xs text-theme-fg outline-none text-center">
                              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={item.rate} min={0}
                              onChange={e => updateItem(item.id, "rate", Number(e.target.value))}
                              placeholder="Rate (inc. GST)"
                              className="w-full bg-transparent outline-none text-right text-theme-fg text-xs font-semibold text-blue-600" />
                          </td>
                          <td className="px-2 py-1.5 text-right font-bold text-theme-fg">
                            {fmt(item.total)}
                          </td>
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
                    {roundOff !== 0 && (
                      <div className="flex justify-between text-orange-600"><span>Round Off</span><span className="font-semibold">{fmt(roundOff)}</span></div>
                    )}
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

              </div>{/* end gate wrapper */}

            </div>
          </div>

          {/* ── Preview Panel ── */}
          <div className={cn("flex-1 overflow-y-auto bg-theme-page flex justify-center py-6 transition-all duration-300", activeTab !== "preview" ? "w-0 opacity-0 overflow-hidden" : "w-full")}
            style={{ display: activeTab !== "preview" ? "none" : "flex" }}>
            <SettingsCtx.Provider value={settings}>
              <div style={{ boxShadow: "0 8px 48px rgba(0,0,0,0.6)" }}>
                <A4Invoice
                  id="a4-invoice-render"
                  inv={tempInvoiceForPDF ? { ...tempInvoiceForPDF, client_name: selectedClient?.name, project_name: selectedProject?.name } : { ...form, invoice_number: "INV-PREVIEW", client_name: selectedClient?.name, project_name: selectedProject?.name }}
                  items={tempInvoiceForPDF ? (tempInvoiceForPDF.invoice_items || []) : items}
                />
              </div>
            </SettingsCtx.Provider>
          </div>
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

      {/* Status Modal - shown after create and send */}
      {statusModal && (
        <StatusModal
          created={statusModal.created}
          sent={statusModal.sent}
          invoiceNumber={statusModal.invoice_number}
          email={statusModal.email}
          onClose={() => {
            setStatusModal(null);
            if (statusModal.created) {
              onSaved();
              onClose();
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Invoice Status Modal ─────────────────────────────────────────────────────
function StatusModal({ created, sent, invoiceNumber, email, onClose }: {
  created: boolean; sent: boolean; invoiceNumber: string; email?: string; onClose: () => void;
}) {
  const [isSending, setIsSending] = useState(email && !sent); // Show sending state initially if email exists

  useEffect(() => {
    // Auto-close after 3.5 seconds if email was sent successfully
    if (sent || !email) {
      const timer = setTimeout(onClose, 3500);
      return () => clearTimeout(timer);
    }
    // If still sending, wait longer
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose, sent, email]);

  // Once sent status changes, update sending state
  useEffect(() => {
    if (sent && isSending) {
      setIsSending(false);
    }
  }, [sent, isSending]);

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="border-b border-theme-border px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
          <h3 className="text-base font-black text-white">Invoice Status</h3>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Invoice Number */}
          <div className="bg-theme-raised rounded-xl p-4 border border-theme-border">
            <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1">Invoice Number</p>
            <p className="text-sm font-black text-theme-fg">{invoiceNumber}</p>
          </div>

          {/* Created Status */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-theme-fg">✓ Invoice Created</p>
              <p className="text-[10px] text-theme-muted mt-0.5">Saved to database successfully</p>
            </div>
          </div>

          {/* Email Status */}
          {email && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  sent
                    ? "bg-emerald-100"
                    : isSending
                    ? "bg-blue-100"
                    : "bg-amber-100"
                }`}>
                  {sent ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : isSending ? (
                    <Mail size={16} className="text-blue-600 animate-pulse" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-600" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <p className={`text-xs font-black ${
                  sent
                    ? "text-emerald-600"
                    : isSending
                    ? "text-blue-600"
                    : "text-amber-600"
                }`}>
                  {sent ? "✓ Email Sent" : isSending ? "Sending Email..." : "Email Send Failed"}
                </p>
                <p className="text-[10px] text-theme-muted mt-0.5">
                  {sent
                    ? `4K PDF sent to ${email}`
                    : isSending
                    ? `Generating 4K PDF and sending to ${email}...`
                    : `Could not send to ${email}. Try manual share.`}
                </p>
              </div>
            </div>
          )}

          {!email && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <Mail size={16} className="text-slate-400" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-slate-600">No Email on File</p>
                <p className="text-[10px] text-theme-muted mt-0.5">Client email not configured. Add it to send automatically.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-theme-border px-6 py-4 bg-theme-raised flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Preview Modal ────────────────────────────────────────────────────
function PreviewModal({ invoice, onClose, settings }: {
  invoice: Invoice; onClose: () => void; settings: InvoiceSettings;
}) {
  const { showToast } = useToast();
  const [shareEmail, setShareEmail] = useState(invoice.client_email || "");
  const [shareMsg, setShareMsg]   = useState("Please find the attached invoice for your reference.");
  const [sharing, setSharing]     = useState(false);
  const [downloading, setDownloading] = useState(false);

  const invData = {
    ...invoice,
    client_name:  invoice.clients?.name,
    project_name: invoice.projects?.name,
  };

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Shared helper — always produces exactly 1 A4 page PDF
  const buildA4PDF = async () => {
    const el = document.getElementById("a4-invoice-render");
    if (!el) throw new Error("Invoice render element not found");

    const SCALE   = 4; // 4K quality - ultra crisp, clear text and sharp images for professional PDFs
    const A4_W_PX = 794;
    const A4_H_PX = 1123;

    const html2canvas = (await import("html2canvas")).default;
    const jsPDF       = (await import("jspdf")).default;

    console.log("[buildA4PDF] Starting canvas render with SCALE=" + SCALE);
    const startTime = performance.now();

    // Capture at exact A4 dimensions with quality settings
    // Add timeout to prevent hanging if canvas rendering is slow
    const canvasPromise = html2canvas(el, {
      scale:             SCALE,
      useCORS:           true,
      backgroundColor:   "#ffffff",
      width:             A4_W_PX,
      height:            A4_H_PX,
      windowWidth:       A4_W_PX,
      allowTaint:        true,  // Handle CORS issues
      logging:           false,
      imageTimeout:      3000,  // 3 second timeout per image
    } as any);

    // Race against a timeout with proper cleanup
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        console.error("[buildA4PDF] Timeout after 20 seconds");
        reject(new Error("PDF generation timeout - canvas rendering took too long"));
      }, 20000);
    });

    console.log("[buildA4PDF] Waiting for canvas render...");
    let rawCanvas: HTMLCanvasElement;
    try {
      rawCanvas = await Promise.race([canvasPromise, timeoutPromise]) as HTMLCanvasElement;
      if (timeoutId) clearTimeout(timeoutId); // Clear timeout on success
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      throw err;
    }

    const renderTime = performance.now() - startTime;
    console.log(`[buildA4PDF] ✓ Canvas rendered in ${(renderTime/1000).toFixed(2)}s`);

    // Crop to exactly A4 size to guarantee no second page
    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width  = A4_W_PX * SCALE;
    croppedCanvas.height = A4_H_PX * SCALE;
    croppedCanvas.getContext("2d")!.drawImage(
      rawCanvas,
      0, 0, A4_W_PX * SCALE, A4_H_PX * SCALE,
      0, 0, A4_W_PX * SCALE, A4_H_PX * SCALE,
    );

    const pdf   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();   // 210 mm
    const pageH = pdf.internal.pageSize.getHeight();  // 297 mm

    // Use PNG lossless compression for crystal clear 4K text and images
    // No blur, no noise reduction - maximum quality for professional documents
    const pngImage = croppedCanvas.toDataURL("image/png");
    pdf.addImage(pngImage, "PNG", 0, 0, pageW, pageH);

    console.log(`[buildA4PDF] ✓ PDF ready with PNG lossless compression (4K quality)`);
    return pdf;
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const pdf = await buildA4PDF();
      pdf.save(`${invoice.invoice_number}.pdf`);
      showToast("PDF downloaded successfully", "success");
    } catch (e: any) {
      showToast("PDF generation failed: " + e.message, "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!shareEmail) { showToast("Enter recipient email", "error"); return; }
    setSharing(true);
    try {
      console.log("[Preview Modal] Starting PDF generation...");
      const pdf = await buildA4PDF();
      console.log("[Preview Modal] ✓ PDF generated successfully");

      // Step 2 — extract raw base64 (strip data URI prefix)
      const pdfBase64 = pdf.output("datauristring").split(",")[1];
      console.log("[Preview Modal] PDF size:", pdfBase64?.length || 0, "bytes");

      // Step 3 — send to share API with PDF attachment
      console.log("[Preview Modal] Sending email to", shareEmail);
      const res = await fetch("/api/invoices/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: shareEmail,
          subject: `Invoice ${invoice.invoice_number}`,
          message: shareMsg,
          pdfBase64,
          pdfFileName: `${invoice.invoice_number}.pdf`,
          invoice: {
            invoiceNumber:  invoice.invoice_number,
            issuedDate:     invoice.issued_date,
            dueDate:        invoice.due_date,
            clientName:     invoice.clients?.name,
            clientGstin:    invoice.client_gstin,
            billingAddress: invoice.billing_address,
            projectName:    invoice.projects?.name,
            bankDetails:    invoice.bank_details,
            notes:          invoice.notes,
            subtotal:       invoice.subtotal,
            cgst: invoice.cgst, sgst: invoice.sgst, igst: invoice.igst,
            total: invoice.total,
            items: invoice.invoice_items || [],
          },
        }),
      });
      const resData = await res.json();
      console.log("[Preview Modal] API Response:", res.status, resData);

      if (res.ok) {
        showToast(`✓ Invoice emailed to ${shareEmail} with PDF attached`, "success");
      } else {
        const errorMsg = resData.error || "Failed to send email";
        console.error("[Preview Modal] API Error:", errorMsg);
        showToast(errorMsg, "error");
      }
    } catch (err: any) {
      console.error("[Preview Modal] Exception:", {
        message: err?.message,
        name: err?.name,
        stack: err?.stack?.split('\n')[0],
      });
      showToast(`Error: ${err?.message || "Failed to send email"}`, "error");
    } finally {
      setSharing(false);
    }
  };

  return (
    <SettingsCtx.Provider value={settings}>
      <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        {/* Modal shell — slightly wider than A4 so there's breathing room */}
        <div className="flex flex-col rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          style={{ width: "860px", maxHeight: "96vh" }}>

          {/* ── Header bar ── */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-theme-border flex-shrink-0 bg-theme-raised">
            <div className="flex items-center gap-3">
              <FileText size={15} className="text-blue-600" />
              <div>
                <p className="text-sm font-black text-theme-fg">{invoice.invoice_number}</p>
                <p className="text-[10px] text-theme-muted">{invoice.clients?.name || "—"} · {fmt(invoice.total)}</p>
              </div>
              <Badge variant={STATUS_BADGE[invoice.status]}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Inline email send — always visible */}
              <div className="flex items-center gap-1.5 rounded-xl border border-theme-border bg-theme-page px-2 py-1">
                <Mail size={12} className="text-blue-500 flex-shrink-0" />
                <input
                  value={shareEmail}
                  onChange={e => setShareEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !sharing) handleShare(); }}
                  placeholder="recipient@example.com"
                  type="email"
                  className="h-7 w-48 bg-transparent text-[11px] text-theme-fg placeholder-theme-subtle outline-none"
                />
                <button
                  onClick={handleShare}
                  disabled={sharing || !shareEmail}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-2.5 py-1 text-[11px] font-bold text-white transition-all whitespace-nowrap"
                >
                  {sharing ? <><span className="animate-spin inline-block">⟳</span> Sending…</> : <><Send size={10} /> Send PDF</>}
                </button>
              </div>
              <button onClick={handleDownloadPDF} disabled={downloading}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 transition-all disabled:opacity-60">
                <Download size={12} /> {downloading ? "Generating..." : "Download PDF"}
              </button>
              <button onClick={onClose} className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Internal Log Banner (not in PDF) ── */}
          {(invoice.created_by_emp_id || invoice.created_by_name) && (
            <div className="flex-shrink-0 border-b border-theme-border bg-theme-page px-5 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={12} className="text-blue-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Internal Invoice Log — Not visible in PDF or Email</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {invoice.created_by_emp_id && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-wider font-bold">Emp ID</span>
                    <span className="text-[11px] font-black text-theme-fg">{invoice.created_by_emp_id}</span>
                  </div>
                )}
                {invoice.created_by_name && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-wider font-bold">Name</span>
                    <span className="text-[11px] font-black text-theme-fg">{invoice.created_by_name}</span>
                  </div>
                )}
                {invoice.created_by_desig && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-wider font-bold">Designation</span>
                    <span className="text-[11px] font-semibold text-theme-fg">{invoice.created_by_desig}</span>
                  </div>
                )}
                {invoice.created_by_dept && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-wider font-bold">Dept</span>
                    <span className="text-[11px] font-semibold text-theme-fg">{invoice.created_by_dept}</span>
                  </div>
                )}
                {invoice.created_by_team && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-wider font-bold">Team</span>
                    <span className="text-[11px] font-semibold text-theme-fg">{invoice.created_by_team}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── A4 Canvas area ── */}
          <div className="flex-1 overflow-y-auto bg-theme-page flex justify-center py-6 px-4">
            <div style={{ boxShadow: "0 8px 48px rgba(0,0,0,0.6)", borderRadius: "2px" }}>
              <A4Invoice id="a4-invoice-render" inv={invData} items={invoice.invoice_items || []} />
            </div>
          </div>
        </div>
      </div>
    </SettingsCtx.Provider>
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
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings]  = useState<InvoiceSettings>(EMPTY_SETTINGS);
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices?status=${filter}&search=${search}`);
      const data = await res.json();
      // Fetch items for each invoice in preview
      const invs = data.invoices || [];
      setInvoices(invs);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  const loadMeta = useCallback(async () => {
    const [cRes, pRes, tRes, sRes] = await Promise.all([
      fetch("/api/config/clients").then(r => r.json()),
      fetch("/api/projects").then(r => r.json()),
      fetch("/api/teams").then(r => r.json()),
      fetch("/api/invoices/settings").then(r => r.json()).catch(() => ({ settings: EMPTY_SETTINGS })),
    ]);
    setClients(cRes.clients || []);
    setProjects(pRes.projects || []);
    setTeams(tRes.teams || []);
    if (sRes.settings) setSettings({ ...EMPTY_SETTINGS, ...sRes.settings });
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

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${deleteConfirm.id}`, { method: "DELETE" });
      if (res.ok) {
        setInvoices(prev => prev.filter(i => i.id !== deleteConfirm.id));
        showToast("Invoice deleted", "success");
        setDeleteConfirm(null);
      } else {
        showToast("Failed to delete invoice", "error");
      }
    } catch {
      showToast("Failed to delete invoice", "error");
    } finally {
      setDeleting(false);
    }
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
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)}
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-theme-border bg-theme-raised text-theme-muted hover:text-theme-fg hover:bg-theme-surface transition-all"
            title="Invoice Settings">
            <Settings size={15} />
          </button>
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} className="mr-1.5" /> Create Invoice
          </Button>
        </div>
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
                    <td className="px-5 py-3 text-xs text-theme-muted">{fmtDate(inv.issued_date)}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs", inv.status === "overdue" ? "font-semibold text-red-500" : "text-theme-muted")}>
                        {fmtDate(inv.due_date)}
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
                        <button onClick={() => setDeleteConfirm(inv)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-theme-border bg-theme-raised text-theme-muted hover:text-red-600 hover:border-red-300 transition-colors"
                          title="Delete Invoice">
                          <Trash2 size={12} />
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
          settings={settings}
        />
      )}

      {/* Preview Modal */}
      {previewInv && (
        <PreviewModal invoice={previewInv} onClose={() => setPreviewInv(null)} settings={settings} />
      )}

      {/* Invoice Settings Modal */}
      {showSettings && (
        <InvoiceSettingsModal
          initial={settings}
          onClose={(saved) => {
            if (saved) setSettings({ ...EMPTY_SETTINGS, ...saved });
            setShowSettings(false);
          }}
        />
      )}

      {/* Delete Confirm Pill */}
      {deleteConfirm && (
        <div className="fixed inset-x-0 top-8 z-[9000] flex justify-center px-4 animate-in slide-in-from-top-8 duration-300">
          <div className="flex items-center gap-6 bg-theme-surface px-6 py-4 shadow-xl rounded-2xl border border-theme-border min-w-[420px]">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl">
                <Trash2 size={20} />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-theme-fg tracking-tight">
                  Delete <span className="text-rose-500 font-bold">"{deleteConfirm.invoice_number}"</span>?
                </p>
                <p className="text-xs text-theme-muted mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <Button onClick={() => setDeleteConfirm(null)} disabled={deleting} variant="secondary" size="sm" className="px-4">
                Cancel
              </Button>
              <Button onClick={handleDelete} disabled={deleting} variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white px-5 border-rose-600">
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
