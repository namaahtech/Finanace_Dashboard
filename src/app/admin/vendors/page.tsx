"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  ShoppingCart, Plus, Search, IndianRupee, Clock, CheckCircle2, Tag, X, Trash2,
  RefreshCw, Building2, ChevronDown, FileText, Phone, Mail, User, Receipt,
  CalendarDays, StickyNote, Layers, CreditCard, Share2, Download, Banknote,
  Smartphone, ArrowLeftRight, BookOpen, CheckCircle, AlertCircle, Copy, Printer,
  Pencil, Users, TrendingUp,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  department: string;
  designation: string;
}

interface Vendor {
  id: string; name: string; contact_person: string | null;
  email: string | null; phone: string | null; category: string;
  total_paid: number; created_at: string;
}

interface Purchase {
  id: string; purchase_number: string; vendor_id: string | null;
  vendor_name: string; description: string; category: string;
  amount: number; date: string; status: "pending" | "paid" | "cancelled";
  invoice_id: string | null; notes: string | null; created_at: string;
  vendors?: Vendor | null;
  filed_by_emp_id?: string;
  filed_by_name?: string;
  filed_by_dept?: string;
  filed_by_desig?: string;
  filed_by_uuid?: string;
}

interface PaymentRow {
  id: string;
  mode: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
  amount: string;
  reference: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Infrastructure","Equipment","Facilities","Legal","Logistics","Marketing","Supplies","Software","General"];

const CATEGORY_COLORS: Record<string, string> = {
  Infrastructure: "bg-sky-500/10 text-sky-600",
  Equipment: "bg-purple-500/10 text-purple-600",
  Facilities: "bg-emerald-500/10 text-emerald-600",
  Legal: "bg-amber-500/10 text-amber-600",
  Logistics: "bg-orange-500/10 text-orange-600",
  Marketing: "bg-pink-500/10 text-pink-600",
  Supplies: "bg-theme-raised text-theme-muted",
  Software: "bg-indigo-500/10 text-indigo-600",
  General: "bg-theme-raised text-theme-muted",
};

const PAYMENT_MODES = [
  { mode: "Cash",          icon: Banknote,       color: "text-emerald-600", bg: "bg-emerald-500/10" },
  { mode: "UPI",           icon: Smartphone,     color: "text-purple-600",  bg: "bg-purple-500/10" },
  { mode: "Bank Transfer", icon: ArrowLeftRight, color: "text-sky-600",     bg: "bg-sky-500/10" },
  { mode: "Cheque",        icon: BookOpen,       color: "text-amber-600",   bg: "bg-amber-500/10" },
] as const;

const EMPTY_FORM = {
  vendor_id:"", vendor_name:"", description:"", category:"", amount:"",
  date: new Date().toISOString().split("T")[0], notes:"",
  filed_by_emp_id: "", filed_by_name: "", filed_by_dept: "", filed_by_desig: "", filed_by_uuid: ""
};
const EMPTY_VENDOR_FORM = { name:"", contact_person:"", email:"", phone:"", category:"General", address:"", gstin:"" };

// ─── Small field helpers ──────────────────────────────────────────────────────

function FLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-theme-muted">{children}</p>;
}
function FInput({ value, onChange, placeholder, type="text", className="", disabled=false }: {
  value:string; onChange:(v:string)=>void; placeholder?:string; type?:string; className?:string; disabled?:boolean;
}) {
  return <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
    className={cn("w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-blue-500 transition-all placeholder:text-theme-subtle disabled:opacity-50", className)} />;
}
function FSelect({ value, onChange, children, className="" }: {
  value:string; onChange:(v:string)=>void; children:React.ReactNode; className?:string;
}) {
  return <select value={value} onChange={(e)=>onChange(e.target.value)}
    className={cn("w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-blue-500 transition-all", className)}>
    {children}
  </select>;
}

// ─── Receipt number generator ─────────────────────────────────────────────────
function genReceiptNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const ny = String(d.getFullYear() + 1).slice(2);
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `RCPT-${seq}/${yy}-${ny}`;
}

