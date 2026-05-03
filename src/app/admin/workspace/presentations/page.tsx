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
  "from-violet-500 to-purple-600", "from-fuchsia-500 to-pink-600",
  "from-rose-500 to-red-600", "from-indigo-500 to-blue-600",
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
      const res = await axios.get("/api/workspace/presentations");
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

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Presentation size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-theme-fg">Presentations</h1>
            <p className="text-xs text-theme-muted">{ppts.length} presentation{ppts.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={createPpt} disabled={creating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors shadow-sm">
          <Plus size={16} /> New Presentation
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search presentations..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-theme-border bg-theme-surface text-sm text-theme-fg placeholder:text-theme-muted focus:outline-none focus:border-violet-500" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={13} className="text-theme-muted" /></button>}
        </div>
        {(["all","pinned"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-2 rounded-xl text-xs font-bold capitalize",
            filter === f ? "bg-violet-500/10 text-violet-600" : "text-theme-muted hover:bg-theme-raised")}>
            {f === "all" ? "All" : "Pinned"}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setView("grid")} className={cn("p-2 rounded-lg", view === "grid" ? "bg-violet-500/10 text-violet-600" : "text-theme-muted hover:bg-theme-raised")}><Grid3X3 size={15} /></button>
          <button onClick={() => setView("list")} className={cn("p-2 rounded-lg", view === "list" ? "bg-violet-500/10 text-violet-600" : "text-theme-muted hover:bg-theme-raised")}><List size={15} /></button>
        </div>
      </div>

      {loading ? (
        <div className={cn("grid gap-4", view === "grid" ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1")}>
          {[...Array(6)].map((_, i) => <div key={i} className="rounded-2xl bg-theme-raised animate-pulse" style={{ aspectRatio: "16/9" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Presentation size={48} className="mx-auto mb-4 text-theme-muted opacity-30" />
          <p className="font-bold text-theme-fg mb-1">No presentations yet</p>
          <p className="text-sm text-theme-muted mb-4">Create your first presentation to get started.</p>
          <button onClick={createPpt} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold">
            <Plus size={15} /> Create Presentation
          </button>
        </div>
      ) : (
        <div className={cn("grid gap-4", view === "grid" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1")}>
          {filtered.map((p) => {
            const ci = p.id.charCodeAt(0) % COVER_GRADIENTS.length;
            return view === "grid" ? (
              <div key={p.id} onClick={() => router.push(`/admin/workspace/presentations/${p.id}`)}
                className="group relative bg-theme-surface border border-violet-200 dark:border-violet-900 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer">
                {/* 16:9 slide preview */}
                <div className={cn("relative bg-gradient-to-br", COVER_GRADIENTS[ci])} style={{ aspectRatio: "16/9" }}>
                  <div className="absolute inset-4 flex flex-col items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center w-full">
                      <p className="text-white font-black text-sm truncate">{p.title}</p>
                      <p className="text-white/60 text-xs mt-1">{p.slides?.length ?? 1} slide{(p.slides?.length ?? 1) !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {p.is_pinned && <span className="absolute top-2 right-2"><Pin size={12} className="text-white/80" /></span>}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm text-theme-fg truncate group-hover:text-violet-600">{p.title}</h3>
                  <p className="text-xs text-theme-muted">{p.owner?.name ?? "You"} · {dayjs(p.last_edited_at).fromNow()}</p>
                </div>
                <PptMenu p={p} onPin={() => togglePin(p)} onArchive={() => archivePpt(p)} onDelete={() => deletePpt(p)} />
              </div>
            ) : (
              <div key={p.id} onClick={() => router.push(`/admin/workspace/presentations/${p.id}`)}
                className="group flex items-center gap-4 px-4 py-3 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-raised cursor-pointer">
                <span className="text-xl">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-theme-fg truncate group-hover:text-violet-600">{p.title}</p>
                  <p className="text-xs text-theme-muted">{p.owner?.name ?? "You"} · {p.slides?.length ?? 1} slides · {dayjs(p.last_edited_at).fromNow()}</p>
                </div>
                {p.is_pinned && <Pin size={12} className="text-amber-500" />}
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

function PptMenu({ p, onPin, onArchive, onDelete }: { p: Ppt; onPin: () => void; onArchive: () => void; onDelete: () => void; }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setMenu(!menu)} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-black/20 backdrop-blur-sm flex items-center justify-center">
        <MoreVertical size={13} className="text-white" />
      </button>
      {menu && (
        <div className="absolute top-8 left-0 z-50 w-36 rounded-xl border border-theme-border bg-theme-surface shadow-xl p-1">
          <button onClick={() => { onPin(); setMenu(false); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg"><Pin size={12} />{p.is_pinned ? "Unpin" : "Pin"}</button>
          <button onClick={() => { onArchive(); setMenu(false); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg"><Archive size={12} />Archive</button>
          <button onClick={() => { onDelete(); setMenu(false); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-rose-500/10 flex items-center gap-2 text-rose-500"><Trash2 size={12} />Delete</button>
        </div>
      )}
    </div>
  );
}
