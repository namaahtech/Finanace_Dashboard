"use client";

import { useEffect, useState, useRef } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";
import { formatDate, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import {
  Users, UserPlus, Search, X, CreditCard, Building, UserCheck, UserX,
  ShieldCheck, FileText, Zap, CalendarDays, MoreVertical, Trash2, Edit2,
  RefreshCw, Mail, ChevronDown, Check, Clock, LayoutGrid, Coffee
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import dayjs from "dayjs";

interface TeamNode { 
  id: string; 
  name: string; 
  type: string; 
  parent_id: string | null;
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  department: string | null;
  team_id: string | null;
}

interface User {
  id: string; name: string; email: string; employeeId: string;
  role: string; department: string; designation: string;
  joiningDate: string; isActive: boolean;
  shift_id: string | null;
  team_id: string | null;
  monthly_leave_quota: number;
  employment_type: string;
  salary_structure: string;
  base_salary: number;
}

const ROLE_BADGE: Record<string, "default" | "info" | "success" | "purple" | "warning" | "danger"> = {
  employee: "default", hr: "info", lead: "success",
  super_admin: "purple", accounts: "warning", sales: "danger",
};
const ROLE_LABEL: Record<string, string> = {
  employee: "Employee", hr: "HR", lead: "Team Lead",
  super_admin: "Super Admin", accounts: "Accounts", sales: "Sales",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Custom Simple Dropdown ───────────────────────────────
function CustomSelect({ value, options, onChange, placeholder, icon, label }: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="space-y-2" ref={ref}>
      {label && <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-theme-muted">{icon}{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-[46px] w-full items-center justify-between rounded-2xl border border-theme-border bg-theme-page px-4 text-sm font-bold text-theme-fg outline-none focus:border-theme-strong transition-all overflow-hidden"
        >
          <span className="flex items-center gap-2 truncate pr-2">
            {!label && icon}
            {selected ? selected.label : <span className="text-theme-muted font-normal">{placeholder}</span>}
          </span>
          <ChevronDown size={14} className={cn("flex-shrink-0 text-theme-muted transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute top-full z-[8000] mt-1.5 w-full max-h-48 overflow-y-auto rounded-2xl border border-theme-border bg-theme-surface shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-1.5 animate-in slide-in-from-top-1 duration-200">
            {options.length > 0 ? options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                  value === opt.value ? "bg-theme-primary text-theme-surface" : "text-theme-fg hover:bg-theme-raised"
                )}
              >
                <span className="truncate uppercase tracking-tight">{opt.label}</span>
                {value === opt.value && <Check size={12} className="flex-shrink-0" />}
              </button>
            )) : (
              <div className="px-3 py-4 text-center text-[10px] uppercase font-black tracking-widest text-theme-muted opacity-50">No Data Options</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 3-Dot Context Menu ──────────────────────────────────
function RowMenu({ user, onRefresh, onEdit, isLast, setDeleteConfirm }: { 
  user: User; 
  onRefresh: () => void; 
  onEdit: () => void;
  isLast?: boolean; 
  setDeleteConfirm: (u: User) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showCustomMail, setShowCustomMail] = useState(false);
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [acting, setActing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setShowCustomMail(false); }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  async function doAction(action: string, extra?: Record<string, string>) {
    setActing(true);
    setOpen(false);
    try {
      const res = await axios.post(`/api/users/${user.id}`, { action, ...extra });
      showToast(res.data.message || res.data.warning || "Done", res.data.warning ? "warning" : "success");
      onRefresh();
    } catch (e: any) {
      showToast(e.response?.data?.error || e.message, "error");
    } finally {
      setActing(false);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)} disabled={acting} className="p-1.5 rounded-lg text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors">
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className={cn("absolute z-[1000] w-52 rounded-2xl border border-theme-border bg-theme-surface shadow-2xl p-1.5 animate-in zoom-in-95 duration-150", 
          "right-full mr-2", isLast ? "bottom-0" : "top-0"
        )}>
          <button onClick={() => { onEdit(); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
            <Edit2 size={13} className="text-theme-muted group-hover:text-theme-primary transition-colors" /> Edit Employee
          </button>
          <button onClick={() => doAction("resend_credentials")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
            <RefreshCw size={13} className="text-sky-500 group-hover:rotate-45 transition-transform" /> Resend Login Info
          </button>
          <button onClick={() => { setShowCustomMail(true); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
            <Mail size={13} className="text-emerald-500" /> Send Custom Mail
          </button>
          <div className="my-1.5 h-px bg-theme-border/50" />
          <button onClick={() => { setDeleteConfirm(user); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black text-rose-500 hover:bg-rose-500/10 transition-all">
            <Trash2 size={13} /> Delete Account
          </button>
        </div>
      )}

      {showCustomMail && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface border border-theme-border shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="text-sm font-bold text-theme-fg">Message: {user.name}</h3>
              <button onClick={() => setShowCustomMail(false)} className="text-theme-muted hover:text-theme-fg p-1 rounded-lg hover:bg-theme-raised transition-colors"><X size={15} /></button>
            </div>
            <div className="space-y-3 pt-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Subject</label>
                <input value={mailSubject} onChange={(e) => setMailSubject(e.target.value)}
                  placeholder="Enter subject..."
                  className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-theme-muted">Message</label>
                <textarea value={mailBody} onChange={(e) => setMailBody(e.target.value)}
                  rows={4} placeholder="Type message..."
                  className="w-full rounded-lg border border-theme-border bg-theme-page px-3 py-2 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-3 border-t border-theme-border">
              <Button variant="secondary" size="sm" onClick={() => setShowCustomMail(false)} className="font-semibold px-4">Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => {
                doAction("send_custom", { subject: mailSubject, message: mailBody });
                setShowCustomMail(false);
              }} className="font-semibold px-6">Send Mail</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────
export default function AdminUsersPage() {
  const { showToast } = useToast();
  const { request } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [orgTeams, setOrgTeams] = useState<TeamNode[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [form, setForm] = useState({
    name: "", email: "", role: "employee",
    employeeId: "", department: "", designation: "", joiningDate: "",
    shift_id: "", team_id: "", monthly_leave_quota: "1",
    employment_type: "full_time", salary_structure: "fixed_monthly", base_salary: ""
  });

  async function load(q?: string) {
    setLoading(true);
    try {
      const url = `/api/users?${q ? `search=${q}` : ""}`;
      const res = await request<{ users: User[]; total: number }>({ url });
      setUsers(res.users ?? []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrg() {
    const { data: teamsData } = await supabase.from("teams").select("id, name, type, parent_id");
    if (teamsData) setOrgTeams(teamsData);
    
    const { data: shiftsData } = await supabase.from("shifts").select("id, name, start_time, end_time, department, team_id");
    if (shiftsData) setShifts(shiftsData);
  }

  useEffect(() => { load(); loadOrg(); }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === "Escape") {
        setShowForm(false);
        setDeleteConfirm(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (showForm && !editingId && !form.employeeId) {
      setForm(f => ({ ...f, employeeId: `NP-${Math.floor(1000 + Math.random() * 8999)}` }));
    }
  }, [showForm, editingId]);

  function handleAdd() {
    setEditingId(null);
    setForm({ 
      name: "", email: "", role: "employee", employeeId: "", 
      department: "", designation: "", shift_id: "", team_id: "",
      monthly_leave_quota: "1", employment_type: "full_time",
      salary_structure: "fixed_monthly", base_salary: "",
      joiningDate: new Date().toISOString() 
    });
    setShowForm(true);
  }

  function handleEdit(user: User) {
    setEditingId(user.id);
    const deptNode = orgTeams.find(t => t.name === user.department && t.type === 'department');
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      department: deptNode ? deptNode.id : user.department,
      designation: user.designation,
      joiningDate: user.joiningDate,
      shift_id: user.shift_id || "",
      team_id: user.team_id || "",
      monthly_leave_quota: String(user.monthly_leave_quota || "1"),
      employment_type: user.employment_type || "full_time",
      salary_structure: user.salary_structure || "fixed_monthly",
      base_salary: String(user.base_salary || "")
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const deptNode = orgTeams.find(t => t.id === form.department);
      const payload = {
        ...form,
        department: deptNode ? deptNode.name : form.department,
        shift_id: form.shift_id || null,
        team_id: form.team_id || null,
        monthly_leave_quota: parseFloat(form.monthly_leave_quota)
      };

      if (editingId) {
        await axios.patch(`/api/users/${editingId}`, payload);
        showToast("Employee protocol re-indexed successfully.", "success");
      } else {
        await request({ url: "/api/users", method: "POST", data: payload });
        showToast(`Secure onboarding initialized for ${form.email}`, "success");
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      await axios.delete(`/api/users/${deleteConfirm.id}`);
      showToast(`Account for "${deleteConfirm.name}" has been decommissioned.`, "success");
      setDeleteConfirm(null);
      await load();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(userId: string, current: boolean) {
    try {
      await axios.patch(`/api/users/${userId}`, { isActive: !current });
      showToast(`Account is now ${!current ? "Active" : "Inactive"}`, "success");
      await load();
    } catch (e: any) {
      showToast("Error updating status.", "error");
    }
  }

  const filteredUsers = users.filter((u) => {
    const act = u.isActive ?? (u as any).is_active;
    if (activeTab === "active")   return act === true;
    if (activeTab === "inactive") return act === false;
    return true;
  });

  const activeCount   = users.filter((u) => u.isActive === true || (u as any).is_active === true).length;
  const inactiveCount = users.filter((u) => u.isActive === false || (u as any).is_active === false).length;

  // Filter shifts based on selected department/team
  const selectedDeptNode = orgTeams.find(t => t.id === form.department);
  const availableShifts = shifts.filter(s => {
    if (!s.department && !s.team_id) return true; // Global shift
    if (s.team_id && s.team_id === form.team_id) return true; // Team match
    if (s.department && selectedDeptNode && s.department === selectedDeptNode.name && !s.team_id) return true; // Dept match
    return false;
  });

  return (
    <DashboardShell
      title="Employees"
      subtitle="Architect your workforce and manage enterprise system access."
      actions={
        <Button variant="primary" size="sm" onClick={handleAdd}>
          <UserPlus size={14} className="mr-1.5" /> Add Employee
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Staff",   value: total || users.length, icon: Users,     color: "text-theme-fg",    bg: "bg-theme-raised" },
            { label: "Active Now",    value: activeCount,           icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Inactive",      value: inactiveCount,         icon: UserX,     color: "text-rose-500",    bg: "bg-rose-500/10" },
            { label: "Global Roles",   value: new Set(users.map((u) => u.role)).size, icon: ShieldCheck, color: "text-sky-500", bg: "bg-sky-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="page-card flex items-center gap-3">
              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-xs text-theme-muted">{label}</p>
                <p className={cn("text-xl font-bold leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="page-card p-0 shadow-xl border-theme-border/50 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-theme-border/50 px-8 py-6 sm:flex-row sm:items-center sm:justify-between bg-theme-raised/5">
            <div className="flex rounded-2xl border border-theme-border bg-theme-raised p-1 gap-1">
              {([
                { id: "all",      label: "All Records", count: users.length },
                { id: "active",   label: "Active",      count: activeCount },
                { id: "inactive", label: "Inactive",    count: inactiveCount },
              ] as { id: "all" | "active" | "inactive"; label: string; count: number }[]).map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    activeTab === t.id ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg"
                  )}>
                  {t.label} <span className="ml-1 opacity-40">({t.count})</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted" size={14} />
              <input type="text" placeholder="Search personnel..." value={search}
                onChange={(e) => { setSearch(e.target.value); load(e.target.value); }}
                className="h-10 w-72 rounded-lg border border-theme-border bg-theme-page pl-10 pr-4 text-xs text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
            </div>
          </div>

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-page text-left text-xs font-semibold text-theme-muted">
                    <th className="px-5 py-3">Personnel</th>
                    <th className="px-5 py-3">Corporate ID</th>
                    <th className="px-5 py-3">Org Entity / Hierarchy</th>
                    <th className="px-5 py-3">Commencement</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Action Matrix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/30">
                  {filteredUsers.map((u, idx) => (
                    <tr key={u.id} className="group hover:bg-theme-raised/30 transition-all duration-300">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-theme-primary text-theme-surface text-[10px] font-bold shadow-sm">{getInitials(u.name)}</div>
                          <div>
                            <p className="text-xs font-semibold text-theme-fg">{u.name}</p>
                            <p className="text-xs text-theme-muted font-normal">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-theme-muted">{u.employeeId}</td>
                      <td className="px-5 py-3">
                        <p className="text-xs font-semibold text-theme-fg">{u.department || 'General Nodes'}</p>
                        <div className="flex items-center gap-2 mt-1.5!">
                          <Badge variant={ROLE_BADGE[u.role] ?? "default"} className="text-[10px] px-2 py-0.5 transition-all group-hover:bg-theme-primary group-hover:text-white">
                            {ROLE_LABEL[u.role] ?? u.role}
                          </Badge>
                          <span className="flex items-center gap-1 text-[9px] font-black text-theme-muted px-2 py-0.5 border border-theme-border rounded-lg bg-theme-page">
                             <Coffee size={10} /> {u.monthly_leave_quota} L/M
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-theme-fg">{formatDate(u.joiningDate)}</td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => toggleActive(u.id, u.isActive ?? (u as any).is_active)}
                          className={cn("rounded-md px-2 py-0.5 text-xs font-semibold transition-all",
                            (u.isActive || (u as any).is_active) ? "bg-emerald-500/10 text-emerald-600" : "bg-theme-raised text-theme-muted"
                          )}>
                          {(u.isActive || (u as any).is_active) ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <RowMenu user={u} onRefresh={() => load(search || undefined)} onEdit={() => handleEdit(u)} isLast={idx >= filteredUsers.length - 2} setDeleteConfirm={setDeleteConfirm} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-2xl rounded-2xl bg-theme-surface shadow-2xl border border-theme-border relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-theme-border bg-theme-surface px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-primary text-theme-surface shadow-sm">
                  {editingId ? <Edit2 size={16} /> : <UserPlus size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-theme-fg">{editingId ? "Edit Personnel" : "Add Personnel"}</h3>
                  <p className="text-xs text-theme-muted mt-0.5">Human Capital Records System</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-theme-muted hover:bg-theme-raised transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pr-3 custom-scrollbar">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Full Legal Name</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Operational Inbox</label>
                    <input required type="email" value={form.email} disabled={!!editingId} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm disabled:opacity-50" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Architecture node (Dept)</label>
                    <CustomSelect 
                      icon={<Building size={14} className="text-theme-primary" />}
                      placeholder="Select Department"
                      value={form.department} 
                      onChange={(v) => {
                         setForm({...form, department: v, team_id: "", shift_id: ""});
                      }} 
                      options={orgTeams.filter(t => t.type === 'department').map(t => ({ label: t.name, value: t.id }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Operational Unit (Team)</label>
                    <CustomSelect 
                      icon={<LayoutGrid size={14} className="text-theme-primary" />}
                      placeholder="Global/No Team"
                      value={form.team_id} 
                      onChange={(v) => {
                         setForm({...form, team_id: v, shift_id: ""});
                      }} 
                      options={form.department ? orgTeams.filter(t => t.type === 'team' && t.parent_id === form.department).map(t => ({ label: t.name, value: t.id })) : []}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Professional Designation</label>
                    <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Matrix Role</label>
                    <CustomSelect 
                      icon={<ShieldCheck size={14} className="text-theme-primary" />}
                      placeholder="Select Role"
                      value={form.role} 
                      onChange={(v) => setForm({...form, role: v})} 
                      options={Object.entries(ROLE_LABEL).map(([v, l]) => ({ label: l, value: v }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-primary">Temporal Protocol (Shift)</label>
                    <CustomSelect 
                      icon={<Clock size={14} className="text-theme-primary" />}
                      placeholder="SELECT SHIFT..."
                      value={form.shift_id} 
                      onChange={(v) => setForm({...form, shift_id: v})} 
                      options={availableShifts.map(s => ({ 
                        label: `${s.name.toUpperCase()} (${dayjs(`2000-01-01 ${s.start_time}`).format("hh:mm A")})`, 
                        value: s.id 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-emerald-600">Leave Entitlement</label>
                    <CustomSelect 
                      icon={<Coffee size={14} className="text-emerald-500" />}
                      placeholder="Select Quota"
                      value={form.monthly_leave_quota} 
                      onChange={(v) => setForm({...form, monthly_leave_quota: v})} 
                      options={[
                        { label: "0 Days / Month", value: "0" },
                        { label: "1 Day / Month", value: "1" },
                        { label: "2 Days / Month", value: "2" },
                        { label: "3 Days / Month", value: "3" },
                        { label: "4 Days / Month", value: "4" },
                        { label: "5 Days / Month", value: "5" },
                      ]}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Employment Type</label>
                    <CustomSelect 
                      placeholder="Select Type"
                      value={form.employment_type} 
                      onChange={(v) => setForm({...form, employment_type: v})} 
                      options={[
                        { label: "Full Time", value: "full_time" },
                        { label: "Part Time", value: "part_time" },
                        { label: "Internship", value: "internship" },
                      ]}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Salary Structure</label>
                    <CustomSelect 
                      placeholder="Select Structure"
                      value={form.salary_structure} 
                      onChange={(v) => setForm({...form, salary_structure: v})} 
                      options={[
                        { label: "Fixed Monthly", value: "fixed_monthly" },
                        { label: "Hourly Pay", value: "hourly" },
                        { label: "Daily Pay", value: "daily" },
                        { label: "Stipend", value: "stipend" },
                      ]}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Base Salary / Rate (Amount)</label>
                    <input type="number" required value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                      className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Commencement Date</label>
                    <DatePicker value={form.joiningDate} onChange={(d) => setForm({ ...form, joiningDate: d })} label="" />
                  </div>
                </div>

                <div className="bg-theme-surface flex justify-end gap-3 border-t border-theme-border pt-4 mt-6">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)} className="px-6">Cancel</Button>
                  <Button type="submit" size="sm" loading={submitting} className="px-6">
                    {editingId ? "Save Changes" : "Create Profile"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION TOAST (PILL DESIGN) */}
      {deleteConfirm && (
        <div className="fixed inset-x-0 top-8 z-[9000] flex justify-center px-4 animate-in slide-in-from-top-8 duration-300">
           <div className="flex items-center gap-6 bg-theme-surface px-6 py-4 shadow-xl rounded-2xl border border-theme-border min-w-[400px]">
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl">
                    <Trash2 size={20} />
                 </div>
                 <div className="flex flex-col">
                    <p className="text-sm font-semibold text-theme-fg tracking-tight">Delete <span className="text-rose-500 font-bold">"{deleteConfirm.name}"</span>?</p>
                    <p className="text-xs text-theme-muted mt-0.5">This action cannot be undone.</p>
                 </div>
              </div>
              
              <div className="flex items-center gap-3 ml-auto">
                 <Button onClick={() => setDeleteConfirm(null)} disabled={submitting} variant="secondary" size="sm" className="px-4">
                   Cancel
                 </Button>
                 <Button onClick={handleDelete} disabled={submitting} variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white px-5 border-rose-600">
                   {submitting ? "Deleting..." : "Delete"}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </DashboardShell>
  );
}
