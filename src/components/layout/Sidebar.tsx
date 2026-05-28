"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, CalendarDays, TrendingUp, Wallet, FileText, Zap, Users,
  Settings, LogOut, Sun, Moon, ChevronRight, Building2,
  GitBranch, Receipt, CreditCard, Tag, PiggyBank, Handshake,
  MessageSquare, CalendarClock, IndianRupee,
  Shield, RefreshCw, Mail, Ticket,
  Network, Briefcase, BarChart3, ClipboardList, Folder, User,
  BookOpen, Table2, Presentation, StickyNote, LayoutTemplate, Award,
  Inbox, PenLine, Send, Paperclip, Layers, KeyRound, ChevronDown,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// ─── Types ───────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  moduleKey: string;
};
type NavSection = { title: string; items: NavItem[] };

// ─── MASTER NAV ───────────────────────────────────────────────
// Single source of truth for ALL possible routes in the app.
// The DB (role_permissions) controls which items are visible per role.

const MASTER_NAV: NavSection[] = [
  {
    title: "Organization",
    items: [
      { href: "/admin",             label: "Admin Overview",   icon: LayoutDashboard, moduleKey: "admin_dashboard" },
      { href: "/department-lead/dashboard", label: "Manager Hub",      icon: LayoutDashboard, moduleKey: "manager_dashboard" },
      { href: "/dashboard",         label: "My Dashboard",     icon: LayoutDashboard, moduleKey: "my_dashboard" },
      { href: "/admin/projects",    label: "Projects",         icon: Folder,          moduleKey: "projects" },
      { href: "/admin/users",       label: "Employees",        icon: Users,           moduleKey: "employees" },
      { href: "/admin/shifts",      label: "Shift Management", icon: CalendarClock,   moduleKey: "shift_management" },
      { href: "/admin/teams",       label: "Teams",            icon: Building2,       moduleKey: "teams" },
      { href: "/admin/org-chart",   label: "Org Chart",        icon: Network,         moduleKey: "org_chart" },
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
      { href: "/admin/payslips",       label: "Payslips",        icon: FileText,      moduleKey: "payslips_management" },
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
      { href: "/admin/mail/accounts",  label: "Mail Accounts",icon: Users,        moduleKey: "mail_accounts" },
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
      { href: "/dashboard/calendar",       label: "My Calendar",     icon: CalendarDays, moduleKey: "my_meetings" },
      { href: "/department-lead/teams",     label: "My Teams",        icon: Building2,    moduleKey: "manager_teams" },
      { href: "/department-lead/org-chart", label: "My Org Chart",   icon: Network,      moduleKey: "manager_org_chart" },
      { href: "/dashboard/support",        label: "Support & Help",  icon: Ticket,       moduleKey: "support_user" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/analytics",   label: "Analytics",     icon: BarChart3,    moduleKey: "analytics" },
      { href: "/admin/permissions", label: "Permissions",   icon: Shield,       moduleKey: "permissions_control" },
      { href: "/admin/audit",       label: "Audit Log",     icon: ClipboardList,moduleKey: "system_config" },
      { href: "/admin/report",      label: "Feature Report",icon: ClipboardList,moduleKey: "feature_report" },
      { href: "/admin/config",      label: "System Config", icon: Settings,     moduleKey: "system_config" },
    ],
  },
];

// ─── Role badge styles ────────────────────────────────────────

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin:     { label: "Admin",     cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  dept_lead: { label: "Dept Lead", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  team_lead: { label: "Team Lead", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  employee:  { label: "Employee",  cls: "bg-muted text-muted-foreground" },
  intern:    { label: "Intern",    cls: "bg-indigo-500/10 text-indigo-500" },
};

// ─── Sidebar component ────────────────────────────────────────

export function Sidebar() {
  const { user, permissions, logout } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const navRef = useRef<HTMLDivElement>(null);

  const roleInfo = ROLE_BADGE[user?.role ?? "employee"] ?? ROLE_BADGE.employee;

  // ── Permission filtering ──────────────────────────────────
  const sections: NavSection[] = MASTER_NAV
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!permissions) return false;
        const perm = permissions[item.moduleKey];
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
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

  // ── Accordion section state — only one open at a time ──
  const activeSectionTitle = useMemo(() => {
    for (const s of sections) {
      if (s.items.some((i) => isActive(i.href))) return s.title;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, pathname]);

  const [openSection, setOpenSection] = useState<string | null | undefined>(undefined);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = sessionStorage.getItem("sidebar-open-section");
      if (raw !== null) setOpenSection(JSON.parse(raw));
    } catch {
      // ignore parse errors
    }
  }, []);

  const toggleSection = (title: string) => {
    setOpenSection((prev) => {
      const current = prev === undefined ? activeSectionTitle : prev;
      const next = current === title ? null : title;
      try {
        sessionStorage.setItem("sidebar-open-section", JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  };

  const isSectionOpen = (title: string) => {
    const current = openSection === undefined ? activeSectionTitle : openSection;
    return current === title;
  };

  return (
    <ShadcnSidebar collapsible="icon" className="border-none">
      <SidebarHeader className="border-none">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            N
          </div>
          <span className="text-sm font-semibold tracking-tight truncate group-data-[collapsible=icon]:hidden">
            Namaah Nexus
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent ref={navRef} onScroll={handleScroll} className="gap-0">
        {sections.map((section, sectionIdx) => {
          const open = isSectionOpen(section.title);
          const sectionHasActive = section.items.some((i) => isActive(i.href));
          return (
            <SidebarGroup
              key={section.title}
              className={cn(
                "py-1.5",
                sectionIdx > 0 && "border-t border-sidebar-border group-data-[collapsible=icon]:border-t-0"
              )}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                aria-expanded={open}
                className="group/label group-data-[collapsible=icon]:hidden flex w-full items-center justify-between px-2 py-1.5 rounded-md hover:bg-sidebar-accent/60 transition-colors"
              >
                <SidebarGroupLabel asChild>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider transition-colors",
                      sectionHasActive ? "text-foreground" : "text-muted-foreground group-hover/label:text-foreground"
                    )}
                  >
                    {section.title}
                  </span>
                </SidebarGroupLabel>
                <ChevronDown
                  size={11}
                  strokeWidth={2.5}
                  className={cn(
                    "transition-transform duration-200",
                    open ? "rotate-0 text-foreground" : "-rotate-90 text-muted-foreground",
                    sectionHasActive && !open && "text-primary"
                  )}
                />
              </button>
              <SidebarGroupContent
                className={cn(
                  "mt-0.5",
                  !open && "group-data-[state=expanded]:hidden"
                )}
              >
                <SidebarMenu className="gap-0.5">
                  {section.items.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href);
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={label}
                          className={cn(
                            "relative h-9 text-[13px] rounded-md transition-colors",
                            "data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground data-[active=true]:font-semibold",
                            !active && "text-foreground/70 font-medium hover:bg-sidebar-accent/50 hover:text-foreground"
                          )}
                        >
                          <Link href={href} scroll={false}>
                            {active && (
                              <span
                                aria-hidden
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary"
                              />
                            )}
                            <Icon className="size-4 shrink-0" />
                            <span className="truncate">{label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border">
        {/* User card */}
        <div className="group-data-[collapsible=icon]:hidden rounded-lg bg-sidebar-accent/50 border border-sidebar-border px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? "—"}</p>
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0",
              roleInfo.cls
            )}>
              {roleInfo.label}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{user?.email ?? "—"}</p>
        </div>

        {/* Theme toggle + Logout */}
        <div className="flex gap-1.5 group-data-[collapsible=icon]:flex-col">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            <span className="group-data-[collapsible=icon]:hidden">
              {theme === "dark" ? "Light" : "Dark"}
            </span>
          </button>
          <button
            onClick={() => logout()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
            title="Logout"
          >
            <LogOut size={14} />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </button>
        </div>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
