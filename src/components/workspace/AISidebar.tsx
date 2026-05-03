"use client";

import { useState } from "react";
import { Sparkles, Wand2, Type, RotateCcw, Languages, BookOpen, Search, Lightbulb, PenTool, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

interface AISidebarProps {
  content: string;
  onApplyChange: (newContent: string) => void;
  onInsertContent: (content: string) => void;
}

export function AISidebar({ content, onApplyChange, onInsertContent }: AISidebarProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const runAIAction = async (action: string, customPrompt?: string) => {
    setLoading(true);
    setResult(null);
    try {
      const response = await axios.post('/api/workspace/ai', {
        action,
        content: content,
        customPrompt: customPrompt || prompt
      });
      setResult(response.data.result);
    } catch (error) {
      console.error("AI Action failed", error);
    } finally {
      setLoading(false);
    }
  };

  const AIActionBtn = ({ icon: Icon, label, onClick, description }: any) => (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full p-4 rounded-2xl bg-theme-raised/50 border border-theme-border hover:border-theme-primary/30 transition-all text-left group"
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="h-8 w-8 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icon size={16} />
        </div>
        <span className="text-xs font-black text-theme-fg uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-[10px] text-theme-muted font-bold ml-11">{description}</p>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-theme-surface border-l border-theme-border w-80 overflow-hidden">
      <div className="p-6 border-b border-theme-border bg-theme-raised/30">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="text-theme-primary" size={18} />
          <h2 className="text-sm font-black text-theme-fg uppercase tracking-tight">AI Writing Assistant</h2>
        </div>
        <p className="text-[10px] text-theme-muted font-bold">Powered by Gemma4:e4b Intelligence</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {/* Custom Prompt */}
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI to write anything..."
            className="w-full h-24 p-3 bg-theme-raised rounded-xl text-xs font-bold text-theme-fg border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-primary/20 placeholder:text-theme-muted/50"
          />
          <button
            onClick={() => runAIAction('custom')}
            disabled={loading || !prompt}
            className="w-full py-2 bg-theme-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-theme-primary/90 transition-all disabled:opacity-50"
          >
            Generate Content
          </button>
        </div>

        <div className="h-px bg-theme-border my-4" />

        {/* Quick Actions */}
        <div className="space-y-3">
          <AIActionBtn 
            icon={BookOpen} 
            label="Summarize" 
            description="Create a concise summary of your document"
            onClick={() => runAIAction('summarize')}
          />
          <AIActionBtn 
            icon={Wand2} 
            label="Improve Writing" 
            description="Fix grammar, flow and professional tone"
            onClick={() => runAIAction('improve')}
          />
          <AIActionBtn 
            icon={RotateCcw} 
            label="Rewrite" 
            description="Express the same ideas in a fresh way"
            onClick={() => runAIAction('rewrite')}
          />
          <AIActionBtn 
            icon={Lightbulb} 
            label="Brainstorm" 
            description="Generate ideas based on current content"
            onClick={() => runAIAction('brainstorm')}
          />
          <AIActionBtn 
            icon={Search} 
            label="Plagiarism Check" 
            description="Verify original content and detect matches"
            onClick={() => runAIAction('plagiarism')}
          />
          <AIActionBtn 
            icon={PenTool} 
            label="Make Shorter" 
            description="Condensed version for quick reading"
            onClick={() => runAIAction('shorten')}
          />
        </div>

        {/* AI Result Area */}
        {result && (
          <div className="mt-6 p-4 rounded-2xl bg-theme-primary/5 border border-theme-primary/20 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest">AI Result</span>
              <div className="flex gap-2">
                <button 
                   onClick={() => onInsertContent(result)}
                   className="text-[10px] font-black text-theme-primary hover:underline"
                >
                  INSERT
                </button>
                <button 
                   onClick={() => setResult(null)}
                   className="text-[10px] font-black text-theme-muted hover:text-theme-fg"
                >
                  DISCARD
                </button>
              </div>
            </div>
            <div className="text-xs text-theme-fg font-medium leading-relaxed max-h-60 overflow-y-auto pr-2 scrollbar-hide whitespace-pre-wrap">
              {result}
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-6 p-8 flex flex-col items-center justify-center gap-4 bg-theme-raised/30 rounded-2xl border border-dashed border-theme-border">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-2 border-theme-primary/20 border-t-theme-primary animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-theme-primary animate-pulse" size={16} />
            </div>
            <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest animate-pulse">Gemma is thinking...</p>
          </div>
        )}
      </div>
    </div>
  );
}
