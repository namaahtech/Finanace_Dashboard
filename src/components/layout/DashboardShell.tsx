"use client";

import { useAuth } from "./AuthProvider";
import { Sidebar } from "./Sidebar";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { GlobalAttendanceWidget } from "./GlobalAttendanceWidget";

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  moduleKey?: string; // when provided, redirects user away if can_view is revoked
}

function getDashboardForRole(role: string): string {
  if (role === "team_lead")  return "/team-lead/dashboard";
  if (role === "dept_lead")  return "/department-lead/dashboard";
  if (role === "employee" || role === "intern") return "/dashboard";
  return "/admin";
}

export function DashboardShell({ children, title, subtitle, actions, moduleKey }: DashboardShellProps) {
  const { user, permissions, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Redirect away when not authenticated
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Real-time permission guard: if admin revokes can_view for this page's module,
  // redirect the user to their home dashboard immediately — no refresh needed.
  useEffect(() => {
    if (!moduleKey || !user || !permissions) return;

    const perm = permissions[moduleKey];
    if (perm && !perm.can_view) {
      router.replace(getDashboardForRole(user.role));
    }
  }, [permissions, moduleKey, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-page">
        <div className="flex flex-col items-center gap-4">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-theme-fg border-t-transparent" />
          <p className="text-xs font-semibold text-theme-muted uppercase tracking-widest">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-theme-page">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <main className="flex-1 overflow-y-auto flex flex-col min-w-0 bg-theme-page">
        <header className="sticky top-0 z-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border bg-theme-surface/90 px-8 py-4 backdrop-blur-md">
          <div className="flex-1 min-w-0">
            {title && <h1 className="text-2xl font-black text-theme-fg tracking-tight leading-none">{title}</h1>}
            {subtitle && <p className="text-sm text-theme-muted mt-1.5 leading-snug">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}

            {/* The Global Attendance Command Center - Now at the perfect right end */}
            <GlobalAttendanceWidget />
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-10">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
