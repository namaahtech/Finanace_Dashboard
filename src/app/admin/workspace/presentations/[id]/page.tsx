"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/layout/AuthProvider";
import {
  ArrowLeft, Plus, Trash2, Share2, Save, Type, Image as ImageIcon, Square,
  ChevronLeft, ChevronRight, Play, Copy, Pin, Archive,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Sparkles,
  Presentation, Globe, Download, History, MoreVertical, Layout,
  Settings, Layers, MousePointer2
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

dayjs.extend(relativeTime);

interface SlideElement {
  id: string;
  type: "text" | "shape" | "image";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: Record<string, string>;
}

interface Slide {
  id: string;
  background: string;
  layout: "title" | "content" | "two-col" | "blank";
  elements: SlideElement[];
}

interface Theme {
  primary: string;
  secondary: string;
  font: string;
  bg: string;
}

interface PptDoc {
  id: string;
  title: string;
  icon: string;
  slides: Slide[];
  theme: Theme;
  is_pinned: boolean;
  last_edited_at: string;
}

const BG_COLORS = [
  "#FFFFFF","#1e293b","#f8fafc","#eff6ff","#f0fdf4","#faf5ff","#fff7ed","#fdf2f8","#0f172a","#10B981"
];

const LAYOUTS = [
  { id: "title", label: "Title Slide", desc: "Hero title & subtitle" },
  { id: "content", label: "Standard", desc: "Title & bullet points" },
  { id: "two-col", label: "Two Column", desc: "Side-by-side comparison" },
  { id: "blank", label: "Blank Canvas", desc: "Total creative freedom" },
];

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
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [menu, setMenu] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchDoc(); }, [id]);

  async function fetchDoc() {
    setLoading(true);
    try {
      const res = await axios.get(`/api/workspace/presentations/${id}`);
      const d = res.data.presentation;
      setDoc(d);
      setTitle(d.title);
      setSlides(d.slides || []);
    } catch {
      router.push("/admin/workspace/presentations");
    } finally {
      setLoading(false);
    }
  }

  function scheduleSave(updatedSlides: Slide[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSlides(updatedSlides), 2000);
  }

  async function saveSlides(updatedSlides: Slide[]) {
    setSaving(true);
    try {
      await axios.patch(`/api/workspace/presentations/${id}`, { slides: updatedSlides, last_edited_by: user?.id });
      setSavedAt(new Date());
    } catch { } finally { setSaving(false); }
  }

  async function saveTitle(val: string) {
    setTitle(val);
    await axios.patch(`/api/workspace/presentations/${id}`, { title: val });
  }

  const currentSlide = slides[activeSlide];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-page">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <p className="text-xs font-black text-theme-muted uppercase tracking-widest animate-pulse">Designing Experiences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f0f1b] overflow-hidden">
      {/* PREMIUM GREEN HEADER */}
      <header className="h-16 bg-[#10B981] flex items-center justify-between px-6 z-50 shadow-lg flex-shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <Link href="/admin/workspace" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
            <ArrowLeft size={18} />
          </Link>
          
          <div className="h-8 w-px bg-white/20 mx-1" />

          <div className="text-2xl bg-white/10 p-1.5 rounded-xl">
            {doc?.icon ?? "📑"}
          </div>

          <div className="flex flex-col flex-1 max-w-xl">
            <input
              value={title}
              onChange={(e) => saveTitle(e.target.value)}
              className="bg-transparent font-black text-white text-lg focus:outline-none placeholder:text-white/40"
              placeholder="Untitled Presentation"
            />
            <div className="flex items-center gap-2 text-[10px] font-bold text-white/70">
               <Presentation size={10} /> Namaah Slides <span className="opacity-30">•</span> {saving ? "Saving..." : `Saved ${dayjs(savedAt || doc?.last_edited_at).fromNow()}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setPresenting(true)} className="bg-white text-[#10B981] hover:bg-white/90 border-none rounded-xl gap-2 h-10 px-4 font-black">
            <Play size={16} fill="currentColor" /> Present
          </Button>
          <Button variant="ghost" className="bg-white/10 hover:bg-white/20 text-white border-none rounded-xl h-10 w-10 p-0">
            <Share2 size={18} />
          </Button>
          <div className="relative">
            <button onClick={() => setMenu(!menu)} className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
              <MoreVertical size={20} />
            </button>
            {menu && (
              <div className="absolute right-0 top-12 z-[60] w-56 bg-theme-surface border border-theme-border rounded-2xl shadow-2xl p-2 animate-in slide-in-from-top-2 text-theme-fg">
                <button className="w-full text-left text-xs px-4 py-3 rounded-xl hover:bg-theme-raised flex items-center gap-3 font-bold">
                   <Download size={14} className="text-emerald-500" /> Export PDF
                </button>
                <button className="w-full text-left text-xs px-4 py-3 rounded-xl hover:bg-theme-raised flex items-center gap-3 font-bold">
                   <Settings size={14} className="text-blue-500" /> Slide Settings
                </button>
                <div className="h-px bg-theme-border my-2" />
                <button className="w-full text-left text-xs px-4 py-3 rounded-xl hover:bg-rose-500/10 flex items-center gap-3 text-rose-500 font-bold">
                   <Trash2 size={14} /> Delete Presentation
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SECONDARY DESIGN TOOLBAR */}
      <div className="h-14 bg-[#1a1a2e] border-b border-white/5 flex items-center gap-1.5 px-4 flex-shrink-0">
         <button className="p-2.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all"><MousePointer2 size={16}/></button>
         <button className="p-2.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all"><Type size={16}/></button>
         <button className="p-2.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all"><ImageIcon size={16}/></button>
         <button className="p-2.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all"><Square size={16}/></button>
         
         <div className="h-6 w-px bg-white/10 mx-2" />

         <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 text-violet-400 text-[10px] font-black uppercase tracking-widest hover:bg-violet-500/20 transition-all border border-violet-500/20">
           <Layout size={14} /> Change Layout
         </button>
         
         <div className="h-6 w-px bg-white/10 mx-2" />

         <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
           <Sparkles size={14} /> AI Slide Generate
         </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: THUMBNAILS */}
        <aside className="w-64 bg-[#131322] border-r border-white/5 flex flex-col p-4 overflow-y-auto scrollbar-hide gap-4">
           <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">Presentation Slides</p>
           <div className="space-y-4">
             {slides.map((slide, idx) => (
               <div 
                  key={slide.id}
                  onClick={() => setActiveSlide(idx)}
                  className={cn(
                    "relative aspect-video rounded-xl border-2 transition-all cursor-pointer group",
                    activeSlide === idx ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 hover:border-white/30"
                  )}
               >
                 <div className="absolute inset-0 flex items-center justify-center opacity-20 scale-50">
                    <span className="text-4xl font-black text-white/10">#{idx + 1}</span>
                 </div>
                 <div className="absolute top-2 left-2 h-5 w-5 rounded-lg bg-black/40 flex items-center justify-center text-[10px] font-black text-white/60">
                   {idx + 1}
                 </div>
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-all gap-2 rounded-lg">
                    <button className="p-2 rounded-lg bg-white/10 text-white"><Copy size={12}/></button>
                    <button className="p-2 rounded-lg bg-rose-500/20 text-rose-500"><Trash2 size={12}/></button>
                 </div>
               </div>
             ))}
             <button className="w-full aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 flex flex-col items-center justify-center gap-2 transition-all group">
                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Plus size={20}/>
                </div>
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest group-hover:text-emerald-500">New Slide</span>
             </button>
           </div>
        </aside>

        {/* MAIN CANVAS */}
        <main className="flex-1 bg-[#0a0a14] relative flex items-center justify-center p-12 overflow-hidden">
           <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] group" style={{ width: "min(1000px, 100%)", aspectRatio: "16/9" }}>
              {currentSlide && (
                <div className="w-full h-full rounded-2xl overflow-hidden relative border border-white/5" style={{ background: currentSlide.background }}>
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-20 text-center">
                      <h1 className="text-6xl font-black text-theme-fg tracking-tight mb-6">Click to Edit Title</h1>
                      <p className="text-xl text-theme-muted font-bold opacity-60">Add some subtitle here for your presentation slide.</p>
                   </div>
                </div>
              )}
              
              {/* CANVAS OVERLAYS */}
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl">
                 <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/60"><ChevronLeft size={18}/></button>
                 <span className="text-xs font-black text-white/40 tracking-[0.2em]">{activeSlide + 1} / {slides.length}</span>
                 <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/60"><ChevronRight size={18}/></button>
              </div>
           </div>
        </main>

        {/* RIGHT PANEL: LAYERS / PROPERTIES */}
        <aside className="w-80 bg-[#131322] border-l border-white/5 flex flex-col">
           <div className="p-6 border-b border-white/5">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Slide Theme</p>
              <div className="grid grid-cols-4 gap-3">
                 {BG_COLORS.map(c => (
                   <button key={c} className="h-10 rounded-xl border border-white/10 transition-transform hover:scale-110" style={{ background: c }} />
                 ))}
              </div>
           </div>
           
           <div className="flex-1 p-6 space-y-6">
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Object Layers</p>
                <div className="space-y-2">
                   <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-xs font-bold text-white/80">Main Title Text</span>
                      </div>
                      <Layers size={12} className="text-white/20" />
                   </div>
                   <div className="p-3 rounded-xl hover:bg-white/5 border border-transparent transition-all flex items-center justify-between opacity-50">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        <span className="text-xs font-bold text-white/80">Subtitle Element</span>
                      </div>
                      <Layers size={12} className="text-white/20" />
                   </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                 <button className="w-full p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 group hover:border-emerald-500/40 transition-all text-left">
                    <div className="flex items-center gap-3 mb-2">
                       <Sparkles size={16} className="text-emerald-500" />
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">AI Content Assist</span>
                    </div>
                    <p className="text-[10px] text-white/40 font-bold">Let Gemma help you generate slide content, outlines, and talking points instantly.</p>
                 </button>
              </div>
           </div>
        </aside>
      </div>

      {/* FOOTER STATUS */}
      <footer className="h-10 bg-[#0a0a14] border-t border-white/5 flex items-center justify-between px-6 z-50 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
         <div className="flex items-center gap-4">
           <span>Renderer: WebGL 2.0</span>
           <span>Resolution: 1920x1080 (16:9)</span>
         </div>
         <div className="flex items-center gap-4">
           <span className="text-emerald-500/50">Engine: Gemma 4 High-Speed</span>
           <span>Memory: 1.2GB / 4.0GB</span>
         </div>
      </footer>
    </div>
  );
}
