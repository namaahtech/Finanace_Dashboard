"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, TrendingUp, Wallet, FileText, Zap, Users,
  Settings, LogOut, Sun, Moon, ChevronRight, Building2,
  GitBranch, Receipt, CreditCard, Tag, PiggyBank, Handshake,
  MessageSquare, CalendarClock, IndianRupee,
  Network, Briefcase, ChevronLeft
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavSection = { title: string; items: NavItem[] };

const superAdminNav: NavSection[] = [
  {
    title: "Organization",
    items: [
      { href: "/admin",            label: "Dashboard",       icon: LayoutDashboard },
      { href: "/admin/users",      label: "Employees",       icon: Users },
      { href: "/admin/teams",      label: "Teams",           icon: Building2 },
      { href: "/admin/org-chart",  label: "Org Chart",       icon: Network },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/attendance", label: "Attendance",      icon: CalendarDays },
      { href: "/admin/kpi",        label: "KPI / KRA",       icon: TrendingUp },
      { href: "/admin/payroll",    label: "Payroll",         icon: IndianRupee },
      { href: "/admin/incentives", label: "Incentives",      icon: Wallet },
      { href: "/admin/claims",     label: "Claims",          icon: FileText },
      { href: "/admin/reimbursements", label: "Reimbursements", icon: Receipt },
      { href: "/admin/priority",   label: "Priority Payout", icon: Zap },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/admin/invoicing",  label: "Invoicing",       icon: CreditCard },
      { href: "/admin/vendors",    label: "Vendors",         icon: Briefcase },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: Tag },
      { href: "/admin/budgets",    label: "Budgets",         icon: PiggyBank },
    ],
  },
  {
    title: "CRM",
    items: [
      { href: "/admin/crm",        label: "Sales Pipeline",  icon: GitBranch },
      { href: "/admin/crm/clients", label: "Clients",         icon: Handshake },
    ],
  },
];

const employeeNav: NavSection[] = [
  {
    title: "Personal",
    items: [
      { href: "/dashboard",                label: "My Dashboard",    icon: LayoutDashboard },
      { href: "/dashboard/attendance",     label: "Attendance",      icon: CalendarDays },
      { href: "/dashboard/performance",    label: "Performance",     icon: TrendingUp },
      { href: "/dashboard/incentives",     label: "Incentives",      icon: Wallet },
      { href: "/dashboard/payslips",       label: "Payslips",        icon: IndianRupee },
      { href: "/dashboard/reimbursements", label: "Expenditures",    icon: Receipt },
    ],
  },
  {
    title: "Communication",
    items: [
      { href: "/dashboard/messages",  label: "Messages",       icon: MessageSquare },
      { href: "/dashboard/meetings",  label: "Meetings",       icon: CalendarClock },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const sections = getNavForRole(user?.role);
  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/admin") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className={cn(
      "flex h-screen flex-col border-r border-slate-200 bg-slate-50 flex-shrink-0 transition-all duration-300 ease-in-out shadow-sm relative",
      collapsed ? "w-[78px]" : "w-64"
    )}>
      {/* Sidebar Header with Logo and Toggle */}
      <div className={cn(
        "flex h-[73px] items-center border-b border-slate-200 transition-all duration-300",
        collapsed ? "px-0 justify-center" : "px-6 justify-between"
      )}>
        <div className="flex items-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white font-black text-sm flex-shrink-0 shadow-lg">
            N
          </div>
          {!collapsed && (
            <span className="ml-3 text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
              Namaah Pulse
            </span>
          )}
        </div>
        
        {!collapsed && (
          <button 
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all"
          >
            <ChevronLeft size={16} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Collapsed Specific Toggle - Placed on the border for a professional look */}
      {collapsed && (
        <button 
          onClick={onToggle}
          className="absolute -right-3 top-[88px] z-30 h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:shadow-md transition-all animate-all duration-300"
        >
          <ChevronRight size={14} strokeWidth={3} />
        </button>
      )}

      {/* Navigation Space */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-8 scrollbar-hide">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            {!collapsed && (
              <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap overflow-hidden opacity-60">
                {section.title}
              </p>
            )}
            <ul className="space-y-1.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center rounded-lg transition-all group relative",
                        active
                          ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                          : "text-slate-600 hover:bg-slate-200 hover:text-slate-900",
                        collapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3 py-2.5"
                      )}
                      title={collapsed ? label : ""}
                    >
                      <Icon size={active ? 20 : 18} strokeWidth={active ? 2.5 : 2} className={cn("flex-shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-slate-900")} />
                      {!collapsed && (
                        <span className="truncate whitespace-nowrap text-sm font-semibold animate-in fade-in duration-300">
                          {label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Profile area */}
      <div className={cn(
        "p-4 border-t border-slate-200 bg-white/40 space-y-4 transition-all duration-300",
        collapsed ? "items-center" : ""
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3 px-3 py-1">
            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase flex-shrink-0 border border-slate-300">
              {user?.name?.slice(0, 2) ?? "US"}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase tracking-tighter opacity-70">{user?.role}</p>
            </div>
          </div>
        ) : (
          <div className="h-9 w-9 mx-auto rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase border border-white shadow-sm">
             {user?.name?.slice(0, 2) ?? "US"}
          </div>
        )}
        
        <div className={cn("flex items-center px-1", collapsed ? "flex-col gap-3" : "gap-2")}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex-1 flex h-9 items-center justify-center rounded-lg border border-slate-200 py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={() => logout()}
            className="flex-1 flex h-9 items-center justify-center rounded-lg border border-slate-200 py-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all font-bold uppercase"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function getNavForRole(role?: string): NavSection[] {
  if (role === "super_admin" || role === "hr" || role === "accounts") return superAdminNav;
  return employeeNav;
}
