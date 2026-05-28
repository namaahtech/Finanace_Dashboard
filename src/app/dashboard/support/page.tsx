"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge, statusBadgeVariant } from "@/components/ui/BadgeLegacy";
import { Button } from "@/components/ui/ButtonLegacy";
import { useToast } from "@/components/ui/ToastLegacy";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { cn, formatDate } from "@/lib/utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket, Plus, Search, Filter, Clock, CheckCircle2, AlertCircle,
  ChevronRight, X, Send, MessageSquare, UserCheck, Loader2,
  Inbox, ShieldCheck, Zap, ArrowRight, Signal, RefreshCw, Building, Users
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────
interface TicketRow {
  id: string; subject: string; description: string; category: string;
  priority: string; status: string; target_role: string;
  resolution_notes: string | null; created_at: string; updated_at: string;
  creator: { id: string; name: string; role: string; department: string | null } | null;
  assignee: { id: string; name: string; role: string; department: string | null } | null;
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

const ROLES = [
  { id: "admin",     label: "Admin" },
  { id: "dept_lead", label: "Department Lead" },
  { id: "team_lead", label: "Team Lead" },
  { id: "employee",  label: "Employee" },
  { id: "intern",    label: "Intern" },
];

const PRIORITIES = ["low", "medium", "high", "critical"];

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

// ─── Main Hub ────────────────────────────────────────────────
export default function SupportHubPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState<"raise" | "solve">("raise");
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Realtime Employee List
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [orgTeams, setOrgTeams] = useState<any[]>([]);

