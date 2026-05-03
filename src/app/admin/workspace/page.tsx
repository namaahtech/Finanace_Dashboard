"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import {
  BookOpen, Table2, Presentation, StickyNote, Plus, Clock,
  Pin, LayoutTemplate, ArrowRight, FileText, ChevronRight,
  Sparkles, Folder, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "axios";
import { supabase } from "@/lib/supabase";

dayjs.extend(relativeTime);

interface WorkspaceItem {
  id: string;
  title: string;
  icon: string;
  last_edited_at: string;
  is_pinned: boolean;
  owner?: { name: string };
  type: "document" | "spreadsheet" | "presentation" | "note";
}

const TYPE_CONFIG = {
  document: {
    label: "Documents",
    icon: BookOpen,
    href: "/admin/workspace/documents",
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    desc: "Rich text docs, reports & wikis",
    emoji: "📄",
  },
  spreadsheet: {
    label: "Spreadsheets",
    icon: Table2,
    href: "/admin/workspace/spreadsheets",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    desc: "Tables, trackers & data grids",
    emoji: "📊",
  },
  presentation: {
    label: "Presentations",
    icon: Presentation,
    href: "/admin/workspace/presentations",
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    desc: "Slide decks & visual stories",
    emoji: "📑",
  },
  note: {
    label: "Notes",
    icon: StickyNote,
    href: "/admin/workspace/notes",
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    desc: "Quick notes, ideas & checklists",
    emoji: "📝",
  },
};

