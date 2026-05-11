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
    text: "text-blue-400",
    border: "border-theme-border",
    desc: "Rich text docs, reports & wikis",
    emoji: "📄",
  },
  spreadsheet: {
    label: "Spreadsheets",
    icon: Table2,
    href: "/admin/workspace/spreadsheets",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-theme-border",
    desc: "Tables, trackers & data grids",
    emoji: "📊",
  },
  presentation: {
    label: "Presentations",
    icon: Presentation,
    href: "/admin/workspace/presentations",
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-theme-border",
    desc: "Slide decks & visual stories",
    emoji: "📑",
  },
  note: {
    label: "Notes",
    icon: StickyNote,
    href: "/admin/workspace/notes",
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-theme-border",
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
      const role = user.role || "";
      const [docsRes, sheetsRes, pptsRes, notesRes] = await Promise.all([
        axios.get(`/api/workspace/documents?userId=${user.id}&userRole=${role}`),
        axios.get(`/api/workspace/spreadsheets?userId=${user.id}&userRole=${role}`),
        axios.get(`/api/workspace/presentations?userId=${user.id}&userRole=${role}`),
        axios.get(`/api/workspace/notes?userId=${user.id}&userRole=${role}`),
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
    <DashboardShell
      moduleKey="workspace_hub" title="Workspace Hub" subtitle={getGreeting(user?.name ?? "")}>
      <div className="space-y-8">

        {/* 4 type cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map((type) => {
            const cfg = TYPE_CONFIG[type];
            return (
              <div key={type} className="group relative bg-theme-card border border-theme-border rounded-xl p-4 flex flex-col gap-3 hover:border-theme-strong hover:shadow-sm transition-all cursor-pointer">
                <Link href={cfg.href} className="absolute inset-0 z-10 rounded-xl" />
                <div className="flex items-start justify-between">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0", cfg.bg)}>
                    {cfg.emoji}
                  </div>
                  <span className={cn("text-sm font-black tabular-nums", cfg.text)}>
                    {loading ? "—" : counts[type]}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-theme-fg">{cfg.label}</p>
                  <p className="text-[11px] text-theme-muted mt-0.5 leading-snug">{cfg.desc}</p>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); createNew(type); }}
                  disabled={creating}
                  className={cn("relative z-20 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg w-fit transition-all hover:opacity-80", cfg.bg, cfg.text)}
                >
                  <Plus size={11} /> New
                </button>
              </div>
            );
          })}
        </div>

        {/* Pinned */}
        {pinned.length > 0 && (
          <div className="space-y-3">
            <p className="section-label flex items-center gap-2"><Pin size={10} fill="currentColor" /> Pinned · {pinned.length}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {pinned.map((item) => {
                const cfg = TYPE_CONFIG[item.type];
                return (
                  <Link key={item.id} href={itemHref(item)} target="_blank"
                    className="group flex items-start gap-3 bg-theme-card border border-theme-border rounded-xl p-3.5 hover:border-theme-strong hover:shadow-sm transition-all">
                    <span className="text-lg flex-shrink-0 mt-0.5">{item.icon || cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-theme-fg truncate group-hover:text-theme-primary transition-colors">{item.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", cfg.bg, cfg.text)}>{cfg.label.replace(/s$/, "")}</span>
                        <span className="text-[10px] text-theme-muted">{dayjs(item.last_edited_at).fromNow()}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent */}
        <div className="space-y-3">
          <p className="section-label flex items-center gap-2"><Clock size={10} /> Recent</p>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-theme-card border border-theme-border animate-pulse" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-theme-card border border-dashed border-theme-border rounded-xl">
              <LayoutTemplate size={32} className="text-theme-muted opacity-30" />
              <div>
                <p className="font-semibold text-sm text-theme-fg">Workspace is empty</p>
                <p className="text-xs text-theme-muted mt-1">Create your first doc, sheet, presentation or note.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map((type) => {
                  const cfg = TYPE_CONFIG[type];
                  return (
                    <button key={type} onClick={() => createNew(type)}
                      className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5", cfg.bg, cfg.text)}>
                      {cfg.emoji} {cfg.label.replace(/s$/, "")}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-raised/60">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-theme-muted w-1/2">Name</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-theme-muted hidden md:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-theme-muted hidden lg:table-cell">Owner</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Edited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {recent.map((item) => {
                    const cfg = TYPE_CONFIG[item.type];
                    return (
                      <tr key={item.id} className="hover:bg-theme-raised/50 transition-colors group cursor-pointer">
                        <td className="px-4 py-3">
                          <Link href={itemHref(item)} target="_blank"
                            onClick={() => { setNavigatingId(item.id); setTimeout(() => setNavigatingId(null), 2000); }}
                            className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-5 flex-shrink-0">
                              {navigatingId === item.id
                                ? <Loader2 size={14} className="animate-spin text-theme-primary" />
                                : <span className="text-base leading-none">{item.icon || cfg.emoji}</span>}
                            </span>
                            <span className="font-medium text-sm text-theme-fg truncate group-hover:text-theme-primary transition-colors">{item.title}</span>
                            {item.is_pinned && <Pin size={10} className="text-amber-500 flex-shrink-0" fill="currentColor" />}
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", cfg.bg, cfg.text)}>{cfg.label.replace(/s$/, "")}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-theme-muted">{item.owner?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-xs text-theme-muted">{dayjs(item.last_edited_at).fromNow()}</td>
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
