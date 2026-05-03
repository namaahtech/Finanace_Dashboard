"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/layout/AuthProvider";
import {
  ArrowLeft, Plus, Trash2, Share2, Type, Image as ImageIcon, Square,
  ChevronLeft, ChevronRight, Play, Copy, Pin,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Sparkles,
  Download, MoreVertical, Layout, Layers, MousePointer2,
  Check, X, Maximize2, Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface SlideElement {
  id: string;
  type: "text" | "shape" | "image";
  content: string;
  x: number; y: number; width: number; height: number;
  style: Record<string, string>;
}

interface Slide {
  id: string;
  background: string;
  layout: "title" | "content" | "two-col" | "blank";
  elements: SlideElement[];
}

interface PptDoc {
  id: string; title: string; icon: string;
  slides: Slide[]; is_pinned: boolean; last_edited_at: string;
  owner?: { name: string };
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const BG_SWATCHES = [
  "#FFFFFF", "#F8FAFC", "#EFF6FF", "#F0FDF4", "#FAF5FF",
  "#FFF7ED", "#0F172A", "#1E293B", "#18181B", "#111827",
];

const LAYOUTS: { id: Slide["layout"]; label: string; desc: string }[] = [
  { id: "title",   label: "Title Slide",  desc: "Hero title + subtitle" },
  { id: "content", label: "Standard",     desc: "Title + bullet points" },
  { id: "two-col", label: "Two Column",   desc: "Side-by-side columns"  },
  { id: "blank",   label: "Blank",        desc: "Empty canvas"          },
];

function makeSlide(layout: Slide["layout"] = "title"): Slide {
  const id = `slide-${Date.now()}`;
  const elBase = (eid: string): SlideElement => ({
    id: eid, type: "text", content: "", x: 10, y: 30, width: 80, height: 14,
    style: { fontSize: "1.6rem", fontWeight: "bold", color: "#1e293b", textAlign: "center" },
  });

  if (layout === "title") {
    return {
      id, background: "#FFFFFF", layout,
      elements: [
        { ...elBase("el-t"), content: "Click to edit title", x: 10, y: 28, width: 80, height: 16,
          style: { fontSize: "2.2rem", fontWeight: "800", color: "#0f172a", textAlign: "center" } },
        { ...elBase("el-s"), content: "Add your subtitle here", x: 15, y: 52, width: 70, height: 10,
          style: { fontSize: "1.1rem", fontWeight: "400", color: "#64748b", textAlign: "center" } },
      ],
    };
  }
  if (layout === "content") {
    return {
      id, background: "#FFFFFF", layout,
      elements: [
        { ...elBase("el-h"), content: "Slide Title", x: 5, y: 8, width: 90, height: 12,
          style: { fontSize: "1.8rem", fontWeight: "700", color: "#0f172a", textAlign: "left" } },
        { ...elBase("el-b"), content: "• Point one\n• Point two\n• Point three", x: 5, y: 26, width: 90, height: 60,
          style: { fontSize: "1rem", fontWeight: "400", color: "#334155", textAlign: "left", whiteSpace: "pre-wrap" } },
      ],
    };
  }
  if (layout === "two-col") {
    return {
      id, background: "#FFFFFF", layout,
      elements: [
        { ...elBase("el-h"), content: "Slide Title", x: 5, y: 5, width: 90, height: 12,
          style: { fontSize: "1.8rem", fontWeight: "700", color: "#0f172a", textAlign: "center" } },
        { ...elBase("el-l"), content: "Left column content here", x: 3, y: 22, width: 45, height: 70,
          style: { fontSize: "0.95rem", fontWeight: "400", color: "#334155", textAlign: "left", whiteSpace: "pre-wrap" } },
        { ...elBase("el-r"), content: "Right column content here", x: 52, y: 22, width: 45, height: 70,
          style: { fontSize: "0.95rem", fontWeight: "400", color: "#334155", textAlign: "left", whiteSpace: "pre-wrap" } },
      ],
    };
  }
  return { id, background: "#FFFFFF", layout: "blank", elements: [] };
}

/* ─── Slide Canvas ───────────────────────────────────────────────────────── */
function SlideCanvas({
  slide, selected, editing, onSelect, onEdit, onBlur, onChange,
}: {
  slide: Slide;
  selected: string | null;
  editing: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
  onBlur: () => void;
  onChange: (elId: string, content: string) => void;
}) {
  return (
    <div
      className="w-full h-full relative rounded-xl overflow-hidden select-none"
      style={{ background: slide.background }}
      onClick={() => onSelect(null)}
    >
      {slide.elements.map((el) => (
        <div
          key={el.id}
          onClick={(e) => { e.stopPropagation(); onSelect(el.id); }}
          onDoubleClick={(e) => { e.stopPropagation(); onEdit(el.id); }}
          className={cn(
            "absolute transition-all",
            selected === el.id && editing !== el.id && "ring-2 ring-theme-primary ring-offset-1 cursor-move",
            selected !== el.id && editing !== el.id && "cursor-pointer hover:ring-1 hover:ring-theme-primary/40",
          )}
          style={{
            left: `${el.x}%`, top: `${el.y}%`,
            width: `${el.width}%`, height: `${el.height}%`,
          }}
        >
          {editing === el.id ? (
            <textarea
              autoFocus
              defaultValue={el.content}
              onBlur={(e) => { onChange(el.id, e.target.value); onBlur(); }}
              className="w-full h-full resize-none bg-transparent outline-none border-none p-0"
              style={el.style as React.CSSProperties}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className="w-full h-full overflow-hidden"
              style={el.style as React.CSSProperties}
            >
              {el.content || <span className="opacity-30">Double-click to edit</span>}
            </div>
          )}
        </div>
      ))}

      {slide.elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-theme-muted opacity-40 font-medium">Blank slide — add elements from the toolbar</p>
        </div>
      )}
    </div>
  );
}

/* ─── Thumbnail ──────────────────────────────────────────────────────────── */
function SlideThumbnail({ slide, index, active, onClick, onDuplicate, onDelete }: {
  slide: Slide; index: number; active: boolean;
  onClick: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "relative aspect-video rounded-lg border-2 cursor-pointer transition-all overflow-hidden group",
        active ? "border-theme-primary shadow-sm" : "border-theme-border hover:border-theme-strong",
      )}
    >
      {/* mini preview */}
      <div className="w-full h-full" style={{ background: slide.background }}>
        <div className="absolute inset-0 scale-[0.18] origin-top-left pointer-events-none" style={{ width: "550%", height: "550%" }}>
          {slide.elements.map((el) => (
            <div key={el.id} className="absolute overflow-hidden" style={{
              left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`,
              ...(el.style as React.CSSProperties),
            }}>
              {el.content}
            </div>
          ))}
        </div>
      </div>
      {/* index badge */}
      <span className="absolute top-1 left-1 text-[8px] font-bold bg-black/20 text-white/80 rounded px-1">
        {index + 1}
      </span>
      {/* hover actions */}
      {hover && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1.5 rounded-md bg-white/20 hover:bg-white/40 text-white transition-all">
            <Copy size={10} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-md bg-rose-500/30 hover:bg-rose-500/60 text-white transition-all">
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function PresentationEditorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [doc, setDoc] = useState<PptDoc | null>(null);
  const [title, setTitle] = useState("Untitled Presentation");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  const [editEl, setEditEl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [presenting, setPresenting] = useState(false);
  const [presentSlide, setPresentSlide] = useState(0);
  const [menu, setMenu] = useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [rightTab, setRightTab] = useState<"theme" | "layers">("theme");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchDoc(); }, [id]);

  async function fetchDoc() {
    setLoading(true);
    try {
      const res = await axios.get(`/api/workspace/presentations/${id}?userId=${user?.id || "anon"}`);
      const d = res.data.presentation;
      setDoc(d);
      setTitle(d.title || "Untitled Presentation");
      const s = d.slides && d.slides.length > 0 ? d.slides : [makeSlide("title")];
      setSlides(s);
    } catch {
      router.push("/admin/workspace/presentations");
    } finally {
      setLoading(false);
    }
  }

  const persistSlides = useCallback(async (s: Slide[]) => {
    setSaving(true);
    try {
      await axios.patch(`/api/workspace/presentations/${id}?userId=${user?.id || "anon"}`, {
        slides: s, last_edited_by: user?.id,
      });
      setSavedAt(new Date());
    } catch { } finally { setSaving(false); }
  }, [id, user?.id]);

  function updateSlides(s: Slide[]) {
    setSlides(s);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistSlides(s), 1500);
  }

  async function saveTitle(val: string) {
    setTitle(val);
    await axios.patch(`/api/workspace/presentations/${id}?userId=${user?.id || "anon"}`, { title: val });
  }

  /* slide operations */
  function addSlide(layout: Slide["layout"] = "blank") {
    const s = [...slides];
    const newSlide = makeSlide(layout);
    s.splice(activeSlide + 1, 0, newSlide);
    updateSlides(s);
    setActiveSlide(activeSlide + 1);
    setShowLayoutPicker(false);
  }

  function duplicateSlide(idx: number) {
    const s = [...slides];
    const dup: Slide = JSON.parse(JSON.stringify(s[idx]));
    dup.id = `slide-${Date.now()}`;
    dup.elements = dup.elements.map(el => ({ ...el, id: `${el.id}-copy` }));
    s.splice(idx + 1, 0, dup);
    updateSlides(s);
    setActiveSlide(idx + 1);
  }

  function deleteSlide(idx: number) {
    if (slides.length <= 1) return;
    const s = slides.filter((_, i) => i !== idx);
    updateSlides(s);
    setActiveSlide(Math.min(idx, s.length - 1));
  }

  function setSlideBackground(color: string) {
    const s = slides.map((sl, i) => i === activeSlide ? { ...sl, background: color } : sl);
    updateSlides(s);
  }

  function addTextElement() {
    const el: SlideElement = {
      id: `el-${Date.now()}`, type: "text",
      content: "New text element",
      x: 20, y: 40, width: 60, height: 12,
      style: { fontSize: "1rem", fontWeight: "400", color: "#0f172a", textAlign: "left" },
    };
    const s = slides.map((sl, i) => i === activeSlide ? { ...sl, elements: [...sl.elements, el] } : sl);
    updateSlides(s);
    setSelectedEl(el.id);
    setTimeout(() => setEditEl(el.id), 50);
  }

  function updateElementContent(elId: string, content: string) {
    const s = slides.map((sl, i) => i === activeSlide
      ? { ...sl, elements: sl.elements.map(el => el.id === elId ? { ...el, content } : el) }
      : sl
    );
    updateSlides(s);
  }

  function deleteSelectedElement() {
    if (!selectedEl) return;
    const s = slides.map((sl, i) => i === activeSlide
      ? { ...sl, elements: sl.elements.filter(el => el.id !== selectedEl) }
      : sl
    );
    updateSlides(s);
    setSelectedEl(null);
  }

  const current = slides[activeSlide];

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-page">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-theme-primary/20 border-t-theme-primary animate-spin" />
          <p className="text-xs text-theme-muted font-medium">Loading presentation…</p>
        </div>
      </div>
    );
  }

  /* ── Presentation mode ───────────────────────────────────────────────── */
  if (presenting) {
    const ps = slides[presentSlide];
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative shadow-2xl" style={{ width: "min(90vw, 160vh)", aspectRatio: "16/9" }}>
            <div className="w-full h-full rounded-2xl overflow-hidden" style={{ background: ps.background }}>
              {ps.elements.map((el) => (
                <div key={el.id} className="absolute overflow-hidden" style={{
                  left: `${el.x}%`, top: `${el.y}%`,
                  width: `${el.width}%`, height: `${el.height}%`,
                  ...(el.style as React.CSSProperties),
                }}>
                  {el.content}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* controls */}
        <div className="h-14 flex items-center justify-center gap-6">
          <button
            onClick={() => setPresentSlide(p => Math.max(0, p - 1))}
            disabled={presentSlide === 0}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-white/50 text-sm font-medium tabular-nums">
            {presentSlide + 1} / {slides.length}
          </span>
          <button
            onClick={() => setPresentSlide(p => Math.min(slides.length - 1, p + 1))}
            disabled={presentSlide === slides.length - 1}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => { setPresenting(false); setPresentSlide(0); }}
            className="ml-4 p-2.5 rounded-xl bg-white/10 hover:bg-rose-500/40 text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Editor layout ───────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-screen bg-theme-page overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="h-14 bg-theme-surface border-b border-theme-border flex items-center justify-between px-4 z-50 flex-shrink-0 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/admin/workspace/presentations"
            className="p-2 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>

          <span className="text-lg flex-shrink-0">{doc?.icon ?? "📑"}</span>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => saveTitle(e.target.value)}
            className="bg-transparent font-semibold text-sm text-theme-fg focus:outline-none min-w-0 flex-1 truncate"
            placeholder="Untitled Presentation"
          />

          <span className="text-[11px] text-theme-muted flex-shrink-0 hidden sm:block">
            {saving ? "Saving…" : savedAt ? `Saved ${dayjs(savedAt).fromNow()}` : doc?.last_edited_at ? `Saved ${dayjs(doc.last_edited_at).fromNow()}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { setPresentSlide(0); setPresenting(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Play size={12} fill="currentColor" /> Present
          </button>
          <button className="p-2 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all">
            <Share2 size={15} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenu(!menu)}
              className="p-2 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all"
            >
              <MoreVertical size={15} />
            </button>
            {menu && (
              <div className="absolute right-0 top-10 z-[60] w-44 bg-theme-surface border border-theme-border rounded-xl shadow-xl p-1">
                <button className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-theme-raised flex items-center gap-2 text-theme-fg">
                  <Download size={12} className="text-theme-muted" /> Export PDF
                </button>
                <div className="h-px bg-theme-border my-1" />
                <button className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-rose-500/10 flex items-center gap-2 text-rose-500">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="h-11 bg-theme-surface border-b border-theme-border flex items-center gap-1 px-3 flex-shrink-0">
        <ToolBtn icon={<MousePointer2 size={14} />} label="Select" />
        <ToolBtn icon={<Type size={14} />} label="Add text" onClick={addTextElement} />
        <ToolBtn icon={<Square size={14} />} label="Shape" />
        <ToolBtn icon={<ImageIcon size={14} />} label="Image" />

        <div className="h-5 w-px bg-theme-border mx-1" />

        <button
          onClick={() => setShowLayoutPicker(!showLayoutPicker)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-theme-muted hover:bg-theme-raised hover:text-theme-fg transition-all"
        >
          <Layout size={13} /> Layout
          {showLayoutPicker && (
            <div className="absolute top-8 left-0 z-50 w-56 bg-theme-surface border border-theme-border rounded-xl shadow-xl p-2 grid grid-cols-2 gap-1.5">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  onClick={(e) => { e.stopPropagation(); addSlide(l.id); }}
                  className="text-left p-2.5 rounded-lg hover:bg-theme-raised transition-all border border-theme-border"
                >
                  <p className="text-xs font-semibold text-theme-fg">{l.label}</p>
                  <p className="text-[10px] text-theme-muted mt-0.5">{l.desc}</p>
                </button>
              ))}
            </div>
          )}
        </button>

        {selectedEl && (
          <>
            <div className="h-5 w-px bg-theme-border mx-1" />
            <button
              onClick={deleteSelectedElement}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <Trash2 size={13} /> Delete element
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          <ToolBtn icon={<Sparkles size={14} />} label="AI Generate" className="text-violet-500 hover:bg-violet-500/10" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Slide panel ──────────────────────────────────────────────── */}
        <aside className="w-52 bg-theme-surface border-r border-theme-border flex flex-col overflow-hidden flex-shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-theme-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
              Slides · {slides.length}
            </span>
            <button
              onClick={() => addSlide("blank")}
              className="p-1 rounded-md hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all"
              title="Add blank slide"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-hide">
            {slides.map((slide, idx) => (
              <SlideThumbnail
                key={slide.id}
                slide={slide}
                index={idx}
                active={activeSlide === idx}
                onClick={() => { setActiveSlide(idx); setSelectedEl(null); setEditEl(null); }}
                onDuplicate={() => duplicateSlide(idx)}
                onDelete={() => deleteSlide(idx)}
              />
            ))}

            <button
              onClick={() => addSlide("blank")}
              className="w-full aspect-video rounded-lg border-2 border-dashed border-theme-border hover:border-theme-primary/50 hover:bg-theme-raised/50 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-theme-muted hover:text-theme-fg transition-all"
            >
              <Plus size={12} /> New Slide
            </button>
          </div>

          {/* slide nav */}
          <div className="border-t border-theme-border p-2 flex items-center justify-between">
            <button
              onClick={() => setActiveSlide(p => Math.max(0, p - 1))}
              disabled={activeSlide === 0}
              className="p-1.5 rounded-lg hover:bg-theme-raised disabled:opacity-30 text-theme-muted transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] font-medium text-theme-muted tabular-nums">
              {activeSlide + 1} / {slides.length}
            </span>
            <button
              onClick={() => setActiveSlide(p => Math.min(slides.length - 1, p + 1))}
              disabled={activeSlide === slides.length - 1}
              className="p-1.5 rounded-lg hover:bg-theme-raised disabled:opacity-30 text-theme-muted transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </aside>

        {/* ── Canvas area ──────────────────────────────────────────────── */}
        <main className="flex-1 bg-theme-page flex items-center justify-center p-8 overflow-hidden">
          {current ? (
            <div
              className="shadow-xl"
              style={{ width: "min(960px, calc(100% - 2rem))", aspectRatio: "16/9" }}
            >
              <SlideCanvas
                slide={current}
                selected={selectedEl}
                editing={editEl}
                onSelect={setSelectedEl}
                onEdit={(id) => { setSelectedEl(id); setEditEl(id); }}
                onBlur={() => setEditEl(null)}
                onChange={updateElementContent}
              />
            </div>
          ) : (
            <p className="text-theme-muted text-sm">No slides yet</p>
          )}
        </main>

        {/* ── Right panel ──────────────────────────────────────────────── */}
        <aside className="w-64 bg-theme-surface border-l border-theme-border flex flex-col flex-shrink-0">
          <div className="flex border-b border-theme-border">
            {(["theme", "layers"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={cn(
                  "flex-1 py-2.5 text-[11px] font-semibold capitalize transition-colors",
                  rightTab === t ? "text-theme-primary border-b-2 border-theme-primary" : "text-theme-muted hover:text-theme-fg",
                )}
              >
                {t === "theme" ? "Slide Theme" : "Layers"}
              </button>
            ))}
          </div>

          {rightTab === "theme" && (
            <div className="p-4 space-y-5 overflow-y-auto flex-1">
              <div>
                <p className="section-label mb-3">Background</p>
                <div className="grid grid-cols-5 gap-2">
                  {BG_SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSlideBackground(c)}
                      className={cn(
                        "h-9 rounded-lg border-2 transition-all hover:scale-110",
                        current?.background === c ? "border-theme-primary shadow-sm" : "border-theme-border",
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-[10px] text-theme-muted font-medium">Custom</label>
                  <input
                    type="color"
                    value={current?.background || "#FFFFFF"}
                    onChange={(e) => setSlideBackground(e.target.value)}
                    className="h-7 w-12 rounded cursor-pointer border border-theme-border bg-transparent"
                  />
                </div>
              </div>

              <div>
                <p className="section-label mb-3">Quick Layouts</p>
                <div className="space-y-1.5">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => addSlide(l.id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-theme-raised border border-theme-border transition-all"
                    >
                      <p className="text-xs font-semibold text-theme-fg">{l.label}</p>
                      <p className="text-[10px] text-theme-muted">{l.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {rightTab === "layers" && (
            <div className="p-4 space-y-2 overflow-y-auto flex-1">
              <p className="section-label mb-3">Elements on slide {activeSlide + 1}</p>
              {current?.elements.length === 0 ? (
                <p className="text-[11px] text-theme-muted text-center py-6">No elements. Add text from the toolbar.</p>
              ) : (
                current?.elements.map((el) => (
                  <button
                    key={el.id}
                    onClick={() => setSelectedEl(el.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all",
                      selectedEl === el.id
                        ? "border-theme-primary bg-theme-primary/5 text-theme-fg"
                        : "border-theme-border hover:bg-theme-raised text-theme-fg",
                    )}
                  >
                    <div className={cn("h-2 w-2 rounded-full flex-shrink-0", el.type === "text" ? "bg-blue-400" : "bg-violet-400")} />
                    <span className="text-xs font-medium truncate">{el.content || `${el.type} element`}</span>
                  </button>
                ))
              )}
              <button
                onClick={addTextElement}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-theme-border hover:border-theme-primary/50 text-[11px] font-semibold text-theme-muted hover:text-theme-fg transition-all mt-2"
              >
                <Plus size={11} /> Add Text
              </button>
            </div>
          )}

          {/* AI assist */}
          <div className="p-3 border-t border-theme-border">
            <button className="w-full p-3 rounded-xl border border-theme-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-left">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={13} className="text-violet-500" />
                <span className="text-[10px] font-semibold text-violet-500">AI Content Assist</span>
              </div>
              <p className="text-[10px] text-theme-muted leading-snug">Generate slide content, outlines, and talking points instantly.</p>
            </button>
          </div>
        </aside>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="h-8 bg-theme-surface border-t border-theme-border flex items-center justify-between px-4 flex-shrink-0">
        <span className="text-[10px] text-theme-muted font-medium">
          Slide {activeSlide + 1} of {slides.length} · 16:9 widescreen
        </span>
        <span className="text-[10px] text-theme-muted">
          {saving ? "Saving…" : savedAt ? `Last saved ${dayjs(savedAt).fromNow()}` : ""}
        </span>
      </footer>
    </div>
  );
}

/* ─── ToolBtn helper ─────────────────────────────────────────────────────── */
function ToolBtn({ icon, label, onClick, className }: {
  icon: React.ReactNode; label: string; onClick?: () => void; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "p-2 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all",
        className,
      )}
    >
      {icon}
    </button>
  );
}
