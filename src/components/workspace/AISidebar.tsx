"use client";

import { useState } from "react";
import { Sparkles, Wand2, RotateCcw, BookOpen, Search, Lightbulb, PenTool } from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

interface AISidebarProps {
  content: string;
  onApplyChange: (newContent: string) => void;
  onInsertContent: (content: string) => void;
}

const QUICK_ACTIONS = [
  { id: "summarize",  icon: BookOpen,  label: "Summarize",        description: "Create a concise summary of your document" },
  { id: "improve",    icon: Wand2,     label: "Improve writing",  description: "Fix grammar, flow and professional tone" },
  { id: "rewrite",    icon: RotateCcw, label: "Rewrite",          description: "Express the same ideas in a fresh way" },
  { id: "brainstorm", icon: Lightbulb, label: "Brainstorm",       description: "Generate ideas based on current content" },
  { id: "plagiarism", icon: Search,    label: "Plagiarism check", description: "Verify original content and detect matches" },
  { id: "shorten",    icon: PenTool,   label: "Make shorter",     description: "Condensed version for quick reading" },
];

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

  return (
    <div className="flex flex-col h-full bg-card w-full overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">AI Writing Assistant</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Powered by Gemma4:e4b Intelligence</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI to write anything..."
            className="h-24 resize-none text-sm"
          />
          <Button
            type="button"
            onClick={() => runAIAction('custom')}
            disabled={loading || !prompt}
            className="w-full"
          >
            <Sparkles size={14} className="mr-1.5" />
            Generate content
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Quick actions</p>
          {QUICK_ACTIONS.map(({ id, icon: Icon, label, description }) => (
            <button
              key={id}
              type="button"
              onClick={() => runAIAction(id)}
              disabled={loading}
              className="w-full rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {result && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">AI result</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onInsertContent(result)}
                  >
                    Insert
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setResult(null)}
                  >
                    Discard
                  </Button>
                </div>
              </div>
              <div className="text-xs text-foreground leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                {result}
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" size={14} />
              </div>
              <p className="text-xs font-medium text-muted-foreground animate-pulse">Gemma is thinking…</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
