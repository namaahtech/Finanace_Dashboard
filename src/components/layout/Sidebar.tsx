"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard, CalendarDays, TrendingUp, Wallet, FileText, Zap, Users,
  Settings, LogOut, Sun, Moon, ChevronRight, Building2,
  GitBranch, Receipt, CreditCard, Tag, PiggyBank, Handshake,
  MessageSquare, CalendarClock, IndianRupee,
  Shield, RefreshCw, Mail, ChevronDown, Check,
  Network, Briefcase, ChevronLeft, BarChart3, ClipboardList, Folder, User,
  BookOpen, Table2, Presentation, StickyNote, LayoutTemplate, Award
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavSection = { title: string; items: NavItem[] };

// ─── Nav definitions per role ────────────────────────────

const superAdminNav: NavSection[] = [
  { title: "Organization", items: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/projects", label: "Projects", icon: Folder },
    { href: "/admin/users", label: "Employees", icon: Users },
    { href: "/admin/shifts", label: "Shift Management", icon: CalendarClock },
    { href: "/admin/teams", label: "Teams", icon: Building2 },
    { href: "/admin/org-chart", label: "Org Chart", icon: Network },
  ]},
  { title: "Workspace", items: [
    { href: "/admin/workspace", label: "Workspace Hub", icon: LayoutTemplate },
    { href: "/admin/workspace/documents", label: "Documents", icon: BookOpen },
    { href: "/admin/workspace/spreadsheets", label: "Spreadsheets", icon: Table2 },
    { href: "/admin/workspace/presentations", label: "Presentations", icon: Presentation },
    { href: "/admin/workspace/notes", label: "Notes", icon: StickyNote },
  ]},
  { title: "HR", items: [
    { href: "/admin/hr/job-clusters", label: "Job Clusters", icon: Network },
    { href: "/admin/recruitment", label: "Recruitment Hub", icon: Briefcase },
    { href: "/admin/ats", label: "ATS Scanner", icon: RefreshCw },
    { href: "/admin/interviews", label: "Interviews", icon: MessageSquare },
  ]},
  { title: "LMS Academy", items: [
    { href: "/admin/lms", label: "Academy Manager", icon: BookOpen },
    { href: "/admin/lms/courses", label: "Manage Courses", icon: ClipboardList },
    { href: "/admin/lms/certifications", label: "Certifications", icon: Award },
  ]},
  { title: "Operations", items: [
    { href: "/admin/attendance", label: "Attendance", icon: CalendarDays },
    { href: "/admin/kpi", label: "KPI / KRA", icon: TrendingUp },
    { href: "/admin/payroll", label: "Payroll", icon: IndianRupee },
    { href: "/admin/incentives", label: "Incentives", icon: Wallet },
    { href: "/admin/claims", label: "Claims", icon: FileText },
    { href: "/admin/reimbursements", label: "Reimbursements", icon: Receipt },
    { href: "/admin/priority", label: "Priority Payout", icon: Zap },
  ]},
  { title: "Finance", items: [
    { href: "/admin/invoicing", label: "Invoicing", icon: CreditCard },
    { href: "/admin/vendors", label: "Vendors", icon: Briefcase },
    { href: "/admin/subscriptions", label: "Subscriptions", icon: Tag },
    { href: "/admin/budgets", label: "Budgets", icon: PiggyBank },
  ]},
  { title: "CRM", items: [
    { href: "/admin/crm", label: "Sales Pipeline", icon: GitBranch },
    { href: "/admin/crm/clients", label: "Clients", icon: Handshake },
  ]},
  { title: "Comms", items: [
    { href: "/admin/messaging", label: "Messages", icon: MessageSquare },
    { href: "/admin/meetings", label: "Meetings", icon: CalendarClock },
  ]},
  { title: "System", items: [
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/permissions", label: "Permissions", icon: Shield },
    { href: "/admin/report", label: "Feature Report", icon: ClipboardList },
    { href: "/admin/config", label: "System Config", icon: Settings },
  ]},
];

const accountsNav: NavSection[] = [
  { title: "Overview", items: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  ]},
  { title: "People", items: [
    { href: "/admin/payroll", label: "Payroll", icon: IndianRupee },
    { href: "/admin/incentives", label: "Incentives", icon: Wallet },
    { href: "/admin/claims", label: "Claims", icon: FileText },
    { href: "/admin/reimbursements", label: "Reimbursements", icon: Receipt },
  ]},
  { title: "Finance", items: [
    { href: "/admin/invoicing", label: "Invoicing", icon: CreditCard },
    { href: "/admin/vendors", label: "Vendors", icon: Briefcase },
    { href: "/admin/subscriptions", label: "Subscriptions", icon: Tag },
    { href: "/admin/budgets", label: "Budgets", icon: PiggyBank },
  ]},
  { title: "Comms", items: [
    { href: "/admin/messaging", label: "Messages", icon: MessageSquare },
    { href: "/admin/meetings", label: "Meetings", icon: CalendarClock },
  ]},
  { title: "Reports", items: [
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  ]},
];

