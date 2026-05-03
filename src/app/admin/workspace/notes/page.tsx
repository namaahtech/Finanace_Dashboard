"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import {
  StickyNote, Plus, Search, Pin, Archive, Trash2, X, Palette, Check,
  MoreVertical, Sparkles, Layout, Settings, History, Share2, 
  ArrowLeft, Globe, Filter, List, Grid, Info, Clock, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "axios";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

dayjs.extend(relativeTime);

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  icon: string;
  status: string;
  tags: string[];
  last_edited_at: string;
  owner?: { name: string };
}

const NOTE_COLORS = [
  { bg: "#ffffff", label: "White", ring: "ring-gray-300" },
  { bg: "#fef9c3", label: "Yellow", ring: "ring-yellow-300" },
  { bg: "#dcfce7", label: "Green", ring: "ring-green-300" },
  { bg: "#dbeafe", label: "Blue", ring: "ring-blue-300" },
  { bg: "#fce7f3", label: "Pink", ring: "ring-pink-300" },
  { bg: "#ede9fe", label: "Purple", ring: "ring-purple-300" },
  { bg: "#ffedd5", label: "Orange", ring: "ring-orange-300" },
  { bg: "#e0f2fe", label: "Sky", ring: "ring-sky-300" },
];

interface NoteCardProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

