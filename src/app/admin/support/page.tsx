"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { cn, formatDate } from "@/lib/utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket, Clock, CheckCircle2, AlertCircle, Search, Filter,
  ChevronRight, X, Send, MessageSquare, Users, Loader2,
  ShieldAlert, ArrowUpRight, Eye, CornerDownRight, Zap, RefreshCw,
  UserCheck, ShieldCheck, Signal, Settings, Trash2, Building
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

// ─── Types ───────────────────────────────────────────────────
interface TicketRow {
  id: string; subject: string; description: string; category: string;
  priority: string; status: string; target_role: string;
  resolution_notes: string | null; created_at: string; updated_at: string; resolved_at: string | null;
  creator: { id: string; name: string; email: string; role: string; department: string | null; employee_id: string | null } | null;
  assignee: { id: string; name: string; email: string; role: string; department: string | null; employee_id: string | null } | null;
  resolver: { id: string; name: string; role: string } | null;
  linked_ticket_id: string | null;
  linked_ticket?: { 
    id: string; subject: string; status: string; priority: string; created_at: string;
    creator?: { id: string; name: string; role: string; department: string | null } | null;
  } | null;
}
interface ResponseRow {
  id: string; message: string; created_at: string; is_internal: boolean;
  sender: { id: string; name: string; role: string; department: string | null } | null;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-rose-500/10", text: "text-rose-500" },
  high:     { bg: "bg-amber-500/10", text: "text-amber-600" },
  medium:   { bg: "bg-sky-500/10",   text: "text-sky-600" },
  low:      { bg: "bg-zinc-500/10",  text: "text-zinc-500" },
};

const ROLES = [
  { id: "super_admin", label: "Super Admin" },
  { id: "manager",     label: "Department Lead" },
  { id: "lead",        label: "Team Lead" },
  { id: "hr",          label: "HR" },
  { id: "employee",    label: "Employee" },
  { id: "internship",  label: "Internship" },
];

const CATEGORIES = ["General", "Technical", "Payroll", "HR", "IT Support", "Compliance", "Other"];

function getInitials(n: string) { return n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2); }

const STATUS_LABELS: Record<string, string> = {
  open: "Open Request",
  in_progress: "Working on it",
  resolved: "Solved",
  closed: "Closed",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; iconBg: string; icon: any; border: string }> = {
  open: { bg: "bg-amber-500/10", text: "text-amber-500", iconBg: "bg-amber-500/20", icon: Ticket, border: "border-amber-500/20" },
  in_progress: { bg: "bg-blue-500/10", text: "text-blue-500", iconBg: "bg-blue-500/20", icon: Signal, border: "border-blue-500/20" },
  resolved: { bg: "bg-emerald-500/10", text: "text-emerald-500", iconBg: "bg-emerald-500/20", icon: CheckCircle2, border: "border-emerald-500/20" },
  closed: { bg: "bg-slate-500/10", text: "text-slate-500", iconBg: "bg-slate-500/20", icon: X, border: "border-slate-500/20" },
};

