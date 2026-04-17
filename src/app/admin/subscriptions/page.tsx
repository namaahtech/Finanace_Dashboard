"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  Plus, Search, X, RefreshCw, Pencil, Trash2, Mail, Users, Tag, CreditCard,
  CheckCircle, CheckCircle2, AlertCircle, Clock, Globe, Building2, User,
  Calendar, IndianRupee, Layers, StickyNote, Send, ExternalLink, Shield,
  Zap, ChevronDown, MailCheck,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/layout/AuthProvider";
import { useToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string; name: string; email: string;
  employee_id: string; department: string; designation: string;
}
interface Team { id: string; name: string; department?: string; }

interface SubscriptionAssignment {
  id: string; subscription_id: string;
  assignment_type: "department" | "team" | "employee";
  department_name: string | null;
  team_id: string | null;
  employee_id: string | null;
  seats_allocated: number;
  access_email: string | null;
  access_login: string | null;
  access_note: string | null;
  credentials_sent: boolean;
  sent_at: string | null;
  sent_by_name: string | null;
  created_at: string;
  teams?: { name: string } | null;
  employees?: { name: string; email: string; employee_id: string; department: string; designation: string } | null;
}

interface Subscription {
  id: string; sub_number: string; name: string; provider: string | null;
  category: string; cost_per_seat: number; total_seats: number;
  billing_cycle: "Monthly" | "Annual" | "Quarterly" | "One-time";
  currency: string; renewal_date: string | null;
  status: "active" | "expiring" | "inactive" | "cancelled" | "trial";
  notes: string | null; website_url: string | null;
  created_at: string; updated_at: string;
  subscription_assignments?: SubscriptionAssignment[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUB_CATEGORIES = [
  "AI & ML", "Design", "Development", "Cloud", "Communication", "Productivity",
  "Project Management", "Analytics", "Security", "Documents", "Marketing", "HR & Ops", "Finance", "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  "AI & ML": "bg-purple-500/10 text-purple-600",
  "Design": "bg-pink-500/10 text-pink-600",
  "Development": "bg-sky-500/10 text-sky-600",
  "Cloud": "bg-sky-500/10 text-sky-600",
  "Communication": "bg-emerald-500/10 text-emerald-600",
  "Productivity": "bg-indigo-500/10 text-indigo-600",
  "Project Management": "bg-amber-500/10 text-amber-600",
  "Analytics": "bg-orange-500/10 text-orange-600",
  "Security": "bg-red-500/10 text-red-600",
  "Documents": "bg-theme-raised text-theme-muted",
  "Marketing": "bg-pink-500/10 text-pink-600",
  "HR & Ops": "bg-teal-500/10 text-teal-600",
  "Finance": "bg-emerald-500/10 text-emerald-600",
  "Other": "bg-theme-raised text-theme-muted",
  "Software": "bg-indigo-500/10 text-indigo-600",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-600", label: "Active" },
  expiring: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Expiring" },
  trial: { bg: "bg-sky-500/10", text: "text-sky-600", label: "Trial" },
  inactive: { bg: "bg-theme-raised", text: "text-theme-muted", label: "Inactive" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-500", label: "Cancelled" },
};

const PRESET_TOOLS = [
  { name: "Claude AI", provider: "Anthropic", category: "AI & ML", website: "https://claude.ai" },
  { name: "ChatGPT", provider: "OpenAI", category: "AI & ML", website: "https://chat.openai.com" },
  { name: "Gemini", provider: "Google", category: "AI & ML", website: "https://gemini.google.com" },
  { name: "GitHub Copilot", provider: "GitHub", category: "AI & ML", website: "https://github.com/features/copilot" },
  { name: "Midjourney", provider: "Midjourney", category: "AI & ML", website: "https://midjourney.com" },
  { name: "Perplexity", provider: "Perplexity AI", category: "AI & ML", website: "https://perplexity.ai" },
  { name: "Figma", provider: "Figma Inc.", category: "Design", website: "https://figma.com" },
  { name: "Adobe Creative Cloud", provider: "Adobe", category: "Design", website: "https://adobe.com" },
  { name: "Canva", provider: "Canva", category: "Design", website: "https://canva.com" },
  { name: "Framer", provider: "Framer", category: "Design", website: "https://framer.com" },
  { name: "GitHub", provider: "GitHub Inc.", category: "Development", website: "https://github.com" },
  { name: "GitLab", provider: "GitLab", category: "Development", website: "https://gitlab.com" },
  { name: "Vercel", provider: "Vercel Inc.", category: "Development", website: "https://vercel.com" },
  { name: "Postman", provider: "Postman Inc.", category: "Development", website: "https://postman.com" },
  { name: "AWS", provider: "Amazon Web Services", category: "Cloud", website: "https://aws.amazon.com" },
  { name: "Google Cloud", provider: "Google", category: "Cloud", website: "https://cloud.google.com" },
  { name: "Azure", provider: "Microsoft", category: "Cloud", website: "https://azure.microsoft.com" },
  { name: "Supabase", provider: "Supabase Inc.", category: "Cloud", website: "https://supabase.com" },
  { name: "Slack", provider: "Salesforce", category: "Communication", website: "https://slack.com" },
  { name: "Zoom", provider: "Zoom Video", category: "Communication", website: "https://zoom.us" },
  { name: "Google Workspace", provider: "Google", category: "Productivity", website: "https://workspace.google.com" },
  { name: "Microsoft 365", provider: "Microsoft", category: "Productivity", website: "https://microsoft.com/365" },
  { name: "Notion", provider: "Notion Labs", category: "Productivity", website: "https://notion.so" },
  { name: "Loom", provider: "Loom Inc.", category: "Productivity", website: "https://loom.com" },
  { name: "Grammarly", provider: "Grammarly Inc.", category: "Productivity", website: "https://grammarly.com" },
  { name: "Jira", provider: "Atlassian", category: "Project Management", website: "https://atlassian.com/jira" },
  { name: "Linear", provider: "Linear", category: "Project Management", website: "https://linear.app" },
  { name: "Asana", provider: "Asana Inc.", category: "Project Management", website: "https://asana.com" },
  { name: "ClickUp", provider: "ClickUp", category: "Project Management", website: "https://clickup.com" },
  { name: "Mixpanel", provider: "Mixpanel Inc.", category: "Analytics", website: "https://mixpanel.com" },
  { name: "Datadog", provider: "Datadog Inc.", category: "Analytics", website: "https://datadoghq.com" },
  { name: "1Password", provider: "AgileBits", category: "Security", website: "https://1password.com" },
  { name: "LastPass", provider: "LogMeIn", category: "Security", website: "https://lastpass.com" },
  { name: "DocuSign", provider: "DocuSign", category: "Documents", website: "https://docusign.com" },
  { name: "Zapier", provider: "Zapier Inc.", category: "Other", website: "https://zapier.com" },
];

const BILLING_CYCLES = ["Monthly", "Annual", "Quarterly", "One-time"] as const;
const MONTHS_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
];

type SubFormState = {
  name: string; provider: string; category: string;
  cost_per_seat: string; total_seats: string;
  billing_cycle: "Monthly" | "Annual" | "Quarterly" | "One-time";
  renewal_date: string; currency: string;
  status: "active" | "trial" | "inactive" | "cancelled" | "expiring";
  notes: string; website_url: string;
  filed_by_emp_id: string;
  filed_by_name: string;
  filed_by_dept: string;
  filed_by_desig: string;
  filed_by_uuid: string;
};
const EMPTY_SUB_FORM: SubFormState = {
  name: "", provider: "", category: "Software", cost_per_seat: "", total_seats: "1",
  billing_cycle: "Monthly", renewal_date: "", currency: "INR", status: "active",
  notes: "", website_url: "",
  filed_by_emp_id: "",
  filed_by_name: "",
  filed_by_dept: "",
  filed_by_desig: "",
  filed_by_uuid: "",
};

function FLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-theme-muted">{children}</p>;
}
function FInput({ value, onChange, placeholder, type = "text", className = "", disabled = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string; disabled?: boolean;
}) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
    className={cn("w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-fg transition-all placeholder:text-theme-subtle disabled:opacity-50", className)} />;
}
function FSelect({ value, onChange, children, className = "" }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return <select value={value} onChange={e => onChange(e.target.value)}
    className={cn("w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-fg transition-all", className)}>
    {children}
  </select>;
}