function NoteCard({ note, onUpdate, onDelete }: NoteCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(note.title);
  const [draftContent, setDraftContent] = useState(note.content);
  const [colorPicker, setColorPicker] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  function saveAndClose() {
    if (draftTitle !== note.title || draftContent !== note.content) {
      onUpdate(note.id, { title: draftTitle, content: draftContent });
    }
    setEditing(false);
  }

  useEffect(() => {
    if (!editing) return;
    function handler(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) saveAndClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing, draftTitle, draftContent]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative rounded-[2rem] border-2 transition-all overflow-hidden",
        editing ? "shadow-2xl z-20 scale-100" : "hover:shadow-xl hover:-translate-y-1",
        !editing && "cursor-pointer",
      )}
      style={{
        background: note.color || "#ffffff",
        borderColor: note.color === "#ffffff" ? "var(--theme-border)" : "transparent",
      }}
      onClick={() => { if (!editing) setEditing(true); }}
    >
      <div className="p-6">
        {/* Title */}
        {editing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Note Title"
            className="w-full bg-transparent font-black text-lg text-slate-800 focus:outline-none mb-3 placeholder:text-slate-400"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          note.title && note.title !== "Untitled Note" && (
            <p className="font-black text-base text-slate-800 mb-2 truncate leading-tight">{note.title}</p>
          )
        )}

        {/* Content */}
        {editing ? (
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            placeholder="Take a note..."
            rows={6}
            className="w-full bg-transparent text-sm text-slate-700 focus:outline-none resize-none placeholder:text-slate-400 leading-relaxed font-medium"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-8 leading-relaxed font-medium">
            {note.content || "Empty note"}
          </p>
        )}

        {/* Tags */}
        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {note.tags.map((t) => (
              <span key={t} className="text-[9px] bg-black/5 text-slate-600 px-3 py-1 rounded-full font-black uppercase tracking-widest">{t}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        {editing ? (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/5">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setColorPicker(!colorPicker)} className="h-8 w-8 rounded-xl hover:bg-black/5 transition-all flex items-center justify-center">
                <Palette size={16} className="text-slate-500" />
              </button>
              {colorPicker && (
                <div className="absolute bottom-10 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 flex gap-2 animate-in slide-in-from-bottom-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.bg}
                      onClick={() => { onUpdate(note.id, { color: c.bg }); setColorPicker(false); }}
                      className={cn("w-7 h-7 rounded-full border-2 transition-all hover:scale-125",
                        note.color === c.bg ? "border-slate-800 scale-110" : "border-transparent")}
                      style={{ background: c.bg }}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
               <button onClick={(e) => { e.stopPropagation(); saveAndClose(); }}
                className="px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-black/5 transition-all">
                Discard
              </button>
              <button onClick={(e) => { e.stopPropagation(); saveAndClose(); }}
                className="px-6 py-2 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between">
             <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
               <Clock size={10} /> {dayjs(note.last_edited_at).fromNow()}
             </div>
             <div className="h-2 w-2 rounded-full" style={{ background: note.color === '#ffffff' ? '#e2e8f0' : 'rgba(0,0,0,0.1)' }} />
          </div>
        )}
      </div>

      {/* Hover actions */}
      {!editing && (
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onUpdate(note.id, { is_pinned: !note.is_pinned })}
            className="w-9 h-9 rounded-2xl bg-white/80 backdrop-blur shadow-sm hover:shadow-md flex items-center justify-center transition-all"
            title={note.is_pinned ? "Unpin" : "Pin"}
          >
            <Pin size={14} className={note.is_pinned ? "text-amber-500" : "text-slate-400"} fill={note.is_pinned ? "currentColor" : "none"} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-2xl bg-white/80 backdrop-blur shadow-sm hover:shadow-md flex items-center justify-center transition-all"
            >
              <MoreVertical size={14} className="text-slate-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-[30] w-44 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 animate-in slide-in-from-top-2">
                <button onClick={() => { onDelete(note.id); setMenuOpen(false); }}
                  className="w-full text-left text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-rose-50 text-rose-500 flex items-center gap-3">
                  <Trash2 size={14} /> Delete
                </button>
                <button onClick={() => { onUpdate(note.id, { status: "archived" }); setMenuOpen(false); }}
                  className="w-full text-left text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-gray-50 text-slate-600 flex items-center gap-3">
                  <Archive size={14} /> Archive
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

  useEffect(() => { fetchNotes(); }, []);

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
      const res = await axios.get("/api/workspace/notes");
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
      setQuickTitle("");
      setQuickContent("");
      setQuickOpen(false);
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
    <div className="flex flex-col h-screen bg-theme-page overflow-hidden">
      {/* PREMIUM GREEN HEADER */}
      <header className="h-16 bg-[#10B981] flex items-center justify-between px-6 z-50 shadow-lg flex-shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <Link href="/admin/workspace" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
            <ArrowLeft size={18} />
          </Link>
          
          <div className="h-8 w-px bg-white/20 mx-1" />

          <div className="text-2xl bg-white/10 p-1.5 rounded-xl">
            🗒️
          </div>

          <div className="flex flex-col">
            <h1 className="font-black text-white text-lg leading-none">Workspace Notes</h1>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">
               {notes.length} Active Thoughts <span className="opacity-30">•</span> Gemma Sync Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Deep search notes..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/10 border-none text-white text-xs font-bold placeholder:text-white/40 focus:bg-white/20 transition-all outline-none" 
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"><X size={14}/></button>}
          </div>
          <Button variant="ghost" className="bg-white/10 hover:bg-white/20 text-white border-none rounded-xl h-10 w-10 p-0">
            <Filter size={18} />
          </Button>
          <Button variant="ghost" className="bg-white text-[#10B981] hover:bg-white/90 border-none rounded-xl h-10 px-4 font-black text-xs uppercase tracking-widest shadow-lg">
            <Plus size={16} className="mr-2" /> New Note
          </Button>
        </div>
      </header>

      {/* NOTES CANVAS */}
      <main className="flex-1 overflow-y-auto p-12 bg-theme-raised/10 scrollbar-hide">
        {/* Quick create */}
        <div className="mb-16 max-w-2xl mx-auto">
          <div ref={quickRef} onClick={() => setQuickOpen(true)}
            className={cn(
              "rounded-[2.5rem] border-2 transition-all cursor-text bg-theme-surface",
              quickOpen ? "shadow-2xl border-emerald-500/50 p-8" : "border-theme-border shadow-lg hover:shadow-xl p-5"
            )}>
            {quickOpen ? (
              <div className="space-y-4">
                <input
                  autoFocus
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="Note Title"
                  className="w-full bg-transparent font-black text-xl text-theme-fg focus:outline-none placeholder:text-theme-muted/50"
                />
                <textarea
                  value={quickContent}
                  onChange={(e) => setQuickContent(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full bg-transparent text-base font-medium text-theme-fg/80 focus:outline-none resize-none placeholder:text-theme-muted/50 leading-relaxed"
                />
                <div className="flex items-center justify-between pt-4 border-t border-theme-border">
                  <div className="flex gap-2">
                    <button className="h-10 w-10 rounded-2xl bg-theme-raised flex items-center justify-center text-theme-muted"><Palette size={18}/></button>
                    <button className="h-10 w-10 rounded-2xl bg-theme-raised flex items-center justify-center text-theme-muted"><Pin size={18}/></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setQuickOpen(false); setQuickTitle(""); setQuickContent(""); }}
                      className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-theme-muted hover:text-theme-fg transition-all">
                      Discard
                    </button>
                    <button onClick={saveQuick} disabled={creating}
                      className="px-8 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl transition-all">
                      Generate Note
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-[1.25rem] bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <PenTool size={20} />
                  </div>
                  <span className="text-base font-bold text-theme-muted/70 italic">Capture an idea...</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="h-10 w-10 rounded-2xl hover:bg-theme-raised text-theme-muted transition-all flex items-center justify-center"><Sparkles size={18}/></button>
                  <button className="h-10 w-10 rounded-2xl bg-theme-raised text-theme-fg flex items-center justify-center shadow-sm"><Plus size={20}/></button>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-[2rem] bg-theme-surface border border-theme-border animate-pulse flex flex-col p-6 gap-4" style={{ height: `${200 + (i % 3) * 60}px`, breakInside: "avoid" }}>
                 <div className="h-6 w-3/4 bg-theme-raised rounded-lg" />
                 <div className="h-32 w-full bg-theme-raised rounded-2xl" />
                 <div className="mt-auto h-4 w-1/2 bg-theme-raised rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 animate-in fade-in slide-in-from-bottom-4">
            <div className="h-24 w-24 rounded-[2rem] bg-theme-raised/50 border border-dashed border-theme-border flex items-center justify-center mx-auto mb-6">
               <StickyNote size={40} className="text-theme-muted opacity-20" />
            </div>
            <p className="font-black text-xl text-theme-fg mb-1">{search ? "No matches found" : "Quiet in here"}</p>
            <p className="text-xs text-theme-muted font-bold uppercase tracking-widest">
              {search ? "Adjust your search filters" : "Start your creative journey above"}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {pinned.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6 px-2">
                  <Pin size={14} className="text-emerald-500" fill="currentColor" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-muted">Pinned Collection</span>
                  <div className="h-px flex-1 bg-theme-border opacity-50" />
                </div>
                <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
                  {pinned.map((note) => (
                    <div key={note.id} className="mb-6 break-inside-avoid animate-in zoom-in-95">
                      <NoteCard note={note} onUpdate={updateNote} onDelete={deleteNote} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-3 mb-6 px-2">
                  <Layout size={14} className="text-theme-muted" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-muted">All Notes</span>
                  <div className="h-px flex-1 bg-theme-border opacity-50" />
                </div>
              )}
              <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
                {rest.map((note) => (
                  <div key={note.id} className="mb-6 break-inside-avoid animate-in zoom-in-95">
                    <NoteCard note={note} onUpdate={updateNote} onDelete={deleteNote} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER STATUS */}
      <footer className="h-10 bg-theme-surface border-t border-theme-border flex items-center justify-between px-6 z-50 text-[9px] font-black text-theme-muted uppercase tracking-[0.2em]">
         <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Realtime Memory Sync</span>
           </div>
           <span>Storage: 4.2MB</span>
         </div>
         <div className="flex items-center gap-4">
           <span className="text-theme-primary/60">Gemma 4: Intelligence Active</span>
           <div className="flex items-center gap-2">
              <CheckCircle2 size={10} className="text-emerald-500" />
              <span>All Systems Nominal</span>
           </div>
         </div>
      </footer>
    </div>
  );
}

// Dummy PenTool since it's missing from lucide-react sometimes
const PenTool = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l1.5 1.5"/><path d="M13 18l1.5 1.5"/></svg>
)
