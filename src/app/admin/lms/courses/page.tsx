"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Edit3, 
  Eye, 
  Video, 
  FileText, 
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Layout,
  Save,
  Rocket,
  PlusCircle,
  FileUp
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// Coda-style Block types
type BlockType = 'lesson' | 'quiz' | 'assignment';

interface Lesson {
  id: string;
  title: string;
  type: BlockType;
  duration: string;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  isOpen: boolean;
}

export default function ManageCoursesPage() {
  const [modules, setModules] = useState<Module[]>([
    {
      id: "mod-1",
      title: "Module 1: Foundations of Namaah",
      isOpen: true,
      lessons: [
        { id: "les-1", title: "Introduction to Core Principles", type: "lesson", duration: "10m" },
        { id: "les-2", title: "Security Protocols & NDA", type: "lesson", duration: "15m" },
        { id: "les-3", title: "Cultural Alignment Quiz", type: "quiz", duration: "5m" },
      ]
    },
    {
      id: "mod-2",
      title: "Module 2: Technical Architecture",
      isOpen: false,
      lessons: [
        { id: "les-4", title: "Supabase & Realtime Engines", type: "lesson", duration: "25m" },
        { id: "les-5", title: "Frontend Component Patterns", type: "lesson", duration: "20m" },
      ]
    }
  ]);

  const [selectedCourse, setSelectedCourse] = useState("Engineering Excellence");
  const [saving, setSaving] = useState(false);

  const addModule = () => {
    const newMod: Module = {
      id: `mod-${Date.now()}`,
      title: "New Module",
      isOpen: true,
      lessons: []
    };
    setModules([...modules, newMod]);
  };

  const addLesson = (modId: string, type: BlockType) => {
    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      duration: "5m"
    };
    setModules(modules.map(m => m.id === modId ? { ...m, lessons: [...m.lessons, newLesson] } : m));
  };

  const deleteLesson = (modId: string, lesId: string) => {
    setModules(modules.map(m => m.id === modId ? { ...m, lessons: m.lessons.filter(l => l.id !== lesId) } : m));
  };

  return (
    <DashboardShell
      title="Course Builder"
      subtitle={`Editing Curriculum: ${selectedCourse}`}
      actions={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Eye size={14} className="mr-2" /> Preview Course
          </Button>
          <Button 
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold shadow-lg shadow-emerald-500/20"
            onClick={() => { setSaving(true); setTimeout(() => setSaving(false), 1500); }}
          >
            {saving ? "Syncing..." : <><Save size={16} className="mr-2" /> Publish Changes</>}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar: Course Outline (Coda-style Navigator) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="page-card bg-theme-surface/50 border-theme-border/50 backdrop-blur-sm sticky top-24">
            <h3 className="text-[10px] font-black uppercase text-theme-muted tracking-widest mb-6">Course Outline</h3>
            <div className="space-y-4">
              {modules.map((mod, idx) => (
                <div key={mod.id} className="space-y-2">
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="h-5 w-5 rounded bg-theme-raised flex items-center justify-center text-theme-muted text-[10px] font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-xs font-bold text-theme-fg group-hover:text-theme-primary transition-colors truncate">{mod.title}</span>
                  </div>
                  <div className="pl-7 space-y-2 border-l border-theme-border ml-2.5">
                    {mod.lessons.map(les => (
                      <div key={les.id} className="text-[11px] text-theme-muted flex items-center gap-2 hover:text-theme-fg transition-colors cursor-pointer">
                        {les.type === 'lesson' ? <FileText size={10} /> : les.type === 'quiz' ? <HelpCircle size={10} /> : <FileUp size={10} />}
                        <span className="truncate">{les.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={addModule}
              className="mt-8 w-full py-2.5 border border-dashed border-theme-border rounded-xl text-[10px] font-black uppercase text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-all flex items-center justify-center gap-2"
            >
              <Plus size={12} /> Add New Module
            </button>
          </div>
        </div>

        {/* Main Content Area: The Block Editor */}
        <div className="lg:col-span-3 space-y-6 pb-24">
          <Reorder.Group axis="y" values={modules} onReorder={setModules} className="space-y-6">
            {modules.map((mod) => (
              <Reorder.Item key={mod.id} value={mod}>
                <div className="page-card p-0 overflow-hidden group/mod border-transparent hover:border-theme-primary/30 transition-colors">
                  <div className="bg-theme-raised/50 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <GripVertical size={16} className="text-theme-subtle cursor-grab opacity-0 group-hover/mod:opacity-100 transition-opacity" />
                      <input 
                        value={mod.title}
                        onChange={(e) => setModules(modules.map(m => m.id === mod.id ? { ...m, title: e.target.value } : m))}
                        className="bg-transparent text-lg font-black text-theme-fg focus:outline-none focus:ring-0 w-full"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setModules(modules.map(m => m.id === mod.id ? { ...m, isOpen: !m.isOpen } : m))}>
                        {mod.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 opacity-0 group-hover/mod:opacity-100" onClick={() => setModules(modules.filter(m => m.id !== mod.id))}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {mod.isOpen && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 space-y-4">
                          <Reorder.Group axis="y" values={mod.lessons} onReorder={(newLessons) => setModules(modules.map(m => m.id === mod.id ? { ...m, lessons: newLessons } : m))} className="space-y-3">
                            {mod.lessons.map((les) => (
                              <Reorder.Item key={les.id} value={les}>
                                <div className="flex items-center gap-4 p-4 bg-theme-surface border border-theme-border rounded-2xl hover:border-theme-primary/30 transition-all group/item shadow-sm">
                                  <GripVertical size={14} className="text-theme-subtle cursor-grab opacity-0 group-hover/item:opacity-100" />
                                  
                                  <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                    les.type === 'lesson' ? "bg-blue-500/10 text-blue-500" : 
                                    les.type === 'quiz' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                                  )}>
                                    {les.type === 'lesson' ? <Video size={18} /> : les.type === 'quiz' ? <HelpCircle size={18} /> : <FileUp size={18} />}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <input 
                                      value={les.title}
                                      onChange={(e) => {
                                        const newLessons = mod.lessons.map(l => l.id === les.id ? { ...l, title: e.target.value } : l);
                                        setModules(modules.map(m => m.id === mod.id ? { ...m, lessons: newLessons } : m));
                                      }}
                                      className="bg-transparent text-sm font-bold text-theme-fg focus:outline-none w-full"
                                    />
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase font-black">{les.type}</Badge>
                                      <span className="text-[10px] text-theme-muted uppercase font-bold">{les.duration} read</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-theme-primary/10 hover:text-theme-primary">
                                      <Edit3 size={14} />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 opacity-0 group-hover/item:opacity-100" onClick={() => deleteLesson(mod.id, les.id)}>
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                </div>
                              </Reorder.Item>
                            ))}
                          </Reorder.Group>

                          {/* Block Actions */}
                          <div className="flex items-center gap-2 pt-2">
                            <button 
                              onClick={() => addLesson(mod.id, 'lesson')}
                              className="px-4 py-2 rounded-xl bg-theme-raised text-[10px] font-black uppercase text-theme-muted hover:text-theme-fg transition-all flex items-center gap-2 border border-transparent hover:border-theme-border"
                            >
                              <PlusCircle size={12} /> Add Lesson
                            </button>
                            <button 
                              onClick={() => addLesson(mod.id, 'quiz')}
                              className="px-4 py-2 rounded-xl bg-theme-raised text-[10px] font-black uppercase text-theme-muted hover:text-theme-fg transition-all flex items-center gap-2 border border-transparent hover:border-theme-border"
                            >
                              <HelpCircle size={12} /> Add Quiz
                            </button>
                            <button 
                              onClick={() => addLesson(mod.id, 'assignment')}
                              className="px-4 py-2 rounded-xl bg-theme-raised text-[10px] font-black uppercase text-theme-muted hover:text-theme-fg transition-all flex items-center gap-2 border border-transparent hover:border-theme-border"
                            >
                              <FileUp size={12} /> Add Assignment
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {/* Bottom Action */}
          <div className="flex justify-center pt-8">
            <button 
              onClick={addModule}
              className="px-12 py-4 bg-zinc-900 border border-theme-border rounded-[2rem] text-sm font-black uppercase tracking-widest text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-all flex items-center gap-3 group shadow-2xl"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
              Insert New Module
            </button>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