function monthlyCost(sub: Subscription) {
  const c = sub.cost_per_seat * sub.total_seats;
  if (sub.billing_cycle === "Annual") return c / 12;
  if (sub.billing_cycle === "Quarterly") return c / 3;
  if (sub.billing_cycle === "One-time") return 0;
  return c;
}

function daysUntilRenewal(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "assignments">("subscriptions");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  // Modals
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Subscription | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Subscription | null>(null);
  const [confirmDeleteAssign, setConfirmDeleteAssign] = useState<SubscriptionAssignment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sendSuccess, setSendSuccess] = useState<Set<string>>(new Set());

  // Sub form
  const [subForm, setSubForm] = useState<SubFormState>(EMPTY_SUB_FORM);
  const [toolSearch, setToolSearch] = useState("");
  const [showToolDrop, setShowToolDrop] = useState(false);
  const toolDropRef = useRef<HTMLDivElement>(null);
  const [displayCurrency, setDisplayCurrency] = useState("INR");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ INR: 1 });
  const [loadingRates, setLoadingRates] = useState(false);

  // Assign form
  const [assignType, setAssignType] = useState<"dept_team" | "employee">("dept_team");
  const [assignDept, setAssignDept] = useState("");
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignEmpId, setAssignEmpId] = useState("");
  const [assignSeats, setAssignSeats] = useState("1");
  const [assignAccessEmail, setAssignAccessEmail] = useState("");
  const [assignLogin, setAssignLogin] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assignEmpSearch, setAssignEmpSearch] = useState("");
  const [showEmpFormDrop, setShowEmpFormDrop] = useState(false);
  const [empFormSearch, setEmpFormSearch] = useState("");
  const empFormDropRef = useRef<HTMLDivElement>(null);
  const [showEmpDrop, setShowEmpDrop] = useState(false);
  const [selectedAssignEmp, setSelectedAssignEmp] = useState<Employee | null>(null);
  const empDropRef = useRef<HTMLDivElement>(null);

  // ─── Load ─────────────────────────────────────────────────────────────────

  const loadSubscriptions = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (filterStatus !== "all") p.set("status", filterStatus);
      const res = await fetch(`/api/subscriptions?${p}`);
      const json = await res.json();
      if (json.subscriptions) setSubscriptions(json.subscriptions);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [search, filterStatus]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      const json = await res.json();
      if (json.employees) setEmployees(json.employees);
    } catch { /* silent */ }
  }, []);

  const fetchExchangeRates = useCallback(async (base: string) => {
    if (!base) return;
    setLoadingRates(true);
    try {
      // Call our backend API (avoids CORS issues)
      const res = await fetch(`/api/exchange-rates?from=${base}`);

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();
      if (data && data.rates) {
        setExchangeRates({ ...data.rates, [base]: 1 });
      }
    } catch (err) {
      console.warn("Exchange rates failed:", err);
      // Fallback: Just keep current rates
      setExchangeRates(prev => ({ ...prev, [base]: 1 }));
    } finally {
      setLoadingRates(false);
    }
  }, []);

  // Fetch rates whenever base currency changes
  useEffect(() => {
    if (subForm.currency) fetchExchangeRates(subForm.currency);
  }, [subForm.currency, fetchExchangeRates]);

  const loadTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/teams");
      const json = await res.json();
      if (json.teams) setTeams(json.teams);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);
  useEffect(() => { loadEmployees(); loadTeams(); }, [loadEmployees, loadTeams]);

  // ─── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel("subs-rt-v1")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => loadSubscriptions())
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_assignments" }, () => loadSubscriptions())
      .subscribe(s => {
        if (s === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (s === "CLOSED" || s === "CHANNEL_ERROR") setRealtimeStatus("disconnected");
        else setRealtimeStatus("connecting");
      });
    return () => { supabase.removeChannel(ch); };
  }, [loadSubscriptions]);

  // ─── Keyboard ESC ─────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSubModal(); setShowAssignModal(false);
        setConfirmDelete(null); setConfirmDeleteAssign(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // outside click dropdowns
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (toolDropRef.current && !toolDropRef.current.contains(e.target as Node)) setShowToolDrop(false);
      if (empDropRef.current && !empDropRef.current.contains(e.target as Node)) setShowEmpDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const allAssignments = subscriptions.flatMap(s =>
    (s.subscription_assignments || []).map(a => ({ ...a, subscription: s }))
  );

  const filtered = subscriptions.filter(s => {
    const q = search.toLowerCase();
    const ms = !search || s.name.toLowerCase().includes(q) || (s.provider || "").toLowerCase().includes(q);
    return ms && (filterStatus === "all" || s.status === filterStatus);
  });

  const totalMonthly = subscriptions.filter(s => s.status !== "cancelled").reduce((t, s) => t + monthlyCost(s), 0);
  const totalAnnual = totalMonthly * 12;
  const activeCount = subscriptions.filter(s => s.status === "active").length;
  const expiringCount = subscriptions.filter(s => s.status === "expiring").length;
  const totalSeats = subscriptions.filter(s => s.status !== "cancelled").reduce((t, s) => t + s.total_seats, 0);
  const assignedSeats = subscriptions.reduce((t, s) => t + (s.subscription_assignments || []).reduce((a, x) => a + x.seats_allocated, 0), 0);

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
  const filteredTeams = assignDept ? teams.filter(t => (t.department || "").toLowerCase() === assignDept.toLowerCase()) : teams;
  const filteredPresets = PRESET_TOOLS.filter(t =>
    !toolSearch || t.name.toLowerCase().includes(toolSearch.toLowerCase()) || t.category.toLowerCase().includes(toolSearch.toLowerCase())
  );
  const filteredEmpSearch = employees.filter(e =>
    assignEmpSearch ? e.name.toLowerCase().includes(assignEmpSearch.toLowerCase()) || e.employee_id.toLowerCase().includes(assignEmpSearch.toLowerCase()) : true
  );
  const filteredEmpForm = employees.filter(e =>
    !empFormSearch || e.name.toLowerCase().includes(empFormSearch.toLowerCase()) || e.employee_id.toLowerCase().includes(empFormSearch.toLowerCase())
  );

  // ─── Sub Actions ──────────────────────────────────────────────────────────

  function openAddSub() { setEditingSub(null); setSubForm(EMPTY_SUB_FORM); setToolSearch(""); setShowSubModal(true); }
  function openEditSub(s: Subscription) {
    setEditingSub(s);
    setSubForm({
      name: s.name, provider: s.provider || "", category: s.category,
      cost_per_seat: String(s.cost_per_seat), total_seats: String(s.total_seats),
      billing_cycle: s.billing_cycle, renewal_date: s.renewal_date || "",
      currency: s.currency || "INR",
      status: s.status, notes: s.notes || "", website_url: s.website_url || "",
      filed_by_emp_id: "",
      filed_by_name: "",
      filed_by_dept: "",
      filed_by_desig: "",
      filed_by_uuid: "",
    });
    setToolSearch(s.name);
    setShowSubModal(true);
  }
  function closeSubModal() { setShowSubModal(false); setEditingSub(null); setSubForm(EMPTY_SUB_FORM); setToolSearch(""); }

  async function handleSaveSub() {
    if (!subForm.name) return;
    setSaving(true);
    try {
      const payload = {
        name: subForm.name,
        provider: subForm.provider || null,
        category: subForm.category,
        cost_per_seat: Number(subForm.cost_per_seat) || 0,
        total_seats: Number(subForm.total_seats) || 1,
        billing_cycle: subForm.billing_cycle,
        renewal_date: subForm.renewal_date || null,
        currency: subForm.currency,
        status: subForm.status,
        notes: subForm.notes || null,
        website_url: subForm.website_url || null,
        filed_by_emp_id: subForm.filed_by_emp_id || undefined,
        filed_by_name: subForm.filed_by_name || undefined,
        filed_by_dept: subForm.filed_by_dept || undefined,
        filed_by_desig: subForm.filed_by_desig || undefined,
        filed_by_uuid: subForm.filed_by_uuid || undefined,
      };

      if (editingSub) {
        const res = await fetch(`/api/subscriptions/${editingSub.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) { showToast(json.error || "Failed to update subscription", "error"); return; }
        if (json.subscription) setSubscriptions(prev => prev.map(s => s.id === editingSub.id ? { ...s, ...json.subscription } : s));
        showToast(`${subForm.name} updated successfully`, "success");
      } else {
        const res = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) { showToast(json.error || "Failed to add subscription", "error"); return; }
        loadSubscriptions();
        showToast(`${subForm.name} added to subscriptions`, "success");
      }

      closeSubModal();
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally { setSaving(false); }
  }

  async function handleDeleteSub(s: Subscription) {
    setDeletingId(s.id);
    try {
      await fetch(`/api/subscriptions/${s.id}`, { method: "DELETE" });
      setSubscriptions(prev => prev.filter(x => x.id !== s.id));
    } finally { setDeletingId(null); setConfirmDelete(null); }
  }

  // ─── Assign Actions ────────────────────────────────────────────────────────

  function openAssign(s: Subscription) {
    setAssignTarget(s);
    setAssignType("dept_team"); setAssignDept(""); setAssignTeamId("");
    setAssignEmpId(""); setAssignSeats("1");
    setAssignAccessEmail(""); setAssignLogin(""); setAssignNote("");
    setAssignEmpSearch(""); setSelectedAssignEmp(null);
    setShowAssignModal(true);
  }

  async function handleSaveAssign(shouldSendEmail = false) {
    if (!assignTarget) return;
    setSaving(true);
    try {
      const payload = assignType === "employee"
        ? { assignment_type: "employee", employee_id: assignEmpId || null, seats_allocated: Number(assignSeats) || 1, access_email: selectedAssignEmp?.email || null, access_login: assignLogin, access_note: assignNote }
        : { assignment_type: assignTeamId ? "team" : "department", department_name: assignDept || null, team_id: assignTeamId || null, seats_allocated: Number(assignSeats) || 1, access_email: assignAccessEmail || null, access_login: assignLogin, access_note: assignNote };

      const res = await fetch(`/api/subscriptions/${assignTarget.id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.error || "Failed to save assignment", "error");
        return;
      }

      if (shouldSendEmail && json.assignment?.id) {
        await handleSendAccess(assignTarget.id, [json.assignment.id]);
      } else if (!shouldSendEmail) {
        showToast("Assignment saved successfully", "success");
      }

      loadSubscriptions();
      setShowAssignModal(false);
    } finally { setSaving(false); }
  }

  async function handleDeleteAssignment(a: SubscriptionAssignment) {
    setDeletingId(a.id);
    try { await fetch(`/api/subscriptions/${a.subscription_id}/assign/${a.id}`, { method: "DELETE" }); loadSubscriptions(); }
    finally { setDeletingId(null); setConfirmDeleteAssign(null); }
  }

  async function handleSendAccess(subId: string, assignmentIds: string[]) {
    setSendingIds(prev => new Set([...prev, ...assignmentIds]));
    try {
      const res = await fetch(`/api/subscriptions/${subId}/send-access`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_ids: assignmentIds,
          sent_by_emp_id: user?.employee_id || null,
          sent_by_name: user?.name || null,
        }),
      });
      const json = await res.json();
      if (json.error) { showToast(json.error, "error"); return; }
      if (json.sent > 0) {
        showToast(`Credentials sent to ${json.sent} recipient${json.sent !== 1 ? "s" : ""}`, "success");
        setSendSuccess(prev => new Set([...prev, ...assignmentIds]));
        setTimeout(() => setSendSuccess(prev => { const n = new Set(prev); assignmentIds.forEach(i => n.delete(i)); return n; }), 3000);
        loadSubscriptions();
      } else if (json.total > 0) {
        showToast("No emails could be sent — check access email addresses", "warning");
      }
    } finally { setSendingIds(prev => { const n = new Set(prev); assignmentIds.forEach(i => n.delete(i)); return n; }); }
  }

  const subFormValid = !!subForm.name && !!subForm.cost_per_seat && !!subForm.total_seats && (editingSub || !!subForm.filed_by_uuid);
  const assignValid = assignType === "employee" ? !!assignEmpId : !!assignDept;
  // "Save & Send" requires an email address to actually deliver credentials
  const canSendEmail = assignType === "employee"
    ? !!assignEmpId && !!(selectedAssignEmp?.email)
    : !!assignDept && !!assignAccessEmail;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardShell
      title="Subscriptions"
      subtitle="Manage SaaS tools, licenses, access credentials and team assignments."
      actions={
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold">
            <span className={cn("h-1.5 w-1.5 rounded-full", realtimeStatus === "connected" ? "bg-emerald-500 animate-pulse" : realtimeStatus === "connecting" ? "bg-amber-500 animate-pulse" : "bg-red-500")} />
            <span className={cn(realtimeStatus === "connected" ? "text-emerald-600" : realtimeStatus === "connecting" ? "text-amber-600" : "text-red-500")}>
              {realtimeStatus === "connected" ? "Live" : realtimeStatus === "connecting" ? "Connecting" : "Offline"}
            </span>
          </span>
          <Button variant="secondary" size="sm" onClick={loadSubscriptions}><RefreshCw size={13} className="mr-1.5" />Refresh</Button>
          <Button variant="primary" size="sm" onClick={openAddSub} className="bg-black border-black hover:bg-zinc-800 text-white shadow-lg shadow-black/10"><Plus size={14} className="mr-1.5" />Add Subscription</Button>
        </div>
      }
    >
      <div className="flex flex-col">
        <div className="space-y-5">

        {/* Tab switcher */}
        <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5 w-fit">
          {([["subscriptions", "Subscriptions", CreditCard], ["assignments", "Assignments", Users]] as const).map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                activeTab === tab ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
              <Icon size={13} />
              {label}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-black",
                activeTab === tab ? "bg-theme-raised text-theme-fg" : "bg-theme-border text-theme-subtle")}>
                {tab === "subscriptions" ? subscriptions.length : allAssignments.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── SUBSCRIPTIONS TAB ── */}
        {activeTab === "subscriptions" && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                { label: "Monthly Cost", value: formatCurrency(totalMonthly), icon: IndianRupee, color: "text-red-600", bg: "bg-red-500/10" },
                { label: "Annual Commit", value: formatCurrency(totalAnnual), icon: Calendar, color: "text-theme-fg", bg: "bg-theme-raised" },
                { label: "Active Tools", value: activeCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                { label: "Expiring Soon", value: expiringCount, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-500/10" },
                { label: "Total Seats", value: `${assignedSeats}/${totalSeats}`, icon: Users, color: "text-sky-600", bg: "bg-sky-500/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="page-card flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}><Icon size={15} className={color} /></div>
                  <div><p className="text-[11px] text-theme-muted">{label}</p><p className={cn("text-xl font-black leading-tight", color)}>{value}</p></div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="page-card overflow-hidden p-0">
              <div className="flex flex-col gap-3 border-b border-theme-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5 flex-wrap">
                  {["all", "active", "expiring", "trial", "inactive", "cancelled"].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-all capitalize",
                        filterStatus === s ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
                      {s === "all" ? "All" : STATUS_STYLES[s]?.label || s}
                    </button>
                  ))}
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={13} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools…"
                    className="h-8 w-48 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs text-theme-fg outline-none focus:border-theme-strong transition-all" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                      <th className="px-5 py-3 font-semibold">Tool</th>
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-5 py-3 font-semibold">Billing</th>
                      <th className="px-5 py-3 font-semibold">Seats</th>
                      <th className="px-5 py-3 font-semibold">Monthly Cost</th>
                      <th className="px-5 py-3 font-semibold">Renewal</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Assigned</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-5 py-3"><div className="h-3 rounded bg-theme-raised" /></td>)}
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={9} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-theme-raised"><CreditCard size={20} className="text-theme-subtle" /></div>
                          <p className="text-sm text-theme-subtle">{search ? "No tools match your search" : "No subscriptions yet"}</p>
                          {!search && <button onClick={openAddSub} className="flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-xs font-bold text-white hover:bg-zinc-900 transition-colors shadow-md"><Plus size={12} />Add First Subscription</button>}
                        </div>
                      </td></tr>
                    ) : filtered.map(s => {
                      const days = daysUntilRenewal(s.renewal_date);
                      const st = STATUS_STYLES[s.status] || STATUS_STYLES.inactive;
                      const mc = monthlyCost(s);
                      const assigns = s.subscription_assignments || [];
                      const usedSeats = assigns.reduce((t, a) => t + a.seats_allocated, 0);
                      return (
                        <tr key={s.id} className="group transition-colors hover:bg-theme-raised/40">
                          {/* Tool */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-black uppercase",
                                CATEGORY_COLORS[s.category]?.replace("text-", "bg-").replace("bg-", "bg-") || "bg-theme-raised text-theme-muted",
                                CATEGORY_COLORS[s.category] || "")}>
                                {s.name.slice(0, 2)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-theme-fg">{s.name}</p>
                                  {s.website_url && <a href={s.website_url} target="_blank" rel="noreferrer" className="text-theme-subtle hover:text-sky-500 transition-colors"><ExternalLink size={10} /></a>}
                                </div>
                                <p className="text-[10px] text-theme-subtle font-mono">{s.sub_number}</p>
                              </div>
                            </div>
                          </td>
                          {/* Category */}
                          <td className="px-5 py-3">
                            <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold", CATEGORY_COLORS[s.category] || "bg-theme-raised text-theme-muted")}>
                              <Tag size={9} />{s.category}
                            </span>
                          </td>
                          {/* Billing */}
                          <td className="px-5 py-3">
                            <p className="text-xs font-semibold text-theme-fg">{s.billing_cycle}</p>
                            <p className="text-[10px] text-theme-subtle">{formatCurrency(s.cost_per_seat)}/seat</p>
                          </td>
                          {/* Seats */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16">
                                <div className="h-1.5 rounded-full bg-theme-raised overflow-hidden">
                                  <div className={cn("h-full rounded-full transition-all",
                                    usedSeats / s.total_seats >= 0.9 ? "bg-red-500" : usedSeats / s.total_seats >= 0.7 ? "bg-amber-500" : "bg-emerald-500")}
                                    style={{ width: `${Math.min(100, (usedSeats / s.total_seats) * 100)}%` }} />
                                </div>
                              </div>
                              <span className="text-[11px] text-theme-muted font-mono">{usedSeats}/{s.total_seats}</span>
                            </div>
                          </td>
                          {/* Monthly Cost */}
                          <td className="px-5 py-3 text-sm font-bold text-red-500">
                            {mc > 0 ? `−${formatCurrency(mc, s.currency)}` : <span className="text-theme-subtle text-xs">One-time</span>}
                          </td>
                          {/* Renewal */}
                          <td className="px-5 py-3">
                            {s.renewal_date ? (
                              <div>
                                <p className={cn("text-xs font-semibold", days !== null && days <= 30 ? "text-red-500" : days !== null && days <= 60 ? "text-amber-600" : "text-theme-fg")}>
                                  {formatDate(s.renewal_date)}
                                </p>
                                {days !== null && days >= 0 && <p className={cn("text-[10px]", days <= 30 ? "text-red-400" : days <= 60 ? "text-amber-500" : "text-theme-subtle")}>{days}d left</p>}
                                {days !== null && days < 0 && <p className="text-[10px] text-red-500">Overdue</p>}
                              </div>
                            ) : <span className="text-[11px] text-theme-subtle">—</span>}
                          </td>
                          {/* Status */}
                          <td className="px-5 py-3">
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", st.bg, st.text)}>
                              {s.status === "active" ? <CheckCircle size={9} /> : s.status === "expiring" ? <AlertCircle size={9} /> : s.status === "trial" ? <Zap size={9} /> : <Clock size={9} />}
                              {st.label}
                            </span>
                          </td>
                          {/* Assigned */}
                          <td className="px-5 py-3">
                            {assigns.length > 0 ? (
                              <div className="flex items-center -space-x-1">
                                {assigns.slice(0, 3).map(a => (
                                  <div key={a.id} title={a.employees?.name || a.department_name || a.teams?.name || ""}
                                    className={cn("flex h-6 w-6 items-center justify-center rounded-full border-2 border-theme-surface text-[9px] font-black uppercase",
                                      a.assignment_type === "employee" ? "bg-sky-500/20 text-sky-600" : a.assignment_type === "team" ? "bg-purple-500/20 text-purple-600" : "bg-emerald-500/20 text-emerald-600")}>
                                    {(a.employees?.name || a.department_name || a.teams?.name || "?").slice(0, 2)}
                                  </div>
                                ))}
                                {assigns.length > 3 && <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-theme-surface bg-theme-raised text-[9px] font-black text-theme-muted">+{assigns.length - 3}</div>}
                              </div>
                            ) : <span className="text-[11px] text-theme-subtle">Unassigned</span>}
                          </td>
                          {/* Actions */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openAssign(s)} title="Assign access"
                                className="rounded p-1 text-theme-muted hover:bg-sky-500/10 hover:text-sky-600 transition-colors"><Users size={13} /></button>
                              {assigns.length > 0 && (
                                <button onClick={() => handleSendAccess(s.id, assigns.map(a => a.id))} title="Send access to all"
                                  disabled={assigns.some(a => sendingIds.has(a.id))}
                                  className="rounded p-1 text-theme-muted hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors disabled:opacity-40">
                                  {assigns.some(a => sendSuccess.has(a.id)) ? <MailCheck size={13} className="text-emerald-500" /> : <Send size={13} />}
                                </button>
                              )}
                              <button onClick={() => openEditSub(s)} title="Edit"
                                className="rounded p-1 text-theme-muted hover:bg-amber-500/10 hover:text-amber-600 transition-colors"><Pencil size={13} /></button>
                              <button onClick={() => setConfirmDelete(s)} disabled={deletingId === s.id} title="Delete"
                                className="rounded p-1 text-theme-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
                <span className="text-xs text-theme-subtle">{filtered.length} subscription{filtered.length !== 1 ? "s" : ""}</span>
                <span className="text-xs text-theme-subtle">Monthly total: <span className="font-bold text-theme-fg">{formatCurrency(filtered.filter(s => s.status !== "cancelled").reduce((t, s) => t + monthlyCost(s), 0))}</span></span>
              </div>
            </div>
          </>
        )}

        {/* ── ASSIGNMENTS TAB ── */}
        {activeTab === "assignments" && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total Assignments", value: allAssignments.length, icon: Users, color: "text-theme-fg", bg: "bg-theme-raised" },
                { label: "Seats Assigned", value: assignedSeats, icon: Shield, color: "text-sky-600", bg: "bg-sky-500/10" },
                { label: "Emails Sent", value: allAssignments.filter(a => a.credentials_sent).length, icon: MailCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                { label: "Pending Send", value: allAssignments.filter(a => !a.credentials_sent).length, icon: Mail, color: "text-amber-600", bg: "bg-amber-500/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="page-card flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}><Icon size={15} className={color} /></div>
                  <div><p className="text-[11px] text-theme-muted">{label}</p><p className={cn("text-xl font-black leading-tight", color)}>{value}</p></div>
                </div>
              ))}
            </div>

            <div className="page-card overflow-hidden p-0">
              <div className="border-b border-theme-border px-5 py-4 flex items-center justify-between">
                <p className="text-sm font-black text-theme-fg">All Assignments</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme-border bg-theme-page text-left text-xs text-theme-muted">
                      <th className="px-5 py-3 font-semibold">Subscription</th>
                      <th className="px-5 py-3 font-semibold">Assigned To</th>
                      <th className="px-5 py-3 font-semibold">Target</th>
                      <th className="px-5 py-3 font-semibold">Seats</th>
                      <th className="px-5 py-3 font-semibold">Access Email</th>
                      <th className="px-5 py-3 font-semibold">Credentials</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {allAssignments.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-sm text-theme-subtle">No assignments yet — assign tools from the Subscriptions tab</td></tr>
                    ) : allAssignments.map(a => {
                      const sub = (a as typeof a & { subscription: Subscription }).subscription;
                      const isSending = sendingIds.has(a.id);
                      const isSent = sendSuccess.has(a.id);
                      return (
                        <tr key={a.id} className="group transition-colors hover:bg-theme-raised/40">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black uppercase", CATEGORY_COLORS[sub.category] || "bg-theme-raised text-theme-muted")}>
                                {sub.name.slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-theme-fg">{sub.name}</p>
                                <p className="text-[10px] text-theme-subtle font-mono">{sub.sub_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                              a.assignment_type === "employee" ? "bg-sky-500/10 text-sky-600" : a.assignment_type === "team" ? "bg-purple-500/10 text-purple-600" : "bg-emerald-500/10 text-emerald-600")}>
                              {a.assignment_type === "employee" ? <User size={9} /> : <Building2 size={9} />}
                              {a.assignment_type.charAt(0).toUpperCase() + a.assignment_type.slice(1)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {a.assignment_type === "employee" && a.employees ? (
                              <div>
                                <p className="text-xs font-semibold text-theme-fg">{a.employees.name}</p>
                                <p className="text-[10px] text-theme-subtle">{a.employees.designation} · {a.employees.department}</p>
                              </div>
                            ) : a.assignment_type === "team" && a.teams ? (
                              <p className="text-xs font-semibold text-theme-fg">{a.teams.name}</p>
                            ) : (
                              <p className="text-xs font-semibold text-theme-fg">{a.department_name || "—"}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs font-mono text-theme-muted">{a.seats_allocated}</td>
                          <td className="px-5 py-3 text-xs text-theme-muted truncate max-w-[160px]">{a.access_email || "—"}</td>
                          <td className="px-5 py-3">
                            {a.credentials_sent ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600"><MailCheck size={9} />Sent</span>
                                {a.sent_at && <p className="text-[9px] text-theme-subtle">{formatDate(a.sent_at)}</p>}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600"><Clock size={9} />Pending</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleSendAccess(a.subscription_id, [a.id])} disabled={isSending} title="Send access email"
                                className="rounded p-1 text-theme-muted hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors disabled:opacity-40">
                                {isSent ? <MailCheck size={13} className="text-emerald-500" /> : isSending ? <Send size={13} className="animate-pulse" /> : <Send size={13} />}
                              </button>
                              <button onClick={() => setConfirmDeleteAssign(a)} disabled={deletingId === a.id} title="Remove assignment"
                                className="rounded p-1 text-theme-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-5 py-2.5">
                <span className="text-xs text-theme-subtle">{allAssignments.length} assignment{allAssignments.length !== 1 ? "s" : ""}</span>
                <span className="text-xs text-theme-subtle">{allAssignments.filter(a => a.credentials_sent).length} credentials sent</span>
              </div>
            </div>
          </>
        )}
        </div> {/* Closes space-y-5 */}

      {/* ══════════════════════════════════════════════════════════════════
          ADD / EDIT SUBSCRIPTION MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-[76vw] max-h-[88vh] flex flex-col rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

            {/* ── Modal Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-theme-border px-6 py-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border",
                  editingSub ? "bg-amber-500/10 border-amber-200/50" : "bg-theme-raised border-theme-border")}>
                  {editingSub ? <Pencil size={17} className="text-amber-600" /> : <CreditCard size={17} className="text-theme-muted" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-theme-fg leading-none">
                    {editingSub ? "Edit Subscription" : "Add Subscription"}
                  </h3>
                  <p className="text-[10px] text-theme-subtle mt-1">
                    {editingSub ? `${editingSub.sub_number} · ${editingSub.name}` : "Register a new SaaS tool or license"}
                  </p>
                </div>
              </div>
              <button onClick={closeSubModal} className="rounded-xl p-2 text-theme-muted hover:bg-theme-raised transition-all"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* ── Authorization Strip (new subscriptions only) ───────────── */}
              {!editingSub && (
                <div className={cn("px-6 py-4 border-b border-theme-border transition-colors",
                  subForm.filed_by_uuid ? "bg-emerald-500/[0.04]" : "bg-theme-raised/40")}>
                  <div className="flex items-center gap-4">
                    <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                      subForm.filed_by_uuid ? "bg-emerald-500 text-white" : "bg-theme-raised text-theme-muted border border-theme-border")}>
                      {subForm.filed_by_uuid ? <CheckCircle2 size={15} /> : <Shield size={14} />}
                    </div>

                    {!subForm.filed_by_uuid ? (
                      <div className="flex-1 min-w-0 relative" ref={empFormDropRef}>
                        <div className="relative">
                          <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                          <input value={empFormSearch} onFocus={() => setShowEmpFormDrop(true)}
                            onChange={e => { setEmpFormSearch(e.target.value); setShowEmpFormDrop(true); }}
                            placeholder="Select initiating personnel from registry to authorize…"
                            className="w-full h-9 rounded-lg border border-theme-border bg-theme-page pl-8 pr-3 text-xs font-semibold text-theme-fg outline-none focus:border-theme-strong transition-all placeholder:font-normal placeholder:text-theme-subtle" />
                        </div>
                        {showEmpFormDrop && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-theme-border bg-theme-surface shadow-2xl p-1 animate-in slide-in-from-top-2 duration-200">
                            {filteredEmpForm.length === 0 ? (
                              <div className="px-4 py-6 text-center"><p className="text-xs text-theme-muted">No registered personnel found</p></div>
                            ) : filteredEmpForm.map(e => (
                              <button key={e.id} onClick={() => {
                                setSubForm(f => ({ ...f, filed_by_emp_id: e.employee_id, filed_by_name: e.name, filed_by_dept: e.department, filed_by_desig: e.designation, filed_by_uuid: e.id }));
                                setShowEmpFormDrop(false); setEmpFormSearch("");
                              }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-theme-raised text-left transition-colors group">
                                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-theme-raised text-[10px] font-black text-theme-muted group-hover:bg-theme-primary group-hover:text-theme-surface transition-colors">
                                  {e.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-theme-fg truncate">{e.name}</p>
                                  <p className="text-[10px] text-theme-muted font-mono">{e.employee_id} · {e.department}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Authorized</span>
                            <span className="text-[10px] text-theme-subtle font-mono">{subForm.filed_by_emp_id}</span>
                          </div>
                          <p className="text-sm font-bold text-theme-fg leading-tight truncate">{subForm.filed_by_name}</p>
                          <p className="text-[10px] text-theme-muted">{subForm.filed_by_desig} · {subForm.filed_by_dept}</p>
                        </div>
                        <button onClick={() => setSubForm(f => ({ ...f, filed_by_emp_id: "", filed_by_name: "", filed_by_dept: "", filed_by_desig: "", filed_by_uuid: "" }))}
                          className="ml-auto flex-shrink-0 text-[10px] font-bold text-theme-muted hover:text-red-500 transition-colors uppercase tracking-wide">
                          Change
                        </button>
                      </div>
                    )}

                    <p className={cn("flex-shrink-0 text-[10px] font-semibold", subForm.filed_by_uuid ? "text-emerald-600" : "text-theme-subtle")}>
                      {subForm.filed_by_uuid ? "Ready to save" : "Required to proceed"}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Form Body ─────────────────────────────────────────────── */}
              <div className={cn("p-6 transition-all duration-300",
                !editingSub && !subForm.filed_by_uuid ? "opacity-40 pointer-events-none select-none" : "opacity-100")}>
                <div className="grid grid-cols-2 gap-7">

                  {/* ── LEFT: Tool Identity ─────────────────────────────── */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-1.5">
                      <Layers size={10} />Tool Identity
                    </p>

                    {/* Name with preset dropdown */}
                    <div>
                      <FLabel>Tool / Service Name *</FLabel>
                      <div className="relative" ref={toolDropRef}>
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                        <input value={toolSearch} onFocus={() => setShowToolDrop(true)}
                          onChange={e => { setToolSearch(e.target.value); setSubForm(f => ({ ...f, name: e.target.value })); setShowToolDrop(true); }}
                          placeholder="Search presets or type custom name…"
                          className="w-full rounded-lg border border-theme-border bg-theme-page pl-9 pr-8 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all placeholder:text-theme-subtle" />
                        {toolSearch && (
                          <button onClick={() => { setToolSearch(""); setSubForm(f => ({ ...f, name: "" })); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-fg transition-colors"><X size={13} /></button>
                        )}
                        {showToolDrop && (
                          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-xl border border-theme-border bg-theme-surface shadow-xl">
                            {toolSearch && !PRESET_TOOLS.find(t => t.name.toLowerCase() === toolSearch.toLowerCase()) && (
                              <button onClick={() => { setSubForm(f => ({ ...f, name: toolSearch })); setShowToolDrop(false); }}
                                className="flex w-full items-center gap-2 border-b border-theme-border px-4 py-2.5 hover:bg-theme-raised transition-colors">
                                <Plus size={11} className="text-sky-500" />
                                <span className="text-xs text-sky-600 font-semibold">Use &ldquo;{toolSearch}&rdquo; as custom tool</span>
                              </button>
                            )}
                            {filteredPresets.map(t => (
                              <button key={t.name} onClick={() => {
                                setSubForm(f => ({ ...f, name: t.name, provider: t.provider, category: t.category, website_url: t.website }));
                                setToolSearch(t.name); setShowToolDrop(false);
                              }} className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-theme-raised transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black uppercase flex-shrink-0", CATEGORY_COLORS[t.category] || "bg-theme-raised text-theme-muted")}>
                                    {t.name.slice(0, 2)}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-xs font-semibold text-theme-fg">{t.name}</p>
                                    <p className="text-[10px] text-theme-muted">{t.provider}</p>
                                  </div>
                                </div>
                                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold flex-shrink-0", CATEGORY_COLORS[t.category] || "")}>{t.category}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Inline SaaS preview chip — shows once a name is selected */}
                      {subForm.name && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-theme-border bg-theme-raised/60 px-3 py-2">
                          <div className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-black uppercase", CATEGORY_COLORS[subForm.category] || "bg-theme-raised text-theme-muted")}>
                            {subForm.name.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-theme-fg truncate">{subForm.name}</p>
                            <p className="text-[10px] text-theme-muted truncate">{subForm.provider || "No provider set"}</p>
                          </div>
                          <span className={cn("flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold", CATEGORY_COLORS[subForm.category] || "bg-theme-raised text-theme-muted")}>
                            {subForm.category}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FLabel>Provider / Vendor</FLabel>
                        <div className="relative">
                          <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                          <FInput value={subForm.provider} onChange={v => setSubForm(f => ({ ...f, provider: v }))} placeholder="e.g. Anthropic" className="pl-9" />
                        </div>
                      </div>
                      <div>
                        <FLabel>Category</FLabel>
                        <FSelect value={subForm.category} onChange={v => setSubForm(f => ({ ...f, category: v }))}>
                          {SUB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </FSelect>
                      </div>
                    </div>

                    <div>
                      <FLabel>Website URL</FLabel>
                      <div className="relative">
                        <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                        <FInput value={subForm.website_url} onChange={v => setSubForm(f => ({ ...f, website_url: v }))} placeholder="https://…" className="pl-9" />
                      </div>
                    </div>

                    <div>
                      <FLabel>Status</FLabel>
                      <div className="flex gap-2 flex-wrap">
                        {(["active", "trial", "inactive", "cancelled"] as const).map(s => (
                          <button key={s} onClick={() => setSubForm(f => ({ ...f, status: s }))}
                            className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                              subForm.status === s
                                ? `${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].text} border-current`
                                : "border-theme-border text-theme-muted hover:text-theme-fg")}>
                            {STATUS_STYLES[s].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <FLabel>Notes</FLabel>
                      <div className="relative">
                        <StickyNote size={13} className="absolute left-3 top-3 text-theme-muted pointer-events-none" />
                        <textarea value={subForm.notes} onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Vendor notes, contract terms, special access instructions…" rows={3}
                          className="w-full rounded-lg border border-theme-border bg-theme-page pl-9 pr-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-strong transition-all resize-none placeholder:text-theme-subtle" />
                      </div>
                    </div>
                  </div>

                  {/* ── RIGHT: Billing & Cost Analysis ──────────────────── */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-1.5">
                      <CreditCard size={10} />Billing & Seats
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FLabel>Cost per Seat *</FLabel>
                        <div className="flex">
                          <select value={subForm.currency} onChange={e => setSubForm(f => ({ ...f, currency: e.target.value }))}
                            className="h-[38px] w-[72px] rounded-l-lg border border-theme-border border-r-0 bg-theme-raised px-2 text-xs font-bold text-theme-fg outline-none focus:border-theme-strong transition-all flex-shrink-0">
                            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                          </select>
                          <FInput type="number" value={subForm.cost_per_seat} onChange={v => setSubForm(f => ({ ...f, cost_per_seat: v }))} placeholder="0.00" className="rounded-l-none font-mono" />
                        </div>
                      </div>
                      <div>
                        <FLabel>Total Seats *</FLabel>
                        <div className="relative">
                          <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                          <FInput type="number" value={subForm.total_seats} onChange={v => setSubForm(f => ({ ...f, total_seats: v }))} placeholder="1" className="pl-9 font-mono" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <FLabel>Billing Cycle *</FLabel>
                      <div className="flex gap-2">
                        {BILLING_CYCLES.map(c => (
                          <button key={c} onClick={() => setSubForm(f => ({ ...f, billing_cycle: c }))}
                            className={cn("flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all text-center",
                              subForm.billing_cycle === c
                                ? "border-theme-primary bg-theme-primary/5 text-theme-primary"
                                : "border-theme-border text-theme-muted hover:border-theme-strong hover:text-theme-fg")}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <FLabel>Renewal Date</FLabel>
                      <div className="relative">
                        <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                        <FInput type="date" value={subForm.renewal_date} onChange={v => setSubForm(f => ({ ...f, renewal_date: v }))} className="pl-9" />
                      </div>
                    </div>

                    {/* Cost Analysis — visible as soon as cost + seats are entered */}
                    {subForm.cost_per_seat && subForm.total_seats && (
                      <div className="rounded-xl border border-theme-border bg-theme-page p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Cost Analysis</p>
                          <div className="relative">
                            <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)}
                              className="h-6 appearance-none rounded-md border border-theme-border bg-theme-raised pl-2 pr-6 text-[10px] font-bold text-theme-fg outline-none focus:border-theme-strong transition-all cursor-pointer">
                              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                            </select>
                            <ChevronDown size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-theme-muted" />
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          {(() => {
                            const base = CURRENCIES.find(c => c.code === subForm.currency) || { code: "INR", symbol: "₹" };
                            const target = CURRENCIES.find(c => c.code === displayCurrency) || { code: "INR", symbol: "₹" };
                            const rate = exchangeRates[displayCurrency] || 1;
                            const costPerSeatBase = Number(subForm.cost_per_seat) || 0;
                            const totalS = Number(subForm.total_seats) || 1;
                            const monthlyBase = subForm.billing_cycle === "Annual" ? (costPerSeatBase * totalS) / 12
                              : subForm.billing_cycle === "Quarterly" ? (costPerSeatBase * totalS) / 3
                              : subForm.billing_cycle === "One-time" ? 0
                              : costPerSeatBase * totalS;
                            const monthlyTarget = monthlyBase * rate;

                            return (
                              <>
                                <div className="flex justify-between text-theme-muted">
                                  <span>Unit Price</span>
                                  <span className="font-semibold text-theme-fg font-mono">{base.symbol}{costPerSeatBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-theme-muted">
                                  <span>Seats</span>
                                  <span className="font-semibold text-theme-fg">{totalS} × {subForm.billing_cycle}</span>
                                </div>

                                {displayCurrency !== subForm.currency && (
                                  <div className="rounded-lg bg-theme-raised p-2.5 text-[10px] space-y-1.5 border border-theme-border/50">
                                    <div className="flex justify-between text-theme-subtle">
                                      <span>FX Rate (Frankfurter)</span>
                                      <span className="font-mono font-semibold text-theme-muted">1 {base.code} = {rate.toFixed(4)} {target.code}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-theme-muted">Converted Monthly</span>
                                      <span className="font-bold text-theme-fg">{target.symbol}{monthlyTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-between items-center border-t border-theme-border pt-2.5 mt-1">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Monthly Commitment</span>
                                  <div className="text-right">
                                    {subForm.billing_cycle === "One-time"
                                      ? <span className="text-xs font-semibold text-theme-subtle">One-time only</span>
                                      : <span className="text-base font-black text-red-500">{base.symbol}{monthlyBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    }
                                    {subForm.billing_cycle !== "One-time" && <p className="text-[9px] font-bold text-theme-subtle uppercase">{base.code} / mo</p>}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        {loadingRates && <p className="text-[9px] text-sky-500 font-semibold animate-pulse">Fetching live rates…</p>}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div> {/* Closes flex-1 scroll container */}

            <div className="flex items-center justify-between border-t border-theme-border px-6 py-3.5 flex-shrink-0 bg-theme-page">
              <p className="text-[10px] text-theme-subtle">After saving, use Assign Access to grant tool access to employees or teams.</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={closeSubModal}>Cancel</Button>
                <Button variant="primary" size="sm" disabled={saving || !subFormValid} onClick={handleSaveSub}>
                  {saving ? "Saving…" : editingSub ? "Save Changes" : "Add Subscription"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ASSIGN ACCESS MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showAssignModal && assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-[60vw] max-h-[90vh] flex flex-col rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-theme-border px-7 py-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-200/50"><Users size={18} className="text-sky-600" /></div>
                <div>
                  <h3 className="text-sm font-black text-theme-fg">Assign Access</h3>
                  <p className="text-[10px] text-theme-muted mt-0.5">Grant access to <span className="font-bold text-sky-600">{assignTarget.name}</span> and send credentials via email</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn("flex items-center gap-2 rounded-xl px-3 py-1.5 border", CATEGORY_COLORS[assignTarget.category]?.replace("text-", "border-").replace("bg-", "border-").split(" ")[0] || "border-theme-border", CATEGORY_COLORS[assignTarget.category] || "bg-theme-raised text-theme-muted")}>
                  <span className="text-[10px] font-black uppercase tracking-wider">{assignTarget.sub_number}</span>
                  <span className="text-[10px]">·</span>
                  <span className="text-[10px] font-semibold">{assignTarget.total_seats} seats</span>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="rounded-lg p-1.5 text-theme-muted hover:bg-theme-raised transition-colors"><X size={16} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-7 space-y-6">
              {/* Assignment type toggle */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3">Assignment Scope</p>
                <div className="grid grid-cols-2 gap-3">
                  {([["dept_team", "Department / Team", Building2, "Assign to an entire dept or team — all members get access"], ["employee", "Specific Employee", User, "Grant access to a single employee only"]] as const).map(([type, label, Icon, desc]) => (
                    <button key={type} onClick={() => setAssignType(type)}
                      className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                        assignType === type ? "border-sky-500 bg-sky-500/5" : "border-theme-border hover:border-theme-strong")}>
                      <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl mt-0.5", assignType === type ? "bg-sky-500/10" : "bg-theme-raised")}>
                        <Icon size={16} className={assignType === type ? "text-sky-600" : "text-theme-muted"} />
                      </div>
                      <div>
                        <p className={cn("text-xs font-black", assignType === type ? "text-sky-600" : "text-theme-fg")}>{label}</p>
                        <p className="text-[11px] text-theme-muted mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dept/Team flow */}
              {assignType === "dept_team" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <FLabel>Department *</FLabel>
                      <FSelect value={assignDept} onChange={v => { setAssignDept(v); setAssignTeamId(""); }}>
                        <option value="">Select department…</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </FSelect>
                      {assignDept && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {employees.filter(e => e.department === assignDept).slice(0, 6).map(e => (
                            <div key={e.id} title={e.name} className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-[9px] font-black text-emerald-600 border border-emerald-200/60 uppercase">{e.name.slice(0, 2)}</div>
                          ))}
                          {employees.filter(e => e.department === assignDept).length > 6 && <span className="text-[10px] text-theme-muted self-center">+{employees.filter(e => e.department === assignDept).length - 6} more</span>}
                        </div>
                      )}
                    </div>
                    <div>
                      <FLabel>Team (optional)</FLabel>
                      <FSelect value={assignTeamId} onChange={setAssignTeamId}>
                        <option value="">All teams in dept</option>
                        {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </FSelect>
                    </div>
                  </div>
                  <div>
                    <FLabel>Access Email (required to send credentials)</FLabel>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                      <FInput value={assignAccessEmail} onChange={setAssignAccessEmail} placeholder="shared-access@company.com or team DL…" className="pl-9" />
                    </div>
                    <p className="mt-1 text-[10px] text-theme-subtle">For dept/team assignments use a shared inbox or distribution list. Individual employee credentials use their profile email.</p>
                  </div>
                </div>
              )}

              {/* Employee flow */}
              {assignType === "employee" && (
                <div ref={empDropRef} className="relative">
                  <FLabel>Select Employee *</FLabel>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                    <input value={assignEmpSearch} onFocus={() => setShowEmpDrop(true)}
                      onChange={e => { setAssignEmpSearch(e.target.value); setShowEmpDrop(true); }}
                      placeholder="Search employee name or ID…"
                      className="w-full rounded-lg border border-theme-border bg-theme-page pl-9 pr-3 py-2 text-sm text-theme-fg outline-none focus:border-blue-500 transition-all" />
                    {assignEmpSearch && <button onClick={() => { setAssignEmpSearch(""); setSelectedAssignEmp(null); setAssignEmpId(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-fg"><X size={13} /></button>}
                    {showEmpDrop && filteredEmpSearch.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-theme-border bg-theme-surface shadow-xl">
                        {filteredEmpSearch.map(e => (
                          <button key={e.id} onClick={() => { setSelectedAssignEmp(e); setAssignEmpId(e.id); setAssignEmpSearch(e.name); setShowEmpDrop(false); }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-theme-raised transition-colors">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/10 text-[10px] font-black text-sky-600 uppercase">{e.name.slice(0, 2)}</div>
                            <div className="text-left"><p className="text-xs font-bold text-theme-fg">{e.name}</p><p className="text-[10px] text-theme-muted">{e.employee_id} · {e.department}</p></div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedAssignEmp && (
                    <div className="mt-3 rounded-xl border border-sky-200/60 bg-sky-500/[0.03] p-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-[11px] font-black text-sky-600 uppercase">{selectedAssignEmp.name.slice(0, 2)}</div>
                      <div>
                        <p className="text-sm font-black text-theme-fg">{selectedAssignEmp.name}</p>
                        <p className="text-[11px] text-theme-muted">{selectedAssignEmp.designation} · {selectedAssignEmp.department}</p>
                        <p className="text-[10px] text-sky-600 font-mono mt-0.5">{selectedAssignEmp.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Seats + credentials */}
              <div className="grid grid-cols-3 gap-4">
                <div><FLabel>Seats Allocated</FLabel><div className="relative"><Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" /><FInput type="number" value={assignSeats} onChange={setAssignSeats} className="pl-9 font-mono" /></div></div>
                <div className="col-span-2"><FLabel>Access Login / Username</FLabel><div className="relative"><Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" /><FInput value={assignLogin} onChange={setAssignLogin} placeholder="login@company.com or username" className="pl-9" /></div></div>
              </div>
              <div><FLabel>Access Note (optional)</FLabel><div className="relative"><StickyNote size={13} className="absolute left-3 top-3 text-theme-muted pointer-events-none" /><textarea value={assignNote} onChange={e => setAssignNote(e.target.value)} placeholder="Any extra instructions, temp password, etc…" rows={2} className="w-full rounded-lg border border-theme-border bg-theme-page pl-9 pr-3 py-2 text-sm text-theme-fg outline-none focus:border-blue-500 transition-all resize-none placeholder:text-theme-subtle" /></div></div>

              {/* Email preview */}
              <div className="rounded-xl border border-theme-border bg-theme-page p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3 flex items-center gap-2"><Mail size={11} />Email Preview — who will receive access mail</p>
                <div className="space-y-2">
                  {assignType === "employee" && selectedAssignEmp && (
                    <div className="flex items-center gap-2 text-xs">
                      <MailCheck size={12} className="text-emerald-500 flex-shrink-0" />
                      <span className="font-semibold text-theme-fg">{selectedAssignEmp.name}</span>
                      <span className="text-theme-muted font-mono">→ {selectedAssignEmp.email}</span>
                    </div>
                  )}
                  {assignType === "dept_team" && assignDept && (
                    employees.filter(e => e.department === assignDept).slice(0, 5).map(e => (
                      <div key={e.id} className="flex items-center gap-2 text-xs">
                        <MailCheck size={12} className="text-emerald-500 flex-shrink-0" />
                        <span className="font-semibold text-theme-fg">{e.name}</span>
                        <span className="text-theme-muted font-mono">→ {e.email}</span>
                      </div>
                    ))
                  )}
                  {assignType === "dept_team" && assignDept && employees.filter(e => e.department === assignDept).length > 5 && (
                    <p className="text-[11px] text-theme-muted pl-5">+{employees.filter(e => e.department === assignDept).length - 5} more in dept</p>
                  )}
                  {((assignType === "dept_team" && !assignDept) || (assignType === "employee" && !selectedAssignEmp)) && (
                    <p className="text-[11px] text-theme-subtle">Select {assignType === "dept_team" ? "a department" : "an employee"} above to preview recipients</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-theme-border px-7 py-4 flex-shrink-0 bg-theme-page">
              <p className="text-[10px] text-theme-subtle">Credentials email uses your configured SMTP from Company Profile</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                <Button variant="secondary" size="sm" disabled={saving || !assignValid} onClick={handleSaveAssign}>{saving ? "Saving…" : "Save Assignment"}</Button>
                <Button variant="primary" size="sm" disabled={saving || !canSendEmail} onClick={() => handleSaveAssign(true)}>
                  <Send size={13} className="mr-1.5" />{saving ? "Saving…" : "Save & Send Access Email"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete subscription confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-16 bg-transparent" onClick={() => setConfirmDelete(null)}>
          <div className="flex items-center gap-4 rounded-2xl bg-theme-surface border border-theme-border shadow-2xl px-5 py-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10"><Trash2 size={17} className="text-red-500" /></div>
            <div className="mr-2">
              <p className="text-sm font-bold text-theme-fg leading-tight">Delete <span className="text-red-500">&ldquo;{confirmDelete.name}&rdquo;</span>?</p>
              <p className="text-[11px] text-theme-muted mt-0.5">All assignments will also be removed.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-theme-border bg-theme-page px-4 py-2 text-xs font-semibold text-theme-fg hover:bg-theme-raised transition-colors">Cancel</button>
              <button onClick={() => handleDeleteSub(confirmDelete)} disabled={deletingId === confirmDelete.id} className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
                {deletingId === confirmDelete.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete assignment confirmation */}
      {confirmDeleteAssign && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-16 bg-transparent" onClick={() => setConfirmDeleteAssign(null)}>
          <div className="flex items-center gap-4 rounded-2xl bg-theme-surface border border-theme-border shadow-2xl px-5 py-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10"><Trash2 size={17} className="text-red-500" /></div>
            <div className="mr-2">
              <p className="text-sm font-bold text-theme-fg leading-tight">Remove this assignment?</p>
              <p className="text-[11px] text-theme-muted mt-0.5">Access credentials already sent will not be revoked.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setConfirmDeleteAssign(null)} className="rounded-lg border border-theme-border bg-theme-page px-4 py-2 text-xs font-semibold text-theme-fg hover:bg-theme-raised transition-colors">Cancel</button>
              <button onClick={() => handleDeleteAssignment(confirmDeleteAssign)} disabled={deletingId === confirmDeleteAssign.id} className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
                {deletingId === confirmDeleteAssign.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardShell>
  );
}
