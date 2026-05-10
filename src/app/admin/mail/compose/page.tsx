"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Send, X, Paperclip, Layers, Bot, Sparkles, Loader2,
  ChevronDown, ChevronUp, Bold, Italic, Link, List, Minus, Plus,
  FileText, Check, RefreshCw,
} from "lucide-react";

type Template = { id: string; name: string; category: string; subject: string; body: string };
type Employee = { id: string; name: string; email: string; designation: string };

export default function ComposePage() {
  const { user }    = useAuth();
  const { showToast } = useToast();
  const router      = useRef(typeof window !== "undefined" ? window : null);

  const [to,      setTo]      = useState<string[]>([]);
  const [toInput, setToInput] = useState("");
  const [cc,      setCc]      = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [bcc,     setBcc]     = useState<string[]>([]);
  const [bccInput, setBccInput] = useState("");
  const [subject, setSubject] = useState("");
  const [body,    setBody]    = useState("");
  const [sending, setSending] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const [templates,        setTemplates]        = useState<Template[]>([]);
  const [showTemplates,    setShowTemplates]    = useState(false);
  const [employeeSuggestions, setEmployeeSuggestions] = useState<Employee[]>([]);
  const [activeInput,      setActiveInput]      = useState<"to" | "cc" | "bcc" | null>(null);

  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiPanel,     setAiPanel]     = useState(false);
  const [suggestedSubject, setSuggestedSubject] = useState("");
  const [improved,    setImproved]    = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.from("mail_templates").select("id,name,category,subject,body").eq("status","active")
      .then(({ data }) => setTemplates(data || []));
  }, []);

  async function searchEmployees(q: string) {
    if (!q || q.length < 2) { setEmployeeSuggestions([]); return; }
    const { data } = await supabase
      .from("employees")
      .select("id,name,email,designation")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(6);
    setEmployeeSuggestions(data || []);
  }

  function addTag(list: string[], setList: (v: string[]) => void, setInput: (v: string) => void, value: string) {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
    setInput("");
    setEmployeeSuggestions([]);
  }

  function removeTag(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.filter((v) => v !== value));
  }

  function applyTemplate(t: Template) {
    setSubject(t.subject);
    setBody(t.body);
    setShowTemplates(false);
    showToast(`Template "${t.name}" applied.`, "info");
  }

  function insertFormat(tag: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = body.substring(start, end);
    const insert = tag === "bold"   ? `**${sel || "text"}**`
                 : tag === "italic" ? `_${sel || "text"}_`
                 : tag === "list"   ? `\n• ${sel || "item"}`
                 : tag === "link"   ? `[${sel || "link text"}](url)`
                 : sel;
    setBody(body.substring(0, start) + insert + body.substring(end));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + insert.length, start + insert.length); }, 0);
  }

  async function aiImprove(type: "improve_tone" | "shorten" | "suggest_subject") {
    if (!body && type !== "suggest_subject") { showToast("Write some content first.", "warning"); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/mail/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, subject, body }),
      });
      const data = await res.json();
      if (type === "improve_tone") { setImproved(data.improved || ""); setAiPanel(true); }
      else if (type === "shorten")  { setImproved(data.shortened || ""); setAiPanel(true); }
      else if (type === "suggest_subject") { setSuggestedSubject(data.subject || ""); }
    } finally {
      setAiLoading(false);
    }
  }

  async function saveDraft() {
    if (!body && !subject && !to.length) { showToast("Nothing to save.", "warning"); return; }
    setSaving(true);
    try {
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (user as any)?.email || "")
        .maybeSingle();

      await fetch("/api/mail/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: emp?.id, to, cc, bcc, subject, body }),
      });
      showToast("Draft saved.", "success");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!to.length)    { showToast("Add at least one recipient.", "warning"); return; }
    if (!subject)      { showToast("Subject is required.", "warning"); return; }
    if (!body.trim())  { showToast("Email body cannot be empty.", "warning"); return; }

    setSending(true);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, cc, bcc, subject, content: body, fromName: (user as any)?.name }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Email sent successfully.", "success");
        setTo([]); setCc([]); setBcc([]); setSubject(""); setBody("");
      } else {
        showToast(data.error || "Failed to send.", "error");
      }
    } finally {
      setSending(false);
    }
  }

  const CATEGORY_COLORS: Record<string, string> = {
    hr: "bg-sky-500/10 text-sky-500", finance: "bg-amber-500/10 text-amber-500",
    general: "bg-theme-raised text-theme-muted", ops: "bg-emerald-500/10 text-emerald-500",
    sales: "bg-rose-500/10 text-rose-500",
  };

  return (
    <DashboardShell
      title="Compose Email"
      subtitle="Write and send emails with AI assist."
      actions={
        <div className="flex items-center gap-2">
          <button onClick={saveDraft} disabled={saving}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-theme-border bg-theme-raised text-xs font-semibold text-theme-muted hover:text-theme-fg transition-all">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            Save Draft
          </button>
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-1.5 h-9 px-5 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all shadow-sm disabled:opacity-60">
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Send
          </button>
        </div>
      }
    >
      <div className="flex gap-5">
        {/* Compose Panel */}
        <div className="flex-1 min-w-0 page-card p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-4 py-2.5 border-b border-theme-border bg-theme-raised/30">
            {[
              { icon: Bold,   label: "Bold",   action: () => insertFormat("bold") },
              { icon: Italic, label: "Italic", action: () => insertFormat("italic") },
              { icon: Link,   label: "Link",   action: () => insertFormat("link") },
              { icon: List,   label: "List",   action: () => insertFormat("list") },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} onClick={action} title={label}
                className="p-1.5 rounded-lg text-theme-muted hover:text-theme-fg hover:bg-theme-raised transition-all">
                <Icon size={13} />
              </button>
            ))}
            <div className="h-4 w-px bg-theme-border mx-1" />
            <button onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-theme-muted hover:text-theme-fg hover:bg-theme-raised text-[11px] font-semibold transition-all">
              <Layers size={12} /> Templates
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => aiImprove("improve_tone")} disabled={aiLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-theme-primary/10 text-theme-primary text-[11px] font-semibold hover:bg-theme-primary/20 transition-all disabled:opacity-50">
                {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                Improve
              </button>
              <button onClick={() => aiImprove("shorten")} disabled={aiLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-theme-primary/10 text-theme-primary text-[11px] font-semibold hover:bg-theme-primary/20 transition-all disabled:opacity-50">
                <Minus size={11} /> Shorten
              </button>
            </div>
          </div>

          {/* Template Picker */}
          {showTemplates && (
            <div className="border-b border-theme-border bg-theme-page px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-theme-fg">Choose a Template</p>
                <button onClick={() => setShowTemplates(false)} className="text-theme-muted hover:text-theme-fg"><X size={13} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => applyTemplate(t)}
                    className="flex items-start gap-2 p-3 rounded-xl border border-theme-border hover:border-theme-primary/30 hover:bg-theme-raised text-left transition-all group">
                    <FileText size={13} className="text-theme-muted mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-theme-fg truncate">{t.name}</p>
                      <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full", CATEGORY_COLORS[t.category] || "bg-theme-raised text-theme-muted")}>
                        {t.category}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fields */}
          <div className="divide-y divide-theme-border/50">
            {/* To */}
            <div className="flex items-start px-4 py-2.5 gap-3 relative">
              <span className="text-[11px] font-bold text-theme-muted mt-2 w-8 flex-shrink-0">To</span>
              <div className="flex-1 flex flex-wrap gap-1 items-center min-h-[32px]">
                {to.map((email) => (
                  <span key={email} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary text-[11px] font-semibold">
                    {email} <button onClick={() => removeTag(to, setTo, email)}><X size={9} /></button>
                  </span>
                ))}
                <input
                  value={toInput}
                  onChange={(e) => { setToInput(e.target.value); setActiveInput("to"); searchEmployees(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(to, setTo, setToInput, toInput); }}}
                  onBlur={() => { setTimeout(() => { addTag(to, setTo, setToInput, toInput); setActiveInput(null); }, 200); }}
                  placeholder={to.length === 0 ? "Add recipients…" : ""}
                  className="flex-1 min-w-32 bg-transparent text-xs text-theme-fg outline-none placeholder:text-theme-muted/50 h-8"
                />
              </div>
              <button onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-[10px] font-semibold text-theme-muted hover:text-theme-fg transition-colors mt-2">
                {showCcBcc ? "Hide" : "CC/BCC"}
              </button>
              {activeInput === "to" && employeeSuggestions.length > 0 && (
                <div className="absolute left-14 top-full z-50 w-72 rounded-xl border border-theme-border bg-theme-surface shadow-xl overflow-hidden">
                  {employeeSuggestions.map((emp) => (
                    <button key={emp.id} onMouseDown={() => addTag(to, setTo, setToInput, emp.email)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-theme-raised text-left transition-all">
                      <div className="h-6 w-6 rounded-full bg-theme-primary/10 flex items-center justify-center text-[9px] font-black text-theme-primary">
                        {emp.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-theme-fg">{emp.name}</p>
                        <p className="text-[10px] text-theme-muted">{emp.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CC / BCC */}
            {showCcBcc && (
              <>
                {[
                  { label: "CC",  list: cc,  setList: setCc,  input: ccInput,  setInput: setCcInput,  inputKey: "cc" as const },
                  { label: "BCC", list: bcc, setList: setBcc, input: bccInput, setInput: setBccInput, inputKey: "bcc" as const },
                ].map(({ label, list, setList, input, setInput, inputKey }) => (
                  <div key={label} className="flex items-start px-4 py-2 gap-3 relative">
                    <span className="text-[11px] font-bold text-theme-muted mt-2 w-8 flex-shrink-0">{label}</span>
                    <div className="flex-1 flex flex-wrap gap-1 items-center min-h-[28px]">
                      {list.map((email) => (
                        <span key={email} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-theme-raised text-theme-muted text-[11px]">
                          {email} <button onClick={() => removeTag(list, setList, email)}><X size={9} /></button>
                        </span>
                      ))}
                      <input
                        value={input}
                        onChange={(e) => { setInput(e.target.value); setActiveInput(inputKey); searchEmployees(e.target.value); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(list, setList, setInput, input); }}}
                        onBlur={() => { setTimeout(() => { addTag(list, setList, setInput, input); setActiveInput(null); }, 200); }}
                        placeholder={`Add ${label} recipients…`}
                        className="flex-1 min-w-32 bg-transparent text-xs text-theme-fg outline-none placeholder:text-theme-muted/50 h-7"
                      />
                    </div>
                    {activeInput === inputKey && employeeSuggestions.length > 0 && (
                      <div className="absolute left-14 top-full z-50 w-72 rounded-xl border border-theme-border bg-theme-surface shadow-xl overflow-hidden">
                        {employeeSuggestions.map((emp) => (
                          <button key={emp.id} onMouseDown={() => addTag(list, setList, setInput, emp.email)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-theme-raised text-left">
                            <p className="text-xs font-semibold text-theme-fg">{emp.name}</p>
                            <p className="text-[10px] text-theme-muted ml-2">{emp.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Subject */}
            <div className="flex items-center px-4 py-2.5 gap-3">
              <span className="text-[11px] font-bold text-theme-muted w-16 flex-shrink-0">Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject…"
                className="flex-1 bg-transparent text-sm font-semibold text-theme-fg outline-none placeholder:text-theme-muted/40"
              />
              {suggestedSubject && (
                <button onClick={() => { setSubject(suggestedSubject); setSuggestedSubject(""); }}
                  className="text-[10px] text-theme-primary hover:underline flex-shrink-0">
                  Use: {suggestedSubject.slice(0, 30)}…
                </button>
              )}
              <button onClick={() => aiImprove("suggest_subject")} disabled={aiLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-theme-raised text-theme-muted hover:text-theme-fg text-[10px] font-semibold transition-all">
                <Bot size={10} /> AI
              </button>
            </div>
          </div>

          {/* Body */}
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email here…&#10;&#10;Tip: Use the AI buttons above to improve tone, shorten, or apply a template."
            className="w-full flex-1 px-4 py-4 text-sm text-theme-fg bg-transparent resize-none outline-none placeholder:text-theme-muted/40 leading-relaxed"
            style={{ minHeight: 320 }}
          />

          {/* Footer */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-theme-border bg-theme-raised/20">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-theme-border text-theme-muted hover:text-theme-fg cursor-pointer text-xs font-semibold transition-all">
              <Paperclip size={13} /> Attach File
              <input type="file" className="hidden" />
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={saveDraft} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-theme-border text-theme-muted hover:text-theme-fg text-xs font-semibold transition-all">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />} Draft
              </button>
              <button onClick={handleSend} disabled={sending}
                className="flex items-center gap-1.5 px-5 py-1.5 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all disabled:opacity-60 shadow-sm">
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send
              </button>
            </div>
          </div>
        </div>

        {/* AI Panel */}
        {aiPanel && improved && (
          <div className="w-72 flex-shrink-0 page-card">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-theme-primary/10 flex items-center justify-center">
                <Sparkles size={14} className="text-theme-primary" />
              </div>
              <p className="text-xs font-bold text-theme-fg flex-1">AI Suggestion</p>
              <button onClick={() => setAiPanel(false)} className="text-theme-muted hover:text-theme-fg"><X size={13} /></button>
            </div>
            <div className="rounded-xl bg-theme-raised p-3 mb-3 text-xs text-theme-muted leading-relaxed whitespace-pre-wrap">
              {improved}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setBody(improved); setAiPanel(false); showToast("AI suggestion applied.", "success"); }}
                className="flex-1 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all">
                <Check size={11} className="inline mr-1" /> Apply
              </button>
              <button onClick={() => setAiPanel(false)}
                className="flex-1 py-2 rounded-xl border border-theme-border text-theme-muted text-xs font-semibold hover:bg-theme-raised transition-all">
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