const hrNav: NavSection[] = [
  { title: "Organization", items: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/projects", label: "Projects", icon: Folder },
    { href: "/admin/users", label: "Employees", icon: Users },
    { href: "/admin/shifts", label: "Shift Management", icon: CalendarClock },
    { href: "/admin/teams", label: "Teams", icon: Building2 },
  ]},
  { title: "Workspace", items: [
    { href: "/admin/workspace", label: "Workspace Hub", icon: LayoutTemplate },
    { href: "/admin/workspace/documents", label: "Documents", icon: BookOpen },
    { href: "/admin/workspace/spreadsheets", label: "Spreadsheets", icon: Table2 },
    { href: "/admin/workspace/presentations", label: "Presentations", icon: Presentation },
    { href: "/admin/workspace/notes", label: "Notes", icon: StickyNote },
  ]},
  { title: "HR", items: [
    { href: "/admin/hr/job-clusters", label: "Job Clusters", icon: Network },
    { href: "/admin/recruitment", label: "Recruitment Hub", icon: Briefcase },
    { href: "/admin/ats", label: "ATS Scanner", icon: RefreshCw },
    { href: "/admin/interviews", label: "Interviews", icon: MessageSquare },
  ]},
  { title: "LMS Academy", items: [
    { href: "/admin/lms", label: "Academy Manager", icon: BookOpen },
    { href: "/admin/lms/certifications", label: "Certifications", icon: Award },
  ]},
  { title: "People", items: [
    { href: "/admin/attendance", label: "Attendance", icon: CalendarDays },
    { href: "/admin/kpi", label: "KPI / KRA", icon: TrendingUp },
    { href: "/admin/incentives", label: "Incentives", icon: Wallet },
    { href: "/admin/claims", label: "Claims", icon: FileText },
    { href: "/admin/reimbursements", label: "Reimbursements", icon: Receipt },
    { href: "/admin/priority", label: "Priority Payout", icon: Zap },
  ]},
  { title: "Comms", items: [
    { href: "/admin/messaging", label: "Messages", icon: MessageSquare },
    { href: "/admin/meetings", label: "Meetings", icon: CalendarClock },
  ]},
  { title: "System", items: [
    { href: "/admin/report", label: "Feature Report", icon: ClipboardList },
  ]},
];

const leadNav: NavSection[] = [
  { title: "Team", items: [
    { href: "/admin/projects", label: "Projects", icon: Folder },
    { href: "/admin/kpi", label: "KPI / KRA", icon: TrendingUp },
    { href: "/admin/recruitment", label: "Recruitment Hub", icon: Briefcase },
    { href: "/admin/ats", label: "ATS Scanner", icon: RefreshCw },
    { href: "/admin/attendance", label: "Attendance", icon: CalendarDays },
    { href: "/admin/budgets", label: "Team Budget", icon: PiggyBank },
    { href: "/admin/subscriptions", label: "Subscriptions", icon: Tag },
  ]},
  { title: "Workspace", items: [
    { href: "/admin/workspace", label: "Workspace Hub", icon: LayoutTemplate },
    { href: "/admin/workspace/documents", label: "Documents", icon: BookOpen },
    { href: "/admin/workspace/spreadsheets", label: "Spreadsheets", icon: Table2 },
    { href: "/admin/workspace/presentations", label: "Presentations", icon: Presentation },
    { href: "/admin/workspace/notes", label: "Notes", icon: StickyNote },
  ]},
  { title: "Comms", items: [
    { href: "/admin/messaging", label: "Messages", icon: MessageSquare },
    { href: "/admin/meetings", label: "Meetings", icon: CalendarClock },
  ]},
];

const salesNav: NavSection[] = [
  { title: "CRM", items: [
    { href: "/admin/crm", label: "Sales Pipeline", icon: GitBranch },
    { href: "/admin/crm/clients", label: "Clients", icon: Handshake },
  ]},
  { title: "My Info", items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    { href: "/dashboard/payslips", label: "Payslips", icon: IndianRupee },
  ]},
  { title: "Comms", items: [
    { href: "/admin/messaging", label: "Messages", icon: MessageSquare },
    { href: "/admin/meetings", label: "Meetings", icon: CalendarClock },
  ]},
];

