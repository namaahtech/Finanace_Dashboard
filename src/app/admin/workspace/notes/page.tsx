"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import {
  StickyNote, Plus, Search, Pin, Archive, Trash2, X, Palette, MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "axios";

dayjs.extend(relativeTime);

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  status: string;
  tags: string[];
  last_edited_at: string;
  owner?: { name: string };
}

const NOTE_COLORS = [
  { bg: "#ffffff", label: "Default" },
  { bg: "#fef9c3", label: "Yellow" },
  { bg: "#dcfce7", label: "Green" },
  { bg: "#dbeafe", label: "Blue" },
  { bg: "#fce7f3", label: "Pink" },
  { bg: "#ede9fe", label: "Purple" },
  { bg: "#ffedd5", label: "Orange" },
  { bg: "#e0f2fe", label: "Sky" },
];

function NoteCard({ note, onUpdate, onDelete }: {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(note.title);
  const [draftContent, setDraftContent] = useState(note.content);
  const [colorPicker, setColorPicker] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  function save() {
    if (draftTitle !== note.title || draftContent !== note.content) {
      onUpdate(note.id, { title: draftTitle, content: draftContent });
    }
    setEditing(false);
  }

  useEffect(() => {
    if (!editing) return;
    function handler(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) save();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing, draftTitle, draftContent]);

  const isColored = note.color && note.color !== "#ffffff";
  const cardStyle = isColored ? { backgroundColor: note.color } : undefined;

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative rounded-xl border transition-all overflow-hidden",
        editing ? "shadow-lg z-20 border-theme-strong" : "hover:shadow-md cursor-pointer",
        isColored ? "border-transparent" : "border-theme-border bg-theme-card"
      )}
      style={cardStyle}
      onClick={() => { if (!editing) setEditing(true); }}
    >
      <div className="p-4">
        {editing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent font-bold text-sm text-theme-fg focus:outline-none mb-2 placeholder:text-theme-muted"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          note.title && note.title !== "Untitled Note" && (
            <p className="font-semibold text-sm text-theme-fg mb-2 truncate">{note.title}</p>
          )
        )}

        {editing ? (
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            placeholder="Write something…"
            rows={5}
            className="w-full bg-transparent text-sm text-theme-fg focus:outline-none resize-none placeholder:text-theme-muted leading-relaxed"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm text-theme-muted whitespace-pre-wrap line-clamp-6 leading-relaxed">
            {note.content || <span className="italic opacity-50">Empty note</span>}
          </p>
        )}

        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {note.tags.map((t) => (
              <span key={t} className="text-[10px] bg-theme-raised text-theme-muted px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">{t}</span>
            ))}
          </div>
        )}

        {editing ? (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-theme-border" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <button
                onClick={() => setColorPicker(!colorPicker)}
                className="h-7 w-7 rounded-lg hover:bg-theme-raised flex items-center justify-center text-theme-muted transition-all"
              >
                <Palette size={14} />
              </button>
              {colorPicker && (
                <div className="absolute bottom-9 left-0 z-50 bg-theme-surface border border-theme-border rounded-xl shadow-xl p-2.5 flex gap-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.bg}
                      onClick={() => { onUpdate(note.id, { color: c.bg }); setColorPicker(false); }}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                        note.color === c.bg ? "border-theme-strong scale-110" : "border-theme-border"
                      )}
                      style={{ background: c.bg }}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditing(false); setDraftTitle(note.title); setDraftContent(note.content); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-theme-muted hover:bg-theme-raised transition-all"
              >
                Discard
              </button>
              <button
                onClick={save}
                className="px-4 py-1.5 rounded-lg bg-theme-primary text-white text-xs font-semibold transition-all"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-theme-muted mt-3 font-medium">{dayjs(note.last_edited_at).fromNow()}</p>
        )}
      </div>

      {/* Hover actions */}
      {!editing && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onUpdate(note.id, { is_pinned: !note.is_pinned })}
            className="w-7 h-7 rounded-lg bg-theme-surface/80 backdrop-blur border border-theme-border flex items-center justify-center transition-all hover:bg-theme-raised"
            title={note.is_pinned ? "Unpin" : "Pin"}
          >
            <Pin size={12} className={note.is_pinned ? "text-amber-500" : "text-theme-muted"} fill={note.is_pinned ? "currentColor" : "none"} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-7 h-7 rounded-lg bg-theme-surface/80 backdrop-blur border border-theme-border flex items-center justify-center transition-all hover:bg-theme-raised"
            >
              <MoreVertical size={12} className="text-theme-muted" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-50 w-36 bg-theme-surface border border-theme-border rounded-xl shadow-xl p-1">
                <button
                  onClick={() => { onUpdate(note.id, { status: "archived" }); setMenuOpen(false); }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised text-theme-fg flex items-center gap-2"
                >
                  <Archive size={12} /> Archive
                </button>
                <button
                  onClick={() => { onDelete(note.id); setMenuOpen(false); }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-rose-500/10 text-rose-500 flex items-center gap-2"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickContent, setQuickContent] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user?.id) fetchNotes(); }, [user?.id]);

  useEffect(() => {
    if (!quickOpen) return;
    function handler(e: MouseEvent) {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        if (quickContent.trim() || quickTitle.trim()) saveQuick();
        else setQuickOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [quickOpen, quickTitle, quickContent]);

  async function fetchNotes() {
    setLoading(true);
    try {
      const res = await axios.get(`/api/workspace/notes?userId=${user?.id}&userRole=${user?.role}`);
      setNotes(res.data.notes || []);
    } catch { } finally { setLoading(false); }
  }

  async function saveQuick() {
    if (!quickTitle.trim() && !quickContent.trim()) { setQuickOpen(false); return; }
    setCreating(true);
    try {
      await axios.post("/api/workspace/notes", {
        title: quickTitle || "Untitled Note",
        content: quickContent,
        owner_id: user?.id,
        color: "#ffffff",
      });
      setQuickTitle(""); setQuickContent(""); setQuickOpen(false);
      fetchNotes();
    } catch { } finally { setCreating(false); }
  }

  async function updateNote(id: string, updates: Partial<Note>) {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...updates } : n));
    await axios.patch(`/api/workspace/notes/${id}`, { ...updates, last_edited_by: user?.id });
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await axios.delete(`/api/workspace/notes/${id}`);
  }

  const filtered = notes.filter((n) => {
    if (n.status === "archived") return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pinned = filtered.filter((n) => n.is_pinned);
  const rest = filtered.filter((n) => !n.is_pinned);

  return (
    <DashboardShell
      moduleKey="workspace_notes"
      title="Notes"
      subtitle="Quick notes, ideas and checklists"
      actions={
        <button
          onClick={() => setQuickOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Note
        </button>
      }
    >
      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-theme-border bg-theme-surface text-sm text-theme-fg placeholder:text-theme-muted focus:outline-none focus:border-theme-strong transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={13} className="text-theme-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Quick create */}
      <div className="mb-6 max-w-xl">
        <div
          ref={quickRef}
          onClick={() => setQuickOpen(true)}
          className={cn(
            "rounded-xl border transition-all cursor-text bg-theme-card",
            quickOpen ? "shadow-md border-theme-strong p-4" : "border-theme-border p-3 hover:border-theme-strong"
          )}
        >
          {quickOpen ? (
            <div className="space-y-3">
              <input
                autoFocus
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Title"
                className="w-full bg-transparent font-semibold text-sm text-theme-fg focus:outline-none placeholder:text-theme-muted"
              />
              <textarea
                value={quickContent}
                onChange={(e) => setQuickContent(e.target.value)}
                placeholder="What's on your mind?"
                rows={3}
                className="w-full bg-transparent text-sm text-theme-fg focus:outline-none resize-none placeholder:text-theme-muted leading-relaxed"
              />
              <div className="flex items-center justify-between pt-2 border-t border-theme-border">
                <div />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setQuickOpen(false); setQuickTitle(""); setQuickContent(""); }}
                    className="px-3 py-1.5 text-xs font-semibold text-theme-muted hover:text-theme-fg transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={saveQuick}
                    disabled={creating}
                    className="px-4 py-1.5 rounded-lg bg-theme-primary text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-theme-muted">
              <StickyNote size={16} />
              <span className="text-sm">Take a note…</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="mb-4 break-inside-avoid rounded-xl bg-theme-card border border-theme-border animate-pulse"
              style={{ height: `${160 + (i % 3) * 50}px` }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="h-14 w-14 rounded-xl bg-theme-raised border border-theme-border flex items-center justify-center">
            <StickyNote size={24} className="text-theme-muted opacity-40" />
          </div>
          <div>
            <p className="font-semibold text-theme-fg mb-1">{search ? "No notes match your search" : "No notes yet"}</p>
            <p className="text-sm text-theme-muted">{search ? "Try a different keyword" : "Create your first note above."}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {pinned.length > 0 && (
            <div className="space-y-3">
              <p className="section-label px-1 flex items-center gap-2">
                <Pin size={10} fill="currentColor" /> Pinned · {pinned.length}
              </p>
              <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4">
                {pinned.map((note) => (
                  <div key={note.id} className="mb-4 break-inside-avoid">
                    <NoteCard note={note} onUpdate={updateNote} onDelete={deleteNote} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && <p className="section-label px-1">All Notes · {rest.length}</p>}
              <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4">
                {rest.map((note) => (
                  <div key={note.id} className="mb-4 break-inside-avoid">
                    <NoteCard note={note} onUpdate={updateNote} onDelete={deleteNote} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