  // Form State
  const [targetRole, setTargetRole] = useState("");
  const [targetDepartment, setTargetDepartment] = useState("");
  const [targetTeam, setTargetTeam] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [linkedTicketId, setLinkedTicketId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Routing Rules
  const [routingRules, setRoutingRules] = useState<any[]>([]);
  const [isRuleLocked, setIsRuleLocked] = useState(false);

  // UI States
  const [isFetchingRole, setIsFetchingRole] = useState(false);

  // Detail Modal
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [responseText, setResponseText] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/support?userId=${user.id}&userRole=${user.role}`);
      const json = await res.json();
      if (json.tickets) setTickets(json.tickets);
    } catch { showToast("Sync Error: Ticket list failed to refresh", "error"); }
    finally { setLoading(false); }
  }, [user, showToast]);

  const loadEmployees = useCallback(async (role?: string) => {
    setIsSyncing(true);
    try {
      let query = supabase
        .from("employees")
        .select("id, name, role, department, team_id, is_active")
        .eq("is_active", true);
      
      if (role) {
        query = query.eq("role", role);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (role) {
        // Merge or replace? For "Assign To" we just need the filtered list, 
        // but the main 'employees' state should probably hold everyone to avoid flickers.
        // However, the user specifically asked for "fetching" when clicking.
        setEmployees(data || []);
      } else {
        setEmployees(data || []);
      }
    } catch (e) {
      console.error("Employee fetch failed:", e);
    } finally {
      setLoadingEmp(false);
      setIsSyncing(false);
      setIsFetchingRole(false);
    }
  }, []);

  const loadOrg = useCallback(async () => {
    const { data: teamsData } = await supabase.from("teams").select("id, name, type, parent_id");
    if (teamsData) setOrgTeams(teamsData);
  }, []);

  const loadRules = useCallback(async () => {
    const { data } = await supabase.from("support_routing_rules").select("*");
    if (data) setRoutingRules(data);
  }, []);

  useEffect(() => {
    if (routingRules.length > 0 && orgTeams.length > 0) {
      const defaultRule = routingRules.find(r => r.category === category);
      if (defaultRule) {
        setTargetRole(defaultRule.target_role);
        setTargetDepartment(defaultRule.target_department || "");
        setIsRuleLocked(true);
      } else if (user?.role === 'employee') {
        const dept = orgTeams.find(t => t.name === user.department);
        if (dept) setTargetDepartment(dept.id);
      }
    }
  }, [routingRules, orgTeams, user, category]);

  useEffect(() => {
    if (user) {
      loadTickets();
      loadEmployees();
      loadOrg();
      loadRules();
      
      // REAL-TIME: Employees table subscription
      const empChannel = supabase.channel("realtime-employees-hub")
        .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => {
          console.log("Realtime: Employee list updating...");
          loadEmployees();
        })
        .subscribe();

      // REAL-TIME: Tickets table subscription
      const ticketChannel = supabase.channel("realtime-tickets-hub")
        .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
          loadTickets();
        })
        .subscribe();

      // REAL-TIME: Routing Rules subscription
      const rulesChannel = supabase.channel("realtime-rules-hub")
        .on("postgres_changes", { event: "*", schema: "public", table: "support_routing_rules" }, () => {
          loadRules();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(empChannel);
        supabase.removeChannel(ticketChannel);
        supabase.removeChannel(rulesChannel);
      };
    }
  }, [user, loadTickets, loadEmployees]);

  // REAL-TIME: Support Thread Sync
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel(`ticket-thread-${selectedTicket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_responses", filter: `ticket_id=eq.${selectedTicket.id}` },
        async (payload) => {
          // Fetch the full sender info because the payload only has sender_id
          const { data: responseData, error } = await supabase
            .from("ticket_responses")
            .select("*, sender:employees(id, name, role, department)")
            .eq("id", payload.new.id)
            .single();
          
          if (responseData && !error) {
            setResponses(prev => {
              if (prev.some(r => r.id === responseData.id)) return prev;
              return [...prev, responseData];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  // Handle role change with actual database fetch to satisfy "realtime fetching" requirement
  const handleRoleChange = (val: string) => {
    setTargetRole(val);
    setAssigneeId("");
    setIsFetchingRole(true);
    loadEmployees(val);
  };

  const handleTicketSelect = async (ticket: TicketRow) => {
    setSelectedTicket(ticket);
    setPendingStatus(ticket.status);
    setResolveNotes(ticket.resolution_notes || "");
    setResponses([]); // Reset while loading
    
    // Create a "Virtual" first message from the description
    const originMessage: ResponseRow = {
      id: "origin",
      message: ticket.description || "No description provided.",
      created_at: ticket.created_at,
      sender: ticket.creator,
      is_internal: false
    };

    try {
      const res = await fetch(`/api/support/responses?ticketId=${ticket.id}`);
      const json = await res.json();
      if (json.responses) {
        setResponses([originMessage, ...json.responses]);
      } else {
        setResponses([originMessage]);
      }
    } catch (err) {
      console.error("Failed to load thread responses:", err);
      setResponses([originMessage]);
    }
  };

  async function sendResponse() {
    if (!responseText.trim() || !selectedTicket || !user) return;
    setSending(true);
    try {
      const res = await fetch("/api/support/responses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: selectedTicket.id, sender_id: user.id, message: responseText }),
      });
      if (!res.ok) throw new Error();
      setResponseText("");
      showToast("Response transmitted.", "success");
    } catch { showToast("Failed to transmit response.", "error"); }
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

  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    if (targetRole) filtered = filtered.filter(e => e.role === targetRole);
    if (targetDepartment) {
      const dept = orgTeams.find(t => t.id === targetDepartment);
      if (dept) filtered = filtered.filter(e => e.department === dept.name);
    }
    if (targetTeam) filtered = filtered.filter(e => e.team_id === targetTeam);
    return filtered;
  }, [employees, targetRole, targetDepartment, targetTeam, orgTeams]);

  const raisedTickets = tickets.filter(t => t.creator?.id === user?.id);
  const assignedTickets = tickets.filter(t => t.assignee?.id === user?.id);

  async function handleSubmit() {
    if (!user || !assigneeId || !subject.trim()) {
      showToast("Please complete the required assignment fields.", "warning"); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          creator_id: user.id, 
          target_role: targetRole, 
          assignee_id: assigneeId, 
          subject, 
          description, 
          category, 
          priority,
          linked_ticket_id: linkedTicketId
        }),
      });
      if (!res.ok) throw new Error();
      showToast("Ticket transmitted to the secure node.", "success");
      setSubject(""); setDescription(""); setTargetRole(""); setTargetDepartment(""); setTargetTeam(""); setAssigneeId(""); setCategory("General"); setPriority("medium"); setLinkedTicketId(null);
      loadTickets();
    } catch { showToast("Transmission Failed: Server node unreachable.", "error"); }
    finally { setSubmitting(false); }
  }

