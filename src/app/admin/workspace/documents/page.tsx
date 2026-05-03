"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { ShareModal } from "@/components/workspace/ShareModal";
import {
  BookOpen, Plus, Search, Pin, Archive, Trash2, MoreVertical,
  Clock, Grid3X3, List, X, Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "axios";

dayjs.extend(relativeTime);

interface Doc {
  id: string;
  title: string;
  icon: string;
  cover_color: string | null;
  is_pinned: boolean;
  status: string;
  tags: string[];
  last_edited_at: string;
  created_at: string;
  owner?: { id: string; name: string; employee_id: string };
}

const COVER_GRADIENTS = [
  "from-blue-400 to-indigo-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-teal-400 to-emerald-500",
  "from-sky-400 to-cyan-500",
];

function DocCard({ doc, onPin, onArchive, onDelete, onShare, onClick }: {
  doc: Doc;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onShare: () => void;
  onClick: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const colorIdx = doc.id.charCodeAt(0) % COVER_GRADIENTS.length;
  const coverGrad = doc.cover_color ?? COVER_GRADIENTS[colorIdx];

  return (
    <div
      onClick={onClick}
      className="group relative bg-theme-surface border border-theme-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      {/* Cover */}
      <div className={cn("h-24 bg-gradient-to-br", coverGrad, "relative")}>
        <span className="absolute bottom-3 left-4 text-2xl">{doc.icon}</span>
        {doc.is_pinned && (
          <span className="absolute top-2 right-2">
            <Pin size={12} className="text-white/80" />
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-bold text-sm text-theme-fg truncate mb-1 group-hover:text-theme-primary transition-colors">
          {doc.title}
        </h3>
        <p className="text-xs text-theme-muted">
          {doc.owner?.name ?? "You"} · {dayjs(doc.last_edited_at).fromNow()}
        </p>
        {doc.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {doc.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-full font-semibold">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover action bar */}
      <div
        className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-theme-surface/95 to-transparent px-3 pb-2 pt-4 flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClick}
          className="flex-1 text-[10px] font-bold rounded-lg bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-white py-1.5 transition-all"
        >
          Open
        </button>
        <button
          onClick={onShare}
          className="flex items-center gap-1 text-[10px] font-bold rounded-lg border border-theme-border bg-theme-raised text-theme-fg hover:bg-theme-primary/10 hover:text-theme-primary px-2.5 py-1.5 transition-all"
        >
          <Share2 size={10} /> Share
        </button>
        <div className="relative">
          <button
            onClick={() => setMenu(!menu)}
            className="w-7 h-[26px] rounded-lg border border-theme-border bg-theme-raised text-theme-muted hover:text-theme-fg flex items-center justify-center transition-all"
          >
            <MoreVertical size={12} />
          </button>
          {menu && (
            <div className="absolute bottom-9 right-0 z-50 w-40 rounded-xl border border-theme-border bg-theme-surface shadow-xl p-1">
              <button onClick={() => { onPin(); setMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised text-theme-fg flex items-center gap-2">
                <Pin size={12} /> {doc.is_pinned ? "Unpin" : "Pin"}
              </button>
              <button onClick={() => { onArchive(); setMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised text-theme-fg flex items-center gap-2">
                <Archive size={12} /> Archive
              </button>
              <button onClick={() => { onDelete(); setMenu(false); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-rose-500/10 text-rose-500 flex items-center gap-2">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ListRow({ doc, onPin, onArchive, onDelete, onShare, onClick }: {
  doc: Doc; onPin: () => void; onArchive: () => void; onDelete: () => void; onShare: () => void; onClick: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div onClick={onClick} className="group flex items-center gap-4 px-4 py-3 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-raised cursor-pointer transition-colors">
      <span className="text-xl flex-shrink-0">{doc.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-theme-fg truncate group-hover:text-theme-primary transition-colors">{doc.title}</p>
        <p className="text-xs text-theme-muted">{doc.owner?.name ?? "You"} · {dayjs(doc.last_edited_at).fromNow()}</p>
      </div>
      {doc.is_pinned && <Pin size={12} className="text-amber-500 flex-shrink-0" />}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-theme-border hover:bg-theme-primary/10 hover:text-theme-primary text-theme-muted transition-all"
        >
          <Share2 size={12} /> Share
        </button>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="p-1.5 rounded-lg hover:bg-theme-raised transition-all">
            <MoreVertical size={14} className="text-theme-muted" />
          </button>
          {menu && (
            <div className="absolute right-0 top-8 z-50 w-36 rounded-xl border border-theme-border bg-theme-surface shadow-xl p-1">
              <button onClick={() => { onPin(); setMenu(false); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg"><Pin size={12} />{doc.is_pinned ? "Unpin" : "Pin"}</button>
              <button onClick={() => { onArchive(); setMenu(false); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg"><Archive size={12} />Archive</button>
              <button onClick={() => { onDelete(); setMenu(false); }} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-rose-500/10 flex items-center gap-2 text-rose-500"><Trash2 size={12} />Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned" | "mine">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [shareTarget, setShareTarget] = useState<Doc | null>(null);

  useEffect(() => {
    if (user?.id) fetchDocs();
  }, [user?.id]);

  async function fetchDocs() {
    setLoading(true);
    try {
      const res = await axios.get(`/api/workspace/documents?userId=${user?.id}`);
      setDocs(res.data.documents || []);
    } catch { } finally { setLoading(false); }
  }

  async function createDoc() {
    setCreating(true);
    try {
      const res = await axios.post("/api/workspace/documents", { owner_id: user?.id });
      window.open(`/admin/workspace/documents/${res.data.document.id}`, '_blank');
      fetchDocs();
    } catch { } finally { setCreating(false); }
  }

  async function togglePin(doc: Doc) {
    if (!user?.id) return;
    await axios.patch(`/api/workspace/documents/${doc.id}?userId=${user.id}`, { is_pinned: !doc.is_pinned });
    fetchDocs();
  }

  async function archiveDoc(doc: Doc) {
    if (!user?.id) return;
    await axios.patch(`/api/workspace/documents/${doc.id}?userId=${user.id}`, { status: "archived" });
    fetchDocs();
  }

  async function deleteDoc(doc: Doc) {
    if (!user?.id) return;
    if (!confirm(`Delete "${doc.title}"? This action cannot be undone.`)) return;
    await axios.delete(`/api/workspace/documents/${doc.id}?userId=${user.id}`);
    fetchDocs();
  }

  const filtered = docs.filter((d) => {
    if (filter === "pinned" && !d.is_pinned) return false;
    if (filter === "mine" && d.owner?.id !== user?.id) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pinned = filtered.filter((d) => d.is_pinned);
  const rest = filtered.filter((d) => !d.is_pinned);

  const FILTERS: { key: "all" | "pinned" | "mine"; label: string }[] = [
    { key: "all",    label: "All" },
    { key: "pinned", label: "Pinned" },
    { key: "mine",   label: "Mine" },
  ];

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-theme-primary/10 flex items-center justify-center">
            <BookOpen size={18} className="text-theme-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-theme-fg">Documents</h1>
            <p className="text-xs text-theme-muted">{docs.length} document{docs.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={createDoc}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-primary hover:opacity-90 text-white text-sm font-bold transition-all shadow-sm disabled:opacity-60"
        >
          <Plus size={16} /> New Document
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-theme-border bg-theme-surface text-sm text-theme-fg placeholder:text-theme-muted focus:outline-none focus:border-theme-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={13} className="text-theme-muted" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-theme-border bg-theme-raised p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                filter === f.key
                  ? "bg-theme-surface text-theme-primary shadow-sm"
                  : "text-theme-muted hover:text-theme-fg"
              )}
            >
              {f.label}
              {f.key === "all" && (
                <span className="ml-1.5 text-[10px] bg-theme-primary/10 text-theme-primary px-1.5 py-0.5 rounded-full font-bold">
                  {docs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-theme-border bg-theme-raised p-0.5">
          <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-lg transition-all", view === "grid" ? "bg-theme-surface text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
            <Grid3X3 size={15} />
          </button>
          <button onClick={() => setView("list")} className={cn("p-1.5 rounded-lg transition-all", view === "list" ? "bg-theme-surface text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={cn("grid gap-4", view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1")}>
          {[...Array(8)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-theme-raised animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={48} className="mx-auto mb-4 text-theme-muted opacity-30" />
          <p className="font-bold text-theme-fg mb-1">No documents yet</p>
          <p className="text-sm text-theme-muted mb-4">Create your first document to get started.</p>
          <button
            onClick={createDoc}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-primary hover:opacity-90 text-white text-sm font-bold transition-all"
          >
            <Plus size={15} /> Create Document
          </button>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Pin size={12} className="text-theme-muted" />
                <span className="text-xs font-black uppercase tracking-widest text-theme-muted">Pinned</span>
              </div>
              <div className={cn("grid gap-4", view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1")}>
                {view === "grid" ? pinned.map((doc) => (
                  <DocCard key={doc.id} doc={doc}
                    onPin={() => togglePin(doc)} onArchive={() => archiveDoc(doc)}
                    onDelete={() => deleteDoc(doc)} onShare={() => setShareTarget(doc)}
                    onClick={() => window.open(`/admin/workspace/documents/${doc.id}`, '_blank')} />
                )) : pinned.map((doc) => (
                  <ListRow key={doc.id} doc={doc}
                    onPin={() => togglePin(doc)} onArchive={() => archiveDoc(doc)}
                    onDelete={() => deleteDoc(doc)} onShare={() => setShareTarget(doc)}
                    onClick={() => window.open(`/admin/workspace/documents/${doc.id}`, '_blank')} />
                ))}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={12} className="text-theme-muted" />
                  <span className="text-xs font-black uppercase tracking-widest text-theme-muted">All Documents</span>
                </div>
              )}
              <div className={cn("grid gap-4", view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1")}>
                {view === "grid" ? rest.map((doc) => (
                  <DocCard key={doc.id} doc={doc}
                    onPin={() => togglePin(doc)} onArchive={() => archiveDoc(doc)}
                    onDelete={() => deleteDoc(doc)} onShare={() => setShareTarget(doc)}
                    onClick={() => window.open(`/admin/workspace/documents/${doc.id}`, '_blank')} />
                )) : rest.map((doc) => (
                  <ListRow key={doc.id} doc={doc}
                    onPin={() => togglePin(doc)} onArchive={() => archiveDoc(doc)}
                    onDelete={() => deleteDoc(doc)} onShare={() => setShareTarget(doc)}
                    onClick={() => window.open(`/admin/workspace/documents/${doc.id}`, '_blank')} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Share Modal */}
      {shareTarget && user?.id && (
        <ShareModal
          itemId={shareTarget.id}
          itemType="document"
          itemTitle={shareTarget.title}
          currentUserId={user.id}
          onClose={() => setShareTarget(null)}
        />
      )}
    </DashboardShell>
  );
}
