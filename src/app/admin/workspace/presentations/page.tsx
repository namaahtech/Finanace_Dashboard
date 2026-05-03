"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import {
  Presentation, Plus, Search, Pin, Archive, Trash2, MoreVertical, X, Grid3X3, List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "axios";

dayjs.extend(relativeTime);

interface Ppt {
  id: string;
  title: string;
  icon: string;
  is_pinned: boolean;
  status: string;
  slides: any[];
  last_edited_at: string;
  owner?: { name: string };
}

const COVER_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-fuchsia-500 to-pink-600",
  "from-rose-500 to-red-600",
  "from-indigo-500 to-blue-600",
];

export default function PresentationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ppts, setPpts] = useState<Ppt[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchPpts(); }, []);

  async function fetchPpts() {
    setLoading(true);
    try {
      const res = await axios.get(`/api/workspace/presentations?userId=${user?.id}&userRole=${user?.role}`);
      setPpts(res.data.presentations || []);
    } catch { } finally { setLoading(false); }
  }

  async function createPpt() {
    setCreating(true);
    try {
      const res = await axios.post("/api/workspace/presentations", { owner_id: user?.id });
      router.push(`/admin/workspace/presentations/${res.data.presentation.id}`);
    } catch { } finally { setCreating(false); }
  }

  async function togglePin(p: Ppt) {
    await axios.patch(`/api/workspace/presentations/${p.id}`, { is_pinned: !p.is_pinned });
    fetchPpts();
  }
  async function archivePpt(p: Ppt) {
    await axios.patch(`/api/workspace/presentations/${p.id}`, { status: "archived" });
    fetchPpts();
  }
  async function deletePpt(p: Ppt) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await axios.delete(`/api/workspace/presentations/${p.id}`);
    fetchPpts();
  }

  const filtered = ppts.filter((p) => {
    if (filter === "pinned" && !p.is_pinned) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pinned = filtered.filter(p => p.is_pinned);
  const rest = filtered.filter(p => !p.is_pinned);

  return (
    <DashboardShell
      title="Presentations"
      subtitle="Slide decks and visual stories"
      actions={
        <button
          onClick={createPpt}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Plus size={14} /> New Presentation
        </button>
      }
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search presentations…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-theme-border bg-theme-surface text-sm text-theme-fg placeholder:text-theme-muted focus:outline-none focus:border-theme-strong transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={13} className="text-theme-muted" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-theme-raised rounded-lg p-0.5">
          {(["all", "pinned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all",
                filter === f ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg"
              )}
            >
              {f === "all" ? `All (${ppts.length})` : `Pinned (${ppts.filter(p => p.is_pinned).length})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-theme-raised rounded-lg p-0.5">
          <button
            onClick={() => setView("grid")}
            className={cn("p-2 rounded-md transition-all", view === "grid" ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}
          >
            <Grid3X3 size={14} />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("p-2 rounded-md transition-all", view === "list" ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className={cn("grid gap-4", view === "grid" ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1")}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl bg-theme-raised border border-theme-border animate-pulse" style={{ aspectRatio: "16/9" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="h-14 w-14 rounded-xl bg-theme-raised border border-theme-border flex items-center justify-center">
            <Presentation size={24} className="text-theme-muted opacity-40" />
          </div>
          <div>
            <p className="font-semibold text-theme-fg mb-1">No presentations yet</p>
            <p className="text-sm text-theme-muted">Create your first presentation to get started.</p>
          </div>
          <button
            onClick={createPpt}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-white text-xs font-semibold"
          >
            <Plus size={14} /> Create Presentation
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned */}
          {pinned.length > 0 && (
            <div className="space-y-3">
              <p className="section-label px-1 flex items-center gap-2">
                <Pin size={10} /> Pinned · {pinned.length}
              </p>
              <div className={cn("grid gap-4", view === "grid" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1")}>
                {pinned.map((p) => (
                  <PptItem key={p.id} p={p} view={view} onOpen={() => router.push(`/admin/workspace/presentations/${p.id}`)} onPin={() => togglePin(p)} onArchive={() => archivePpt(p)} onDelete={() => deletePpt(p)} />
                ))}
              </div>
            </div>
          )}

          {/* Rest */}
          {rest.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && <p className="section-label px-1">All Presentations · {rest.length}</p>}
              <div className={cn("grid gap-4", view === "grid" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1")}>
                {rest.map((p) => (
                  <PptItem key={p.id} p={p} view={view} onOpen={() => router.push(`/admin/workspace/presentations/${p.id}`)} onPin={() => togglePin(p)} onArchive={() => archivePpt(p)} onDelete={() => deletePpt(p)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}

function PptItem({ p, view, onOpen, onPin, onArchive, onDelete }: {
  p: Ppt;
  view: "grid" | "list";
  onOpen: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const ci = p.id.charCodeAt(0) % COVER_GRADIENTS.length;

  if (view === "list") {
    return (
      <div
        onClick={onOpen}
        className="group flex items-center gap-4 px-4 py-3 rounded-xl border border-theme-border bg-theme-card hover:bg-theme-raised cursor-pointer transition-all"
      >
        <div className={cn("h-10 w-16 rounded-lg bg-gradient-to-br flex-shrink-0", COVER_GRADIENTS[ci])} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-theme-fg truncate group-hover:text-theme-primary transition-colors">{p.title}</p>
          <p className="text-xs text-theme-muted">{p.owner?.name ?? "You"} · {p.slides?.length ?? 1} slides · {dayjs(p.last_edited_at).fromNow()}</p>
        </div>
        {p.is_pinned && <Pin size={12} className="text-amber-500 flex-shrink-0" />}
        <PptMenu p={p} onPin={onPin} onArchive={onArchive} onDelete={onDelete} />
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      className="group relative bg-theme-card border border-theme-border rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className={cn("relative bg-gradient-to-br", COVER_GRADIENTS[ci])} style={{ aspectRatio: "16/9" }}>
        <div className="absolute inset-4 flex flex-col items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center w-full">
            <p className="text-white font-bold text-sm truncate">{p.title}</p>
            <p className="text-white/60 text-xs mt-0.5">{p.slides?.length ?? 1} slide{(p.slides?.length ?? 1) !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {p.is_pinned && (
          <span className="absolute top-2 right-2">
            <Pin size={11} className="text-white/80" />
          </span>
        )}
        <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
          <PptMenu p={p} onPin={onPin} onArchive={onArchive} onDelete={onDelete} dark />
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-theme-fg truncate group-hover:text-theme-primary transition-colors">{p.title}</h3>
        <p className="text-xs text-theme-muted">{p.owner?.name ?? "You"} · {dayjs(p.last_edited_at).fromNow()}</p>
      </div>
    </div>
  );
}

function PptMenu({ p, onPin, onArchive, onDelete, dark }: {
  p: Ppt;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  dark?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setMenu(!menu)}
        className={cn(
          "opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
          dark ? "bg-black/20 backdrop-blur-sm" : "hover:bg-theme-raised"
        )}
      >
        <MoreVertical size={13} className={dark ? "text-white" : "text-theme-muted"} />
      </button>
      {menu && (
        <div className="absolute top-8 left-0 z-[9999] w-36 rounded-xl border border-theme-border bg-theme-surface shadow-xl p-1">
          <button onClick={() => { onPin(); setMenu(false); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg">
            <Pin size={12} />{p.is_pinned ? "Unpin" : "Pin"}
          </button>
          <button onClick={() => { onArchive(); setMenu(false); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg">
            <Archive size={12} />Archive
          </button>
          <button onClick={() => { onDelete(); setMenu(false); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-rose-500/10 flex items-center gap-2 text-rose-500">
            <Trash2 size={12} />Delete
          </button>
        </div>
      )}
    </div>
  );
}
