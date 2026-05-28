"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
import {
  Shield, Search, RefreshCw, Filter, User, Mail, LogIn, LogOut,
  UserPlus, AlertCircle, Calendar, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dayjs from "dayjs";

interface AuditLog {
  id:          string;
  user_id:     string | null;
  action:      string;
  target_type: string | null;
  target_id:   string | null;
  metadata:    Record<string, any>;
  ip_address:  string | null;
  created_at:  string;
  employee?:   { name: string; email: string; employee_id: string } | null;
}

const ACTION_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  login_success:          { icon: <LogIn className="h-3.5 w-3.5" />,      color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",   label: "Login" },
  login_failed:           { icon: <AlertCircle className="h-3.5 w-3.5" />, color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",           label: "Login Failed" },
  employee_created:       { icon: <UserPlus className="h-3.5 w-3.5" />,    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400", label: "Employee Created" },
  mailbox_provisioned:    { icon: <Mail className="h-3.5 w-3.5" />,        color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",        label: "Mailbox Provisioned" },
  offboarding_started:    { icon: <UserPlus className="h-3.5 w-3.5" />,    color: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400", label: "Offboarding Started" },
  offboarding_finalized:  { icon: <LogOut className="h-3.5 w-3.5" />,      color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",            label: "Offboarded" },
  statutory_events_seeded:{ icon: <Calendar className="h-3.5 w-3.5" />,    color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400", label: "Events Seeded" },
};

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const [logs,      setLogs]      = useState<AuditLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page,      setPage]      = useState(0);
  const [total,     setTotal]     = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*, employee:employees!audit_logs_user_id_fkey(name,email,employee_id)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (actionFilter) query = query.eq("action", actionFilter);
      if (search)       query = query.or(`action.ilike.%${search}%,target_id.ilike.%${search}%`);

      const { data, count, error } = await query;
      if (!error) {
        setLogs((data || []) as any);
        setTotal(count || 0);
      }
    } catch {}
    setLoading(false);
  }, [page, search, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function formatMetadata(meta: Record<string, any>) {
    if (!meta) return null;
    const entries = Object.entries(meta).filter(([k]) => !["password", "hash"].includes(k));
    if (!entries.length) return null;
    return entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(" · ");
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-theme-fg flex items-center gap-2">
              <Shield className="h-6 w-6 text-indigo-500" /> Audit Log
            </h1>
            <p className="text-sm text-theme-muted mt-0.5">All system events — logins, provisioning, offboarding, and changes</p>
          </div>
          <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-theme-border text-sm font-bold text-theme-muted hover:text-theme-fg transition-colors">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search actions or targets…"
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-theme-border bg-theme-card text-sm text-theme-fg focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
            <Select value={actionFilter || "all"} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="h-11 w-[200px]"><SelectValue placeholder="All Actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(ACTION_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Events", value: total, color: "text-theme-fg" },
            { label: "Logins Today", value: logs.filter(l => l.action === "login_success" && dayjs(l.created_at).isToday()).length, color: "text-green-600" },
            { label: "Failed Logins", value: logs.filter(l => l.action === "login_failed").length, color: "text-red-600" },
            { label: "Offboardings", value: logs.filter(l => l.action.startsWith("offboarding")).length, color: "text-orange-600" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-theme-border bg-theme-card px-4 py-3">
              <div className={cn("text-xl font-black", s.color)}>{s.value}</div>
              <div className="text-xs text-theme-muted font-bold uppercase tracking-widest mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-theme-border overflow-hidden bg-theme-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-page">
                  {["Action","Actor","Target","Details","Time"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-theme-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-theme-border animate-pulse">
                      {[1,2,3,4,5].map(j => (
                        <td key={j} className="px-4 py-3"><div className="h-3 bg-theme-border rounded w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-theme-muted">
                      <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No audit events found
                    </td>
                  </tr>
                ) : (
                  logs.map(log => {
                    const meta = ACTION_META[log.action];
                    return (
                      <tr key={log.id} className="border-b border-theme-border hover:bg-theme-page/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold", meta?.color || "bg-theme-page text-theme-muted")}>
                            {meta?.icon}
                            {meta?.label || log.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.employee ? (
                            <div>
                              <div className="font-semibold text-theme-fg text-xs">{log.employee.name}</div>
                              <div className="text-[11px] text-theme-muted">{log.employee.employee_id}</div>
                            </div>
                          ) : (
                            <span className="text-theme-muted text-xs">System</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {log.target_type && (
                            <span className="text-xs text-theme-muted">
                              <span className="font-bold text-theme-fg capitalize">{log.target_type}</span>
                              {log.target_id && ` · ${log.target_id.slice(0, 20)}…`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <span className="text-[11px] text-theme-muted truncate block">
                            {formatMetadata(log.metadata)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-theme-muted">
                          {dayjs(log.created_at).format("MMM D, YYYY HH:mm")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-theme-border">
              <span className="text-xs text-theme-muted">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-theme-border disabled:opacity-40 hover:bg-theme-page transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-theme-fg">{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-theme-border disabled:opacity-40 hover:bg-theme-page transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
