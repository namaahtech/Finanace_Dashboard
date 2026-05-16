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
  RefreshCw, Mail, ChevronDown, ChevronRight, Check, Clock, LayoutGrid, Coffee, Loader2, LogOut
} from "lucide-react";
import { useAuth } from "@/components/layout/AuthProvider";
import { usePermission } from "@/hooks/usePermission";
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
  matrix_role: string; // Added field
  joiningDate: string; isActive: boolean;
  shift_id: string | null;
  team_id: string | null;
  monthly_leave_quota: number;
  employment_type: string;
  salary_structure: string;
  base_salary: number;
  salary_min?: number;
  salary_max?: number;
  kpi_weight?: number;
  kra_weight?: number;
  behavioral_weight?: number;
  enable_salary_linkage?: boolean;
  zoho_email?: string | null;
}

const ROLE_BADGE: Record<string, "default" | "info" | "success" | "purple" | "warning" | "danger" | "indigo"> = {
  employee: "default", team_lead: "success", dept_lead: "purple", admin: "purple", intern: "indigo",
};
const ROLE_LABEL: Record<string, string> = {
  employee: "Employee", team_lead: "Team Lead", dept_lead: "Department Lead", admin: "Admin", intern: "Intern",
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
function RowMenu({ user, onRefresh, onEdit, isLast, setDeleteConfirm, canEdit, canDelete, zohoConnected }: {
  user: User;
  onRefresh: () => void;
  onEdit: () => void;
  isLast?: boolean;
  setDeleteConfirm: (u: User) => void;
  canEdit: boolean;
  canDelete: boolean;
  zohoConnected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showCustomMail, setShowCustomMail] = useState(false);
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [acting, setActing] = useState(false);
  const [provisioningMail, setProvisioningMail] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  async function createZohoMail() {
    setProvisioningMail(true);
    setOpen(false);
    try {
      const res = await fetch("/api/mail/accounts/create-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: user.id, name: user.name, domain: "namaah.in" }),
      });
      const data = await res.json();
      if (res.ok && data.email_address) {
        if (data.already_exists) {
          showToast(`Mail already exists: ${data.email_address}`, "info");
        } else {
          showToast(`Zoho Mail created: ${data.email_address}`, "success");
        }
      } else {
        showToast(data.error || "Failed to create Zoho Mail.", "error");
      }
    } catch {
      showToast("Failed to create Zoho Mail. Check connection.", "error");
    } finally {
      setProvisioningMail(false);
    }
  }

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

  const isActing = acting || provisioningMail;

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
      <button onClick={() => setOpen((o) => !o)} disabled={isActing} className="p-1.5 rounded-lg text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-colors">
        {provisioningMail ? <Loader2 size={14} className="animate-spin" /> : <MoreVertical size={14} />}
      </button>

      {open && (
        <div className={cn("absolute z-[1000] w-52 rounded-2xl border border-theme-border bg-theme-surface shadow-2xl p-1.5 animate-in zoom-in-95 duration-150", 
          "right-full mr-2", isLast ? "bottom-0" : "top-0"
        )}>
          {canEdit && (
            <button onClick={() => { onEdit(); setOpen(false); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
              <Edit2 size={13} className="text-theme-muted group-hover:text-theme-primary transition-colors" /> Edit Employee
            </button>
          )}
          <button onClick={() => doAction("resend_credentials")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
            <RefreshCw size={13} className="text-sky-500 group-hover:rotate-45 transition-transform" /> Resend Login Info
          </button>
          <button onClick={() => { setShowCustomMail(true); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
            <Mail size={13} className="text-emerald-500" /> Send Custom Mail
          </button>
          {zohoConnected && (
            user.zoho_email
              ? <div className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-emerald-600 cursor-default">
                  <Zap size={13} /> Mail Provisioned ✓
                  <span className="ml-auto text-[10px] font-normal text-theme-muted truncate max-w-[120px]">{user.zoho_email}</span>
                </div>
              : <button onClick={createZohoMail}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-theme-fg hover:bg-theme-raised transition-all group">
                  <Zap size={13} className="text-blue-500" /> Create Zoho Mail
                </button>
          )}
          {canDelete && (
            <>
              <div className="my-1.5 h-px bg-theme-border/50" />
              {user.isActive && (
                <button onClick={async () => {
                  setOpen(false);
                  if (!confirm(`Start 7-day offboarding for ${user.name}? They will lose access after 7 days.`)) return;
                  setActing(true);
                  try {
                    const res = await fetch(`/api/employees/${user.id}/offboard`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reason: "Admin initiated offboarding" }),
                    });
                    const data = await res.json();
                    showToast(data.message || "Offboarding started.", res.ok ? "success" : "error");
                    if (res.ok) onRefresh();
                  } catch { showToast("Failed to start offboarding.", "error"); }
                  finally { setActing(false); }
                }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black text-orange-500 hover:bg-orange-500/10 transition-all">
                  <LogOut size={13} /> Begin Offboarding
                </button>
              )}
              <button onClick={() => { setDeleteConfirm(user); setOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black text-rose-500 hover:bg-rose-500/10 transition-all">
                <Trash2 size={13} /> Delete Account
              </button>
            </>
          )}
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
  const { user, loading: authLoading } = useAuth();
  const { canCreate, canEdit, canDelete, canExport } = usePermission("employees");
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
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [form, setForm] = useState({
    name: "", email: "", role: "employee",
    employeeId: "", department: "", designation: "", matrix_role: "", joiningDate: "",
    shift_id: "", team_id: "", monthly_leave_quota: "1",
    employment_type: "full_time", salary_structure: "fixed_monthly", base_salary: "",
    salary_min: "", salary_max: "",
    kpi_weight: 40, kra_weight: 40, behavioral_weight: 20,
    enable_salary_linkage: false,
    create_zoho_mail: true,
  });
  const [zohoConnected, setZohoConnected] = useState(false);
  const [zohoEmailPreview, setZohoEmailPreview] = useState("");
  const [assignableRoles, setAssignableRoles] = useState<string[]>([]);

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
    if (teamsData) {
      setOrgTeams(teamsData);
      setDepartments(teamsData.filter(t => t.type === 'department').map(t => ({ id: t.id, name: t.name })));
    }
    
    const { data: shiftsData } = await supabase.from("shifts").select("id, name, start_time, end_time, department, team_id");
    if (shiftsData) setShifts(shiftsData);
  }

  useEffect(() => {
    if (!authLoading && user) {
      load();
      loadOrg();
      // Check if Zoho Mail is connected
      fetch("/api/mail/auth/connect").then(r => r.json()).then(d => {
        setZohoConnected(d.config?.is_connected === true);
      }).catch(() => {});
      // Fetch which roles this user is allowed to assign
      if (user.role === "admin") {
        setAssignableRoles(Object.keys(ROLE_LABEL));
      } else {
        fetch(`/api/permissions/assignable-roles?role=${user.role}`)
          .then(r => r.json())
          .then(d => { if (d.assignableRoles) setAssignableRoles(d.assignableRoles); })
          .catch(() => {});
      }
    }
  }, [authLoading, user]);

  // Update Zoho email preview when name changes
  useEffect(() => {
    if (form.name && zohoConnected) {
      const parts = form.name.trim().toLowerCase().split(" ");
      const preview = parts.length >= 2
        ? `${parts[0]}.${parts[parts.length - 1]}@namaah.in`
        : `${parts[0]}@namaah.in`;
      setZohoEmailPreview(preview);
    } else {
      setZohoEmailPreview("");
    }
  }, [form.name, zohoConnected]);

  // Re-fetch assignable roles if admin updates permissions while this user is active
  useEffect(() => {
    if (!user?.role || user.role === "admin") return;
    const ch = supabase
      .channel("permissions_sync")
      .on("broadcast", { event: "permissions_updated" }, (payload) => {
        if (payload.payload?.role === user.role) {
          fetch(`/api/permissions/assignable-roles?role=${user.role}`)
            .then(r => r.json())
            .then(d => { if (d.assignableRoles) setAssignableRoles(d.assignableRoles); })
            .catch(() => {});
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.role]);

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
      department: "", designation: "", matrix_role: "", shift_id: "", team_id: "",
      monthly_leave_quota: "1", employment_type: "full_time",
      salary_structure: "fixed_monthly", base_salary: "",
      salary_min: "", salary_max: "",
      joiningDate: new Date().toISOString(),
      kpi_weight: 40, kra_weight: 40, behavioral_weight: 20,
      enable_salary_linkage: false,
      create_zoho_mail: true,
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
      matrix_role: (user as any).matrix_role || "",
      joiningDate: user.joiningDate,
      shift_id: user.shift_id || "",
      team_id: user.team_id || "",
      monthly_leave_quota: String(user.monthly_leave_quota || "1"),
      employment_type: user.employment_type || "full_time",
      salary_structure: user.salary_structure || "fixed_monthly",
      base_salary: String(user.base_salary || ""),
      salary_min: String(user.salary_min || ""),
      salary_max: String(user.salary_max || ""),
      kpi_weight: user.kpi_weight || 40,
      kra_weight: user.kra_weight || 40,
      behavioral_weight: user.behavioral_weight || 20,
      enable_salary_linkage: user.enable_salary_linkage || false,
      create_zoho_mail: false,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const deptNode = orgTeams.find(t => t.id === form.department);

      // Validate KPI weights sum to 100
      const totalWeight = form.kpi_weight + form.kra_weight + form.behavioral_weight;
      if (totalWeight !== 100) {
        showToast(`KPI weights must sum to 100 (currently ${totalWeight})`, "error");
        setSubmitting(false);
        return;
      }

      const VALID_ROLES = ["admin", "dept_lead", "team_lead", "employee", "intern"];
      const safeRole = VALID_ROLES.includes(form.role) ? form.role : "employee";

      const payload = {
        ...form,
        role: safeRole,
        department: deptNode ? deptNode.name : form.department,
        shift_id: form.shift_id || null,
        team_id: form.team_id || null,
        monthly_leave_quota: parseFloat(form.monthly_leave_quota),
        base_salary: form.base_salary ? parseFloat(form.base_salary) : 0,
        salary_min: form.salary_min ? parseFloat(form.salary_min) : null,
        salary_max: form.salary_max ? parseFloat(form.salary_max) : null,
        kpi_weight: form.kpi_weight,
        kra_weight: form.kra_weight,
        behavioral_weight: form.behavioral_weight,
        enable_salary_linkage: form.enable_salary_linkage
      };

      if (editingId) {
        await axios.patch(`/api/users/${editingId}`, payload);
        showToast("Employee protocol re-indexed successfully.", "success");
      } else {
        const newEmployee = await request<{ id?: string }>({ url: "/api/users", method: "POST", data: payload });

        // Auto-provision Zoho Mail if enabled and Zoho is connected
        if (form.create_zoho_mail && zohoConnected && !editingId && newEmployee?.id) {
          try {
            const zohoRes = await fetch("/api/mail/accounts/create-employee", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                employee_id: newEmployee.id,
                name: form.name,
                domain: "namaah.in",
              }),
            });
            const zohoData = await zohoRes.json();
            if (zohoRes.ok) {
              showToast(`Zoho Mail created: ${zohoData.email_address}`, "success");
            } else {
              showToast(`Employee added — Zoho mail creation failed: ${zohoData.error || "retry in Mail Config"}`, "warning");
            }
          } catch {
            showToast(`Employee added — Zoho mail provisioning failed. Retry in Mail Config.`, "warning");
          }
        } else {
          showToast(`Secure onboarding initialized for ${form.email}`, "success");
        }
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      if (msg.includes("updated_at") || msg.includes("500")) {
        showToast("Configuration Error: Database triggers are misconfigured. Please run the SQL patch in your Supabase dashboard.", "error");
      } else {
        showToast(msg, "error");
      }
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
      const errorMsg = err.response?.data?.error || err.message;
      
      // Plain English linkage detection
      if (errorMsg.includes("attendance_logs")) {
        showToast("Cannot Delete: Employee has Attendance records. You must clear their logs first.", "error");
      } else if (errorMsg.includes("project_members")) {
        showToast("Cannot Delete: Employee is still assigned to a Project. Remove them from the project team first.", "error");
      } else if (errorMsg.includes("projects_team_lead_id_fkey")) {
        showToast("Cannot Delete: Employee is a Project Lead. Assign a new Lead to their projects first.", "error");
      } else if (errorMsg.includes("updated_at") || errorMsg.includes("42703")) {
        showToast("System Error: Database script mismatch. Please verify the SQL patch was run in Supabase.", "error");
      } else {
        showToast("Security Block: " + errorMsg, "error");
      }
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
      moduleKey="employees"
      title="Employees"
      subtitle="Architect your workforce and manage enterprise system access."
      actions={
        canCreate ? (
          <Button variant="primary" size="sm" onClick={handleAdd}>
            <UserPlus size={14} className="mr-1.5" /> Add Employee
          </Button>
        ) : null
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
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-theme-fg">{u.department || 'General Nodes'}</span>
                          {u.team_id && (
                            <span className="text-[10px] text-theme-muted font-bold mt-0.5 flex items-center gap-1">
                               <ChevronRight size={10} className="text-theme-primary/50" />
                               {orgTeams.find(t => t.id === u.team_id)?.name || 'Unknown Unit'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
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
                        <RowMenu user={u} onRefresh={() => load(search || undefined)} onEdit={() => handleEdit(u)} isLast={idx >= filteredUsers.length - 2} setDeleteConfirm={setDeleteConfirm} canEdit={canEdit} canDelete={canDelete} zohoConnected={zohoConnected} />
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
                      options={departments.map(d => ({ label: d.name, value: d.id }))}
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
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Matrix Role (Hierarchy Position)</label>
                    <input value={form.matrix_role} onChange={(e) => setForm({ ...form, matrix_role: e.target.value })}
                      placeholder="e.g. Lead Frontend Architect"
                      className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Access Level</label>
                    <CustomSelect
                      icon={<ShieldCheck size={14} className="text-theme-primary" />}
                      placeholder="Select Role"
                      value={form.role}
                      onChange={(v) => setForm({...form, role: v})}
                      options={Object.entries(ROLE_LABEL)
                        .filter(([v]) => {
                          const validRoles = ["admin","dept_lead","team_lead","employee","intern"];
                          const allowed = assignableRoles.filter(r => validRoles.includes(r));
                          return allowed.length === 0 || allowed.includes(v);
                        })
                        .map(([v, l]) => ({ label: l, value: v }))}
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
                      onChange={(v) => {
                        // Auto-set salary structure based on employment type
                        let newSalaryStructure = form.salary_structure;
                        if (v === "internship") {
                          newSalaryStructure = "stipend";
                        } else if (v === "full_time") {
                          newSalaryStructure = "fixed_monthly";
                        }
                        setForm({...form, employment_type: v, salary_structure: newSalaryStructure});
                      }}
                      options={[
                        { label: "Full Time", value: "full_time" },
                        { label: "Part Time", value: "part_time" },
                        { label: "Internship", value: "internship" },
                      ]}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Salary Structure
                      {form.employment_type === "internship" && <span className="text-[10px] bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded">Auto: Stipend</span>}
                    </label>
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

                  {/* STIPEND ONLY - Show Min/Max */}
                  {form.salary_structure === "stipend" && (
                    <>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Minimum Stipend (₹)</label>
                        <input type="number" required value={form.salary_min || ""} onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                          placeholder="e.g., 10000"
                          className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                        <p className="text-[10px] text-theme-muted">Base amount when KPI linkage is disabled</p>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Maximum Stipend (₹)</label>
                        <input type="number" required value={form.salary_max || ""} onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
                          placeholder="e.g., 15000"
                          className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                        <p className="text-[10px] text-theme-muted">Maximum range (performance-based when linked to KPI)</p>
                      </div>

                      {/* Enable Salary Linkage to KPI/KRA - ONLY for Stipend */}
                      <div className="sm:col-span-2 p-4 rounded-lg bg-theme-primary/10 border border-theme-primary/20">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" checked={form.enable_salary_linkage}
                            onChange={(e) => setForm({ ...form, enable_salary_linkage: e.target.checked })}
                            className="w-4 h-4 rounded border-theme-border"
                          />
                          <span className="text-xs font-bold text-theme-primary uppercase tracking-wide">
                            Link Stipend to KPI/KRA Performance
                          </span>
                        </label>
                        <p className="text-[10px] text-theme-muted mt-2 ml-7">
                          ✓ If enabled: Stipend auto-adjusts between Min-Max based on KPI/KRA scores<br/>
                          ✓ If disabled: Use minimum stipend as fixed amount
                        </p>
                      </div>
                    </>
                  )}

                  {/* FIXED MONTHLY - Show single base salary */}
                  {form.salary_structure === "fixed_monthly" && (
                    <div className="sm:col-span-2 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Monthly Base Salary (₹)</label>
                      <input type="number" required value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                        placeholder="e.g., 50000"
                        className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                      <p className="text-[10px] text-theme-muted">Fixed monthly salary amount</p>
                    </div>
                  )}

                  {/* HOURLY - Show single hourly rate */}
                  {form.salary_structure === "hourly" && (
                    <div className="sm:col-span-2 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Hourly Rate (₹/hour)</label>
                      <input type="number" required step="0.01" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                        placeholder="e.g., 500"
                        className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                      <p className="text-[10px] text-theme-muted">Rate per hour (Salary = Rate × Hours Worked)</p>
                    </div>
                  )}

                  {/* DAILY - Show single daily rate */}
                  {form.salary_structure === "daily" && (
                    <div className="sm:col-span-2 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Daily Rate (₹/day)</label>
                      <input type="number" required step="0.01" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                        placeholder="e.g., 2000"
                        className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                      <p className="text-[10px] text-theme-muted">Rate per day (Salary = Rate × Days Worked)</p>
                    </div>
                  )}

                  {/* KPI & KRA Weights */}
                  <div className="sm:col-span-2 border-t border-theme-border pt-4 mt-4">
                    <p className="text-xs font-bold text-theme-primary uppercase tracking-widest mb-4">Performance Linkage Settings</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-blue-600">KPI Weight (%)</label>
                        <input type="number" min="0" max="100" step="1" value={form.kpi_weight ?? 40}
                          onChange={(e) => setForm({ ...form, kpi_weight: parseFloat(e.target.value) || 0 })}
                          className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-emerald-600">KRA Weight (%)</label>
                        <input type="number" min="0" max="100" step="1" value={form.kra_weight ?? 40}
                          onChange={(e) => setForm({ ...form, kra_weight: parseFloat(e.target.value) || 0 })}
                          className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-amber-600">Behavioral Weight (%)</label>
                        <input type="number" min="0" max="100" step="1" value={form.behavioral_weight ?? 20}
                          onChange={(e) => setForm({ ...form, behavioral_weight: parseFloat(e.target.value) || 0 })}
                          className="h-10 w-full rounded-lg border border-theme-border bg-theme-page px-3 text-sm text-theme-fg outline-none focus:border-theme-primary transition-all shadow-sm" />
                      </div>
                    </div>
                    <p className="text-[10px] text-theme-muted mt-2">⚠️ Weights must sum to 100%</p>
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-muted">Commencement Date</label>
                    <DatePicker value={form.joiningDate} onChange={(d) => setForm({ ...form, joiningDate: d })} label="" />
                  </div>

                  {/* Zoho Mail Auto-Provisioning — only for new employees */}
                  {!editingId && (
                    <div className="sm:col-span-2 border-t border-theme-border pt-4 mt-2">
                      <div className={`p-4 rounded-xl border transition-all ${form.create_zoho_mail && zohoConnected ? "bg-blue-500/5 border-blue-500/20" : "bg-theme-raised border-theme-border"}`}>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.create_zoho_mail && zohoConnected}
                            disabled={!zohoConnected}
                            onChange={(e) => setForm({ ...form, create_zoho_mail: e.target.checked })}
                            className="w-4 h-4 rounded border-theme-border accent-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-theme-fg flex items-center gap-1.5">
                                <Mail size={12} className="text-blue-500" />
                                Auto-create Zoho Mail Account
                              </span>
                              {!zohoConnected && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                                  ZOHO NOT CONNECTED
                                </span>
                              )}
                            </div>
                            {zohoConnected && form.create_zoho_mail && zohoEmailPreview && (
                              <p className="text-[11px] text-blue-500 font-mono mt-0.5">{zohoEmailPreview}</p>
                            )}
                            {!zohoConnected && (
                              <p className="text-[10px] text-theme-muted mt-0.5">
                                Connect Zoho Mail in <span className="text-theme-primary">Comms → Mail Config</span> to enable auto-provisioning.
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
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