// ─── Main Page ───────────────────────────────────────────────
export default function AdminSupportPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  // State
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  
  // Routing Rules State
  const [showRules, setShowRules] = useState(false);
  const [routingRules, setRoutingRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({ category: "", target_role: "", target_department: "" });
  const [isSavingRule, setIsSavingRule] = useState(false);
  
  // Realtime Data
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Detail Drawer
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [responseText, setResponseText] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  
  // Re-assignment State
  const [reAssignRole, setReAssignRole] = useState("");
  const [reAssignDepartment, setReAssignDepartment] = useState("");
  const [reAssignTeam, setReAssignTeam] = useState("");
  const [reAssigneeId, setReAssigneeId] = useState("");
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [orgTeams, setOrgTeams] = useState<any[]>([]);

  const loadTickets = useCallback(async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({ userId: user.id, userRole: user.role, view: "all" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/support?${params}`);
      const json = await res.json();
      if (json.tickets) setTickets(json.tickets);
    } catch { showToast("Failed to load tickets", "error"); }
    finally { setLoading(false); }
  }, [user, statusFilter, showToast]);

  const loadEmployees = useCallback(async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, role, department, team_id, is_active")
        .eq("is_active", true);
      if (error) throw error;
      setEmployees(data || []);
    } catch (e) {
      console.error("Employee fetch failed:", e);
    } finally {
      setLoadingEmp(false);
      setIsSyncing(false);
    }
  }, []);

  const loadOrg = useCallback(async () => {
    const { data: teamsData } = await supabase.from("teams").select("id, name, type, parent_id");
    if (teamsData) setOrgTeams(teamsData);
  }, []);

  const loadRules = useCallback(async () => {
    const { data } = await supabase.from("support_routing_rules").select("*").order("created_at", { ascending: false });
    if (data) setRoutingRules(data);
  }, []);

  useEffect(() => { 
    loadTickets(); 
    loadEmployees();
    loadOrg();
  }, [loadTickets, loadEmployees, loadOrg]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel("admin_tickets_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => { loadTickets(); })
      .subscribe();
    
    const empCh = supabase.channel("admin_employees_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => { loadEmployees(); })
      .subscribe();

    const rulesCh = supabase.channel("admin_rules_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_routing_rules" }, () => { loadRules(); })
      .subscribe();

    return () => { 
      supabase.removeChannel(ch); 
      supabase.removeChannel(empCh);
      supabase.removeChannel(rulesCh);
    };
  }, [loadTickets, loadEmployees, loadRules]);

  // Load responses for selected ticket
  useEffect(() => {
    if (!selectedTicket) return;
    (async () => {
      try {
        const res = await fetch(`/api/support/responses?ticketId=${selectedTicket.id}`);
        const json = await res.json();
        
        const originMessage: ResponseRow = {
          id: "origin",
          message: selectedTicket.description || "Initial request transmitted without additional payload.",
          created_at: selectedTicket.created_at,
          sender: selectedTicket.creator,
          is_internal: false
        };

        if (json.responses) {
          setResponses([originMessage, ...json.responses]);
        } else {
          setResponses([originMessage]);
        }
        
        // Reset re-assign state
        setReAssignRole(selectedTicket.target_role || "");
        setReAssignDepartment("");
        setReAssignTeam("");
        setReAssigneeId(selectedTicket.assignee?.id || "");
      } catch { /* silent */ }
    })();

    // Real-time responses sync
    const ch = supabase.channel(`admin-responses-${selectedTicket.id}`)
      .on("postgres_changes", 
        { event: "INSERT", schema: "public", table: "ticket_responses", filter: `ticket_id=eq.${selectedTicket.id}` }, 
        async (payload) => {
          const { data, error } = await supabase
            .from("ticket_responses")
            .select("*, sender:employees(id, name, role, department)")
            .eq("id", payload.new.id)
            .single();
          if (data && !error) {
            setResponses(prev => prev.some(r => r.id === data.id) ? prev : [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [selectedTicket]);

  // Keyboard accessibility: ESC to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedTicket(null);
    };
    if (selectedTicket) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedTicket]);

  const handleTicketSelect = (ticket: TicketRow) => {
    setSelectedTicket(ticket);
    setPendingStatus(ticket.status);
    setResolveNotes(ticket.resolution_notes || "");
  };

  async function sendResponse() {
    if (!responseText.trim() || !selectedTicket || !user) return;
    setSending(true);
    try {
      await fetch("/api/support/responses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: selectedTicket.id, sender_id: user.id, message: responseText }),
      });
      setResponseText("");
      showToast("Response sent", "success");
    } catch { showToast("Failed to send", "error"); }
    finally { setSending(false); }
  }

  async function updateTicketStatus(newStatus: string) {
    if (!selectedTicket || !user) return;
    setResolving(true);
    try {
      const res = await fetch("/api/support", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ticket_id: selectedTicket.id, 
          status: newStatus, 
          resolution_notes: resolveNotes || null,
          resolved_by: user.id 
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.ticket) {
        setSelectedTicket({ ...selectedTicket, ...json.ticket });
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, ...json.ticket } : t));
      }
      showToast(`Status updated to ${STATUS_LABELS[newStatus] || newStatus}`, "success");
    } catch { showToast("Failed to update status.", "error"); }
    finally { setResolving(false); }
  }

  async function handleReAssign() {
    if (!selectedTicket || !reAssigneeId) return;
    setIsUpdatingAssignee(true);
    try {
      const res = await fetch("/api/support", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: selectedTicket.id, target_role: reAssignRole, assignee_id: reAssigneeId }),
      });
      if (!res.ok) throw new Error();
      showToast("Assignee re-calibrated successfully.", "success");
      loadTickets();
      // Update local state to reflect change immediately in drawer
      const newAssignee = employees.find(e => e.id === reAssigneeId);
      if (newAssignee) {
        setSelectedTicket(prev => prev ? { ...prev, target_role: reAssignRole, assignee: { ...newAssignee, email: '', employee_id: '' } } : null);
      }
    } catch { showToast("Re-assignment failed.", "error"); }
    finally { setIsUpdatingAssignee(false); }
  }

  const saveRule = async () => {
    if (!newRule.category || !newRule.target_role || !newRule.target_department) return showToast("Fill all rule fields", "error");
    setIsSavingRule(true);
    try {
      const { error } = await supabase.from("support_routing_rules").upsert({
        category: newRule.category,
        target_role: newRule.target_role,
        target_department: newRule.target_department
      }, { onConflict: 'category' });
      if (error) throw error;
      showToast("Routing rule saved", "success");
      loadRules();
      setNewRule({ category: "", target_role: "", target_department: "" });
    } catch (e: any) {
      showToast(e.message || "Failed to save rule", "error");
    } finally {
      setIsSavingRule(false);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase.from("support_routing_rules").delete().eq("id", id);
      if (error) throw error;
      showToast("Rule deleted", "success");
      loadRules();
    } catch {
      showToast("Failed to delete rule", "error");
    }
  };

  const filtered = tickets.filter(t => {
    if (search) {
      const q = search.toLowerCase();
      return t.subject.toLowerCase().includes(q) || t.creator?.name.toLowerCase().includes(q) || t.assignee?.name.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    if (reAssignRole) filtered = filtered.filter(e => e.role === reAssignRole);
    if (reAssignDepartment) {
      const dept = orgTeams.find(t => t.id === reAssignDepartment);
      if (dept) filtered = filtered.filter(e => e.department === dept.name);
    }
    if (reAssignTeam) filtered = filtered.filter(e => e.team_id === reAssignTeam);
    return filtered;
  }, [employees, reAssignRole, reAssignDepartment, reAssignTeam, orgTeams]);

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
  };

  const getDynamicAssignLabel = (roleId: string) => {
    if (!roleId) return "Assign To Personnel";
    if (roleId === 'super_admin') return "Show Admins are…";
    if (roleId === 'lead') return "Show Team Leads are…";
    if (roleId === 'manager') return "Show Dept Leads are…";
    return `Show ${ROLES.find(r=>r.id===roleId)?.label || roleId}s are…`;
  };

  return (
    <DashboardShell 
      moduleKey="support_admin" 
      title="Support Command Center" 
      subtitle="Administrative oversight and hierarchical ticket delegation."
      actions={
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest",
            isSyncing ? "border-amber-500/20 text-amber-500 bg-amber-500/5" : "border-emerald-500/20 text-emerald-500 bg-emerald-500/5"
          )}>
            <div className={cn("h-1.5 w-1.5 rounded-full", isSyncing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
            {isSyncing ? "Syncing Directory" : "Live Directory Sync"}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Tickets", value: stats.total, icon: Ticket, color: "text-theme-fg", bg: "bg-theme-raised" },
            { label: "Open", value: stats.open, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-500/10" },
            { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-sky-600", bg: "bg-sky-500/10" },
            { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-[11px] text-theme-muted font-bold uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className={cn("text-2xl font-black leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5 flex-wrap">
            {[
              { id: "all", label: "All" }, { id: "open", label: "Open" },
              { id: "in_progress", label: "In Progress" }, { id: "resolved", label: "Resolved" }, { id: "closed", label: "Closed" },
            ].map(t => (
              <button key={t.id} onClick={() => setStatusFilter(t.id)} className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-bold transition-all",
                statusFilter === t.id ? "bg-theme-surface text-theme-fg shadow-md border border-theme-border" : "text-theme-muted hover:text-theme-fg"
              )}>{t.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowRules(true)} className="h-10 px-4 border-theme-primary/30 text-theme-primary hover:bg-theme-primary/10">
              <Settings size={14} className="mr-2" /> Routing Rules
            </Button>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets or personnel…"
                className="pl-10 pr-4 py-2.5 rounded-xl border border-theme-border bg-theme-surface text-sm text-theme-fg placeholder:text-theme-muted focus:outline-none focus:border-theme-primary transition-all w-72 shadow-sm" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="page-card overflow-hidden p-0 border-theme-border shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page text-left text-[10px] font-black uppercase tracking-widest text-theme-muted">
                  <th className="px-6 py-4">Request Intel</th>
                  <th className="px-6 py-4">Origin (Raised By)</th>
                  <th className="px-6 py-4">Node (Assigned To)</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/50">
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 animate-pulse rounded bg-theme-raised w-full" /></td>
                  ))}</tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <Ticket size={48} className="text-theme-muted mb-4" />
                      <p className="text-sm font-black text-theme-fg">No Active Intercepts</p>
                      <p className="text-xs text-theme-muted mt-1">Adjust filters or standby for incoming requests.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(t => {
                  const ps = PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.medium;
                  return (
                    <tr key={t.id} className="group transition-all hover:bg-theme-primary/[0.02] cursor-pointer" onClick={() => handleTicketSelect(t)}>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-theme-fg line-clamp-1 group-hover:text-theme-primary transition-colors">{t.subject}</p>
                        <p className="text-[10px] text-theme-muted mt-1 font-bold">{t.category}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-theme-primary/10 text-theme-primary text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">{getInitials(t.creator?.name ?? "?")}</div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-theme-fg truncate">{t.creator?.name}</p>
                            <p className="text-[10px] text-theme-muted uppercase font-bold tracking-tighter truncate">{t.creator?.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-sky-500/10 text-sky-600 text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">{getInitials(t.assignee?.name ?? "?")}</div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-theme-fg truncate">{t.assignee?.name}</p>
                            <p className="text-[10px] text-theme-muted uppercase font-bold tracking-tighter truncate">{t.target_role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg", ps.bg, ps.text)}>{t.priority}</span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const style = STATUS_STYLES[t.status] || STATUS_STYLES.open;
                          return (
                            <Badge className={cn("text-[8px] px-2 h-5 font-black uppercase tracking-widest", style.bg, style.text, style.border)}>
                              {STATUS_LABELS[t.status] || t.status}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 rounded-xl hover:bg-theme-primary/10 text-theme-muted hover:text-theme-primary transition-all">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-theme-border bg-theme-page px-6 py-4">
            <span className="text-xs font-bold text-theme-muted">{filtered.length} Live Request{filtered.length !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                <AlertCircle size={14} /> {stats.open} Awaiting Action
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Detail Drawer */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1001] flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 35, stiffness: 400 }}
              className="w-full max-w-xl bg-theme-surface border-l border-theme-border h-full overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div className="sticky top-0 z-20 bg-theme-surface/95 backdrop-blur-md border-b border-theme-border px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-lg", PRIORITY_STYLES[selectedTicket.priority]?.bg)}>
                      <Ticket size={20} className={PRIORITY_STYLES[selectedTicket.priority]?.text} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-theme-fg">{selectedTicket.subject}</p>
                      <p className="text-[10px] text-theme-muted font-bold uppercase tracking-widest mt-1">{selectedTicket.category} · {selectedTicket.priority}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-xl hover:bg-theme-raised text-theme-muted transition-colors"><X size={20} /></button>
                </div>
              </div>

              <div className="p-6 space-y-8 flex-1">
                {/* Meta info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-theme-raised/40 border border-theme-border">
                    <p className="text-[10px] text-theme-muted uppercase tracking-widest font-black mb-2">Raised By</p>
                    <p className="text-xs font-black text-theme-fg">{selectedTicket.creator?.name}</p>
                    <p className="text-[10px] text-theme-muted uppercase tracking-tighter mt-0.5">{selectedTicket.creator?.department} · {selectedTicket.creator?.role}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-theme-raised/40 border border-theme-border">
                    <p className="text-[10px] text-theme-muted uppercase tracking-widest font-black mb-2">Currently Assigned To</p>
                    <p className="text-xs font-black text-theme-fg">{selectedTicket.assignee?.name}</p>
                    <p className="text-[10px] text-theme-muted uppercase tracking-tighter mt-0.5">{selectedTicket.target_role}</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-theme-page border border-theme-border shadow-inner-sm">
                  <p className="text-[10px] text-theme-muted uppercase tracking-widest font-black mb-3">Ticket Details</p>
                  <p className="text-sm text-theme-fg leading-relaxed whitespace-pre-wrap">{selectedTicket.description || "No description provided."}</p>
                </div>

                {/* Delegation Matrix (New Re-assignment Feature) */}
                <div className="p-5 rounded-2xl bg-theme-primary/[0.02] border border-theme-primary/10 space-y-4">
                   <p className="text-[10px] text-theme-primary uppercase tracking-widest font-black flex items-center gap-2">
                     <ShieldCheck size={14} /> Re-assign Ticket
                   </p>
                   <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-theme-muted uppercase tracking-tighter px-1">Department/Role</label>
                        <Select value={reAssignRole} onValueChange={(v) => { setReAssignRole(v); setReAssigneeId(""); }} disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}>
                          <SelectTrigger className="h-10 rounded-xl bg-theme-surface font-bold text-[11px] disabled:opacity-50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                             {ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-theme-muted uppercase tracking-tighter px-1">Target Department</label>
                        <Select value={reAssignDepartment || "none"} onValueChange={(v) => { setReAssignDepartment(v === "none" ? "" : v); setReAssignTeam(""); setReAssigneeId(""); }} disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}>
                          <SelectTrigger className="h-10 rounded-xl bg-theme-surface font-bold text-[11px] disabled:opacity-50"><SelectValue placeholder="All Departments" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">All Departments</SelectItem>
                            {orgTeams.filter(t => t.type === 'department').map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-theme-muted uppercase tracking-tighter px-1">Target Team</label>
                        <Select value={reAssignTeam || "none"} onValueChange={(v) => { setReAssignTeam(v === "none" ? "" : v); setReAssigneeId(""); }} disabled={!reAssignDepartment || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}>
                          <SelectTrigger className="h-10 rounded-xl bg-theme-surface font-bold text-[11px] disabled:opacity-50"><SelectValue placeholder={reAssignDepartment ? "All Teams" : "Select Dept First"} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">All Teams</SelectItem>
                            {orgTeams.filter(t => t.type === 'team' && t.parent_id === reAssignDepartment).map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-theme-muted uppercase tracking-tighter px-1">{getDynamicAssignLabel(reAssignRole)}</label>
                        <Select value={reAssigneeId} onValueChange={setReAssigneeId} disabled={!reAssignRole || loadingEmp || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}>
                          <SelectTrigger className="h-10 rounded-xl bg-theme-surface font-bold text-[11px] disabled:opacity-50" loading={loadingEmp}><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                             {filteredEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                   </div>
                   <Button 
                     size="sm" 
                     className="w-full h-10 rounded-xl bg-theme-primary text-theme-surface font-black uppercase tracking-widest text-[10px] shadow-lg shadow-theme-primary/10" 
                     onClick={handleReAssign} 
                     loading={isUpdatingAssignee}
                     disabled={reAssigneeId === selectedTicket.assignee?.id || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                   >
                     Update Assignee
                   </Button>
                </div>

                {/* Status Control */}
                 <div className="space-y-4 pt-4 border-t border-theme-border">
                  <div className="space-y-4">
                    <p className="text-[10px] text-theme-muted uppercase tracking-widest font-black">Status & Notes</p>
                    <div className="flex flex-col gap-3">
                       <label className="text-[9px] font-black text-theme-muted uppercase tracking-tighter px-1">Update Status</label>
                       <Select 
                        value={pendingStatus} 
                        onValueChange={setPendingStatus}
                        disabled={resolving || selectedTicket.status === 'closed' || selectedTicket.status === 'resolved'}
                       >
                         <SelectTrigger className="h-11 rounded-2xl bg-theme-surface font-bold text-xs disabled:opacity-50">
                           <SelectValue placeholder="Update Status..." />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="open">Open Request</SelectItem>
                           <SelectItem value="in_progress">Working on it</SelectItem>
                           <SelectItem value="resolved">Solved</SelectItem>
                           <SelectItem value="closed">Closed</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>

                    <textarea 
                      value={resolveNotes} 
                      onChange={e => setResolveNotes(e.target.value)} 
                      placeholder={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed' ? "This ticket is finalized." : "Add solution notes here…"}
                      disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                      className="w-full p-4 rounded-2xl border border-theme-border bg-theme-surface text-sm text-theme-fg placeholder:text-theme-muted focus:border-theme-primary shadow-inner min-h-[100px] resize-none disabled:opacity-50" 
                    />
                    
                    {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                      <Button 
                        variant={pendingStatus === 'resolved' ? "success" : "primary"}
                        className="w-full h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg" 
                        loading={resolving} 
                        onClick={() => updateTicketStatus(pendingStatus)}
                        disabled={selectedTicket.status === pendingStatus && resolveNotes === (selectedTicket.resolution_notes || "")}
                      >
                        {pendingStatus === 'resolved' ? (
                          <><CheckCircle2 size={14} className="mr-2" /> Mark as Solved</>
                        ) : (
                          <><RefreshCw size={14} className="mr-2" /> Update Status</>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Linked Ticket Context */}
                  {(() => {
                    const linked = Array.isArray(selectedTicket.linked_ticket) ? selectedTicket.linked_ticket[0] : selectedTicket.linked_ticket;
                    if (!linked) return null;
                    return (
                      <div className="p-5 rounded-2xl bg-theme-primary/5 border border-theme-primary/10 space-y-3">
                        <p className="text-[10px] text-theme-primary uppercase tracking-widest font-black flex items-center gap-2">
                          <Zap size={14} /> Linked Reference Intel
                        </p>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-theme-surface border border-theme-border shadow-sm">
                          <div>
                            <p className="text-xs font-black text-theme-fg">{linked.subject}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                              <p className="text-[9px] text-theme-muted font-bold uppercase tracking-tighter">
                                ID: #{linked.id?.slice(0, 8) || "N/A"} · Status: {linked.status}
                              </p>
                              <span className="text-[8px] text-theme-border">•</span>
                              <p className="text-[9px] text-theme-primary font-bold uppercase tracking-tighter">
                                By: {linked.creator?.name || "Unknown"}
                              </p>
                              <span className="text-[8px] text-theme-border">•</span>
                              <p className="text-[9px] text-theme-muted font-bold uppercase tracking-tighter">
                                {formatDate(linked.created_at)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[9px] font-black h-5 uppercase tracking-widest">
                            {linked.priority}
                          </Badge>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Conversation */}
                <div className="space-y-4 pt-4 border-t border-theme-border">
                  <p className="text-[10px] text-theme-muted uppercase tracking-widest font-black flex items-center gap-2">
                    <MessageSquare size={14} /> Chat Messages
                  </p>
                  <div className="space-y-4">
                    {responses.length === 0 ? (
                      <div className="py-12 text-center bg-theme-raised/20 rounded-2xl border border-theme-border/50 opacity-40">
                        <MessageSquare size={24} className="mx-auto text-theme-muted mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Active Communications</p>
                      </div>
                    ) : responses.map(r => (
                      <div key={r.id} className={cn("p-4 rounded-2xl border shadow-sm relative transition-all", 
                        r.id === "origin" ? "bg-theme-raised/40 border-theme-border/50 border-dashed" :
                        r.sender?.id === selectedTicket.creator?.id
                        ? "bg-theme-primary/[0.03] border-theme-primary/10 ml-0 mr-8"
                        : "bg-theme-surface border-theme-border ml-8 mr-0"
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                             <p className="text-[10px] font-black text-theme-fg">{r.sender?.name} <span className="text-theme-muted font-normal">· {r.sender?.role}</span></p>
                             {r.id === "origin" && (
                               <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black uppercase tracking-widest text-theme-primary border-theme-primary/30">Initial Request</Badge>
                             )}
                          </div>
                          <p className="text-[9px] text-theme-muted font-bold">{formatDate(r.created_at)}</p>
                        </div>
                        <p className="text-xs text-theme-fg leading-relaxed">{r.message}</p>
                      </div>
                    ))}
                  </div>
                  {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                     <div className="flex gap-2 sticky bottom-0 bg-theme-surface py-4">
                    <input value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Type a message…"
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendResponse()}
                      className="flex-1 px-4 py-3 rounded-xl border border-theme-border bg-theme-raised/30 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary shadow-inner" />
                    <Button size="sm" className="rounded-xl px-5 h-11 shadow-lg" loading={sending} onClick={sendResponse} disabled={!responseText.trim()}>
                      <Send size={16} />
                    </Button>
                  </div>
                   )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Routing Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-bg/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-theme-page border border-theme-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-theme-border bg-theme-raised/30 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black text-theme-fg">Routing Rules</h2>
                  <p className="text-[11px] text-theme-muted uppercase tracking-widest font-bold mt-1">Configure automated ticket forwarding by category</p>
                </div>
                <button onClick={() => setShowRules(false)} className="p-2 rounded-xl hover:bg-theme-raised text-theme-muted transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="p-5 rounded-2xl bg-theme-raised/50 border border-theme-border space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-theme-fg">Add New Rule</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-theme-muted font-bold uppercase tracking-widest">Reason / Category</label>
                      <input 
                        value={newRule.category} 
                        onChange={e => setNewRule(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g. Leave Extension"
                        className="w-full h-10 px-3 text-xs rounded-xl border border-theme-border bg-theme-surface text-theme-fg placeholder:text-theme-muted outline-none focus:border-theme-primary transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-theme-muted font-bold uppercase tracking-widest">Target Department</label>
                      <Select value={newRule.target_department} onValueChange={(v) => setNewRule(prev => ({ ...prev, target_department: v }))}>
                        <SelectTrigger className="h-10 text-xs bg-theme-surface border-theme-border"><SelectValue placeholder="Select Dept" /></SelectTrigger>
                        <SelectContent>
                          {orgTeams.filter(t => t.type === 'department').map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-theme-muted font-bold uppercase tracking-widest">Target Role</label>
                      <Select value={newRule.target_role} onValueChange={(v) => setNewRule(prev => ({ ...prev, target_role: v }))}>
                        <SelectTrigger className="h-10 text-xs bg-theme-surface border-theme-border"><SelectValue placeholder="Select Role" /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={saveRule} loading={isSavingRule} className="w-full text-xs h-10 font-bold">Save Routing Rule</Button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-theme-muted px-1">Active Rules</h3>
                  {routingRules.length === 0 ? (
                    <div className="p-6 text-center text-theme-muted text-xs italic bg-theme-raised/30 rounded-2xl border border-theme-border border-dashed">No rules configured. All categories require manual routing.</div>
                  ) : routingRules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-4 rounded-xl border border-theme-border bg-theme-raised/30">
                      <div>
                        <p className="text-sm font-black text-theme-fg mb-1">{rule.category}</p>
                        <p className="text-[10px] text-theme-muted font-bold flex items-center gap-2">
                          <Building size={10} /> {orgTeams.find(t => t.id === rule.target_department)?.name || 'Unknown'} 
                          <span className="opacity-50">•</span> 
                          <ShieldCheck size={10} /> {ROLES.find(r => r.id === rule.target_role)?.label || rule.target_role}
                        </p>
                      </div>
                      <button onClick={() => deleteRule(rule.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
