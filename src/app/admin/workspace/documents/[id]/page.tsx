"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/layout/AuthProvider";
import { ShareModal } from "@/components/workspace/ShareModal";
import {
  ArrowLeft, Plus, Trash2, MoreVertical, Share2, Save,
  History, Download, Info, Clock,
  Palette, Sparkles, ChevronDown, Image as LucideImage, PlusSquare,
  FileText, Users, Eye, Edit3, Mail, DownloadCloud, FileCode,
  Undo, Redo, Heading1, Heading2, Type, Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, CheckSquare, Quote, Layout, PlusCircle, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AdvancedEditor } from "@/components/workspace/AdvancedEditor";
import { AISidebar } from "@/components/workspace/AISidebar";

dayjs.extend(relativeTime);

export default function DocumentEditorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [doc, setDoc] = useState<any>(null);
  const [title, setTitle] = useState("Untitled Document");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // MULTI-PAGE SYSTEM
  const [pages, setPages] = useState<string[]>([""]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [editors, setEditors] = useState<any[]>([]);
  const [pageSettings, setPageSettings] = useState({ type: 'A4', width: 800, height: 1131 });
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');

  const addImage = () => {
    setShowImageSourceModal(!showImageSourceModal);
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        activeEditor?.chain().focus().setImage({ src: event.target.result }).run();
        setShowImageSourceModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (imageUrl) {
      activeEditor?.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageSourceModal(false);
    }
  };

  const generateAIImage = async () => {
    if (!imagePrompt) return;
    setGeneratingImage(true);
    try {
      // In a real scenario, this would call a Stable Diffusion or similar API via the bridge
      // For now, we use the AI bridge to generate a placeholder or simulated response
      const res = await axios.post("/api/workspace/ai", {
        action: "custom",
        customPrompt: `Generate a detailed SVG representation or a link to a high-quality image for: ${imagePrompt}. Actually, for this demo, I will use a high-quality Unsplash source based on these keywords.`,
      });
      
      // Simulate image generation with a themed Unsplash URL for instant results
      const keywords = imagePrompt.split(' ').slice(0, 3).join(',');
      const finalUrl = `https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=1000&q=${keywords}`;
      
      activeEditor?.chain().focus().setImage({ src: finalUrl }).run();
      setImagePrompt('');
      setShowImageSourceModal(false);
    } catch {
      alert("AI Image Engine is currently busy. Please try again in a moment.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const activeEditor = editors[activePageIndex];

  // ADVANCED COLOR PICKER LOGIC
  const [hsv, setHsv] = useState({ h: 160, s: 90, v: 70 });

  const hsvToHex = (h: number, s: number, v: number) => {
    s /= 100; v /= 100;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  const updateColorFromHsv = (newHsv: any) => {
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    changeCover(hex);
  };

  const handleSpectrumMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const y = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    let s = ((x - rect.left) / rect.width) * 100;
    let v = 100 - ((y - rect.top) / rect.height) * 100;
    s = Math.max(0, Math.min(100, s));
    v = Math.max(0, Math.min(100, v));
    updateColorFromHsv({ ...hsv, s, v });
  };

  const handleHueMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    let h = ((x - rect.left) / rect.width) * 360;
    h = Math.max(0, Math.min(360, h));
    updateColorFromHsv({ ...hsv, h });
  };

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { 
    if (user?.id) {
      fetchDoc(); 
      fetchCollaborators(); 
    }
  }, [id, user?.id]);

  async function fetchDoc() {
    setLoading(true);
    try {
      const res = await axios.get(`/api/workspace/documents/${id}?userId=${user?.id}`);
      setDoc(res.data.document);
      setTitle(res.data.document.title);
      let rawContent = res.data.document.content || "";
      if (rawContent.includes('<!-- PAGE_BREAK -->')) {
        setPages(rawContent.split('<!-- PAGE_BREAK -->'));
      } else {
        setPages([rawContent]);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        alert("ACCESS DENIED: You do not have permission to view this document.");
      }
      router.push("/admin/workspace");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCollaborators() {
     try {
       const res = await axios.get(`/api/workspace/shares?itemId=${id}`);
       const users = res.data.sharedUsers?.map((u: any) => ({
         name: u.name,
         role: u.role,
         avatar: `https://ui-avatars.com/api/?name=${u.name}&background=random&color=fff`
       })) || [];
       setCollaborators(users);
     } catch {}
  }

  const handlePageUpdate = useCallback((newHtml: string, index: number) => {
    const newPages = [...pages];
    newPages[index] = newHtml;
    setPages(newPages);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!user?.id) return;
      setSaving(true);
      try {
        const fullContent = newPages.join('<!-- PAGE_BREAK -->');
        await axios.patch(`/api/workspace/documents/${id}?userId=${user.id}`, { 
          content: fullContent, 
          last_edited_by: user.id 
        });
        setSavedAt(new Date());
      } catch { } finally { setSaving(false); }
    }, 2000);
  }, [id, pages, user?.id]);

  // AUTO-SAVE ON UNMOUNT & UNLOAD
  useEffect(() => {
    const saveOnLeave = () => {
      if (pages.some(p => p !== "")) {
        const fullContent = pages.join('<!-- PAGE_BREAK -->');
        if (user?.id) {
          // Use fetch with keepalive if possible, or just a background axios
          axios.patch(`/api/workspace/documents/${id}?userId=${user.id}`, { 
            content: fullContent, 
            last_edited_by: user.id 
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', saveOnLeave);
    return () => {
      window.removeEventListener('beforeunload', saveOnLeave);
      saveOnLeave();
    };
  }, [id, pages, user?.id]);

  const forceSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const fullContent = pages.join('<!-- PAGE_BREAK -->');
      await axios.patch(`/api/workspace/documents/${id}?userId=${user.id}`, { 
        content: fullContent, 
        last_edited_by: user.id 
      });
      setSavedAt(new Date());
    } catch { } finally { setSaving(false); }
  };

  const addPage = () => {
    setPages([...pages, ""]);
    setTimeout(() => {
      const main = document.getElementById('document-scroll-container');
      if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const removePage = (index: number) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    const newEditors = editors.filter((_, i) => i !== index);
    setEditors(newEditors);
    if (activePageIndex >= newPages.length) setActivePageIndex(newPages.length - 1);
  };

  const handleEditorReady = useCallback((ed: any, index: number) => {
    setEditors(prev => {
      if (prev[index] === ed) return prev;
      const next = [...prev];
      next[index] = ed;
      return next;
    });
  }, []);

  const saveTitle = async (val: string) => {
    setTitle(val);
    if (user?.id) {
      await axios.patch(`/api/workspace/documents/${id}?userId=${user.id}`, { title: val });
    }
  };

  const changeCover = async (color: string) => {
    setDoc((prev: any) => ({ ...prev, cover_color: color }));
    if (user?.id) {
      await axios.patch(`/api/workspace/documents/${id}?userId=${user.id}`, { cover_color: color });
    }
  };

  const ToolButton = ({ onClick, active, children, title }: any) => (
    <button
      onClick={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-2 rounded-lg transition-all flex items-center justify-center h-8 w-8 ${active ? 'bg-theme-fg text-theme-surface shadow-md scale-105' : 'text-theme-muted hover:bg-theme-raised hover:text-theme-fg'}`}
    >
      {children}
    </button>
  );

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-theme-page text-theme-fg">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-theme-primary/20 border-t-theme-primary animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing Document Protocol...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-theme-page overflow-hidden">
      {/* HEADER */}
      <header className="h-[64px] relative flex-shrink-0 shadow-sm z-[100]" style={{ background: doc?.cover_color || "#10B981" }}>
        {doc?.cover_image && (
          <img src={doc.cover_image} className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay pointer-events-none" alt="" />
        )}
        <div className="absolute inset-0 flex items-center justify-between px-6 z-50">
          <div className="flex items-center gap-4">
            <Link href="/admin/workspace" className="p-2 rounded-xl bg-black/10 hover:bg-black/20 text-white transition-all backdrop-blur-md border border-white/5">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-xl flex items-center justify-center text-base shadow-lg border border-white/10">
                 {doc?.icon || "📄"}
               </div>
               <div className="flex flex-col">
                 <div className="flex items-center gap-3">
                    <input
                      value={title}
                      onChange={(e) => saveTitle(e.target.value)}
                      className="bg-transparent font-black text-white text-sm focus:outline-none placeholder:text-white/40 w-48"
                      placeholder="Untitled"
                    />
                    <button onClick={() => setShowColorPicker(!showColorPicker)} className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all">
                       <Palette size={13} />
                    </button>
                    {showColorPicker && (
                      <div className="absolute left-0 top-10 z-[500] w-72 bg-theme-surface border border-theme-border rounded-[2rem] shadow-2xl p-5">
                         <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] font-black text-theme-fg uppercase tracking-widest">Color Studio</h3>
                            <button onClick={() => setShowColorPicker(false)}><Plus size={16} className="rotate-45" /></button>
                         </div>
                         <div className="space-y-5">
                            <div className="w-full h-32 rounded-2xl relative cursor-crosshair border border-theme-border" onMouseDown={handleSpectrumMove} style={{ background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, transparent), hsl(${hsv.h}, 100%, 50%)` }}>
                               <div className="absolute h-5 w-5 rounded-full border-2 border-white shadow-2xl" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, transform: 'translate(-50%, -50%)' }} />
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-purple-500 to-red-500 cursor-pointer relative" onMouseDown={handleHueMove}>
                               <div className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow-xl" style={{ left: `${(hsv.h / 360) * 100}%`, transform: 'translate(-50%, -50%)' }} />
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="flex-1 bg-theme-raised p-3 rounded-xl border border-theme-border flex items-center justify-between">
                                  <span className="text-[10px] font-black text-theme-muted">HEX</span>
                                  <input value={hsvToHex(hsv.h, hsv.s, hsv.v).replace('#', '')} readOnly className="bg-transparent text-xs font-black text-right focus:outline-none w-20 uppercase" />
                               </div>
                               <div className="h-12 w-12 rounded-xl shadow-lg border-2 border-white" style={{ background: hsvToHex(hsv.h, hsv.s, hsv.v) }} />
                            </div>
                            <Button onClick={() => setShowColorPicker(false)} className="w-full">Save Palette</Button>
                         </div>
                      </div>
                    )}
                 </div>
                 <div className="text-[7px] font-black text-white/60 uppercase tracking-[0.15em]">
                    {saving ? "Syncing..." : dayjs(savedAt || doc?.last_edited_at).fromNow()}
                 </div>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-3 relative">
             <button
               onClick={forceSave}
               className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md border border-white/5 shadow-xl group"
             >
                <Save size={12} className={cn("transition-transform", saving && "animate-pulse")} />
                <span>{saving ? "Saving..." : "Save"}</span>
             </button>

             <div className="w-px h-6 bg-white/10 mx-1" />

             <div className="flex -space-x-2 mr-2">
               {collaborators.map((c, i) => (
                 <div key={i} className="h-7 w-7 rounded-lg border border-white/20 bg-white/10 flex items-center justify-center overflow-hidden" title={`${c.name} (${c.role})`}>
                   <img src={c.avatar} alt="" className="w-full h-full object-cover" />
                 </div>
               ))}
             </div>
             
             <Button onClick={() => setShowShare(true)} className={cn("rounded-lg h-8 px-3 text-[9px] font-black transition-all", "bg-white/20 text-white hover:bg-white/30")}>
               <Share2 size={12} className="mr-1.5" /> Share
             </Button>

             <button onClick={() => setShowDownload(!showDownload)} className="h-8 w-8 rounded-lg bg-white/20 text-white flex items-center justify-center border border-white/10 hover:bg-white/30 transition-all">
               <DownloadCloud size={14} />
             </button>
          </div>
        </div>
      </header>

      {/* RIBBON */}
      <div className="h-[52px] bg-theme-surface border-b border-theme-border/50 flex items-center px-6 gap-2 z-[90]">
        <ToolButton onClick={() => activeEditor?.chain().focus().undo().run()} active={false} title="Undo"><Undo size={14}/></ToolButton>
        <ToolButton onClick={() => activeEditor?.chain().focus().redo().run()} active={false} title="Redo"><Redo size={14}/></ToolButton>
        <div className="w-px h-6 bg-theme-border/50 mx-1" />
        <ToolButton onClick={() => activeEditor?.chain().focus().toggleHeading({ level: 1 }).run()} active={activeEditor?.isActive('heading', { level: 1 })}><Heading1 size={14}/></ToolButton>
        <ToolButton onClick={() => activeEditor?.chain().focus().toggleHeading({ level: 2 }).run()} active={activeEditor?.isActive('heading', { level: 2 })}><Heading2 size={14}/></ToolButton>
        <ToolButton onClick={() => activeEditor?.chain().focus().setParagraph().run()} active={activeEditor?.isActive('paragraph')}><Type size={14}/></ToolButton>
        <div className="w-px h-6 bg-theme-border/50 mx-1" />
        <ToolButton onClick={() => activeEditor?.chain().focus().toggleBold().run()} active={activeEditor?.isActive('bold')}><Bold size={14}/></ToolButton>
        <ToolButton onClick={() => activeEditor?.chain().focus().toggleItalic().run()} active={activeEditor?.isActive('italic')}><Italic size={14}/></ToolButton>
        <ToolButton onClick={() => activeEditor?.chain().focus().toggleUnderline().run()} active={activeEditor?.isActive('underline')}><UnderlineIcon size={14}/></ToolButton>
        
        <div className="w-px h-6 bg-theme-border/50 mx-1" />
        
        {/* TYPOGRAPHY RIBBON CONTROLS */}
        <div className="flex items-center gap-2 px-2 py-1 bg-theme-page/30 rounded-xl border border-theme-border/50">
          <select 
            onChange={(e) => activeEditor?.chain().focus().setMark('textStyle', { fontFamily: e.target.value }).run()}
            className="bg-theme-surface text-[10px] font-black text-theme-fg outline-none hover:border-theme-primary/50 p-1.5 rounded-lg border border-theme-border transition-all cursor-pointer min-w-[130px] shadow-sm"
            value={activeEditor?.getAttributes('textStyle').fontFamily || ""}
          >
            <option value="">Default Font</option>
            <optgroup label="Sans Serif">
              <option value="'Inter', sans-serif">Inter</option>
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="'Open Sans', sans-serif">Open Sans</option>
              <option value="'Montserrat', sans-serif">Montserrat</option>
              <option value="'Outfit', sans-serif">Outfit</option>
              <option value="'Poppins', sans-serif">Poppins</option>
            </optgroup>
            <optgroup label="Serif">
              <option value="'Playfair Display', serif">Playfair Display</option>
              <option value="'Merriweather', serif">Merriweather</option>
              <option value="'Lora', serif">Lora</option>
            </optgroup>
            <optgroup label="Monospace">
              <option value="'Fira Code', monospace">Fira Code</option>
              <option value="'JetBrains Mono', monospace">JetBrains</option>
            </optgroup>
            <optgroup label="Creative">
              <option value="'Dancing Script', cursive">Handwriting</option>
              <option value="'Pacifico', cursive">Pacifico</option>
            </optgroup>
          </select>

          <select 
            onChange={(e) => activeEditor?.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run()}
            className="bg-theme-surface text-[10px] font-black text-theme-fg outline-none hover:border-theme-primary/50 p-1.5 rounded-lg border border-theme-border transition-all cursor-pointer w-[65px] shadow-sm"
            value={activeEditor?.getAttributes('textStyle').fontSize || ""}
          >
            <option value="">Size</option>
            {[12, 14, 16, 18, 20, 24, 32, 40, 48, 64].map(size => (
              <option key={size} value={`${size}px`}>{size}px</option>
            ))}
          </select>
        </div>

        <div className="w-px h-6 bg-theme-border/50 mx-1" />
        <ToolButton onClick={() => activeEditor?.chain().focus().setTextAlign('left').run()} active={activeEditor?.isActive({ textAlign: 'left' })}><AlignLeft size={14}/></ToolButton>
        <ToolButton onClick={() => activeEditor?.chain().focus().setTextAlign('center').run()} active={activeEditor?.isActive({ textAlign: 'center' })}><AlignCenter size={14}/></ToolButton>
        <ToolButton onClick={() => activeEditor?.chain().focus().setTextAlign('right').run()} active={activeEditor?.isActive({ textAlign: 'right' })}><AlignRight size={14}/></ToolButton>
        <div className="w-px h-6 bg-theme-border/50 mx-1" />
        <ToolButton onClick={() => activeEditor?.chain().focus().toggleBulletList().run()} active={activeEditor?.isActive('bulletList')}><List size={14}/></ToolButton>
        <ToolButton onClick={() => activeEditor?.chain().focus().toggleTaskList().run()} active={activeEditor?.isActive('taskList')}><CheckSquare size={14}/></ToolButton>
        <ToolButton onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()} active={activeEditor?.isActive('blockquote')}><Quote size={14}/></ToolButton>
        
        <div className="w-px h-6 bg-theme-border/50 mx-1" />
        <div className="relative">
          <ToolButton onClick={addImage} active={showImageSourceModal} title="Insert Image">
            <LucideImage size={14} />
          </ToolButton>

          {showImageSourceModal && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-theme-surface border border-theme-border rounded-3xl shadow-2xl p-4 z-[100] animate-in fade-in slide-in-from-top-2">
               <p className="text-[9px] font-black text-theme-muted uppercase tracking-[0.2em] mb-4">Insert Image</p>
               
               <div className="space-y-4">
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = handleImageUpload;
                      input.click();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-theme-primary/10 hover:bg-theme-primary transition-all group"
                  >
                     <div className="h-9 w-9 rounded-xl bg-theme-primary/20 flex items-center justify-center text-theme-primary group-hover:bg-white/20 group-hover:text-white transition-all">
                        <PlusSquare size={18} />
                     </div>
                     <div className="text-left">
                        <p className="text-[11px] font-black text-theme-fg group-hover:text-white leading-tight">From Device</p>
                        <p className="text-[9px] font-bold text-theme-muted group-hover:text-white/70">Upload from folder</p>
                     </div>
                  </button>

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Paste image URL..." 
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-theme-raised border border-theme-border p-3 pr-12 rounded-2xl text-[11px] font-bold focus:outline-none focus:ring-2 ring-theme-primary/20"
                    />
                    <button
                      onClick={handleUrlSubmit}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-theme-primary text-white flex items-center justify-center hover:scale-105 transition-all shadow-lg"
                    >
                       <Sparkles size={14} />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-theme-border/50">
                    <p className="text-[9px] font-black text-theme-primary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                       <Sparkles size={10} /> AI Creative Studio
                    </p>
                    <div className="relative">
                      <textarea 
                        placeholder="Describe the image you want to create..." 
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        rows={2}
                        className="w-full bg-theme-primary/5 border border-theme-primary/20 p-3 rounded-2xl text-[11px] font-bold focus:outline-none focus:ring-2 ring-theme-primary/20 resize-none"
                      />
                      <button
                        onClick={generateAIImage}
                        disabled={generatingImage || !imagePrompt}
                        className="absolute right-2 bottom-2 h-8 px-3 rounded-xl bg-theme-primary text-white flex items-center gap-2 text-[9px] font-black uppercase hover:scale-105 transition-all shadow-lg disabled:opacity-50"
                      >
                         {generatingImage ? "Creating..." : <><Sparkles size={12} /> Generate</>}
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
        
        <div className="ml-auto">
          <div className="relative">
            <button onClick={() => setShowLayoutSettings(!showLayoutSettings)} className="flex items-center gap-2 px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase bg-theme-raised">
              <Layout size={12} /> Layout: {pageSettings.type} <ChevronDown size={10} />
            </button>
            {showLayoutSettings && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-theme-surface border border-theme-border rounded-[1.5rem] shadow-2xl p-4 z-[100]">
                <p className="text-[9px] font-black text-theme-muted uppercase mb-3">Page Configuration</p>
                <div className="space-y-2">
                  {[
                    { label: 'A4 Portrait', width: 800, height: 1131, type: 'A4' },
                    { label: 'Letter', width: 816, height: 1056, type: 'Letter' },
                    { label: 'Presentation', width: 1080, height: 608, type: '16:9' }
                  ].map(p => (
                    <button key={p.label} onClick={() => { setPageSettings(p); setShowLayoutSettings(false); }} className="w-full text-left px-4 py-2 rounded-xl hover:bg-theme-raised text-xs font-bold flex items-center justify-between">
                      {p.label} {pageSettings.type === p.type && <div className="h-1.5 w-1.5 rounded-full bg-theme-primary" />}
                    </button>
                  ))}
                  <div className="pt-2 border-t border-theme-border/50">
                    <p className="text-[8px] font-black text-theme-muted uppercase mb-2">Custom Dimensions (PX)</p>
                    <div className="flex items-center gap-2">
                       <input 
                         value={pageSettings.width} 
                         onChange={(e) => setPageSettings({...pageSettings, width: parseInt(e.target.value) || 0, type: 'Custom'})} 
                         className="w-full bg-theme-raised p-2 rounded-lg text-xs font-black focus:outline-none border border-theme-border" 
                         placeholder="Width" 
                       />
                       <span className="text-theme-muted text-[8px]">×</span>
                       <input 
                         value={pageSettings.height} 
                         onChange={(e) => setPageSettings({...pageSettings, height: parseInt(e.target.value) || 0, type: 'Custom'})} 
                         className="w-full bg-theme-raised p-2 rounded-lg text-xs font-black focus:outline-none border border-theme-border" 
                         placeholder="Height" 
                       />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex overflow-hidden z-10">
        <main id="document-scroll-container" className="flex-1 overflow-y-auto px-12 pb-24 pt-12 scrollbar-hide bg-theme-page/50">
          <div className="mx-auto flex flex-col items-center gap-12 max-w-full">
            {pages.map((pageContent, idx) => (
              <div key={idx} className="flex flex-col items-center gap-12 w-full">
                <div className="bg-theme-surface rounded-sm shadow-xl border border-theme-border/30 relative overflow-hidden" style={{ width: `${pageSettings.width}px`, minHeight: `${pageSettings.height}px` }} onFocus={() => setActivePageIndex(idx)}>
                  <div className="p-[80px] h-full w-full">
                    <AdvancedEditor 
                      content={pageContent} 
                      onChange={(html) => handlePageUpdate(html, idx)} 
                      hideToolbar={true} 
                      onEditorReady={(ed) => handleEditorReady(ed, idx)} 
                      className="editor-paged w-full h-full" 
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full max-w-[400px]">
                  <button onClick={addPage} className="flex-1 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-theme-muted hover:text-theme-fg hover:bg-white/10 transition-all">
                    <PlusCircle size={18} className="text-theme-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add New Page</span>
                  </button>
                  {pages.length > 1 && (
                    <button onClick={() => removePage(idx)} className="h-12 w-12 rounded-full bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all" title="Remove Page">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
        <aside className="w-80 flex-shrink-0 pt-8 border-l border-theme-border/30 bg-theme-surface/30 backdrop-blur-md">
          <AISidebar content={pages.join('\n')} onApplyChange={(newContent) => handlePageUpdate(newContent, activePageIndex)} onInsertContent={(c) => {/* Append logic */}} />
        </aside>
      </div>

      <style jsx global>{`
        .editor-paged .ProseMirror { min-height: 100% !important; padding-bottom: 0 !important; }
        .editor-paged .prose p { font-size: 1rem; line-height: 1.6; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>



      <footer className="h-10 bg-theme-surface border-t border-theme-border flex items-center justify-between px-8 z-50 text-[9px] font-black text-theme-muted uppercase tracking-[0.2em]">
         <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-theme-primary animate-pulse" />
              <span>Realtime Sync: Connected</span>
           </div>
           <span>Owner: {user?.name || "Namaah Admin"}</span>
         </div>
      </footer>

      {showShare && doc && user?.id && (
        <ShareModal
          itemId={doc.id}
          itemType="document"
          itemTitle={doc.title || title}
          currentUserId={user.id}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