// ─── Purchase Bill Print View ─────────────────────────────────────────────────
function printPurchaseBill(p: Purchase) {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Purchase Bill - ${p.purchase_number}</title>
<style>
  body{font-family:'Segoe UI',sans-serif;margin:0;padding:32px;color:#111;background:#fff}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px}
  .title{font-size:24px;font-weight:900;letter-spacing:-0.5px}
  .subtitle{font-size:11px;color:#666;margin-top:4px}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;background:${p.status==="paid"?"#dcfce7":"#fef3c7"};color:${p.status==="paid"?"#166534":"#92400e"}}
  .section{margin-bottom:20px}
  .section-title{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:8px}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
  .row .label{color:#666}
  .row .value{font-weight:600}
  .total-row{display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:900;border-top:2px solid #111;margin-top:8px}
  .amount{color:#dc2626;font-size:20px;font-weight:900}
  .footer{margin-top:40px;text-align:center;font-size:10px;color:#999}
</style></head><body>
<div class="header">
  <div>
    <div class="title">Purchase Bill</div>
    <div class="subtitle">${p.purchase_number}</div>
  </div>
  <div style="text-align:right">
    <span class="badge">${p.status.toUpperCase()}</span>
    <div style="font-size:11px;color:#666;margin-top:6px">${formatDate(p.date)}</div>
  </div>
</div>
<div class="section">
  <div class="section-title">Vendor Details</div>
  <div class="row"><span class="label">Vendor Name</span><span class="value">${p.vendor_name}</span></div>
  ${p.vendors?.contact_person ? `<div class="row"><span class="label">Contact</span><span class="value">${p.vendors.contact_person}</span></div>` : ""}
  ${p.vendors?.email ? `<div class="row"><span class="label">Email</span><span class="value">${p.vendors.email}</span></div>` : ""}
  ${p.vendors?.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${p.vendors.phone}</span></div>` : ""}
</div>
<div class="section">
  <div class="section-title">Purchase Details</div>
  <div class="row"><span class="label">Description</span><span class="value">${p.description}</span></div>
  <div class="row"><span class="label">Category</span><span class="value">${p.category}</span></div>
  <div class="row"><span class="label">Date</span><span class="value">${formatDate(p.date)}</span></div>
  ${p.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${p.notes}</span></div>` : ""}
</div>
<div class="total-row"><span>Total Amount</span><span class="amount">−${formatCurrency(p.amount)}</span></div>
<div class="footer">This is a computer generated purchase bill &bull; ${new Date().toLocaleString()}</div>
</body></html>`);
  win.document.close();
  win.print();
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PurchasesPage() {
  const [purchases, setPurchases]       = useState<Purchase[]>([]);
  const [vendors, setVendors]           = useState<Vendor[]>([]);
  const [loading, setLoading]           = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [saving, setSaving]             = useState(false);
  const [filter, setFilter]             = useState("all");
  const [search, setSearch]             = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [activeTab, setActiveTab]       = useState<"purchases" | "vendors">("purchases");

  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingPurchase, setEditingPurchase]     = useState<Purchase | null>(null);
  const [showVendorModal, setShowVendorModal]     = useState(false);
  const [paymentPurchase, setPaymentPurchase]     = useState<Purchase | null>(null);
  const [sharePurchase, setSharePurchase]         = useState<Purchase | null>(null);

  // Vendor edit/delete
  const [editingVendor, setEditingVendor]   = useState<Vendor | null>(null);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);
  const [confirmDeleteVendor, setConfirmDeleteVendor] = useState<Vendor | null>(null);

  // Forms
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [vendorForm, setVendorForm]     = useState(EMPTY_VENDOR_FORM);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [employees, setEmployees]       = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showLogView, setShowLogView]   = useState(false);

  // Vendor autocomplete (in purchase modal)
  const [vendorDropSearch, setVendorDropSearch]   = useState("");
  const [showVendorDrop, setShowVendorDrop] = useState(false);
  const vendorDropRef                     = useRef<HTMLDivElement>(null);

  // Payment modal state
  const [paymentDate, setPaymentDate]     = useState(new Date().toISOString().split("T")[0]);
  const [paymentRows, setPaymentRows]     = useState<PaymentRow[]>([]);
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [receiptNumber]                   = useState(genReceiptNumber);

  // Row actions
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [confirmDeletePurchase, setConfirmDeletePurchase] = useState<Purchase | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting"|"connected"|"disconnected">("connecting");
  const [copied, setCopied]               = useState(false);
  const [editedPurchaseIds, setEditedPurchaseIds] = useState<Set<string>>(new Set());
  // Maps purchaseId → { name, empId } of whoever authorised the edit
  const [editAuthMap, setEditAuthMap] = useState<Record<string, { name: string; empId: string }>>({});

  // ─── Load ─────────────────────────────────────────────────────────────────

  const loadPurchases = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (filter !== "all") p.set("status", filter);
      if (search) p.set("search", search);
      const res = await fetch(`/api/purchases?${p}`);
      const json = await res.json();
      if (json.purchases) setPurchases(json.purchases);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [filter, search]);

  const loadVendors = useCallback(async () => {
    setVendorsLoading(true);
    try {
      const res = await fetch("/api/vendors");
      const json = await res.json();
      if (json.vendors) setVendors(json.vendors);
    } catch { /* silent */ } finally { setVendorsLoading(false); }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      const json = await res.json();
      if (json.employees) setEmployees(json.employees);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadPurchases(); }, [loadPurchases]);
  useEffect(() => { loadVendors(); }, [loadVendors]);
  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePurchaseModal();
        closePaymentModal();
        setShowVendorModal(false);
        setSharePurchase(null);
        setConfirmDeleteVendor(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // ─── Realtime ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const ch = supabase.channel("purchases-rt-v3")
      .on("postgres_changes", { event:"*", schema:"public", table:"purchases" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setPurchases((prev) => prev.some(p => p.id === (payload.new as Purchase).id) ? prev : [payload.new as Purchase, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setPurchases((prev) => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
        } else if (payload.eventType === "DELETE") {
          setPurchases((prev) => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .on("postgres_changes", { event:"*", schema:"public", table:"vendors" }, () => loadVendors())
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (s === "CLOSED" || s === "CHANNEL_ERROR") setRealtimeStatus("disconnected");
        else setRealtimeStatus("connecting");
      });
    return () => { supabase.removeChannel(ch); };
  }, [loadVendors]);

  // ─── Outside click vendor dropdown ────────────────────────────────────────

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (vendorDropRef.current && !vendorDropRef.current.contains(e.target as Node)) setShowVendorDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const totalSpend   = purchases.reduce((s,p) => s + p.amount, 0);
  const thisMonth    = purchases.filter(p => p.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,p) => s + p.amount, 0);
  const totalDues    = purchases.filter(p => p.status === "pending").reduce((s,p) => s + p.amount, 0);
  const pendingCount = purchases.filter(p => p.status === "pending").length;
  const paidCount    = purchases.filter(p => p.status === "paid").length;

  const filtered = purchases.filter(p => {
    const q = search.toLowerCase();
    const ms = !search || p.vendor_name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || (p.purchase_number||"").toLowerCase().includes(q);
    return ms && (filter === "all" || p.status === filter);
  });

  const filteredVendorDrop = vendors.filter(v => v.name.toLowerCase().includes(vendorDropSearch.toLowerCase()));

  // Vendor directory filtered list
  const filteredVendors = vendors.filter(v =>
    !vendorSearch || v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.category.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.contact_person || "").toLowerCase().includes(vendorSearch.toLowerCase())
  );

  // Vendor stats
  const totalVendors    = vendors.length;
  const totalVendorPaid = vendors.reduce((s, v) => s + v.total_paid, 0);
  const categoryCount   = new Set(vendors.map(v => v.category)).size;
  const topVendor       = vendors.reduce((a, b) => a.total_paid > b.total_paid ? a : b, vendors[0]);

  // Payment calc
  const payingNow = paymentRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const balanceDue = (paymentPurchase ? paymentPurchase.amount : 0) - payingNow;

  // ─── Purchase Actions ──────────────────────────────────────────────────────

  async function handleSavePurchase(recordPayment = false) {
    if (!form.vendor_name || !form.description || !form.category || !form.amount || !form.date) return;
    setSaving(true);
    try {
      if (editingPurchase) {
        // Edit mode — PATCH
        const res = await fetch(`/api/purchases/${editingPurchase.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendor_id: form.vendor_id || null, vendor_name: form.vendor_name,
            description: form.description, category: form.category,
            amount: form.amount, date: form.date, notes: form.notes || null,
          }),
        });
        const json = await res.json();
        if (json.purchase) {
          setPurchases(prev => prev.map(p => p.id === editingPurchase.id ? { ...p, ...json.purchase } : p));
          setEditedPurchaseIds(prev => new Set([...prev, editingPurchase.id]));
          if (selectedEmployee) {
            setEditAuthMap(prev => ({ ...prev, [editingPurchase.id]: { name: selectedEmployee.name, empId: selectedEmployee.employee_id } }));
          }
        }
        closePurchaseModal();
      } else {
        // Create mode — POST
        const res = await fetch("/api/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendor_id: form.vendor_id || null, vendor_name: form.vendor_name,
            description: form.description, category: form.category,
            amount: form.amount, date: form.date, notes: form.notes || null, status: "pending",
            filed_by_emp_id: selectedEmployee?.employee_id || "",
            filed_by_name: selectedEmployee?.name || "",
            filed_by_dept: selectedEmployee?.department || "",
            filed_by_desig: selectedEmployee?.designation || "",
            filed_by_uuid: selectedEmployee?.id || null,
          }),
        });
        const json = await res.json();
        closePurchaseModal();
        if (recordPayment && json.purchase) {
          openPaymentModal(json.purchase as Purchase);
        }
      }
    } finally { setSaving(false); }
  }

  async function handleStatusChange(id: string, status: Purchase["status"]) {
    setStatusUpdating(id);
    try {
      await fetch(`/api/purchases/${id}`, {
        method: "PATCH", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ status }),
      });
    } finally { setStatusUpdating(null); }
  }

  async function handleDelete(id: string) {
    setDeleteId(id);
    try { await fetch(`/api/purchases/${id}`, { method:"DELETE" }); }
    finally { setDeleteId(null); setConfirmDeletePurchase(null); }
  }

  function handleCreateInvoice(p: Purchase) {
    const params = new URLSearchParams({ type:"payable", vendor_id: p.vendor_id||"", vendor_name: p.vendor_name, description: p.description, amount: String(p.amount), purchase_id: p.id });
    window.location.href = `/admin/invoicing?${params}`;
  }

  // ─── Payment Modal ─────────────────────────────────────────────────────────

  function openPaymentModal(p: Purchase) {
    setPaymentPurchase(p);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentRows([{ id: crypto.randomUUID(), mode:"Cash", amount: String(p.amount), reference:"" }]);
    setPaymentRemarks("");
  }

  function closePaymentModal() {
    setPaymentPurchase(null);
    setPaymentRows([]);
    setPaymentRemarks("");
  }

  function addPaymentMode(mode: PaymentRow["mode"]) {
    const remaining = (paymentPurchase?.amount || 0) - paymentRows.reduce((s,r) => s + (parseFloat(r.amount)||0), 0);
    setPaymentRows(prev => [...prev, { id: crypto.randomUUID(), mode, amount: remaining > 0 ? String(remaining) : "", reference:"" }]);
  }

  function updatePaymentRow(id: string, field: keyof PaymentRow, value: string) {
    setPaymentRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function removePaymentRow(id: string) {
    setPaymentRows(prev => {
      const next = prev.filter(r => r.id !== id);
      if (next.length > 0 && paymentPurchase) {
        const paid = next.slice(0,-1).reduce((s,r) => s + (parseFloat(r.amount)||0), 0);
        const rem = paymentPurchase.amount - paid;
        next[next.length-1] = { ...next[next.length-1], amount: rem > 0 ? String(rem) : "0" };
      }
      return next;
    });
  }

  async function handleConfirmPayment() {
    if (!paymentPurchase || payingNow <= 0) return;
    setPaymentSaving(true);
    try {
      await fetch(`/api/purchases/${paymentPurchase.id}`, {
        method: "PATCH", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ status:"paid" }),
      });
      closePaymentModal();
    } finally { setPaymentSaving(false); }
  }

  // ─── Vendor Actions ────────────────────────────────────────────────────────

  function openAddVendor() {
    setEditingVendor(null);
    setVendorForm(EMPTY_VENDOR_FORM);
    setShowVendorModal(true);
  }

  function openEditVendor(v: Vendor) {
    setEditingVendor(v);
    setVendorForm({ name: v.name, contact_person: v.contact_person || "", email: v.email || "", phone: v.phone || "", category: v.category, address: "", gstin: "" });
    setShowVendorModal(true);
  }

  async function handleSaveVendor() {
    if (!vendorForm.name) return;
    setSaving(true);
    try {
      if (editingVendor) {
        // Edit mode
        const res = await fetch(`/api/vendors/${editingVendor.id}`, {
          method: "PATCH", headers: { "Content-Type":"application/json" },
          body: JSON.stringify(vendorForm),
        });
        const json = await res.json();
        if (json.vendor) {
          setVendors(prev => prev.map(v => v.id === editingVendor.id ? { ...v, ...json.vendor } : v));
        }
      } else {
        // Add mode
        const res = await fetch("/api/vendors", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(vendorForm) });
        const json = await res.json();
        if (json.vendor) {
          const nv: Vendor = json.vendor;
          setVendors(prev => [...prev, nv].sort((a,b) => a.name.localeCompare(b.name)));
          if (showPurchaseModal) selectVendor(nv);
        }
      }
      setVendorForm(EMPTY_VENDOR_FORM);
      setEditingVendor(null);
      setShowVendorModal(false);
    } finally { setSaving(false); }
  }

  async function handleDeleteVendor(v: Vendor) {
    setDeletingVendorId(v.id);
    try {
      await fetch(`/api/vendors/${v.id}`, { method: "DELETE" });
      setVendors(prev => prev.filter(x => x.id !== v.id));
    } finally {
      setDeletingVendorId(null);
      setConfirmDeleteVendor(null);
    }
  }

  function selectVendor(v: Vendor) {
    setSelectedVendor(v);
    setForm(f => ({ ...f, vendor_id: v.id, vendor_name: v.name }));
    setVendorDropSearch(v.name);
    setShowVendorDrop(false);
  }

  function openPurchaseModal() { setEditingPurchase(null); setForm(EMPTY_FORM); setVendorDropSearch(""); setSelectedVendor(null); setSelectedEmployee(null); setShowPurchaseModal(true); }
  function closePurchaseModal() { setEditingPurchase(null); setForm(EMPTY_FORM); setVendorDropSearch(""); setSelectedVendor(null); setSelectedEmployee(null); setShowPurchaseModal(false); }

  function openEditPurchase(p: Purchase) {
    setEditingPurchase(p);
    setForm({
      vendor_id: p.vendor_id || "", vendor_name: p.vendor_name,
      description: p.description, category: p.category,
      amount: String(p.amount), date: p.date, notes: p.notes || "",
      filed_by_emp_id: "", filed_by_name: "", filed_by_dept: "", filed_by_desig: "", filed_by_uuid: "",
    });
    setVendorDropSearch(p.vendor_name);
    const matched = vendors.find(v => v.id === p.vendor_id);
    setSelectedVendor(matched || null);
    setSelectedEmployee(null); // require re-auth for edit too
    setShowPurchaseModal(true);
  }

  // ─── Share ────────────────────────────────────────────────────────────────

  function copyShareText(p: Purchase) {
    const text = `Purchase Bill: ${p.purchase_number}\nVendor: ${p.vendor_name}\nDescription: ${p.description}\nAmount: ${formatCurrency(p.amount)}\nDate: ${formatDate(p.date)}\nStatus: ${p.status.toUpperCase()}`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const formValid = !!form.vendor_name && !!form.description && !!form.category && !!form.amount && !!form.date && !!selectedEmployee;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardShell
      title="Purchases & Vendors"
      subtitle="Record purchases, track payments, and manage your vendor directory."
      actions={
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold">
            <span className={cn("h-1.5 w-1.5 rounded-full",
              realtimeStatus==="connected" ? "bg-emerald-500 animate-pulse" :
              realtimeStatus==="connecting"? "bg-amber-500 animate-pulse" : "bg-red-500")} />
            <span className={cn(realtimeStatus==="connected"?"text-emerald-600":realtimeStatus==="connecting"?"text-amber-600":"text-red-500")}>
              {realtimeStatus==="connected"?"Live":realtimeStatus==="connecting"?"Connecting":"Offline"}
            </span>
          </span>
          <Button variant="secondary" size="sm" onClick={activeTab === "purchases" ? loadPurchases : loadVendors}><RefreshCw size={13} className="mr-1.5"/>Refresh</Button>
          {activeTab === "purchases" && (
            <Button variant={showLogView ? "primary" : "secondary"} size="sm" onClick={() => setShowLogView(!showLogView)} title="Internal Filing Logs">
              <BookOpen size={13} className="mr-1.5"/> Log Sheet
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={openAddVendor}><Building2 size={13} className="mr-1.5"/>Add Vendor</Button>
          {activeTab === "purchases" && (
            <Button variant="primary" size="sm" onClick={openPurchaseModal}><Plus size={14} className="mr-1.5"/>Add Purchase</Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">

        {/* ── Tab switcher ─────────────────────────────────────────────────── */}
        <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5 w-fit">
          <button
            onClick={() => setActiveTab("purchases")}
            className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              activeTab === "purchases" ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}
          >
            <ShoppingCart size={13}/>Purchases
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-black",
              activeTab === "purchases" ? "bg-theme-raised text-theme-fg" : "bg-theme-border text-theme-subtle")}>
              {purchases.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("vendors")}
            className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
              activeTab === "vendors" ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}
          >
            <Building2 size={13}/>Vendors
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-black",
              activeTab === "vendors" ? "bg-theme-raised text-theme-fg" : "bg-theme-border text-theme-subtle")}>
              {vendors.length}
            </span>
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            PURCHASES TAB
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "purchases" && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                { label:"Total Spend", value: formatCurrency(totalSpend), icon:IndianRupee,  color:"text-theme-fg",    bg:"bg-theme-raised" },
                { label:"This Month",  value: formatCurrency(thisMonth),  icon:ShoppingCart, color:"text-sky-600",     bg:"bg-sky-500/10" },
                { label:"Total Dues",  value: formatCurrency(totalDues),  icon:AlertCircle,  color:"text-red-600",     bg:"bg-red-500/10" },
                { label:"Pending",     value: pendingCount,               icon:Clock,        color:"text-amber-600",   bg:"bg-amber-500/10" },
                { label:"Paid",        value: paidCount,                  icon:CheckCircle2, color:"text-emerald-600", bg:"bg-emerald-500/10" },
              ].map(({ label, value, icon:Icon, color, bg }) => (
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

            {/* Purchases table */}
            <div className="page-card overflow-hidden p-0">
              <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5 flex-wrap">
                  {[{id:"all",label:"All"},{id:"pending",label:"Pending"},{id:"paid",label:"Paid"},{id:"cancelled",label:"Cancelled"}].map(t => (
                    <button key={t.id} onClick={() => setFilter(t.id)}
                      className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                        filter===t.id ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search purchases…"
                    className="h-8 w-48 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all"/>
                </div>
              </div>

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
                      {showLogView && <th className="px-5 py-3 font-semibold">Filed By</th>}
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {loading ? (
                      Array.from({length:5}).map((_,i) => (
                        <tr key={`sk-${i}`} className="animate-pulse">
                          {Array.from({length:7}).map((_,j) => (
                            <td key={j} className="px-5 py-3"><div className="h-3 rounded bg-theme-raised"/></td>
                          ))}
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={showLogView ? 8 : 7} className="py-12 text-center text-sm text-theme-subtle">No purchases found</td></tr>
                    ) : (
                      filtered.map(p => (
                        <tr key={p.id} className="group transition-colors hover:bg-theme-raised/40">
                          <td className="px-5 py-3">
                            <p className="text-xs font-semibold text-theme-fg">{p.vendor_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[10px] text-theme-subtle font-mono">{p.purchase_number}</p>
                              {editedPurchaseIds.has(p.id) && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 border border-amber-200/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600">
                                  <Pencil size={7}/> Edited
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-theme-muted max-w-[200px] truncate">{p.description}</td>
                          <td className="px-5 py-3">
                            <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                              CATEGORY_COLORS[p.category] ?? "bg-theme-raised text-theme-muted")}>
                              <Tag size={10}/>{p.category}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm font-bold text-red-500">−{formatCurrency(p.amount)}</td>
                          <td className="px-5 py-3 text-xs text-theme-muted">{formatDate(p.date)}</td>
                          <td className="px-5 py-3">
                            {p.status === "pending" ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                                  <AlertCircle size={9}/> Due
                                </span>
                                <span className="text-[10px] font-bold text-red-500">−{formatCurrency(p.amount)}</span>
                              </div>
                            ) : p.status === "paid" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                                <CheckCircle size={9}/> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-500">
                                <X size={9}/> Cancelled
                              </span>
                            )}
                          </td>
                          {showLogView && (
                            <td className="px-5 py-3">
                              {/* Filed by */}
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-theme-raised text-[10px] font-bold text-theme-muted border border-theme-border uppercase">
                                  {(p.filed_by_name || "??").slice(0, 2)}
                                </div>
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-theme-subtle leading-none mb-0.5">Filed</p>
                                  <p className="text-[11px] font-bold text-theme-fg leading-none">{p.filed_by_name || "System"}</p>
                                  <p className="text-[9px] text-theme-subtle font-mono mt-0.5">{p.filed_by_emp_id || "LOG-ERR"}</p>
                                </div>
                              </div>

                              {/* Edited by — only shown when this purchase was edited this session */}
                              {editAuthMap[p.id] && (
                                <div className="mt-2 flex items-center gap-2 border-t border-dashed border-amber-200/60 pt-2">
                                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-600 border border-amber-200/60 uppercase">
                                    {editAuthMap[p.id].name.slice(0, 2)}
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 leading-none mb-0.5 flex items-center gap-1">
                                      <Pencil size={7}/> Edited
                                    </p>
                                    <p className="text-[11px] font-bold text-theme-fg leading-none">{editAuthMap[p.id].name}</p>
                                    <p className="text-[9px] text-theme-subtle font-mono mt-0.5">{editAuthMap[p.id].empId}</p>
                                  </div>
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {p.status === "pending" && (
                                <button onClick={() => openPaymentModal(p)} title="Record Payment"
                                  className="rounded p-1 text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                                  <CreditCard size={13}/>
                                </button>
                              )}
                              {!p.invoice_id && (
                                <button onClick={() => handleCreateInvoice(p)} title="Create payable invoice"
                                  className="rounded p-1 text-theme-muted hover:bg-theme-raised hover:text-sky-600 transition-colors">
                                  <FileText size={13}/>
                                </button>
                              )}
                              <button onClick={() => setSharePurchase(p)} title="Share"
                                className="rounded p-1 text-theme-muted hover:bg-theme-raised hover:text-purple-600 transition-colors">
                                <Share2 size={13}/>
                              </button>
                              <button onClick={() => printPurchaseBill(p)} title="Download / Print"
                                className="rounded p-1 text-theme-muted hover:bg-theme-raised hover:text-sky-600 transition-colors">
                                <Download size={13}/>
                              </button>
                              <button onClick={() => openEditPurchase(p)} title="Edit purchase"
                                className="rounded p-1 text-theme-muted hover:bg-amber-500/10 hover:text-amber-600 transition-colors">
                                <Pencil size={13}/>
                              </button>
                              <button onClick={() => setConfirmDeletePurchase(p)} disabled={deleteId===p.id} title="Delete"
                                className="rounded p-1 text-theme-muted hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                <Trash2 size={13}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
                <span className="text-xs text-theme-subtle">{filtered.length} purchase{filtered.length!==1?"s":""}</span>
                <span className="text-xs text-theme-subtle">Total: <span className="font-bold text-theme-fg">{formatCurrency(filtered.reduce((s,p) => s+p.amount,0))}</span></span>
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            VENDORS TAB
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "vendors" && (
          <>
            {/* Vendor stat cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label:"Total Vendors",   value: totalVendors,                 icon:Building2,   color:"text-theme-fg",    bg:"bg-theme-raised" },
                { label:"Total Paid Out",  value: formatCurrency(totalVendorPaid), icon:IndianRupee, color:"text-red-600",   bg:"bg-red-500/10" },
                { label:"Categories",      value: categoryCount,                icon:Tag,          color:"text-sky-600",    bg:"bg-sky-500/10" },
                { label:"Top Vendor",      value: topVendor?.name ?? "—",       icon:TrendingUp,   color:"text-emerald-600",bg:"bg-emerald-500/10" },
              ].map(({ label, value, icon:Icon, color, bg }) => (
                <div key={label} className="page-card flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                    <Icon size={15} className={color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-theme-muted">{label}</p>
                    <p className={cn("text-xl font-black leading-tight truncate", color)}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Vendors table */}
            <div className="page-card overflow-hidden p-0">
              <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black text-theme-fg">Vendor Directory</p>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13}/>
                  <input value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} placeholder="Search vendors…"
                    className="h-8 w-48 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all"/>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                      <th className="px-5 py-3 font-semibold">Vendor</th>
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-5 py-3 font-semibold">Contact Person</th>
                      <th className="px-5 py-3 font-semibold">Email</th>
                      <th className="px-5 py-3 font-semibold">Phone</th>
                      <th className="px-5 py-3 font-semibold">Total Paid</th>
                      <th className="px-5 py-3 font-semibold">Added</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {vendorsLoading ? (
                      Array.from({length:5}).map((_,i) => (
                        <tr key={`vsk-${i}`} className="animate-pulse">
                          {Array.from({length:8}).map((_,j) => (
                            <td key={j} className="px-5 py-3"><div className="h-3 rounded bg-theme-raised"/></td>
                          ))}
                        </tr>
                      ))
                    ) : filteredVendors.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-theme-raised">
                              <Building2 size={20} className="text-theme-subtle"/>
                            </div>
                            <p className="text-sm text-theme-subtle">
                              {vendorSearch ? "No vendors match your search" : "No vendors yet"}
                            </p>
                            {!vendorSearch && (
                              <button onClick={openAddVendor}
                                className="flex items-center gap-1.5 rounded-lg bg-theme-fg px-4 py-2 text-xs font-bold text-theme-bg hover:opacity-90 transition-all">
                                <Plus size={12}/> Add First Vendor
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredVendors.map(v => (
                        <tr key={v.id} className="group transition-colors hover:bg-theme-raised/40">
                          {/* Vendor name + avatar */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-[11px] font-black text-sky-600 uppercase">
                                {v.name.slice(0,2)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-theme-fg">{v.name}</p>
                                <p className="text-[10px] text-theme-subtle font-mono">VEN-{v.id.slice(0,8).toUpperCase()}</p>
                              </div>
                            </div>
                          </td>
                          {/* Category */}
                          <td className="px-5 py-3">
                            <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                              CATEGORY_COLORS[v.category] ?? "bg-theme-raised text-theme-muted")}>
                              <Tag size={10}/>{v.category}
                            </span>
                          </td>
                          {/* Contact person */}
                          <td className="px-5 py-3">
                            {v.contact_person ? (
                              <div className="flex items-center gap-1.5 text-xs text-theme-fg">
                                <User size={11} className="text-theme-subtle flex-shrink-0"/>
                                {v.contact_person}
                              </div>
                            ) : (
                              <span className="text-[11px] text-theme-subtle">—</span>
                            )}
                          </td>
                          {/* Email */}
                          <td className="px-5 py-3">
                            {v.email ? (
                              <div className="flex items-center gap-1.5 text-xs text-theme-muted">
                                <Mail size={11} className="text-theme-subtle flex-shrink-0"/>
                                <span className="truncate max-w-[160px]">{v.email}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-theme-subtle">—</span>
                            )}
                          </td>
                          {/* Phone */}
                          <td className="px-5 py-3">
                            {v.phone ? (
                              <div className="flex items-center gap-1.5 text-xs text-theme-muted">
                                <Phone size={11} className="text-theme-subtle flex-shrink-0"/>
                                {v.phone}
                              </div>
                            ) : (
                              <span className="text-[11px] text-theme-subtle">—</span>
                            )}
                          </td>
                          {/* Total paid */}
                          <td className="px-5 py-3">
                            <span className={cn("text-sm font-bold", v.total_paid > 0 ? "text-red-500" : "text-theme-subtle")}>
                              {v.total_paid > 0 ? `−${formatCurrency(v.total_paid)}` : "₹0"}
                            </span>
                          </td>
                          {/* Created at */}
                          <td className="px-5 py-3 text-xs text-theme-muted">{formatDate(v.created_at)}</td>
                          {/* Actions */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditVendor(v)}
                                title="Edit vendor"
                                className="rounded p-1 text-theme-muted hover:bg-sky-500/10 hover:text-sky-600 transition-colors"
                              >
                                <Pencil size={13}/>
                              </button>
                              <button
                                onClick={() => setConfirmDeleteVendor(v)}
                                disabled={deletingVendorId === v.id}
                                title="Delete vendor"
                                className="rounded p-1 text-theme-muted hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-40"
                              >
                                <Trash2 size={13}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
                <span className="text-xs text-theme-subtle">{filteredVendors.length} vendor{filteredVendors.length!==1?"s":""}</span>
                <span className="text-xs text-theme-subtle">Total paid out: <span className="font-bold text-theme-fg">{formatCurrency(filteredVendors.reduce((s,v) => s+v.total_paid,0))}</span></span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          ADD PURCHASE BILL MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-[72vw] max-h-[90vh] flex flex-col rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between border-b border-theme-border px-7 py-4 flex-shrink-0 bg-theme-raised/30">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-200/50 shadow-inner">
                  <Receipt size={22} className="text-amber-600"/>
                </div>
                <div>
                  <h3 className="text-base font-black text-theme-fg tracking-tight">{editingPurchase ? "Edit Purchase Bill" : "Purchase Bill"}</h3>
                  <p className="text-[10px] text-theme-muted font-bold uppercase tracking-widest mt-0.5 opacity-60">
                    {editingPurchase ? `Editing ${editingPurchase.purchase_number}` : "Finance & Procurement Log"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={cn("flex items-center gap-3 rounded-xl border px-4 py-2 shadow-sm",
                  editingPurchase ? "border-amber-200/60 bg-amber-500/[0.06]" : "border-theme-border bg-theme-surface")}>
                  <div className="text-right">
                    <p className={cn("text-[9px] font-black uppercase tracking-tighter", editingPurchase ? "text-amber-600" : "text-theme-muted")}>
                      {editingPurchase ? "Authorised By (Edit) *" : "Filing Employee *"}
                    </p>
                    <select
                      value={selectedEmployee?.id || ""}
                      onChange={(e) => {
                        const emp = employees.find(emp => emp.id === e.target.value);
                        setSelectedEmployee(emp || null);
                      }}
                      className={cn("text-xs font-black bg-transparent outline-none cursor-pointer transition-colors",
                        editingPurchase ? "text-amber-600 hover:text-amber-700" : "text-blue-600 hover:text-blue-700")}
                    >
                      <option value="">Select Employee...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="h-8 w-[1px] bg-theme-border mx-1"/>
                  <User size={18} className={cn("transition-colors", selectedEmployee ? (editingPurchase ? "text-amber-500" : "text-blue-500") : "text-theme-subtle")}/>
                </div>
                <button onClick={closePurchaseModal} className="rounded-xl p-2 text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-all border border-transparent hover:border-theme-border"><X size={18}/></button>
              </div>
            </div>

            <div className={cn("flex-1 overflow-y-auto p-7 transition-all duration-300", !selectedEmployee && "grayscale opacity-50 pointer-events-none blur-[1px]")}>
              {!selectedEmployee && (
                <div className="absolute inset-x-0 top-[88px] bottom-0 z-50 flex flex-col items-center justify-center bg-theme-surface/10 backdrop-blur-[2px]">
                   <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-2xl text-center max-w-xs animate-in fade-in zoom-in duration-300">
                      <div className={cn("h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 border",
                        editingPurchase ? "bg-amber-500/10 border-amber-200" : "bg-blue-500/10 border-blue-200")}>
                         <User size={28} className={cn("animate-pulse", editingPurchase ? "text-amber-600" : "text-blue-600")}/>
                      </div>
                      <h4 className="text-sm font-black text-theme-fg mb-1">
                        {editingPurchase ? "Edit Authorisation Required" : "Employee Authentication Required"}
                      </h4>
                      <p className="text-[11px] text-theme-muted leading-relaxed mb-4">
                        {editingPurchase
                          ? "Select the employee authorising this edit to unlock the form fields."
                          : "Please select the employee filing this purchase bill to enable form fields."}
                      </p>
                      <div className={cn("text-[9px] font-black uppercase tracking-widest py-1.5 rounded-lg border",
                        editingPurchase ? "text-amber-600 bg-amber-50 border-amber-100" : "text-blue-600 bg-blue-50 border-blue-100")}>
                        {editingPurchase ? "Edit Auth Step" : "Compulsory Log Step"}
                      </div>
                   </div>
                </div>
              )}

              {selectedEmployee && (
                <div className={cn("mb-8 flex items-center justify-between rounded-2xl border p-5 animate-in fade-in slide-in-from-top-2 duration-500",
                  editingPurchase ? "bg-amber-500/[0.03] border-amber-500/10" : "bg-blue-500/[0.03] border-blue-500/10")}>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white font-black text-lg shadow-lg uppercase",
                        editingPurchase ? "bg-amber-500 shadow-amber-500/20" : "bg-blue-600 shadow-blue-500/20")}>
                        {selectedEmployee.name.slice(0, 2)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-theme-surface flex items-center justify-center">
                        <CheckCircle size={8} className="text-white"/>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-theme-fg">{selectedEmployee.name}</h4>
                        <span className={cn("rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                          editingPurchase ? "bg-amber-500/10 text-amber-600" : "bg-blue-600/10 text-blue-600")}>
                          {selectedEmployee.employee_id}
                        </span>
                        {editingPurchase && (
                          <span className="rounded-md bg-amber-500/10 border border-amber-200/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1">
                            <Pencil size={8}/> Edit Auth
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-theme-muted mt-0.5 font-semibold">
                        {selectedEmployee.designation} <span className="mx-1.5 opacity-30">•</span> {selectedEmployee.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pr-4">
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-theme-muted tracking-widest leading-none mb-1.5">
                        {editingPurchase ? "Edit Date" : "Filing Date"}
                      </p>
                      <p className="text-xs font-bold text-theme-fg uppercase">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="h-10 w-[1px] bg-theme-border"/>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-theme-muted tracking-widest leading-none mb-1.5">Record Status</p>
                      <p className={cn("text-xs font-bold uppercase flex items-center justify-end gap-1",
                        editingPurchase ? "text-amber-600" : "text-emerald-600")}>
                        <AlertCircle size={10}/> {editingPurchase ? "Edit Authorised" : "Authenticated"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-8">

                {/* LEFT: Vendor */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2"><Building2 size={11}/>Vendor Details</p>
                    <button onClick={openAddVendor} className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:underline uppercase tracking-wider">
                      <Plus size={10}/> New Vendor
                    </button>
                  </div>
                  <div>
                    <FLabel>Select Vendor *</FLabel>
                    <div className="relative" ref={vendorDropRef}>
                      <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"/>
                      <input value={vendorDropSearch} onFocus={() => setShowVendorDrop(true)}
                        onChange={e => { setVendorDropSearch(e.target.value); setForm(f => ({...f, vendor_name: e.target.value, vendor_id:""})); setSelectedVendor(null); setShowVendorDrop(true); }}
                        placeholder="Search or type vendor name…"
                        className="w-full rounded-lg border border-theme-border bg-theme-page pl-9 pr-3 py-2 text-sm text-theme-fg outline-none focus:border-blue-500 transition-all"/>
                      {vendorDropSearch && <button onClick={() => { setVendorDropSearch(""); setForm(f=>({...f,vendor_name:"",vendor_id:""})); setSelectedVendor(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-fg"><X size={13}/></button>}
                      {showVendorDrop && filteredVendorDrop.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-theme-border bg-theme-surface shadow-xl">
                          {filteredVendorDrop.map(v => (
                            <button key={v.id} onClick={() => selectVendor(v)} className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-theme-raised transition-colors">
                              <div><p className="text-xs font-bold text-theme-fg">{v.name}</p>{v.contact_person && <p className="text-[10px] text-theme-muted">{v.contact_person}</p>}</div>
                              <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", CATEGORY_COLORS[v.category]??"")}>{v.category}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedVendor ? (
                    <div className="rounded-xl border border-theme-border bg-theme-page p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-theme-fg">{selectedVendor.name}</p>
                        <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", CATEGORY_COLORS[selectedVendor.category]??"")}>{selectedVendor.category}</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-theme-muted">
                        {selectedVendor.contact_person && <div className="flex items-center gap-2"><User size={11}/><span>{selectedVendor.contact_person}</span></div>}
                        {selectedVendor.email && <div className="flex items-center gap-2"><Mail size={11}/><span>{selectedVendor.email}</span></div>}
                        {selectedVendor.phone && <div className="flex items-center gap-2"><Phone size={11}/><span>{selectedVendor.phone}</span></div>}
                        <div className="pt-1 border-t border-theme-border flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider">Total Paid</span>
                          <span className="font-bold text-theme-fg">{formatCurrency(selectedVendor.total_paid)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-theme-border bg-theme-page/50 p-6 text-center">
                      <Building2 size={24} className="mx-auto mb-2 text-theme-subtle"/>
                      <p className="text-xs text-theme-subtle">Search above to select a vendor</p>
                      <p className="text-[10px] text-theme-subtle mt-0.5">or type a name to create ad-hoc</p>
                    </div>
                  )}

                  <div>
                    <FLabel>Notes / Remarks</FLabel>
                    <div className="relative">
                      <StickyNote size={13} className="absolute left-3 top-3 text-theme-muted pointer-events-none"/>
                      <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                        placeholder="Any additional remarks…" rows={3}
                        className="w-full rounded-lg border border-theme-border bg-theme-page pl-9 pr-3 py-2 text-sm text-theme-fg outline-none focus:border-blue-500 transition-all resize-none placeholder:text-theme-subtle"/>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Purchase Details */}
                <div className="space-y-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2"><ShoppingCart size={11}/>Purchase Details</p>
                  <div>
                    <FLabel>Description *</FLabel>
                    <div className="relative">
                      <Layers size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"/>
                      <FInput value={form.description} onChange={v=>setForm({...form,description:v})} placeholder="e.g. EC2 + S3 monthly bill" className="pl-9"/>
                    </div>
                  </div>
                  <div>
                    <FLabel>Category *</FLabel>
                    <div className="relative">
                      <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none z-10"/>
                      <FSelect value={form.category} onChange={v=>setForm({...form,category:v})} className="pl-9">
                        <option value="">Select category…</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </FSelect>
                    </div>
                    {form.category && (
                      <div className="mt-2">
                        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold", CATEGORY_COLORS[form.category]??"")}><Tag size={10}/>{form.category}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <FLabel>Amount (₹) *</FLabel>
                    <div className="relative">
                      <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"/>
                      <FInput type="number" value={form.amount} onChange={v=>setForm({...form,amount:v})} placeholder="0.00" className="pl-9 font-mono"/>
                    </div>
                    {form.amount && Number(form.amount)>0 && <p className="mt-1.5 text-[10px] font-semibold text-red-500">−{formatCurrency(Number(form.amount))} expense</p>}
                  </div>
                  <div>
                    <FLabel>Purchase Date *</FLabel>
                    <div className="relative">
                      <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"/>
                      <FInput type="date" value={form.date} onChange={v=>setForm({...form,date:v})} className="pl-9"/>
                    </div>
                  </div>
                  {formValid && (
                    <div className="rounded-xl border border-theme-border bg-theme-page p-4 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Bill Summary</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-theme-muted">Vendor</span><span className="font-semibold text-theme-fg">{form.vendor_name}</span></div>
                        <div className="flex justify-between"><span className="text-theme-muted">Category</span><span className="font-semibold text-theme-fg">{form.category}</span></div>
                        <div className="flex justify-between"><span className="text-theme-muted">Date</span><span className="font-semibold text-theme-fg">{formatDate(form.date)}</span></div>
                        <div className="flex justify-between border-t border-theme-border pt-1.5">
                          <span className="font-bold text-theme-fg">Total Due</span>
                          <span className="font-black text-red-500 text-sm">−{formatCurrency(Number(form.amount))}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-theme-border px-7 py-4 flex-shrink-0 bg-theme-page">
              <p className="text-[10px] text-theme-subtle">
                {editingPurchase
                  ? <span>Editing <span className="font-bold text-amber-600">{editingPurchase.purchase_number}</span> — status unchanged</span>
                  : <>Saved bills are marked <span className="font-bold text-amber-600">Due</span> until payment is recorded</>
                }
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={closePurchaseModal}>Cancel</Button>
                {editingPurchase ? (
                  <Button variant="primary" size="sm" disabled={saving || !formValid} onClick={() => handleSavePurchase(false)}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" size="sm" disabled={saving||!formValid} onClick={() => handleSavePurchase(false)}>
                      {saving?"Saving…":"Save Bill"}
                    </Button>
                    <Button variant="primary" size="sm" disabled={saving||!formValid} onClick={() => handleSavePurchase(true)}>
                      {saving?"Saving…":"Save & Record Payment"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          RECORD PAYMENT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {paymentPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-[72vw] max-h-[90vh] flex flex-col rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

            <div className="flex items-center border-b border-theme-border px-7 py-4 flex-shrink-0 gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-200/50">
                  <CreditCard size={18} className="text-emerald-600"/>
                </div>
                <div>
                  <h3 className="text-sm font-black text-theme-fg">Record Payment</h3>
                  <p className="text-[10px] text-theme-muted mt-0.5">Complete the transaction for this purchase bill</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-theme-border bg-theme-page px-3 py-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Receipt #</span>
                <span className="text-[11px] font-black text-theme-fg font-mono">{receiptNumber}</span>
              </div>
              <button onClick={closePaymentModal} className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised transition-colors"><X size={16}/></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-7 space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3 flex items-center gap-2"><CalendarDays size={11}/>Payment Date</p>
                  <div className="relative inline-block">
                    <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"/>
                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                      className="rounded-lg border border-theme-border bg-theme-page pl-9 pr-4 py-2 text-sm text-theme-fg outline-none focus:border-blue-500 transition-all"/>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3 flex items-center gap-2"><CreditCard size={11}/>Payment Details</p>
                  <div className="space-y-3">
                    {paymentRows.map((row) => {
                      const modeInfo = PAYMENT_MODES.find(m => m.mode === row.mode)!;
                      const ModeIcon = modeInfo?.icon || Banknote;
                      return (
                        <div key={row.id} className="flex items-center gap-3 rounded-xl border border-theme-border bg-theme-page p-3">
                          <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", modeInfo?.bg || "bg-theme-raised")}>
                            <ModeIcon size={15} className={modeInfo?.color || "text-theme-muted"}/>
                          </div>
                          <div className="flex-shrink-0 w-24">
                            <p className="text-xs font-bold text-theme-fg">{row.mode}</p>
                            <p className="text-[9px] text-theme-muted uppercase tracking-wider">Method</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted mb-1">Amount</p>
                            <div className="relative">
                              <IndianRupee size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"/>
                              <input type="number" value={row.amount}
                                onChange={e => updatePaymentRow(row.id, "amount", e.target.value)}
                                className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-1.5 pl-7 text-sm font-bold text-theme-fg outline-none focus:border-blue-500 transition-all"/>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted mb-1">Reference / ID (Optional)</p>
                            <input type="text" value={row.reference} placeholder="Ref No."
                              onChange={e => updatePaymentRow(row.id, "reference", e.target.value)}
                              className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-1.5 text-sm text-theme-fg outline-none focus:border-blue-500 transition-all placeholder:text-theme-subtle"/>
                          </div>
                          {paymentRows.length > 1 && (
                            <button onClick={() => removePaymentRow(row.id)} className="ml-1 flex-shrink-0 rounded-lg p-1.5 text-theme-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"><X size={14}/></button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted mb-2">Add Payment Mode</p>
                    <div className="flex flex-wrap gap-2">
                      {PAYMENT_MODES.map(({ mode, icon: MIcon, color, bg }) => (
                        <button key={mode} onClick={() => addPaymentMode(mode)}
                          className={cn("flex items-center gap-1.5 rounded-lg border border-theme-border px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95", bg, color)}>
                          <MIcon size={12}/> {mode} <Plus size={10} className="opacity-60"/>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3 flex items-center gap-2"><StickyNote size={11}/>Message / Remarks</p>
                  <textarea value={paymentRemarks} onChange={e => setPaymentRemarks(e.target.value)}
                    placeholder="Add payment remarks here…" rows={3}
                    className="w-full rounded-xl border border-theme-border bg-theme-page px-4 py-3 text-sm text-theme-fg outline-none focus:border-blue-500 transition-all resize-none placeholder:text-theme-subtle"/>
                </div>
              </div>

              <div className="w-72 flex-shrink-0 border-l border-theme-border bg-theme-page flex flex-col">
                <div className="p-6 flex-1 space-y-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Transaction Summary</p>
                  <div className="rounded-xl border border-theme-border bg-theme-surface p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10">
                        <Building2 size={15} className="text-sky-600"/>
                      </div>
                      <div>
                        <p className="text-[9px] text-theme-muted uppercase tracking-widest font-bold">Vendor</p>
                        <p className="text-sm font-black text-theme-fg">{paymentPurchase.vendor_name}</p>
                      </div>
                    </div>
                    {paymentPurchase.description && <p className="mt-2 text-[11px] text-theme-muted border-t border-theme-border pt-2 truncate">{paymentPurchase.description}</p>}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-theme-muted">Purchase Amount</span>
                      <span className="font-bold text-theme-fg">{formatCurrency(paymentPurchase.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-theme-muted">Paying Now</span>
                      <span className="font-bold text-red-500">−{formatCurrency(payingNow)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-theme-border pt-3">
                      <span className="text-sm font-black uppercase tracking-wider text-theme-fg">Balance Due</span>
                      <span className={cn("text-lg font-black", balanceDue <= 0 ? "text-emerald-600" : "text-amber-600")}>
                        {formatCurrency(Math.max(0, balanceDue))}
                      </span>
                    </div>
                  </div>
                  {balanceDue <= 0 && payingNow > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200/50 bg-emerald-500/10 px-3 py-2.5">
                      <CheckCircle size={14} className="text-emerald-600 flex-shrink-0"/>
                      <p className="text-[11px] font-bold text-emerald-700">Purchase will be marked as <span className="font-black">Paid</span></p>
                    </div>
                  )}
                  {balanceDue > 0 && payingNow > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200/50 bg-amber-500/10 px-3 py-2.5">
                      <AlertCircle size={14} className="text-amber-600 flex-shrink-0"/>
                      <p className="text-[11px] font-bold text-amber-700">{formatCurrency(balanceDue)} balance remaining</p>
                    </div>
                  )}
                </div>
                <div className="p-5 border-t border-theme-border space-y-2">
                  <button
                    onClick={handleConfirmPayment}
                    disabled={paymentSaving || payingNow <= 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-theme-fg px-4 py-3.5 text-sm font-black text-theme-bg hover:opacity-90 disabled:opacity-40 transition-all active:scale-95">
                    <CreditCard size={16}/> {paymentSaving ? "Processing…" : "Confirm Payment"}
                  </button>
                  <button onClick={closePaymentModal} className="w-full text-center text-xs text-theme-muted hover:text-theme-fg transition-colors py-1">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ADD / EDIT VENDOR MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showVendorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-[56vw] max-h-[90vh] flex flex-col rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-theme-border px-7 py-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border",
                  editingVendor ? "bg-amber-500/10 border-amber-200/50" : "bg-sky-500/10 border-sky-200/50")}>
                  {editingVendor ? <Pencil size={18} className="text-amber-600"/> : <Building2 size={18} className="text-sky-600"/>}
                </div>
                <div>
                  <h3 className="text-sm font-black text-theme-fg">{editingVendor ? "Edit Vendor" : "Add New Vendor"}</h3>
                  <p className="text-[10px] text-theme-muted mt-0.5">
                    {editingVendor ? `Editing: ${editingVendor.name}` : "Register a vendor or supplier for purchase tracking"}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowVendorModal(false); setVendorForm(EMPTY_VENDOR_FORM); setEditingVendor(null); }} className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised transition-colors"><X size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-7 space-y-7">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-4 flex items-center gap-2"><Building2 size={11}/>Business Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><FLabel>Vendor / Company Name *</FLabel><FInput value={vendorForm.name} onChange={v=>setVendorForm({...vendorForm,name:v})} placeholder="e.g. AWS India Pvt. Ltd."/></div>
                  <div><FLabel>Category</FLabel><FSelect value={vendorForm.category} onChange={v=>setVendorForm({...vendorForm,category:v})}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</FSelect></div>
                  <div><FLabel>GSTIN (optional)</FLabel><FInput value={vendorForm.gstin} onChange={v=>setVendorForm({...vendorForm,gstin:v})} placeholder="29ABCDE1234F1Z5"/></div>
                  <div className="col-span-2"><FLabel>Address</FLabel><FInput value={vendorForm.address} onChange={v=>setVendorForm({...vendorForm,address:v})} placeholder="Street, City, State, Pincode"/></div>
                </div>
              </div>
              <div className="border-t border-theme-border/50"/>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-4 flex items-center gap-2"><User size={11}/>Contact Details</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><FLabel>Contact Person</FLabel><div className="relative"><User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"/><FInput value={vendorForm.contact_person} onChange={v=>setVendorForm({...vendorForm,contact_person:v})} placeholder="John Doe" className="pl-9"/></div></div>
                  <div><FLabel>Email</FLabel><div className="relative"><Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"/><FInput type="email" value={vendorForm.email} onChange={v=>setVendorForm({...vendorForm,email:v})} placeholder="vendor@company.com" className="pl-9"/></div></div>
                  <div><FLabel>Phone</FLabel><div className="relative"><Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"/><FInput value={vendorForm.phone} onChange={v=>setVendorForm({...vendorForm,phone:v})} placeholder="+91 98765 43210" className="pl-9"/></div></div>
                </div>
              </div>
              {vendorForm.name && (
                <div className="rounded-xl border border-theme-border bg-theme-page p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3">Preview</p>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-black text-theme-fg">{vendorForm.name}</p>
                      {vendorForm.contact_person && <p className="text-xs text-theme-muted mt-0.5">{vendorForm.contact_person}</p>}
                      {vendorForm.email && <p className="text-xs text-theme-muted">{vendorForm.email}</p>}
                      {vendorForm.phone && <p className="text-xs text-theme-muted">{vendorForm.phone}</p>}
                    </div>
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", CATEGORY_COLORS[vendorForm.category]??"")}>{vendorForm.category}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-theme-border px-7 py-4 flex-shrink-0 bg-theme-page">
              <p className="text-[10px] text-theme-subtle">
                {editingVendor ? "Changes will reflect across all linked purchases" : showPurchaseModal ? "Vendor will be auto-selected in the purchase form" : "Available for all future purchases"}
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={()=>{setShowVendorModal(false);setVendorForm(EMPTY_VENDOR_FORM);setEditingVendor(null);}}>Cancel</Button>
                <Button variant="primary" size="sm" disabled={saving||!vendorForm.name} onClick={handleSaveVendor}>
                  {saving ? "Saving…" : editingVendor ? "Save Changes" : "Add Vendor"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          DELETE VENDOR CONFIRMATION MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {confirmDeletePurchase && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-16 bg-transparent" onClick={() => setConfirmDeletePurchase(null)}>
          <div
            className="flex items-center gap-4 rounded-2xl bg-theme-surface border border-theme-border shadow-2xl px-5 py-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <Trash2 size={17} className="text-red-500"/>
            </div>
            <div className="mr-2">
              <p className="text-sm font-bold text-theme-fg leading-tight">
                Delete <span className="text-red-500">&ldquo;{confirmDeletePurchase.purchase_number}&rdquo;</span>?
              </p>
              <p className="text-[11px] text-theme-muted mt-0.5">This action cannot be undone.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setConfirmDeletePurchase(null)}
                className="rounded-lg border border-theme-border bg-theme-page px-4 py-2 text-xs font-semibold text-theme-fg hover:bg-theme-raised transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeletePurchase.id)}
                disabled={deleteId === confirmDeletePurchase.id}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteId === confirmDeletePurchase.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteVendor && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-16 bg-transparent" onClick={() => setConfirmDeleteVendor(null)}>
          <div
            className="flex items-center gap-4 rounded-2xl bg-theme-surface border border-theme-border shadow-2xl px-5 py-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Trash icon */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <Trash2 size={17} className="text-red-500"/>
            </div>

            {/* Text */}
            <div className="mr-2">
              <p className="text-sm font-bold text-theme-fg leading-tight">
                Delete <span className="text-red-500">&ldquo;{confirmDeleteVendor.name}&rdquo;</span>?
              </p>
              <p className="text-[11px] text-theme-muted mt-0.5">This action cannot be undone.</p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setConfirmDeleteVendor(null)}
                className="rounded-lg border border-theme-border bg-theme-page px-4 py-2 text-xs font-semibold text-theme-fg hover:bg-theme-raised transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteVendor(confirmDeleteVendor)}
                disabled={deletingVendorId === confirmDeleteVendor.id}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deletingVendorId === confirmDeleteVendor.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SHARE MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {sharePurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10">
                  <Share2 size={16} className="text-purple-600"/>
                </div>
                <div>
                  <h3 className="text-sm font-black text-theme-fg">Share Purchase Bill</h3>
                  <p className="text-[10px] text-theme-muted">{sharePurchase.purchase_number}</p>
                </div>
              </div>
              <button onClick={()=>setSharePurchase(null)} className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised transition-colors"><X size={15}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-theme-border bg-theme-page p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-theme-muted">Bill No.</span><span className="font-mono font-bold text-theme-fg">{sharePurchase.purchase_number}</span></div>
                <div className="flex justify-between"><span className="text-theme-muted">Vendor</span><span className="font-semibold text-theme-fg">{sharePurchase.vendor_name}</span></div>
                <div className="flex justify-between"><span className="text-theme-muted">Description</span><span className="font-semibold text-theme-fg max-w-[180px] truncate text-right">{sharePurchase.description}</span></div>
                <div className="flex justify-between"><span className="text-theme-muted">Amount</span><span className="font-black text-red-500">−{formatCurrency(sharePurchase.amount)}</span></div>
                <div className="flex justify-between"><span className="text-theme-muted">Date</span><span className="font-semibold text-theme-fg">{formatDate(sharePurchase.date)}</span></div>
                <div className="flex justify-between border-t border-theme-border pt-2">
                  <span className="text-theme-muted">Status</span>
                  <span className={cn("font-black uppercase text-xs", sharePurchase.status==="paid"?"text-emerald-600":sharePurchase.status==="pending"?"text-amber-600":"text-red-500")}>{sharePurchase.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => copyShareText(sharePurchase)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-page px-4 py-3 text-sm font-semibold text-theme-fg hover:bg-theme-raised transition-colors">
                  {copied ? <><CheckCircle size={14} className="text-emerald-500"/> Copied!</> : <><Copy size={14}/> Copy Details</>}
                </button>
                <button onClick={() => { printPurchaseBill(sharePurchase); setSharePurchase(null); }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-page px-4 py-3 text-sm font-semibold text-theme-fg hover:bg-theme-raised transition-colors">
                  <Printer size={14}/> Print / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
