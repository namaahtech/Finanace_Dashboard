"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Shield, Users, ChevronRight, Save, Lock, AlertCircle,
  LayoutDashboard, FolderOpen, UserCheck, ClockArrowUp,
  Building2, Network, FileText, BookOpen, Video,
  BarChart3, Settings, Mail, MessageSquare, Zap,
  GraduationCap, TrendingUp, IndianRupee, Wallet,
  Receipt, CreditCard, Briefcase, Tag, PiggyBank,
  GitBranch, Handshake, Inbox, Send, Paperclip, Layers, KeyRound,
  UserPlus, RefreshCw, Award, StickyNote, Table2, Presentation,
  LayoutTemplate, CalendarDays, Circle, Crown, Building, Calendar
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────
type PermNode = {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
};
type PermMap = Record<string, PermNode>;

interface RoleMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  designation: string | null;
  employee_id: string | null;
  is_active: boolean;
  joining_date: string | null;
  team_id: string | null;
}

// ─── All Roles ───────────────────────────────────────────────
const ROLES = [
  { id: "super_admin", name: "Super Admin",    description: "Root access — controls everything." },
  { id: "hr",          name: "HR Manager",     description: "Manages people, recruitment, attendance." },
  { id: "accounts",    name: "Accounts",       description: "Finance, payroll, invoicing." },
  { id: "manager",     name: "Department Lead",description: "Oversees a department and its teams." },
  { id: "lead",        name: "Team Lead",      description: "Runs a specific team day-to-day." },
  { id: "sales",       name: "Sales",          description: "CRM, pipeline, client management." },
  { id: "employee",    name: "Employee",       description: "Standard staff — self-service portal." },
  { id: "internship",  name: "Intern",         description: "Interns — training and limited access." },
];

const ALL_ROLES_FOR_ASSIGN = [
  { id: "super_admin", label: "Super Admin" },
  { id: "hr",          label: "HR Manager" },
  { id: "accounts",    label: "Accounts" },
  { id: "manager",     label: "Department Lead" },
  { id: "lead",        label: "Team Lead" },
  { id: "sales",       label: "Sales" },
  { id: "employee",    label: "Employee" },
  { id: "internship",  label: "Intern" },
];

