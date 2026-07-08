"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Activity, Wallet, CalendarDays, RefreshCw, Radio,
  CheckCircle2, PencilLine, IndianRupee,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

interface Event {
  id: string;
  action: string;
  section: string;
  summary: string;
  target_type: string | null;
  target_id: string | null;
  actor_name: string | null;
  created_at: string;
}
interface Account { id: string; name: string; email: string; employee_id: string }

function initials(name?: string | null) {
  return (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function actionMeta(action: string) {
  if (action.includes("payment")) return { icon: Wallet, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", label: "Payment" };
  if (action === "internship.cycle.update") return { icon: PencilLine, cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400", label: "Cycle" };
  return { icon: Activity, cls: "bg-muted text-muted-foreground", label: "Action" };
}

export default function InternActivityPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({ total: 0, payments: 0, holidays: 0 });
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const acctRef = useRef<Account | null>(null);

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true);
    try {
      const res = await fetch("/api/interns/activity", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setAccount(json.account);
        acctRef.current = json.account;
        setEvents(json.events || []);
        setStats(json.stats || { total: 0, payments: 0, holidays: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  // Realtime: subscribe to new audit rows (audit_logs is in the supabase_realtime
  // publication). Refetch on ANY audit insert — cheap, and avoids missing rows if
  // acctRef isn't populated yet. A 5s poll + refetch-on-focus guarantee freshness
  // even if realtime is unavailable in an environment.
  useEffect(() => {
    const channel = supabase
      .channel("intern-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => {
        load(false);
      })
      .subscribe((status) => { setLive(status === "SUBSCRIBED"); });

    const poll = setInterval(() => load(false), 5000);
    const onFocus = () => load(false);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  const statCards = [
    { label: "Total Actions", value: stats.total, icon: Activity },
    { label: "Payments Recorded", value: stats.payments, icon: Wallet },
    { label: "Holidays Set", value: stats.holidays, icon: CalendarDays },
  ];

  return (
    <DashboardShell moduleKey="payroll_internship">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/payroll/internship">
              <Button variant="ghost" size="sm" className="text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Stipend</Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Intern Activity</h1>
              <p className="text-sm text-muted-foreground">
                Everything the internship-payroll helper has done{account ? ` — ${account.name}` : ""}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("gap-1.5", live ? "text-emerald-600 border-emerald-500/30" : "text-muted-foreground")}>
              <Radio className={cn("h-3 w-3", live && "animate-pulse")} /> {live ? "Live" : "Polling"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => load(true)}><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          </div>
        </div>

        {/* Account card */}
        {account && (
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Avatar className="h-10 w-10"><AvatarFallback>{initials(account.name)}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <div className="font-medium">{account.name}</div>
                <div className="text-xs text-muted-foreground">{account.email} · {account.employee_id}</div>
              </div>
              <Badge variant="secondary" className="ml-auto">Scoped: Internship only</Badge>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="rounded-lg bg-primary/10 p-2.5"><s.icon className="h-5 w-5 text-primary" /></div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Timeline */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : events.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-3 opacity-40" />
                No activity yet. Actions the intern takes on the stipend pages will appear here in realtime.
              </div>
            ) : (
              <ol className="divide-y divide-border">
                {events.map((e) => {
                  const meta = actionMeta(e.action);
                  const Icon = meta.icon;
                  return (
                    <li key={e.id} className="flex items-start gap-3 px-5 py-3.5">
                      <div className={cn("rounded-full p-1.5 mt-0.5 shrink-0", meta.cls)}><Icon className="h-3.5 w-3.5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground leading-snug">{e.summary}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{meta.label}</Badge>
                          <span className="text-[11px] text-muted-foreground" title={dayjs(e.created_at).format("DD MMM YYYY, HH:mm:ss")}>
                            {dayjs(e.created_at).fromNow()}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
