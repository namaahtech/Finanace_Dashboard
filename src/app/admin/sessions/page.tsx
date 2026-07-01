"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  MonitorSmartphone, LogIn, LogOut, RefreshCw, Loader2, Search, Globe, Circle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkspaceFeed } from "@/lib/use-workspace-feed";
import {
  relTime, fullTime, roleClass, prettyRole, screenLabel, presenceStatus, lastSeenLabel,
  isLoginEvent, isLogoutEvent, isSessionEvent,
} from "@/lib/log-ui";

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export default function SessionsPage() {
  const { logs, presence, serverNow, loading, refreshing, refresh } = useWorkspaceFeed(500);
  const [q, setQ] = useState("");

  // All presence rows seen in last 8 h, active rows first, then recently-offline
  const allSessions = useMemo(() => {
    return presence
      .map((p) => ({ p, st: presenceStatus(p, serverNow) }))
      .filter(({ p }) => serverNow - new Date(p.last_seen).getTime() < EIGHT_HOURS)
      .sort((a, b) => {
        const aOff = a.st.key === "offline" ? 1 : 0;
        const bOff = b.st.key === "offline" ? 1 : 0;
        if (aOff !== bOff) return aOff - bOff;
        return new Date(b.p.last_seen).getTime() - new Date(a.p.last_seen).getTime();
      });
  }, [presence, serverNow]);

  const activeCount = useMemo(() => allSessions.filter(({ st }) => st.key !== "offline").length, [allSessions]);

  const history = useMemo(() => {
    const term = q.trim().toLowerCase();
    return logs
      .filter((l) => isSessionEvent(l.action))
      .filter((l) => !term || [l.actor_name, l.actor_emp_id, l.actor_role, l.action, l.ip_address].filter(Boolean).join(" ").toLowerCase().includes(term));
  }, [logs, q]);

  return (
    <DashboardShell
      moduleKey="sessions"
      title="Sessions"
      subtitle="Live sessions and login history — see who is signed in, from where, and their current status"
    >
      <div className="flex flex-col gap-4">
        {/* Sessions table */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MonitorSmartphone size={15} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Sessions</span>
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  {activeCount} active
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="h-8" onClick={refresh} disabled={refreshing}>
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Syncing…" : "Refresh"}
              </Button>
            </div>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto" size={20} /></div>
            ) : allSessions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-12 text-center">No sessions in the last 8 hours.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-border">
                    <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-semibold">User</th>
                      <th className="px-3 py-2 font-semibold">Role</th>
                      <th className="px-3 py-2 font-semibold">Current screen</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSessions.map(({ p, st }) => {
                      const isOffline = st.key === "offline";
                      return (
                        <tr key={p.user_id} className={cn("border-b border-border/60 hover:bg-muted/30", isOffline && "opacity-60")}>
                          <td className="px-3 py-2.5">
                            <div className="text-xs font-medium text-foreground">{p.emp?.name || "Unknown"}</div>
                            {p.emp?.employee_id && <div className="text-[10px] text-muted-foreground">{p.emp.employee_id}</div>}
                          </td>
                          <td className="px-3 py-2.5">
                            {p.emp?.role
                              ? <Badge variant="outline" className={cn("text-[9px] capitalize", roleClass(p.emp.role))}>{prettyRole(p.emp.role)}</Badge>
                              : <span className="text-[10px] text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {isOffline ? (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                                  <Globe size={11} className="text-muted-foreground" /> {screenLabel(p.current_path)}
                                </span>
                                <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[220px]">{p.current_path || "—"}</div>
                              </>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("h-2 w-2 rounded-full flex-shrink-0", st.dot)} />
                              <Badge variant="outline" className={cn("text-[9px]", st.badge)}>{st.label}</Badge>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {isOffline ? (
                              <>
                                <div className="text-xs text-muted-foreground font-medium">{lastSeenLabel(p.last_seen, serverNow)}</div>
                                <div className="text-[10px] text-muted-foreground tabular-nums">{fullTime(p.last_seen)}</div>
                              </>
                            ) : (
                              <>
                                <div className="text-xs text-foreground tabular-nums font-medium">
                                  {["available", "online", "interview", "busy"].includes(st.key) ? "Active now" : relTime(p.last_seen, serverNow)}
                                </div>
                                <div className="text-[10px] text-muted-foreground tabular-nums">{fullTime(p.last_seen)}</div>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login history */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span className="text-sm font-semibold text-foreground">Login history</span>
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search person, role, IP…" className="pl-9 h-9 text-sm" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-border">
                  <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">When</th>
                    <th className="px-3 py-2 font-semibold">User</th>
                    <th className="px-3 py-2 font-semibold">Role</th>
                    <th className="px-3 py-2 font-semibold">Event</th>
                    <th className="px-3 py-2 font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-3 py-12 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto" size={18} /></td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-12 text-center text-sm text-muted-foreground">No login events recorded yet.</td></tr>
                  ) : (
                    history.map((l) => {
                      const login = isLoginEvent(l.action);
                      const logout = isLogoutEvent(l.action);
                      return (
                        <tr key={l.id} className="border-b border-border/60 hover:bg-muted/30">
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="text-xs text-foreground tabular-nums">{relTime(l.created_at, serverNow)}</div>
                            <div className="text-[10px] text-muted-foreground tabular-nums">{fullTime(l.created_at)}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs font-medium text-foreground">{l.actor_name || "System"}</div>
                            {l.actor_emp_id && <div className="text-[10px] text-muted-foreground">{l.actor_emp_id}</div>}
                          </td>
                          <td className="px-3 py-2.5">
                            {l.actor_role
                              ? <Badge variant="outline" className={cn("text-[9px] capitalize", roleClass(l.actor_role))}>{prettyRole(l.actor_role)}</Badge>
                              : <span className="text-[10px] text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", logout ? "text-rose-600" : "text-emerald-600")}>
                              {logout ? <LogOut size={12} /> : <LogIn size={12} />}
                              {logout ? "Logout" : login ? "Login" : l.action}
                            </span>
                            <div className="text-[10px] text-muted-foreground font-mono">{l.action}</div>
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-muted-foreground font-mono">{l.ip_address || "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <Circle size={7} className="fill-emerald-500 text-emerald-500" /> Live — presence syncs instantly via Supabase realtime. Offline users shown for the last 8 hours.
        </p>
      </div>
    </DashboardShell>
  );
}