// ─── All Modules grouped by section ──────────────────────────
const SECTIONS = [
  {
    section: "Organization & Dashboard",
    icon: LayoutDashboard,
    color: "text-blue-600",
    bg: "bg-blue-50",
    items: [
      { key: "admin_dashboard",    label: "Admin Dashboard",              desc: "/admin — main overview for admin roles" },
      { key: "manager_dashboard",  label: "Manager Dashboard",            desc: "/manager/dashboard — department overview" },
      { key: "my_dashboard",       label: "Employee Dashboard",           desc: "/dashboard — personal home for staff" },
      { key: "projects",           label: "Projects",                     desc: "Project Kanban, tasks, delegation" },
      { key: "employees",          label: "Employees (User Management)",  desc: "Add, edit, view all staff profiles" },
      { key: "shift_management",   label: "Shift Management",             desc: "Create shifts, assign employees" },
      { key: "teams",              label: "Teams",                        desc: "Department and sub-team management" },
      { key: "org_chart",          label: "Org Chart",                    desc: "Full company hierarchy visualization" },
      { key: "manager_teams",      label: "Manager — Team View",          desc: "Team management for Department Lead" },
      { key: "manager_org_chart",  label: "Manager — Org Chart",          desc: "Org chart scoped to manager's department" },
    ],
  },
  {
    section: "Workspace",
    icon: LayoutTemplate,
    color: "text-violet-600",
    bg: "bg-violet-50",
    items: [
      { key: "workspace_hub",           label: "Workspace Hub Overview",  desc: "Landing page showing all docs, notes, sheets" },
      { key: "workspace_documents",     label: "Documents",               desc: "Rich-text editor, AI writing assist" },
      { key: "workspace_spreadsheets",  label: "Spreadsheets",            desc: "Excel-like grid with formula support" },
      { key: "workspace_presentations", label: "Presentations",           desc: "Slide editor for creating decks" },
      { key: "workspace_notes",         label: "Notes",                   desc: "Google Keep-style sticky notes" },
    ],
  },
  {
    section: "HR & Hiring",
    icon: UserPlus,
    color: "text-sky-600",
    bg: "bg-sky-50",
    items: [
      { key: "job_clusters",  label: "Job Clusters (Role Templates)",  desc: "Define role families, salary bands, skill sets" },
      { key: "recruitment",   label: "Recruitment Hub",                desc: "Hiring pipeline Kanban, applicant tracking" },
      { key: "ats_scanner",   label: "Resume Scanner (ATS)",           desc: "Gemma AI scores resumes against job requirements" },
      { key: "interviews",    label: "Interview Management",           desc: "Schedule interviews, video rooms, AI recap" },
    ],
  },
  {
    section: "Learning & Development",
    icon: GraduationCap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    items: [
      { key: "lms_academy",       label: "Academy Manager (Admin)",        desc: "Overview, assign courses, manage learning paths" },
      { key: "lms_courses",       label: "Manage Courses",                 desc: "Create, edit, delete course content" },
      { key: "lms_certifications", label: "Certifications & Badges",       desc: "Issue and track employee certifications" },
      { key: "training_academy",  label: "Training Academy (Employee View)", desc: "Employee-facing /dashboard/academy" },
    ],
  },
  {
    section: "Operations & People",
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    items: [
      { key: "attendance",      label: "Attendance Tracker",      desc: "View, manage, override attendance records" },
      { key: "kpi_kra",         label: "KPI / KRA Performance",   desc: "Score cards, auto-calculation, history" },
      { key: "payroll",         label: "Payroll Engine",          desc: "Monthly payroll, payslip generation" },
      { key: "incentives",      label: "Incentives",              desc: "Performance-based incentive management" },
      { key: "claims",          label: "Claims & Expenses",       desc: "Approve/reject employee expense claims" },
      { key: "reimbursements",  label: "Reimbursements",          desc: "Process and approve reimbursement requests" },
      { key: "priority_payout", label: "Priority Payout (Bonus)", desc: "Ad-hoc bonus payout separate from salary" },
    ],
  },
  {
    section: "Finance",
    icon: IndianRupee,
    color: "text-rose-600",
    bg: "bg-rose-50",
    items: [
      { key: "invoicing",      label: "Invoicing",          desc: "Create invoices, send via email, track status" },
      { key: "vendors",        label: "Vendors & Purchases", desc: "Vendor directory, purchase orders, logs" },
      { key: "subscriptions",  label: "Subscriptions",      desc: "Software subscriptions, renewal reminders" },
      { key: "budgets",        label: "Budgets",            desc: "Department/project budgets with live tracking" },
    ],
  },
  {
    section: "Sales & CRM",
    icon: GitBranch,
    color: "text-orange-600",
    bg: "bg-orange-50",
    items: [
      { key: "sales_pipeline",  label: "Sales Pipeline",    desc: "Deal Kanban: Lead → Prospect → Won/Lost" },
      { key: "crm_clients",     label: "Client Directory",  desc: "Full client profiles, GST, contact info" },
    ],
  },
  {
    section: "Communications",
    icon: Mail,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    items: [
      { key: "mail_hub",       label: "Mail Hub Overview",   desc: "AI-categorised email Kanban, digest" },
      { key: "mail_inbox",     label: "Inbox",               desc: "3-panel inbox with AI summaries" },
      { key: "mail_compose",   label: "Compose Mail",        desc: "Send emails with AI tone assist" },
      { key: "mail_sent",      label: "Sent Mail",           desc: "View sent emails" },
      { key: "mail_drafts",    label: "Drafts",              desc: "Save and continue draft emails" },
      { key: "mail_files",     label: "File Share Hub",      desc: "Upload and share files via mail" },
      { key: "mail_templates", label: "Mail Templates",      desc: "Pre-built email templates with variables" },
      { key: "mail_config",    label: "Mail Settings (Zoho)", desc: "Zoho OAuth setup, token management" },
      { key: "messages",       label: "Team Messages",       desc: "Direct messages + group channels (real-time)" },
      { key: "meetings",       label: "Video Meetings",      desc: "Schedule and join LiveKit video rooms" },
    ],
  },
  {
    section: "My Account (Self-Service)",
    icon: UserCheck,
    color: "text-teal-600",
    bg: "bg-teal-50",
    items: [
      { key: "my_profile",          label: "My Profile",           desc: "Personal info, salary view, photo upload" },
      { key: "my_attendance",       label: "My Attendance",        desc: "Punch-in/out, leave applications, calendar" },
      { key: "my_performance",      label: "My Performance / KPI", desc: "Personal KPI/KRA score and history" },
      { key: "my_incentives",       label: "My Incentives",        desc: "View assigned incentive status and history" },
      { key: "my_payslips",         label: "My Payslips",          desc: "Download monthly payslip PDFs" },
      { key: "my_reimbursements",   label: "My Reimbursements",    desc: "Submit and track reimbursement requests" },
      { key: "my_priority_payout",  label: "My Priority Payout",   desc: "View ad-hoc bonus payouts" },
      { key: "my_messages",         label: "My Messages",          desc: "/dashboard/messages — employee messaging" },
      { key: "my_meetings",         label: "My Meetings",          desc: "/dashboard/meetings — employee meeting list" },
    ],
  },
  {
    section: "System (Admin Only)",
    icon: Settings,
    color: "text-zinc-600",
    bg: "bg-zinc-100",
    items: [
      { key: "analytics",           label: "Analytics & Reports",       desc: "Company-level charts, revenue trends" },
      { key: "permissions_control", label: "Permissions & Access Control", desc: "This page — manage role-based access" },
      { key: "feature_report",      label: "Feature Status Report",     desc: "Internal completion tracker" },
      { key: "system_config",       label: "System Settings",           desc: "SMTP, company profile, feature toggles" },
    ],
  },
];

