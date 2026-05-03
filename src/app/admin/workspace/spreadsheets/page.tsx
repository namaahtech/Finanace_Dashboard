"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { ShareModal } from "@/components/workspace/ShareModal";
import {
  Table2, Plus, Search, Pin, Archive, Trash2, MoreVertical, Clock,
  Grid3X3, List, X, Share2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "axios";

dayjs.extend(relativeTime);

interface Sheet {
  id: string;
  title: string;
  icon: string;
  is_pinned: boolean;
  status: string;
  tags: string[];
  last_edited_at: string;
  created_at: string;
  owner?: { id: string; name: string };
}

const COVER_GRADIENTS = [
  "from-theme-primary/70 to-emerald-600",
  "from-teal-500 to-cyan-600",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-green-500 to-emerald-700",
];

function MiniGridPreview() {
  return (
    <div className="absolute inset-2 opacity-[0.15] pointer-events-none">
      {[...Array(4)].map((_, r) => (
        <div key={r} className="flex gap-[2px] mb-[2px]">
          {[...Array(7)].map((_, c) => (
            <div key={c} className={cn("h-3 flex-1 bg-white rounded-[2px]", c === 0 && "flex-[0.6]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SheetCard({ s, onPin, onArchive, onDelete, onShare, onClick }: {
  s: Sheet;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onShare: () => void;
  onClick: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const gradIdx = s.id.charCodeAt(0) % COVER_GRADIENTS.length;

  return (
    <div
      onClick={onClick}
      className="group relative bg-theme-surface border border-theme-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      {/* Gradient cover */}
      <div className={cn("h-24 bg-gradient-to-br relative", COVER_GRADIENTS[gradIdx])}>
        <MiniGridPreview />
        <span className="absolute bottom-3 left-4 text-2xl z-10">{s.icon}</span>
        {s.is_pinned && (
          <span className="absolute top-2 right-2 z-10">
            <Pin size={11} className="text-white/80" />
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-bold text-sm text-theme-fg truncate mb-1 group-hover:text-theme-primary transition-colors">
          {s.title}
        </h3>
        <p className="text-xs text-theme-muted">
          {s.owner?.name ?? "You"} · {dayjs(s.last_edited_at).fromNow()}
        </p>
        {s.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {s.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-full font-semibold">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover action bar */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex items-center gap-1.5 bg-theme-surface/95 backdrop-blur-sm border-t border-theme-border px-3 py-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="flex-1 rounded-lg bg-theme-primary px-2 py-1.5 text-[10px] font-semibold text-theme-surface hover:opacity-90 transition-all text-center"
        >
          Open
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="flex-1 rounded-lg border border-theme-border px-2 py-1.5 text-[10px] font-semibold text-theme-fg hover:bg-theme-raised transition-all text-center flex items-center justify-center gap-1"
        >
          <Share2 size={10} /> Share
        </button>
        <div onClick={(e) => e.stopPropagation()} className="relative">
          <button
            onClick={() => setMenu(!menu)}
            className="w-7 h-7 rounded-lg border border-theme-border flex items-center justify-center hover:bg-theme-raised transition-all"
          >
            <MoreVertical size={12} className="text-theme-muted" />
          </button>
          {menu && (
            <div className="absolute right-0 bottom-9 z-50 w-36 rounded-xl border border-theme-border bg-theme-surface shadow-xl p-1">
              <button onClick={() => { onPin(); setMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg">
                <Pin size={12} />{s.is_pinned ? "Unpin" : "Pin"}
              </button>
              <button onClick={() => { onArchive(); setMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg">
                <Archive size={12} />Archive
              </button>
              <div className="h-px bg-theme-border my-1" />
              <button onClick={() => { onDelete(); setMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-rose-500/10 flex items-center gap-2 text-rose-500">
                <Trash2 size={12} />Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ListRow({ s, onPin, onArchive, onDelete, onShare, onClick }: {
  s: Sheet;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onShare: () => void;
  onClick: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 px-4 py-3 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-raised cursor-pointer transition-colors"
    >
      <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-theme-primary/10 flex items-center justify-center text-lg">
        {s.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-theme-fg truncate group-hover:text-theme-primary transition-colors">{s.title}</p>
        <p className="text-xs text-theme-muted">{s.owner?.name ?? "You"} · {dayjs(s.last_edited_at).fromNow()}</p>
      </div>
      {s.is_pinned && <Pin size={12} className="text-amber-500 flex-shrink-0" />}
      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onShare}
          className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-primary transition-all"
          title="Share"
        >
          <Share2 size={14} />
        </button>
        <div className="relative">
          <button
            onClick={() => setMenu(!menu)}
            className="p-1.5 rounded-lg hover:bg-theme-raised transition-all"
          >
            <MoreVertical size={14} className="text-theme-muted" />
          </button>
          {menu && (
            <div className="absolute right-0 top-8 z-50 w-36 rounded-xl border border-theme-border bg-theme-surface shadow-xl p-1">
              <button onClick={() => { onPin(); setMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg">
                <Pin size={12} />{s.is_pinned ? "Unpin" : "Pin"}
              </button>
              <button onClick={() => { onArchive(); setMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg">
                <Archive size={12} />Archive
              </button>
              <div className="h-px bg-theme-border my-1" />
              <button onClick={() => { onDelete(); setMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-rose-500/10 flex items-center gap-2 text-rose-500">
                <Trash2 size={12} />Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SpreadsheetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned" | "mine">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [shareTarget, setShareTarget] = useState<Sheet | null>(null);

  useEffect(() => { if (user?.id) fetchSheets(); }, [user?.id]);

  async function fetchSheets() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/workspace/spreadsheets?userId=${user.id}`);
      setSheets(res.data.spreadsheets || []);
    } catch {} finally { setLoading(false); }
  }

  async function createSheet() {
    if (!user?.id) return;
    setCreating(true);
    try {
      const res = await axios.post("/api/workspace/spreadsheets", {
        owner_id: user.id,
        title: "Untitled Spreadsheet",
      });
      router.push(`/admin/workspace/spreadsheets/${res.data.spreadsheet.id}`);
    } catch {} finally { setCreating(false); }
  }

  async function togglePin(s: Sheet) {
    if (!user?.id) return;
    await axios.patch(`/api/workspace/spreadsheets/${s.id}?userId=${user.id}`, { is_pinned: !s.is_pinned });
    fetchSheets();
  }

  async function archiveSheet(s: Sheet) {
    if (!user?.id) return;
    await axios.patch(`/api/workspace/spreadsheets/${s.id}?userId=${user.id}`, { status: "archived" });
    fetchSheets();
  }

  async function deleteSheet(s: Sheet) {
    if (!user?.id) return;
    if (!confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    await axios.delete(`/api/workspace/spreadsheets/${s.id}?userId=${user.id}`);
    fetchSheets();
  }

  const filtered = sheets.filter((s) => {
    if (filter === "pinned" && !s.is_pinned) return false;
    if (filter === "mine" && s.owner?.id !== user?.id) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pinned = filtered.filter((s) => s.is_pinned);
  const rest = filtered.filter((s) => !s.is_pinned);

  const sheetProps = (s: Sheet) => ({
    s,
    onPin: () => togglePin(s),
    onArchive: () => archiveSheet(s),
    onDelete: () => deleteSheet(s),
    onShare: () => setShareTarget(s),
    onClick: () => window.open(`/admin/workspace/spreadsheets/${s.id}`, '_blank'),
  });

  return (
    <DashboardShell
      title="Spreadsheets"
      subtitle="Your Excel-like spreadsheets — formulas, data, and AI analysis."
      actions={
        <button
          onClick={createSheet}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-theme-primary px-4 py-2 text-sm font-semibold text-theme-surface shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
        >
          <Plus size={15} />
          {creating ? "Creating…" : "New Spreadsheet"}
        </button>
      }
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spreadsheets…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-theme-border bg-theme-raised text-xs text-theme-fg outline-none focus:border-theme-primary transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={12} className="text-theme-muted" />
            </button>
          )}
        </div>

        <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-1">
          {(["all", "pinned", "mine"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all",
                filter === f ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg"
              )}>
              {f === "all" ? "All" : f === "pinned" ? "Pinned" : "Mine"}
              <span className="ml-1.5 rounded-md bg-theme-page px-1.5 py-0.5 text-[10px] font-bold text-theme-muted">
                {f === "all" ? sheets.length : f === "pinned" ? sheets.filter(s => s.is_pinned).length : sheets.filter(s => s.owner?.id === user?.id).length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto border border-theme-border rounded-xl p-1">
          <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-lg transition-all", view === "grid" ? "bg-theme-primary/10 text-theme-primary" : "text-theme-muted hover:bg-theme-raised")}>
            <Grid3X3 size={14} />
          </button>
          <button onClick={() => setView("list")} className={cn("p-1.5 rounded-lg transition-all", view === "list" ? "bg-theme-primary/10 text-theme-primary" : "text-theme-muted hover:bg-theme-raised")}>
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={cn("grid gap-4", view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1")}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={cn("rounded-2xl bg-theme-raised animate-pulse", view === "grid" ? "h-44" : "h-14")} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-theme-border py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-theme-raised mb-4">
            <Table2 size={24} className="text-theme-muted" />
          </div>
          <p className="text-sm font-semibold text-theme-fg">
            {search ? "No spreadsheets match your search" : "No spreadsheets yet"}
          </p>
          <p className="text-xs text-theme-muted mt-1">
            {search ? "Try a different keyword" : "Create your first spreadsheet to get started"}
          </p>
          {!search && (
            <button
              onClick={createSheet}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-theme-primary px-4 py-2 text-xs font-semibold text-theme-surface hover:opacity-90 transition-all"
            >
              <Plus size={13} /> New Spreadsheet
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pin size={11} className="text-theme-muted" />
                <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Pinned</span>
              </div>
              <div className={cn("grid gap-4", view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1")}>
                {view === "grid"
                  ? pinned.map((s) => <SheetCard key={s.id} {...sheetProps(s)} />)
                  : pinned.map((s) => <ListRow key={s.id} {...sheetProps(s)} />)}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={11} className="text-theme-muted" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">All Spreadsheets</span>
                </div>
              )}
              <div className={cn("grid gap-4", view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1")}>
                {view === "grid"
                  ? rest.map((s) => <SheetCard key={s.id} {...sheetProps(s)} />)
                  : rest.map((s) => <ListRow key={s.id} {...sheetProps(s)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      {shareTarget && user && (
        <ShareModal
          itemId={shareTarget.id}
          itemType="spreadsheet"
          itemTitle={shareTarget.title}
          currentUserId={user.id}
          onClose={() => setShareTarget(null)}
        />
      )}
    </DashboardShell>
  );
}
