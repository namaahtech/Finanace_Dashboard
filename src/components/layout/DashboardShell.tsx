"use client";

import { useAuth, getDashboardForRole, type Role } from "./AuthProvider";
import { Sidebar } from "./Sidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GlobalAttendanceWidget } from "./GlobalAttendanceWidget";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  moduleKey?: string;
}

export function DashboardShell({ children, title, subtitle, actions, moduleKey }: DashboardShellProps) {
  const { user, permissions, loading } = useAuth();
  const router = useRouter();

  // Redirect away when not authenticated
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Real-time permission guard
  useEffect(() => {
    if (!moduleKey || !user || !permissions) return;

    const perm = permissions[moduleKey];
    if (perm && !perm.can_view) {
      router.replace(getDashboardForRole(user.role as Role));
    }
  }, [permissions, moduleKey, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="bg-background overflow-x-hidden min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 sm:px-6 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1 min-w-0">
            {title && <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight leading-tight truncate">{title}</h1>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5 leading-snug truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
            <GlobalAttendanceWidget />
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden p-4 sm:p-5 lg:p-6">
          <div className="mx-auto w-full max-w-[1400px]">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