  const getDynamicAssignLabel = (roleId: string) => {
    if (!roleId) return "Assign To Personnel";
    const role = ROLES.find(r => r.id === roleId);
    if (!role) return "Assign To Personnel";
    
    // Exact phrasing requested: "show admis are", "show your team leads are"
    if (roleId === 'admin') return "Show Admins are...";
    if (roleId === 'team_lead') return "Show your Team Leads are...";
    if (roleId === 'dept_lead') return "Show Department Leads are...";
    
    return `Show ${role.label}s are...`;
  };

  return (
    <DashboardShell 
      moduleKey="support_user" 
      title="Support Hub" 
      subtitle="Distributed hierarchical support matrix for real-time issue resolution."
      actions={
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
            isSyncing ? "border-amber-500/20 text-amber-500 bg-amber-500/5" : "border-emerald-500/20 text-emerald-500 bg-emerald-500/5"
          )}>
            <div className={cn("h-1.5 w-1.5 rounded-full", isSyncing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
            {isSyncing ? "Syncing Directory" : "Real-time Connected"}
          </div>
          <Button variant="outline" size="sm" onClick={() => { loadTickets(); loadEmployees(); }} className="h-8">
            <RefreshCw size={12} className={cn("mr-1.5", isSyncing && "animate-spin")} /> Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Tab Selection */}
        <div className="flex items-center gap-2 bg-theme-raised/30 p-1 rounded-2xl border border-theme-border w-fit">
          {[
            { id: "raise" as const, label: "Raise Ticket", icon: Plus, count: raisedTickets.length },
            { id: "solve" as const, label: "My Desk", icon: Inbox, count: assignedTickets.filter(t => t.status === "open" || t.status === "in_progress").length },
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id)} 
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all",
                activeTab === t.id 
                  ? "bg-theme-surface text-theme-fg shadow-xl border border-theme-border" 
                  : "text-theme-muted hover:text-theme-fg"
              )}
            >
              <t.icon size={14} className={activeTab === t.id ? "text-theme-primary" : ""} />
              {t.label}
              {t.count > 0 && (
                <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md ml-1", activeTab === t.id ? "bg-theme-primary text-white" : "bg-theme-raised text-theme-muted")}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "raise" && (
          <div className="grid lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Ticket Submission Form */}
            <div className="lg:col-span-2 space-y-5">
              <div className="page-card p-6 space-y-6 border-theme-strong/10 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20">
                      <Plus size={16} className="text-theme-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-theme-fg">Create Request</p>
                      <p className="text-[10px] text-theme-muted uppercase tracking-widest font-bold">Priority Workflow</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2 p-5 rounded-xl bg-theme-primary/[0.03] border border-theme-primary/10 shadow-inner">
                    <label className="text-[11px] font-black text-theme-primary uppercase tracking-widest flex items-center gap-2 px-1">
                      <Filter size={14} /> Step 1: Select Reason / Category
                    </label>
                    <Select value={category} onValueChange={(v) => {
                      setCategory(v);
                      const rule = routingRules.find(r => r.category === v);
                      if (rule) {
                        setTargetRole(rule.target_role);
                        setTargetDepartment(rule.target_department || "");
                        setTargetTeam("");
                        setAssigneeId("");
                        setIsRuleLocked(true);
                        loadEmployees(rule.target_role);
                      } else {
                        setIsRuleLocked(false);
                        if (user?.role === 'employee') {
                          setTargetDepartment(orgTeams.find(t => t.name === user.department)?.id || "");
                        }
                      }
                    }}>
                      <SelectTrigger className="w-full h-12 rounded-xl bg-theme-surface font-black border-theme-border text-sm shadow-sm">
                        <SelectValue placeholder="Select Reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {routingRules.length > 0 ? (
                          routingRules.map(r => <SelectItem key={r.id} value={r.category}>{r.category}</SelectItem>)
                        ) : (
                          <div className="px-3 py-6 text-center">
                            <p className="text-[10px] font-bold text-theme-muted italic">No categories defined by admin.</p>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-theme-muted uppercase tracking-widest flex items-center gap-2 px-1">
                        <ShieldCheck size={12} className="text-theme-primary" /> Target Role
                      </label>
                      <Select value={targetRole} onValueChange={handleRoleChange} disabled={isRuleLocked}>
                        <SelectTrigger className={cn("w-full h-11 rounded-xl border-theme-border font-bold", isRuleLocked ? "bg-theme-bg opacity-70" : "bg-theme-raised/30")}>
                          <SelectValue placeholder="Select target role…" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-3 py-2 border-b border-theme-border/50 mb-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted opacity-60 italic">Hierarchy Selection</p>
                          </div>
                          {ROLES.filter(r => {
                            if (isRuleLocked) return true;
                            if (user?.role === 'employee' || user?.role === 'intern') return r.id === 'dept_lead' || r.id === 'team_lead';
                            return r.id !== 'employee' && r.id !== 'intern';
                          }).map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-theme-muted uppercase tracking-widest flex items-center gap-2 px-1">
                        <Zap size={12} className="text-theme-primary" /> Link Reference (Secure UUID)
                      </label>
                      <Select value={linkedTicketId || "none"} onValueChange={(v) => setLinkedTicketId(v === "none" ? null : v)}>
                        <SelectTrigger className="w-full h-11 rounded-xl bg-theme-raised/30 border-theme-border font-bold text-xs">
                          <SelectValue placeholder="Link previous ticket (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Link (New Instance)</SelectItem>
                          {tickets.filter(t => t.creator?.id === user?.id).map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex flex-col py-1">
                                <span className="font-bold">#{t.id.slice(0, 8)} - {t.subject}</span>
                                <span className="text-[9px] opacity-60 uppercase">{t.status} · {formatDate(t.created_at)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-theme-muted uppercase tracking-widest flex items-center gap-2 px-1">
                          <Building size={12} className="text-theme-primary" /> Target Department
                        </label>
                        <Select value={targetDepartment || "none"} onValueChange={(v) => { setTargetDepartment(v === "none" ? "" : v); setTargetTeam(""); setAssigneeId(""); }} disabled={isRuleLocked || (user?.role === 'employee' && !isRuleLocked)}>
                          <SelectTrigger className={cn("w-full h-11 rounded-xl border-theme-border font-bold text-xs", (isRuleLocked || user?.role === 'employee') ? "bg-theme-bg opacity-70" : "bg-theme-raised/30")}>
                            <SelectValue placeholder="All Departments" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">All Departments</SelectItem>
                            {orgTeams.filter(t => t.type === 'department').map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-theme-muted uppercase tracking-widest flex items-center gap-2 px-1">
                          <Users size={12} className="text-theme-primary" /> Target Team
                        </label>
                        <Select value={targetTeam || "none"} onValueChange={(v) => { setTargetTeam(v === "none" ? "" : v); setAssigneeId(""); }} disabled={!targetDepartment}>
                          <SelectTrigger className="w-full h-11 rounded-xl bg-theme-raised/30 border-theme-border font-bold text-xs">
                            <SelectValue placeholder={targetDepartment ? "All Teams" : "Select Department First"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">All Teams</SelectItem>
                            {orgTeams.filter(t => t.type === 'team' && t.parent_id === targetDepartment).map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-theme-muted uppercase tracking-widest flex items-center gap-2 px-1">
                        <UserCheck size={12} className="text-emerald-500" /> {getDynamicAssignLabel(targetRole)}
                      </label>
                      <Select value={assigneeId} onValueChange={setAssigneeId} disabled={!targetRole || loadingEmp}>
                        <SelectTrigger className="w-full h-11 rounded-xl bg-theme-raised/30 border-theme-border font-bold">
                          <SelectValue placeholder={
                            loadingEmp 
                              ? "Connecting…" 
                              : targetRole 
                                ? `Searching ${ROLES.find(r=>r.id===targetRole)?.label}s…` 
                                : "Awaiting Role…"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-3 py-2 border-b border-theme-border/50 mb-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted opacity-60">Live Personnel Stream</p>
                          </div>
                          {filteredEmployees.length > 0 ? filteredEmployees.map(e => (
                            <SelectItem key={e.id} value={e.id}>
                              <div className="flex flex-col py-0.5">
                                <span className="text-[11px] font-black">{e.name}</span>
                                <span className="text-[9px] text-theme-muted font-normal uppercase tracking-tighter">{e.department || 'GLOBAL OPS'}</span>
                              </div>
                            </SelectItem>
                          )) : (
                            <div className="px-3 py-6 text-center">
                              <p className="text-[10px] font-bold text-theme-muted italic">No personnel found for this role.</p>
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-theme-muted uppercase tracking-widest flex items-center gap-2 px-1">
                      <Ticket size={12} className="text-sky-500" /> Issue Subject
                    </label>
                    <input 
                      value={subject} 
                      onChange={e => setSubject(e.target.value)} 
                      placeholder="Summary of the request…"
                      className="w-full h-11 rounded-xl border border-theme-border bg-theme-raised/30 px-4 text-sm font-bold text-theme-fg outline-none focus:border-theme-primary transition-all shadow-inner"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-theme-muted uppercase tracking-widest flex items-center gap-2 px-1">
                      <Zap size={12} className="text-amber-500" /> Priority
                    </label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="w-1/2 h-11 rounded-xl bg-theme-raised/30 font-bold border-theme-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-theme-muted uppercase tracking-widest flex items-center gap-2 px-1">
                      <MessageSquare size={12} className="text-theme-muted" /> Detailed Intel
                    </label>
                    <textarea 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      placeholder="Describe the issue in detail…"
                      className="w-full h-28 rounded-xl border border-theme-border bg-theme-raised/30 p-4 text-sm font-semibold text-theme-fg outline-none focus:border-theme-primary transition-all shadow-inner resize-none"
                    />
                  </div>

                  <Button 
                    className="w-full h-12 rounded-xl bg-theme-primary text-theme-surface font-black text-sm uppercase tracking-widest shadow-xl hover:shadow-theme-primary/20 transition-all group" 
                    onClick={handleSubmit} 
                    loading={submitting}
                  >
                    Raise Ticket <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>

              {/* Tips / Info */}
              <div className="p-4 rounded-xl bg-theme-primary/5 border border-theme-primary/20 flex gap-3">
                <AlertCircle size={18} className="text-theme-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-theme-fg leading-relaxed">
                  <span className="font-bold">Protocol Tip:</span> Assigning tickets to the correct <span className="italic font-bold">Target Role</span> ensures your request is triaged within the correct organizational hierarchy.
                </p>
              </div>
            </div>

            {/* List of My Raised Tickets */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between px-2">
                <p className="text-xs font-black text-theme-fg uppercase tracking-widest">My Active Requests</p>
                <Badge variant="secondary" className="text-[10px]">{raisedTickets.length} Total</Badge>
              </div>

              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-theme-raised/50 animate-pulse border border-theme-border/50" />
                  ))
                ) : raisedTickets.length === 0 ? (
                  <div className="py-20 text-center bg-theme-raised/20 rounded-2xl border-2 border-dashed border-theme-border/50">
                    <Ticket size={40} className="mx-auto text-theme-muted opacity-20 mb-3" />
                    <p className="text-xs font-bold text-theme-muted">No tickets raised yet.</p>
                  </div>
                ) : (
                  raisedTickets.map(t => {
                    const style = STATUS_STYLES[t.status] || STATUS_STYLES.open;
                    const StatusIcon = style.icon;
                    return (
                    <div 
                      key={t.id} 
                      onClick={() => handleTicketSelect(t)}
                      className="group p-4 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-primary/30 transition-all hover:shadow-lg cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center border transition-colors",
                          style.iconBg, style.border
                        )}>
                          <StatusIcon size={18} className={style.text} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-theme-fg truncate group-hover:text-theme-primary transition-colors">{t.subject}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cn("text-[8px] px-1.5 h-4 font-black uppercase tracking-widest", style.bg, style.text, style.border)}>
                              {STATUS_LABELS[t.status] || t.status}
                            </Badge>
                            <span className="text-[10px] text-theme-muted font-bold">Assigned to: <span className="text-theme-fg">{t.assignee?.name || 'Unassigned'}</span></span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-theme-muted font-bold uppercase tracking-tighter">{t.category}</p>
                          <p className="text-[9px] text-theme-muted mt-0.5">{formatDate(t.created_at)}</p>
                        </div>
                        <ChevronRight size={16} className="text-theme-muted group-hover:text-theme-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  )})
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "solve" && (
          <div className="animate-in fade-in slide-in-from-right-2 duration-300">
             <div className="grid lg:grid-cols-4 gap-6">
                <div className="lg:col-span-4 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-xs font-black text-theme-fg uppercase tracking-widest">Incoming Support Intel</p>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedTickets.length === 0 ? (
                      <div className="col-span-full py-32 text-center bg-theme-raised/20 rounded-3xl border-2 border-dashed border-theme-border/50">
                        <Inbox size={48} className="mx-auto text-theme-muted opacity-20 mb-4" />
                        <p className="text-sm font-black text-theme-muted">Your Support Desk is clear.</p>
                        <p className="text-xs text-theme-muted mt-1">No pending tickets assigned to your role.</p>
                      </div>
                    ) : (
                      assignedTickets.map(t => {
                        const style = STATUS_STYLES[t.status] || STATUS_STYLES.open;
                        return (
                        <div 
                          key={t.id} 
                          onClick={() => handleTicketSelect(t)}
                          className="page-card p-5 border-theme-border hover:border-theme-primary/40 transition-all group flex flex-col h-full bg-theme-surface shadow-md hover:shadow-xl"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <Badge className={cn("text-[8px] px-1.5 h-4 font-black uppercase tracking-widest", style.bg, style.text, style.border)}>
                              {STATUS_LABELS[t.status] || t.status}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                               <Zap size={10} fill="currentColor" /> {t.priority}
                            </div>
                          </div>
                          
                          <h4 className="text-sm font-black text-theme-fg line-clamp-2 mb-2 group-hover:text-theme-primary transition-colors h-10">{t.subject}</h4>
                          
                          <div className="mt-auto space-y-3">
                            <div className="p-2.5 rounded-xl bg-theme-raised/50 border border-theme-border/50 flex items-center gap-3">
                               <div className="h-7 w-7 rounded-lg bg-theme-primary text-theme-surface flex items-center justify-center text-[10px] font-black shadow-sm">
                                  {t.creator?.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                               </div>
                               <div className="min-w-0">
                                  <p className="text-[10px] font-black text-theme-fg truncate">{t.creator?.name}</p>
                                  <p className="text-[9px] text-theme-muted uppercase font-bold tracking-tighter truncate">{t.creator?.role}</p>
                                </div>
                             </div>
                             
                             <div className="flex items-center justify-between text-[10px] text-theme-muted pt-2 border-t border-theme-border/50">
                                <span className="font-bold uppercase tracking-tighter">{t.category}</span>
                                <span>{formatDate(t.created_at)}</span>
                             </div>
                           </div>
                         </div>
                       )})
                    )}
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* TICKET DETAIL DRAWER */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[1001] flex justify-end bg-black/40 backdrop-blur-sm" 
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 35, stiffness: 400 }}
              className="w-full max-w-xl bg-theme-surface border-l border-theme-border h-full overflow-y-auto shadow-2xl flex flex-col" 
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-theme-surface/95 backdrop-blur-md border-b border-theme-border px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-theme-primary text-theme-surface flex items-center justify-center shadow-lg shadow-theme-primary/20">
                      <Ticket size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-theme-fg leading-tight">{selectedTicket.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest">{selectedTicket.category}</Badge>
                        <span className="text-[10px] text-theme-muted font-bold">#{selectedTicket.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-xl hover:bg-theme-raised text-theme-muted transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-8 flex-1">
                {/* Meta info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-theme-raised/40 border border-theme-border">
                    <p className="text-[10px] text-theme-muted uppercase tracking-widest font-black mb-2">Requester Info</p>
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-full bg-theme-primary/10 text-theme-primary flex items-center justify-center text-[10px] font-black">{selectedTicket.creator?.name[0]}</div>
                       <div className="min-w-0">
                          <p className="text-xs font-black text-theme-fg truncate">{selectedTicket.creator?.name}</p>
                          <p className="text-[10px] text-theme-muted truncate uppercase tracking-tighter">{selectedTicket.creator?.role}</p>
                       </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-theme-raised/40 border border-theme-border">
                    <p className="text-[10px] text-theme-muted uppercase tracking-widest font-black mb-2">Primary Assignee</p>
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] font-black">{selectedTicket.assignee?.name?.[0] || '?'}</div>
                       <div className="min-w-0">
                          <p className="text-xs font-black text-theme-fg truncate">{selectedTicket.assignee?.name || 'Unassigned'}</p>
                          <p className="text-[10px] text-theme-muted truncate uppercase tracking-tighter">{selectedTicket.target_role}</p>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-theme-muted uppercase tracking-widest font-black flex items-center gap-2">
                    <Signal size={12} className="text-theme-primary" /> Ticket Details
                  </p>
                  <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border shadow-inner-sm">
                    <p className="text-sm text-theme-fg leading-relaxed whitespace-pre-wrap">{selectedTicket.description || "No supplemental details provided."}</p>
                  </div>
                </div>

                {selectedTicket.resolution_notes && (
                  <div className="p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 shadow-sm animate-in zoom-in-95">
                    <div className="flex items-center gap-2 mb-3">
                       <div className="h-6 w-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><CheckCircle2 size={12} /></div>
                       <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-black">Resolution Intel</p>
                    </div>
                    <p className="text-sm text-theme-fg leading-relaxed">{selectedTicket.resolution_notes}</p>
                  </div>
                )}

                {/* Status Control (Only for Assignee) */}
                {selectedTicket.assignee?.id === user?.id && (
                  <div className="space-y-4 pt-4 border-t border-theme-border">
                    <p className="text-[10px] text-theme-muted uppercase tracking-widest font-black">Status & Notes</p>
                    
                    <div className="flex flex-col gap-3">
                       <label className="text-[9px] font-black text-theme-muted uppercase tracking-tighter px-1">Update Status</label>
                       <Select 
                        value={pendingStatus} 
                        onValueChange={setPendingStatus}
                        disabled={resolving || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                       >
                         <SelectTrigger className="h-11 rounded-2xl bg-theme-surface font-bold text-xs">
                           <SelectValue placeholder="Change Status..." />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="open">Open Request</SelectItem>
                           <SelectItem value="in_progress">Working on it</SelectItem>
                           <SelectItem value="resolved">Solved</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>

                    <textarea 
                      value={resolveNotes} 
                      onChange={e => setResolveNotes(e.target.value)} 
                      placeholder={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed' ? "This ticket is closed." : "Add notes about the solution…"}
                      disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                      className="w-full p-4 rounded-2xl border border-theme-border bg-theme-surface text-sm text-theme-fg placeholder:text-theme-muted focus:border-theme-primary shadow-inner min-h-[100px] resize-none disabled:opacity-50" 
                    />
                    
                    {selectedTicket.status !== 'resolved' && (
                      <Button 
                        variant={pendingStatus === 'resolved' ? "success" : "primary"}
                        className="w-full rounded-2xl font-black text-[10px] uppercase tracking-widest h-11 shadow-lg" 
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
                )}

                {/* Linked Ticket Context */}
                {(() => {
                  const linked = Array.isArray(selectedTicket.linked_ticket) ? selectedTicket.linked_ticket[0] : selectedTicket.linked_ticket;
                  if (!linked) return null;
                  return (
                    <div className="p-5 rounded-2xl bg-theme-primary/5 border border-theme-primary/10 space-y-3">
                      <p className="text-[10px] text-theme-primary uppercase tracking-widest font-black flex items-center gap-2">
                        <Signal size={14} /> Linked Reference Intel
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

                {/* Conversation Thread */}
                <div className="space-y-4 pt-4 border-t border-theme-border">
                  <p className="text-[10px] text-theme-muted uppercase tracking-widest font-black flex items-center gap-2">
                    <MessageSquare size={12} /> Chat Messages
                  </p>
                  
                  <div className="space-y-4">
                    {responses.length === 0 ? (
                      <div className="py-10 text-center rounded-2xl bg-theme-raised/20 border border-theme-border/50">
                        <MessageSquare size={24} className="mx-auto text-theme-muted opacity-20 mb-2" />
                        <p className="text-[10px] font-bold text-theme-muted italic">No activity detected in the thread.</p>
                      </div>
                    ) : responses.map(r => (
                      <div 
                        key={r.id} 
                        className={cn(
                          "p-4 rounded-2xl border relative transition-all shadow-sm",
                          r.id === "origin" 
                            ? "bg-theme-raised/50 border-theme-border/50 border-dashed"
                            : r.sender?.id === user?.id 
                              ? "bg-theme-primary/5 border-theme-primary/20 ml-10" 
                              : "bg-theme-surface border-theme-border mr-10"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
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
                    <div className="flex gap-2 sticky bottom-0 bg-theme-surface pt-2 pb-6">
                      <input 
                        value={responseText} 
                        onChange={e => setResponseText(e.target.value)} 
                        placeholder="Type your message here…"
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendResponse()}
                        className="flex-1 px-4 py-3 rounded-xl border border-theme-border bg-theme-raised/30 text-xs font-bold text-theme-fg outline-none focus:border-theme-primary shadow-inner" 
                      />
                      <Button size="sm" className="rounded-xl px-5 h-10 shadow-lg" loading={sending} onClick={sendResponse} disabled={!responseText.trim()}>
                        <Send size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
