"use client";

import { useAuth } from "./AuthProvider";
import { Sidebar } from "./Sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
 children: React.ReactNode;
 title?: string;
 subtitle?: string;
 actions?: React.ReactNode;
}

import { GlobalAttendanceWidget } from "./GlobalAttendanceWidget";

export function DashboardShell({ children, title, subtitle, actions }: DashboardShellProps) {
 const { user, loading } = useAuth();
 const router = useRouter();
 const [collapsed, setCollapsed] = useState(false);

 useEffect(() => {
 if (!loading && !user) router.replace("/login");
 }, [user, loading, router]);

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
 <header className="sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border bg-theme-surface/80 px-6 py-4 backdrop-blur-md">
 <div>
 {title && <h1 className="text-xl font-black text-theme-fg tracking-tight leading-tight">{title}</h1>}
 {subtitle && <p className="text-[11px] font-bold text-theme-muted uppercase tracking-widest mt-1">{subtitle}</p>}
 </div>
 <div className="flex items-center gap-3 flex-shrink-0">
 <GlobalAttendanceWidget />
 {actions}
 </div>
 </header>
 <div className="flex-1 p-6 lg:p-8">
 <div className="max-w-[1400px] mx-auto">
 {children}
 </div>
 </div>
 </main>
 </div>
 );
}