const DEFAULT_NODE: PermNode = {
  can_view: false, can_create: false, can_edit: false,
  can_delete: false, can_export: false,
};

// ─── Toggle switch component ─────────────────────────────────
function Toggle({
  checked, onChange, disabled = false,
}: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus:outline-none",
        checked ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span className={cn(
        "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );
}

// ─── Small permission badge toggle ───────────────────────────
function PermBadge({
  label, checked, onChange, color = "emerald",
}: { label: string; checked: boolean; onChange: () => void; color?: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
    blue:    "bg-blue-100 text-blue-700 border-blue-300",
    amber:   "bg-amber-100 text-amber-700 border-amber-300",
    red:     "bg-red-100 text-red-600 border-red-300",
  };
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide transition-all duration-150",
        checked
          ? colorMap[color]
          : "bg-theme-raised/40 text-theme-muted border-theme-border/50 hover:border-theme-border"
      )}
    >
      {label}
    </button>
  );
}

// ─── Module row ───────────────────────────────────────────────
function ModuleRow({
  item, node, onToggle, isSuperAdmin,
}: {
  item: { key: string; label: string; desc: string };
  node: PermNode;
  onToggle: (key: string, field: keyof PermNode) => void;
  isSuperAdmin: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between px-5 py-3 transition-colors",
      "hover:bg-theme-raised/20 border-b border-theme-border/40 last:border-0",
      !node.can_view && "opacity-60"
    )}>
      <div className="min-w-0 flex-1 mr-4">
        <p className="text-sm font-semibold text-theme-fg truncate">{item.label}</p>
        <p className="text-[11px] text-theme-muted mt-0.5 truncate">{item.desc}</p>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Visibility master toggle */}
        <div className="flex items-center gap-2">
          <Toggle
            checked={node.can_view}
            onChange={() => onToggle(item.key, "can_view")}
            disabled={isSuperAdmin}
          />
          <span className={cn(
            "text-[10px] font-bold w-14",
            node.can_view ? "text-emerald-600" : "text-zinc-400"
          )}>
            {node.can_view ? "VISIBLE" : "HIDDEN"}
          </span>
        </div>

        {/* Granular controls — only shown when visible */}
        <div className={cn(
          "flex items-center gap-1.5 transition-opacity duration-200",
          node.can_view ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <PermBadge
            label="Create"
            checked={node.can_create}
            onChange={() => onToggle(item.key, "can_create")}
            color="blue"
          />
          <PermBadge
            label="Edit"
            checked={node.can_edit}
            onChange={() => onToggle(item.key, "can_edit")}
            color="amber"
          />
          <PermBadge
            label="Delete"
            checked={node.can_delete}
            onChange={() => onToggle(item.key, "can_delete")}
            color="red"
          />
          <PermBadge
            label="Export"
            checked={node.can_export}
            onChange={() => onToggle(item.key, "can_export")}
            color="emerald"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function PermissionsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [activeRole, setActiveRole]           = useState("super_admin");
  const [activeTab, setActiveTab]             = useState<"modules" | "assign" | "members">("modules");
  const [permissions, setPermissions]         = useState<PermMap>({});
  const [assignableRoles, setAssignableRoles] = useState<string[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTIONS.map((s) => s.section))
  );

  // Live member counts per role — populated from employees table
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  // Live list of employees for the currently selected role
  const [roleMembers, setRoleMembers] = useState<RoleMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Fetch counts for all roles
  const fetchRoleCounts = useCallback(async () => {
    const { data } = await supabase
      .from("employees")
      .select("role");
    if (!data) return;
    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.role] = (counts[row.role] ?? 0) + 1;
    }
    setRoleCounts(counts);
  }, []);

  // Fetch full employee list for a specific role
  const fetchRoleMembers = useCallback(async (role: string) => {
    setMembersLoading(true);
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, role, department, designation, employee_id, is_active, joining_date, team_id")
      .eq("role", role)
      .order("name");
    setRoleMembers((data as RoleMember[]) ?? []);
    setMembersLoading(false);
  }, []);

  // On mount: load counts + subscribe to employees table for realtime updates
  useEffect(() => {
    fetchRoleCounts();

    const ch = supabase
      .channel("permissions_employees_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => {
        // Re-fetch counts on any employee change (add/edit/delete)
        fetchRoleCounts();
        // If members tab open, refresh the list too
        setActiveTab((tab) => {
          if (tab === "members") fetchRoleMembers(activeRole);
          return tab;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [fetchRoleCounts, fetchRoleMembers, activeRole]);

  // Refresh members list when role or tab changes
  useEffect(() => {
    if (activeTab === "members") fetchRoleMembers(activeRole);
  }, [activeRole, activeTab, fetchRoleMembers]);

  // Broadcast channel — used to push instant permission updates to all connected clients
  const broadcastRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const ch = supabase.channel("permissions_sync");
    ch.subscribe();
    broadcastRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load permissions + assignable roles whenever active role changes
  const loadRole = useCallback(async (role: string) => {
    setLoading(true);
    try {
      const [permRes, assignRes] = await Promise.all([
        fetch(`/api/permissions?role=${role}`),
        fetch(`/api/permissions/assignable-roles?role=${role}`),
      ]);
      const permData   = await permRes.json();
      const assignData = await assignRes.json();
      setPermissions(permData.permissions ?? {});
      setAssignableRoles(assignData.assignableRoles ?? []);
    } catch {
      showToast("Could not load permissions. Check DB connection.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadRole(activeRole); }, [activeRole, loadRole]);

  function togglePerm(key: string, field: keyof PermNode) {
    if (activeRole === "super_admin") {
      showToast("Super Admin always has full access — cannot be restricted.", "warning");
      return;
    }
    setPermissions((prev) => {
      const node = prev[key] ?? { ...DEFAULT_NODE };
      const updated = { ...node, [field]: !node[field] };
      // When hiding (view OFF), disable all granular actions too
      if (field === "can_view" && !updated.can_view) {
        updated.can_create = false;
        updated.can_edit   = false;
        updated.can_delete = false;
        updated.can_export = false;
      }
      return { ...prev, [key]: updated };
    });
  }

  function toggleAssignable(roleId: string) {
    setAssignableRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  }

  function toggleSection(section: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const [permRes, assignRes] = await Promise.all([
        fetch("/api/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: activeRole,
            permissions,
            updatedBy: user?.id,
          }),
        }),
        fetch("/api/permissions/assignable-roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: activeRole, assignableRoles }),
        }),
      ]);

      if (!permRes.ok || !assignRes.ok) throw new Error("Save failed");

      // Broadcast to all logged-in users with this role so their sidebar updates instantly
      await broadcastRef.current?.send({
        type: "broadcast",
        event: "permissions_updated",
        payload: { role: activeRole },
      });

      const roleName = ROLES.find((r) => r.id === activeRole)?.name;
      showToast(`Permissions saved for ${roleName}. Sidebar updated instantly for all active sessions.`, "success");
    } catch {
      showToast("Failed to save permissions. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  const isSuperAdmin = activeRole === "super_admin";
  const activeRoleInfo = ROLES.find((r) => r.id === activeRole)!;

  // Count visible modules for the active role
  const visibleCount = Object.values(permissions).filter((p) => p.can_view).length;
  const totalModules = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <DashboardShell
      title="Access Control"
      subtitle="Control exactly which modules each role can see and what they can do."
      actions={
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={isSuperAdmin}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-10 px-8 font-bold text-xs"
        >
          <Save size={14} className="mr-2" />
          Save Permissions
        </Button>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-200px)]">

        {/* ── LEFT: Role Selector ─────────────────────────── */}
        <div className="w-full lg:w-72 space-y-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-1 mb-4">
            <Shield size={16} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-theme-fg">User Roles</h3>
            <span className="ml-auto text-[10px] font-bold text-theme-muted bg-theme-raised px-2 py-0.5 rounded-full">
              {ROLES.length} roles
            </span>
          </div>

          {ROLES.map((role) => {
            const isActive = activeRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all duration-200",
                  isActive
                    ? "bg-white dark:bg-zinc-900 border-emerald-400 shadow-md scale-[1.01]"
                    : "bg-theme-surface border-theme-border hover:border-emerald-200 hover:bg-theme-raised/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest",
                    isActive ? "text-emerald-600" : "text-theme-muted"
                  )}>
                    {roleCounts[role.id] ?? 0} members
                  </span>
                  <ChevronRight
                    size={13}
                    className={cn(
                      "transition-transform",
                      isActive ? "rotate-90 text-emerald-500" : "text-theme-muted"
                    )}
                  />
                </div>
                <p className="text-sm font-bold text-theme-fg">{role.name}</p>
                <p className="text-[11px] text-theme-muted mt-0.5 leading-relaxed">
                  {role.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── RIGHT: Permission Panel ─────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col bg-theme-surface border border-theme-border/60 rounded-3xl overflow-hidden shadow-sm">

          {/* Header */}
          <div className="bg-white dark:bg-zinc-900 border-b border-theme-border px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Lock size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-theme-fg">
                    Managing: {activeRoleInfo.name}
                  </h3>
                  <p className="text-[11px] text-theme-muted mt-0.5">
                    {activeRoleInfo.description}
                  </p>
                </div>
              </div>

              {/* Stats chip */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isSuperAdmin && (
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-600">{visibleCount}</span>
                    <span className="text-[10px] text-theme-muted font-medium"> / {totalModules} modules visible</span>
                  </div>
                )}
                {isSuperAdmin && (
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-3 py-1 rounded-full">
                    ROOT ACCESS — ALL MODULES
                  </span>
                )}
              </div>
            </div>

            {/* Super Admin notice */}
            {isSuperAdmin && (
              <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                <p className="text-[11px] text-amber-700 font-medium">
                  Super Admin always has full access to all modules. You can view but not change these settings.
                </p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mt-4 bg-theme-raised/40 p-1 rounded-xl w-fit">
              {([
                { id: "modules", label: "Module Visibility & Actions" },
                { id: "assign",  label: "Role Assignment Rights" },
                { id: "members", label: `Members (${roleCounts[activeRole] ?? 0})` },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-5 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeTab === tab.id
                      ? "bg-white dark:bg-zinc-800 text-theme-fg shadow-sm"
                      : "text-theme-muted hover:text-theme-fg"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 text-theme-muted">
                <RefreshCw size={20} className="animate-spin text-emerald-500" />
                <span className="text-sm font-medium">Loading permissions…</span>
              </div>
            </div>
          ) : activeTab === "modules" ? (

            /* ── MODULE ACCESS TAB ──────────────────────── */
            <div className="flex-1 overflow-y-auto">

              {/* Legend */}
              <div className="flex items-center gap-6 px-5 py-3 bg-theme-raised/20 border-b border-theme-border/40">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-8 rounded-full bg-emerald-500 relative">
                    <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow-sm" />
                  </div>
                  <span className="text-[10px] text-theme-muted font-medium">Visible in menu</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-8 rounded-full bg-zinc-200 relative">
                    <span className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow-sm" />
                  </div>
                  <span className="text-[10px] text-theme-muted font-medium">Hidden from menu</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  {[
                    { label: "Create", color: "bg-blue-100 text-blue-700 border-blue-300" },
                    { label: "Edit",   color: "bg-amber-100 text-amber-700 border-amber-300" },
                    { label: "Delete", color: "bg-red-100 text-red-600 border-red-300" },
                    { label: "Export", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
                  ].map(({ label, color }) => (
                    <span key={label} className={cn("px-2 py-0.5 rounded border text-[9px] font-bold", color)}>
                      {label}
                    </span>
                  ))}
                  <span className="text-[10px] text-theme-muted ml-1">— tap to toggle</span>
                </div>
              </div>

              {SECTIONS.map(({ section, icon: SectionIcon, color, bg, items }) => {
                const expanded = expandedSections.has(section);
                const visibleInSection = isSuperAdmin
                  ? items.length
                  : items.filter((i) => permissions[i.key]?.can_view).length;

                return (
                  <div key={section}>
                    {/* Section header */}
                    <button
                      className="w-full flex items-center justify-between px-5 py-3 bg-theme-raised/30 hover:bg-theme-raised/50 transition-colors border-b border-theme-border/40"
                      onClick={() => toggleSection(section)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", bg)}>
                          <SectionIcon size={14} className={color} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-theme-fg">
                          {section}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          visibleInSection === items.length
                            ? "bg-emerald-100 text-emerald-700"
                            : visibleInSection === 0
                              ? "bg-zinc-100 text-zinc-500"
                              : "bg-amber-100 text-amber-700"
                        )}>
                          {visibleInSection}/{items.length} visible
                        </span>
                        <ChevronRight
                          size={14}
                          className={cn("text-theme-muted transition-transform", expanded && "rotate-90")}
                        />
                      </div>
                    </button>

                    {expanded && items.map((item) => {
                      const node = isSuperAdmin
                        ? { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true }
                        : (permissions[item.key] ?? DEFAULT_NODE);

                      return (
                        <ModuleRow
                          key={item.key}
                          item={item}
                          node={node}
                          onToggle={togglePerm}
                          isSuperAdmin={isSuperAdmin}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

          ) : (

            /* ── ROLE ASSIGNMENT TAB ────────────────────── */
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-xl">
                <h4 className="text-sm font-bold text-theme-fg mb-1">
                  Who can <span className="text-emerald-600">{activeRoleInfo.name}</span> assign when adding employees?
                </h4>
                <p className="text-xs text-theme-muted mb-6 leading-relaxed">
                  When someone with this role adds a new employee, the Role dropdown will only show
                  the roles ticked below. This prevents HR from accidentally creating admin-level accounts.
                </p>

                <div className="space-y-2">
                  {ALL_ROLES_FOR_ASSIGN.map((r) => {
                    const isChecked = assignableRoles.includes(r.id);
                    const isSelf    = r.id === activeRole;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => !isSuperAdmin && toggleAssignable(r.id)}
                        disabled={isSuperAdmin}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                          isChecked || isSuperAdmin
                            ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700"
                            : "bg-theme-surface border-theme-border hover:border-emerald-200 hover:bg-theme-raised/20",
                          isSuperAdmin && "cursor-default opacity-80"
                        )}
                      >
                        <div className={cn(
                          "h-5 w-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors",
                          (isChecked || isSuperAdmin)
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-theme-border bg-theme-surface"
                        )}>
                          {(isChecked || isSuperAdmin) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-theme-fg">{r.label}</p>
                          <p className="text-[11px] text-theme-muted">
                            {isSelf ? "Assign someone with the same role as you" : `Create employees with ${r.label} role`}
                          </p>
                        </div>
                        {isSuperAdmin && (
                          <span className="text-[9px] bg-purple-100 text-purple-600 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                            ALWAYS
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {!isSuperAdmin && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                      <strong>How this works:</strong> When an HR manager opens Add Employee,
                      the Role dropdown will only show roles you enable above.
                      Super Admin always sees all roles regardless of this setting.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MEMBERS TAB ─────────────────────────────────── */}
          {activeTab === "members" && (
            <div className="flex-1 overflow-y-auto">
              {membersLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-theme-muted">
                  <RefreshCw size={20} className="animate-spin text-emerald-500" />
                  <span className="text-sm font-medium">Loading members…</span>
                </div>
              ) : roleMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-theme-muted">
                  <Users size={32} className="opacity-20" />
                  <p className="text-sm font-semibold">No members with this role yet</p>
                  <p className="text-xs">Assign the <span className="font-bold">{activeRoleInfo.name}</span> role to employees to see them here.</p>
                </div>
              ) : (
                <div className="p-5 space-y-3">
                  {/* Summary bar */}
                  <div className="flex items-center justify-between px-1 mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-emerald-600" />
                      <span className="text-xs font-black text-theme-fg uppercase tracking-widest">
                        {roleMembers.length} {activeRoleInfo.name}{roleMembers.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-theme-muted font-medium">
                      <span className="flex items-center gap-1">
                        <Circle size={6} className="fill-emerald-500 text-emerald-500" />
                        {roleMembers.filter(m => m.is_active).length} Active
                      </span>
                      <span className="flex items-center gap-1">
                        <Circle size={6} className="fill-zinc-400 text-zinc-400" />
                        {roleMembers.filter(m => !m.is_active).length} Inactive
                      </span>
                    </div>
                  </div>

                  {roleMembers.map((member) => {
                    const initials = member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-2xl border transition-all",
                          member.is_active
                            ? "bg-theme-surface border-theme-border hover:border-emerald-200 hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10"
                            : "bg-theme-raised/30 border-theme-border/50 opacity-60"
                        )}
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-theme-primary flex items-center justify-center text-white text-xs font-black shadow-sm">
                            {initials}
                          </div>
                          <span className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900",
                            member.is_active ? "bg-emerald-500" : "bg-zinc-400"
                          )} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-theme-fg">{member.name}</p>
                            {member.employee_id && (
                              <span className="text-[9px] font-black text-theme-muted bg-theme-raised px-2 py-0.5 rounded-full border border-theme-border">
                                {member.employee_id}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-theme-muted mt-0.5">{member.email}</p>

                          <div className="flex items-center flex-wrap gap-3 mt-2">
                            {member.department && (
                              <span className="flex items-center gap-1 text-[10px] text-theme-muted font-medium">
                                <Building size={10} /> {member.department}
                              </span>
                            )}
                            {member.designation && (
                              <span className="flex items-center gap-1 text-[10px] text-theme-muted font-medium">
                                <Crown size={10} /> {member.designation}
                              </span>
                            )}
                            {member.joining_date && (
                              <span className="flex items-center gap-1 text-[10px] text-theme-muted font-medium">
                                <Calendar size={10} /> Joined {new Date(member.joining_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={cn(
                          "flex-shrink-0 text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest",
                          member.is_active
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                        )}>
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer save hint */}
          {!isSuperAdmin && activeTab !== "members" && (
            <div className="border-t border-theme-border px-5 py-3 bg-white dark:bg-zinc-900 flex items-center justify-between">
              <p className="text-[11px] text-theme-muted">
                Sidebar updates instantly for all active sessions on Save.
              </p>
              <Button
                onClick={handleSave}
                loading={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-8 px-6 text-xs font-bold"
              >
                <Save size={12} className="mr-1.5" /> Save
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
