"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard, CalendarDays, TrendingUp, Wallet, FileText, Zap, Users,
  Settings, LogOut, Sun, Moon, ChevronRight, Building2,
  GitBranch, Receipt, CreditCard, Tag, PiggyBank, Handshake,
  MessageSquare, CalendarClock, IndianRupee,
  Shield, RefreshCw, Mail, Ticket,
  Network, Briefcase, ChevronLeft, BarChart3, ClipboardList, Folder, User,
  BookOpen, Table2, Presentation, StickyNote, LayoutTemplate, Award,
  Inbox, PenLine, Send, Paperclip, Layers, KeyRound,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  moduleKey: string; // must match role_permissions.module_key in DB
};
type NavSection = { title: string; items: NavItem[] };

// ─── MASTER NAV ───────────────────────────────────────────────
// Single source of truth for ALL possible routes in the app.
// The DB (role_permissions) controls which items are visible per role.
// Admin enables/disables any module for any role from /admin/permissions.
// When a module is enabled, the FULL existing page renders — no code changes needed.

const MASTER_NAV: NavSection[] = [
  {
    title: "Organization",
    items: [
      { href: "/admin",             label: "Admin Overview",   icon: LayoutDashboard, moduleKey: "admin_dashboard" },
      { href: "/manager/dashboard", label: "Manager Hub",      icon: LayoutDashboard, moduleKey: "manager_dashboard" },
      { href: "/dashboard",         label: "My Dashboard",     icon: LayoutDashboard, moduleKey: "my_dashboard" },
      { href: "/admin/projects",    label: "Projects",         icon: Folder,          moduleKey: "projects" },
      { href: "/admin/users",       label: "Employees",        icon: Users,           moduleKey: "employees" },
      { href: "/admin/shifts",      label: "Shift Management", icon: CalendarClock,   moduleKey: "shift_management" },
      { href: "/admin/teams",       label: "Teams",            icon: Building2,       moduleKey: "teams" },
      { href: "/admin/org-chart",   label: "Org Chart",        icon: Network,         moduleKey: "org_chart" },
      { href: "/manager/teams",     label: "My Teams",         icon: Building2,       moduleKey: "manager_teams" },
      { href: "/manager/org-chart", label: "My Org Chart",     icon: Network,         moduleKey: "manager_org_chart" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/admin/workspace",               label: "Workspace Hub",  icon: LayoutTemplate, moduleKey: "workspace_hub" },
      { href: "/admin/workspace/documents",     label: "Documents",      icon: BookOpen,       moduleKey: "workspace_documents" },
      { href: "/admin/workspace/spreadsheets",  label: "Spreadsheets",   icon: Table2,         moduleKey: "workspace_spreadsheets" },
      { href: "/admin/workspace/presentations", label: "Presentations",  icon: Presentation,   moduleKey: "workspace_presentations" },
      { href: "/admin/workspace/notes",         label: "Notes",          icon: StickyNote,     moduleKey: "workspace_notes" },
    ],
  },
  {
    title: "HR & Hiring",
    items: [
      { href: "/admin/hr/job-clusters", label: "Job Clusters",    icon: Network,       moduleKey: "job_clusters" },
      { href: "/admin/recruitment",     label: "Recruitment Hub", icon: Briefcase,     moduleKey: "recruitment" },
      { href: "/admin/ats",             label: "ATS Scanner",     icon: RefreshCw,     moduleKey: "ats_scanner" },
      { href: "/admin/interviews",      label: "Interviews",      icon: MessageSquare, moduleKey: "interviews" },
    ],
  },
  {
    title: "Learning & Development",
    items: [
      { href: "/admin/lms",                label: "Academy Manager",  icon: BookOpen,     moduleKey: "lms_academy" },
      { href: "/admin/lms/courses",        label: "Manage Courses",   icon: ClipboardList,moduleKey: "lms_courses" },
      { href: "/admin/lms/certifications", label: "Certifications",   icon: Award,        moduleKey: "lms_certifications" },
      { href: "/dashboard/academy",        label: "Training Academy", icon: BookOpen,     moduleKey: "training_academy" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/attendance",     label: "Attendance",      icon: CalendarDays,  moduleKey: "attendance" },
      { href: "/admin/kpi",            label: "KPI / KRA",       icon: TrendingUp,    moduleKey: "kpi_kra" },
      { href: "/admin/payroll",        label: "Payroll",         icon: IndianRupee,   moduleKey: "payroll" },
      { href: "/admin/incentives",     label: "Incentives",      icon: Wallet,        moduleKey: "incentives" },
      { href: "/admin/claims",         label: "Claims",          icon: FileText,      moduleKey: "claims" },
      { href: "/admin/reimbursements", label: "Reimbursements",  icon: Receipt,       moduleKey: "reimbursements" },
      { href: "/admin/priority",       label: "Priority Payout", icon: Zap,           moduleKey: "priority_payout" },
      { href: "/admin/support",        label: "Support Center",  icon: Ticket,        moduleKey: "support_admin" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/admin/invoicing",     label: "Invoicing",    icon: CreditCard, moduleKey: "invoicing" },
      { href: "/admin/vendors",       label: "Vendors",      icon: Briefcase,  moduleKey: "vendors" },
      { href: "/admin/subscriptions", label: "Subscriptions",icon: Tag,        moduleKey: "subscriptions" },
      { href: "/admin/budgets",       label: "Budgets",      icon: PiggyBank,  moduleKey: "budgets" },
    ],
  },
  {
    title: "CRM",
    items: [
      { href: "/admin/crm",         label: "Sales Pipeline", icon: GitBranch, moduleKey: "sales_pipeline" },
      { href: "/admin/crm/clients", label: "Clients",        icon: Handshake, moduleKey: "crm_clients" },
    ],
  },
  {
    title: "Communications",
    items: [
      { href: "/admin/mail",           label: "Mail Hub",    icon: Mail,         moduleKey: "mail_hub" },
      { href: "/admin/mail/inbox",     label: "Inbox",       icon: Inbox,        moduleKey: "mail_inbox" },
      { href: "/admin/mail/compose",   label: "Compose",     icon: PenLine,      moduleKey: "mail_compose" },
      { href: "/admin/mail/sent",      label: "Sent",        icon: Send,         moduleKey: "mail_sent" },
      { href: "/admin/mail/drafts",    label: "Drafts",      icon: FileText,     moduleKey: "mail_drafts" },
      { href: "/admin/mail/files",     label: "File Share",  icon: Paperclip,    moduleKey: "mail_files" },
      { href: "/admin/mail/templates", label: "Templates",   icon: Layers,       moduleKey: "mail_templates" },
      { href: "/admin/mail/config",    label: "Mail Config", icon: KeyRound,     moduleKey: "mail_config" },
      { href: "/admin/messaging",      label: "Messages",    icon: MessageSquare,moduleKey: "messages" },
      { href: "/admin/meetings",       label: "Meetings",    icon: CalendarClock,moduleKey: "meetings" },
    ],
  },
  {
    title: "My Account",
    items: [
      { href: "/dashboard/profile",        label: "My Profile",      icon: User,         moduleKey: "my_profile" },
      { href: "/dashboard/attendance",     label: "My Attendance",   icon: CalendarDays, moduleKey: "my_attendance" },
      { href: "/dashboard/performance",    label: "Performance",     icon: TrendingUp,   moduleKey: "my_performance" },
      { href: "/dashboard/incentives",     label: "My Incentives",   icon: Wallet,       moduleKey: "my_incentives" },
      { href: "/dashboard/payslips",       label: "My Payslips",     icon: IndianRupee,  moduleKey: "my_payslips" },
      { href: "/dashboard/reimbursements", label: "Reimbursements",  icon: Receipt,      moduleKey: "my_reimbursements" },
      { href: "/dashboard/priority",       label: "Priority Payout", icon: Zap,          moduleKey: "my_priority_payout" },
      { href: "/dashboard/messages",       label: "Messages",        icon: MessageSquare,moduleKey: "my_messages" },
      { href: "/dashboard/meetings",       label: "Meetings",        icon: CalendarClock,moduleKey: "my_meetings" },
      { href: "/dashboard/support",        label: "Support & Help",  icon: Ticket,       moduleKey: "support_user" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/analytics",   label: "Analytics",     icon: BarChart3,    moduleKey: "analytics" },
      { href: "/admin/permissions", label: "Permissions",   icon: Shield,       moduleKey: "permissions_control" },
      { href: "/admin/report",      label: "Feature Report",icon: ClipboardList,moduleKey: "feature_report" },
      { href: "/admin/config",      label: "System Config", icon: Settings,     moduleKey: "system_config" },
    ],
  },
];

// ─── Role badge styles ────────────────────────────────────────

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  super_admin: { label: "Super Admin",    cls: "bg-purple-500/10 text-purple-500" },
  accounts:    { label: "Accounts",       cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  hr:          { label: "HR",             cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  manager:     { label: "Department Lead",cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  lead:        { label: "Team Lead",      cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  employee:    { label: "Employee",       cls: "bg-theme-raised text-theme-muted" },
  sales:       { label: "Sales",          cls: "bg-rose-500/10 text-rose-500" },
  internship:  { label: "Internship",     cls: "bg-indigo-500/10 text-indigo-500" },
};

// ─── Sidebar component ────────────────────────────────────────

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { user, permissions, logout } = useAuth();
  const pathname  = usePathname();
  const { theme, setTheme } = useTheme();
  const navRef    = useRef<HTMLElement>(null);

  const roleInfo = ROLE_BADGE[user?.role ?? "employee"] ?? ROLE_BADGE.employee;

  // ── Permission filtering ──────────────────────────────────
  // Uses MASTER_NAV so ANY module enabled in DB will show up, regardless of role.
  // - permissions null  → permissions still loading (AuthProvider ensures this is very brief)
  //                       show all items as safe fallback (DashboardShell loading state hides the flash)
  // - perm not found    → module not in DB for this role → hidden
  // - perm.can_view     → respect the DB value
  const sections: NavSection[] = MASTER_NAV
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // While permissions are loading, show all (DashboardShell blocks render anyway)
        if (!permissions) return true;
        const perm = permissions[item.moduleKey];
        // No DB row for this module/role = not enabled = hidden
        if (!perm) return false;
        return perm.can_view;
      }),
    }))
    .filter((section) => section.items.length > 0);

  // Restore scroll position
  useEffect(() => {
    const saved = sessionStorage.getItem("sidebar-scroll");
    if (saved && navRef.current) {
      navRef.current.scrollTop = parseInt(saved, 10);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    sessionStorage.setItem("sidebar-scroll", e.currentTarget.scrollTop.toString());
  };

  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/admin" || href === "/dashboard" || href === "/manager/dashboard") {
      return pathname === href;
    }
    if (pathname.startsWith(href + "/")) {
      const hasMoreSpecific = allHrefs.some(
        (h) => h !== href && pathname.startsWith(h) && h.length > href.length
      );
      return !hasMoreSpecific;
    }
    return false;
  };

  return (
    <aside className={cn(
      "relative flex h-screen flex-col flex-shrink-0 transition-all duration-300 ease-in-out z-50",
      "bg-sidebar/95 backdrop-blur-xl border-r border-sidebar shadow-2xl shadow-black/10",
      collapsed ? "w-[72px]" : "w-64"
    )}>
      {/* Header */}
      <div className={cn(
        "flex h-[60px] items-center border-b border-sidebar transition-all duration-300",
        collapsed ? "justify-center px-0" : "justify-between px-5"
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-theme-primary text-white font-black text-sm">
            N
          </div>
          {!collapsed && (
            <span className="text-sm font-bold text-theme-fg tracking-tight truncate">
              Namaah Nexus
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-colors"
          >
            <ChevronLeft size={15} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-[82px] z-20 flex h-6 w-6 items-center justify-center rounded-full bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-fg shadow-sm transition-all"
        >
          <ChevronRight size={12} strokeWidth={2.5} />
        </button>
      )}

      {/* Nav */}
      <nav
        ref={navRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5 scrollbar-hide"
      >
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="section-label px-2 mb-2">{section.title}</p>
            )}
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      scroll={false}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center rounded-lg transition-all duration-150",
                        collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-2.5 px-3 py-2",
                        active
                          ? "bg-theme-primary/10 text-theme-primary"
                          : "text-theme-muted hover:bg-theme-raised hover:text-theme-fg"
                      )}
                    >
                      <Icon size={15} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" />
                      {!collapsed && (
                        <span className="truncate text-sm font-medium">{label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar p-3 space-y-2">
        {!collapsed && (
          <div className="rounded-xl bg-gradient-to-br from-theme-raised/80 to-theme-raised/30 border border-theme-border/50 px-3 py-3 shadow-sm mb-2 group">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-xs font-bold text-theme-fg truncate group-hover:text-theme-primary transition-colors">{user?.name ?? "—"}</p>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex-shrink-0 shadow-sm",
                roleInfo.cls
              )}>
                {roleInfo.label}
              </span>
            </div>
            <p className="text-[10px] text-theme-muted truncate font-medium opacity-70 italic">{user?.email ?? "—"}</p>
          </div>
        )}
        <div className={cn("flex gap-2", collapsed && "flex-col items-center")}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-theme-muted hover:text-theme-fg hover:bg-theme-raised transition-colors",
              collapsed ? "w-10 h-10" : "flex-1"
            )}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {!collapsed && (theme === "dark" ? "Light" : "Dark")}
          </button>
          <button
            onClick={() => logout()}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors",
              collapsed ? "w-10 h-10" : "flex-1"
            )}
            title="Logout"
          >
            <LogOut size={14} />
            {!collapsed && "Logout"}
          </button>
        </div>
      </div>
    </aside>
  );
}