const managerNav: NavSection[] = [
  { title: "Department", items: [
    { href: "/manager/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/projects", label: "Projects", icon: Folder },
    { href: "/manager/teams", label: "Teams", icon: Building2 },
    { href: "/manager/org-chart", label: "Org Chart", icon: Network },
    { href: "/admin/hr/job-clusters", label: "Job Clusters", icon: Network },
    { href: "/admin/recruitment", label: "Recruitment Hub", icon: Briefcase },
    { href: "/admin/ats", label: "ATS Scanner", icon: RefreshCw },
    { href: "/admin/kpi", label: "KPI / KRA", icon: TrendingUp },
  ]},
  { title: "LMS Academy", items: [
    { href: "/admin/lms", label: "Academy Manager", icon: BookOpen },
  ]},
  { title: "My Workspace", items: [
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    { href: "/dashboard/attendance", label: "Attendance", icon: CalendarDays },
    { href: "/dashboard/incentives", label: "Incentives", icon: Wallet },
    { href: "/dashboard/payslips", label: "Payslips", icon: IndianRupee },
  ]},
  { title: "Workspace", items: [
    { href: "/admin/workspace", label: "Workspace Hub", icon: LayoutTemplate },
    { href: "/admin/workspace/documents", label: "Documents", icon: BookOpen },
    { href: "/admin/workspace/spreadsheets", label: "Spreadsheets", icon: Table2 },
    { href: "/admin/workspace/presentations", label: "Presentations", icon: Presentation },
    { href: "/admin/workspace/notes", label: "Notes", icon: StickyNote },
  ]},
  { title: "Comms", items: [
    { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/meetings", label: "Meetings", icon: CalendarClock },
  ]},
];

const employeeNav: NavSection[] = [
  { title: "My Workspace", items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    { href: "/dashboard/attendance", label: "Attendance", icon: CalendarDays },
    { href: "/dashboard/performance", label: "Performance", icon: TrendingUp },
    { href: "/dashboard/incentives", label: "Incentives", icon: Wallet },
    { href: "/dashboard/payslips", label: "Payslips", icon: IndianRupee },
    { href: "/dashboard/reimbursements", label: "Reimbursements", icon: Receipt },
    { href: "/dashboard/priority", label: "Priority Payout", icon: Zap },
  ]},
  { title: "LMS Academy", items: [
    { href: "/dashboard/academy", label: "Training Academy", icon: BookOpen },
  ]},
  { title: "Workspace", items: [
    { href: "/admin/workspace", label: "Workspace Hub", icon: LayoutTemplate },
    { href: "/admin/workspace/documents", label: "Documents", icon: BookOpen },
    { href: "/admin/workspace/spreadsheets", label: "Spreadsheets", icon: Table2 },
    { href: "/admin/workspace/presentations", label: "Presentations", icon: Presentation },
    { href: "/admin/workspace/notes", label: "Notes", icon: StickyNote },
  ]},
  { title: "Comms", items: [
    { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/meetings", label: "Meetings", icon: CalendarClock },
  ]},
];

function getNav(role?: string): NavSection[] {
  switch (role) {
    case "super_admin": return superAdminNav;
    case "accounts": return accountsNav;
    case "hr": return hrNav;
    case "lead": return leadNav;
    case "manager": return managerNav;
    case "sales": return salesNav;
    default: return employeeNav;
  }
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  super_admin: { label: "Super Admin", cls: "bg-purple-500/10 text-purple-500" },
  accounts: { label: "Accounts", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  hr: { label: "HR", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  lead: { label: "Team Lead", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  manager: { label: "Department Manager", cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  employee: { label: "Employee", cls: "bg-theme-raised text-theme-muted" },
  sales: { label: "Sales", cls: "bg-rose-500/10 text-rose-500" },
};

// ─── Component ───────────────────────────────────────────

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const sections = getNav(user?.role);
  const roleInfo = ROLE_BADGE[user?.role ?? "employee"] ?? ROLE_BADGE.employee;

  const navRef = useRef<HTMLElement>(null);

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

  const allHrefs = sections.flatMap(s => s.items.map(i => i.href));

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/admin" || href === "/dashboard") return pathname === href;
    
    if (pathname.startsWith(href + "/")) {
      // Check if there is a more specific (longer) match in the sidebar
      const hasMoreSpecificMatch = allHrefs.some(otherHref => 
        otherHref !== href && 
        pathname.startsWith(otherHref) && 
        otherHref.length > href.length
      );
      return !hasMoreSpecificMatch;
    }
    return false;
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col flex-shrink-0 transition-all duration-300 ease-in-out",
        "bg-sidebar border-r border-sidebar",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
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
                      <Icon
                        size={15}
                        strokeWidth={active ? 2.5 : 2}
                        className="flex-shrink-0"
                      />
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
          <div className="rounded-lg bg-theme-raised/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-theme-fg truncate">{user?.name ?? "—"}</p>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", roleInfo.cls)}>
                {roleInfo.label}
              </span>
            </div>
            <p className="text-[11px] text-theme-muted truncate">{user?.email ?? "—"}</p>
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
