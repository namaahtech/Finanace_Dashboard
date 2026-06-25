"use client";

import { useAuth, getDashboardForRole, type Role } from "./AuthProvider";
import { Sidebar } from "./Sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlobalAttendanceWidget } from "./GlobalAttendanceWidget";
import { ChangePasswordModal } from "./ChangePasswordModal";
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

  // 1. One-time Zoho SAML activation for already-logged-in users whose Zoho
  //    "Last Sign In" hasn't been seeded yet (covers returning sessions where the
  //    login() hand-off didn't just run). ONE-TIME full-page hand-off to the SAML
  //    route: a top-level navigation lets Zoho set its session cookie and record
  //    the sign-in, so "Last Sign In" flips in the Admin Console (a hidden iframe
  //    could not). Zoho accepts the assertion and redirects back here. Gated on
  //    the server's zoho_activated_at (stamped by the route) so it fires exactly
  //    once and never for users who haven't set their password yet.
  useEffect(() => {
    if (!user || user.must_change_password) return;
    if (!user.zoho_email) return;
    if (user.zoho_activated_at) return; // already activated (server source of truth)
    if (sessionStorage.getItem("zoho_sso_seeded") === user.zoho_email) return;
    sessionStorage.setItem("zoho_sso_seeded", user.zoho_email);

    (async () => {
      try {
        // Make sure the server-side np_session reflects THIS user before we hit the
        // SAML route (covers returning sessions where login() didn't just run).
        const { data: sb } = await supabase.auth.getSession();
        if (sb?.session?.access_token) {
          await fetch("/api/auth/save-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: sb.session.access_token,
              refresh_token: sb.session.refresh_token,
              employee_id: user.id,
              role: user.role,
              email: user.email,
            }),
          }).catch(() => {});
        }
        window.location.href = `/api/auth/saml/sso?RelayState=${encodeURIComponent("/auth/zoho-activated")}`;
      } catch { /* non-fatal — activation will retry on next session */ }
    })();
  }, [user]);

  // 1b. One-time Back-trap after Zoho activation. The activation landing page sets
  //     this flag right before redirecting here. While the user sits on this freshly
  //     activated dashboard, intercept Back so it can't navigate to the Zoho sign-in
  //     pages still sitting in browser history. It self-clears: the flag is removed
  //     immediately, and the listener is torn down when the user navigates onward.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("nexus_post_activation") !== "1") return;
    sessionStorage.removeItem("nexus_post_activation");

    window.history.pushState(null, "", window.location.href);
    const onPop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 2. Automate inbox sync fetch on successful return from session seeding
  useEffect(() => {
    if (user?.zoho_email && sessionStorage.getItem("zoho_sso_seeded") === user.zoho_email && sessionStorage.getItem("zoho_inbox_synced") !== user.zoho_email) {
      sessionStorage.setItem("zoho_inbox_synced", user.zoho_email);
      fetch(`/api/mail/inbox?sync=true&employee_id=${user.id}`).catch(() => {});
    }
  }, [user]);

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
    <>
    <ChangePasswordModal />
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
    </>
  );
}