function getGreeting(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${g}, ${name?.split(" ")[0] ?? "there"}`;
}

export default function WorkspaceHubPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [counts, setCounts] = useState({ document: 0, spreadsheet: 0, presentation: 0, note: 0 });
  const [recent, setRecent] = useState<WorkspaceItem[]>([]);
  const [pinned, setPinned] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchAll();

    // Subscribe to all relevant workspace tables for realtime updates
    const channel = supabase
      .channel('workspace-hub-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_documents' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_spreadsheets' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_presentations' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_notes' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_shares', filter: `user_id=eq.${user.id}` }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function fetchAll() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [docsRes, sheetsRes, pptsRes, notesRes] = await Promise.all([
        axios.get(`/api/workspace/documents?userId=${user.id}`),
        axios.get(`/api/workspace/spreadsheets?userId=${user.id}`),
        axios.get(`/api/workspace/presentations?userId=${user.id}`),
        axios.get(`/api/workspace/notes?userId=${user.id}`),
      ]);

      const docs = (docsRes.data.documents || []).map((d: any) => ({ ...d, type: "document" }));
      const sheets = (sheetsRes.data.spreadsheets || []).map((d: any) => ({ ...d, type: "spreadsheet" }));
      const ppts = (pptsRes.data.presentations || []).map((d: any) => ({ ...d, type: "presentation" }));
      const notes = (notesRes.data.notes || []).map((d: any) => ({ ...d, type: "note" }));

      setCounts({
        document: docs.length,
        spreadsheet: sheets.length,
        presentation: ppts.length,
        note: notes.length,
      });

      const all = [...docs, ...sheets, ...ppts, ...notes].sort(
        (a, b) => new Date(b.last_edited_at).getTime() - new Date(a.last_edited_at).getTime()
      );

      setRecent(all.slice(0, 8));
      setPinned(all.filter((i) => i.is_pinned).slice(0, 6));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function createNew(type: keyof typeof TYPE_CONFIG) {
    setCreating(true);
    try {
      const endpoints: Record<string, string> = {
        document: "/api/workspace/documents",
        spreadsheet: "/api/workspace/spreadsheets",
        presentation: "/api/workspace/presentations",
        note: "/api/workspace/notes",
      };
      const keys: Record<string, string> = {
        document: "document", spreadsheet: "spreadsheet",
        presentation: "presentation", note: "note",
      };
      const res = await axios.post(endpoints[type], { owner_id: user?.id });
      const item = res.data[keys[type]];
      if (item) {
        router.push(`/admin/workspace/${type}s/${item.id}`);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  const itemHref = (item: WorkspaceItem) =>
    `/admin/workspace/${item.type}s/${item.id}`;

  return (
    <DashboardShell>
      <div className="flex flex-col min-h-full">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-theme-primary/10 via-violet-500/5 to-transparent border border-theme-border p-8">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-theme-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-theme-muted">Workspace</span>
            </div>
            <h1 className="text-3xl font-black text-theme-fg tracking-tight mb-1">
              {getGreeting(user?.name ?? "")}
            </h1>
            <p className="text-theme-muted text-sm">Create, collaborate, and organise your team's knowledge.</p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-theme-primary/5 blur-2xl" />
          <div className="absolute right-24 -top-8 w-32 h-32 rounded-full bg-violet-500/5 blur-xl" />
        </div>

        {/* 4 type cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map((type) => {
            const cfg = TYPE_CONFIG[type];
            const Icon = cfg.icon;
            return (
              <div key={type} className={cn(
                "group relative rounded-2xl border bg-theme-surface p-5 flex flex-col gap-3 hover:shadow-lg transition-all cursor-pointer",
                cfg.border
              )}>
                <Link href={cfg.href} className="absolute inset-0 z-10" />
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg", cfg.bg)}>
                  {cfg.emoji}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-theme-fg text-sm">{cfg.label}</p>
                    <span className={cn("text-xs font-black", cfg.text)}>
                      {loading ? "—" : counts[type]}
                    </span>
                  </div>
                  <p className="text-xs text-theme-muted mt-0.5">{cfg.desc}</p>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); createNew(type); }}
                  disabled={creating}
                  className={cn(
                    "relative z-20 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
                    cfg.bg, cfg.text, "hover:opacity-80"
                  )}
                >
                  <Plus size={12} /> New
                </button>
              </div>
            );
          })}
        </div>

        {/* Pinned */}
        {pinned.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Pin size={14} className="text-theme-muted" />
              <h2 className="text-xs font-black uppercase tracking-widest text-theme-muted">Pinned</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {pinned.map((item) => {
                const cfg = TYPE_CONFIG[item.type];
                return (
                  <Link
                    key={item.id}
                    href={itemHref(item)}
                    className={cn(
                      "group rounded-xl border bg-theme-surface p-4 flex flex-col gap-2 hover:shadow-md transition-all",
                      cfg.border
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{item.icon || cfg.emoji}</span>
                      <span className="text-xs font-semibold text-theme-fg truncate flex-1">{item.title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.bg, cfg.text)}>
                        {cfg.label.replace(/s$/, "")}
                      </span>
                      <span className="text-[10px] text-theme-muted">{dayjs(item.last_edited_at).fromNow()}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-theme-muted" />
              <h2 className="text-xs font-black uppercase tracking-widest text-theme-muted">Recent</h2>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-theme-raised animate-pulse" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-16 text-theme-muted">
              <LayoutTemplate size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">Your workspace is empty</p>
              <p className="text-xs mt-1">Create your first document, spreadsheet, presentation, or note.</p>
              <div className="flex items-center gap-2 justify-center mt-4">
                {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map((type) => {
                  const cfg = TYPE_CONFIG[type];
                  return (
                    <button
                      key={type}
                      onClick={() => createNew(type)}
                      className={cn("text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5", cfg.bg, cfg.text)}
                    >
                      {cfg.emoji} {cfg.label.replace(/s$/, "")}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-theme-border overflow-hidden bg-theme-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-raised">
                    <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-theme-muted w-1/2">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-theme-muted hidden md:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-theme-muted hidden lg:table-cell">Owner</th>
                    <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-widest text-theme-muted">Edited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {recent.map((item) => {
                    const cfg = TYPE_CONFIG[item.type];
                    return (
                      <tr key={item.id} className="hover:bg-theme-raised transition-colors group cursor-pointer">
                        <td className="px-4 py-3">
                          <Link 
                            href={itemHref(item)} 
                            target="_blank"
                            onClick={() => {
                              setNavigatingId(item.id);
                              // Reset after 2 seconds since it opens in a new tab
                              setTimeout(() => setNavigatingId(null), 2000);
                            }}
                            className="flex items-center gap-3"
                          >
                            <span className="flex items-center justify-center w-6">
                              {navigatingId === item.id ? (
                                <Loader2 size={16} className="animate-spin text-theme-primary" />
                              ) : (
                                <span className="text-base">{item.icon || cfg.emoji}</span>
                              )}
                            </span>
                            <span className="font-semibold text-theme-fg truncate group-hover:text-theme-primary transition-colors">
                              {item.title}
                            </span>
                            {item.is_pinned && <Pin size={10} className="text-amber-500 flex-shrink-0" />}
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.bg, cfg.text)}>
                            {cfg.label.replace(/s$/, "")}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-theme-muted text-xs">
                          {item.owner?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-theme-muted">
                          {dayjs(item.last_edited_at).fromNow()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
