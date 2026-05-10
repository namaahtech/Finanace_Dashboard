"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/layout/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Inbox, Send, FileText, Star, StarOff, Trash2, RefreshCw, Search,
  Paperclip, PenLine, Reply, Forward, Bot, Sparkles, Loader2,
  ChevronRight, Mail, MailOpen, Clock, AlertTriangle, Briefcase,
  IndianRupee, RotateCcw, X, Copy, Check,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type MailMessage = {
  id: string;
  zoho_message_id: string;
  subject: string;
  from_name: string;
  from_address: string;
  to_address: string[];
  cc_address: string[];
  preview: string;
  body: string;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  has_attachment: boolean;
  ai_category: string;
  ai_priority: number;
  ai_sentiment: string;
  ai_summary: string;
};

const FOLDERS = [
  { id: "Inbox",   label: "Inbox",   icon: Inbox },
  { id: "Sent",    label: "Sent",    icon: Send },
  { id: "Drafts",  label: "Drafts",  icon: FileText },
  { id: "Starred", label: "Starred", icon: Star },
  { id: "Trash",   label: "Trash",   icon: Trash2 },
];

const AI_LABELS = [
  { id: "URGENT",    label: "Urgent",     color: "text-rose-500",    dot: "bg-rose-500"    },
  { id: "WORK",      label: "Work",       color: "text-blue-500",    dot: "bg-blue-500"    },
  { id: "FINANCE",   label: "Finance",    color: "text-amber-500",   dot: "bg-amber-500"   },
  { id: "FOLLOW_UP", label: "Follow-Up",  color: "text-purple-500",  dot: "bg-purple-500"  },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  URGENT: AlertTriangle, WORK: Briefcase, FINANCE: IndianRupee, FOLLOW_UP: RotateCcw, GENERAL: Mail,
};

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "border-l-emerald-400",
  NEGATIVE: "border-l-rose-400",
  NEUTRAL:  "border-l-theme-border",
};

function getInitials(name: string) {
  return (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function AICategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = {
    URGENT: "bg-rose-500/10 text-rose-500",
    WORK: "bg-blue-500/10 text-blue-500",
    FINANCE: "bg-amber-500/10 text-amber-600",
    FOLLOW_UP: "bg-purple-500/10 text-purple-500",
    GENERAL: "bg-theme-raised text-theme-muted",
  };
  return (
    <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full", map[category] || map.GENERAL)}>
      {(category || "GENERAL").replace("_", " ")}
    </span>
  );
}

export default function InboxPage() {
  const { user }       = useAuth();
  const { showToast }  = useToast();

  const [folder,   setFolder]   = useState("Inbox");
  const [aiFilter, setAiFilter] = useState<string | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);
  const [connected, setConnected] = useState(true);

  const [aiLoading,       setAiLoading]       = useState(false);
  const [replySuggestions, setReplySuggestions] = useState<string[]>([]);
  const [copiedIdx,        setCopiedIdx]        = useState<number | null>(null);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);

  const load = useCallback(async (sync = false) => {
    if (sync) setSyncing(true); else setLoading(true);
    try {
      const url = `/api/mail/inbox?folder=${folder}${sync ? "&sync=true" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      setConnected(data.connected !== false);
      setMessages(data.data || []);
    } finally {
      setLoading(false); setSyncing(false);
    }
  }, [folder]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("inbox_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "mail_messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function selectMessage(msg: MailMessage) {
    setSelected(msg);
    setReplyOpen(false);
    setReplyBody("");
    setReplySuggestions([]);

    if (!msg.is_read) {
      await fetch("/api/mail/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msg.id, is_read: true }),
      });
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m));
    }

    // Trigger AI classify if not done
    if (!msg.ai_summary && msg.zoho_message_id) {
      setAiLoading(true);
      try {
        const res = await fetch("/api/mail/ai/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type:      "classify",
            messageId: msg.zoho_message_id,
            subject:   msg.subject,
            preview:   msg.preview,
            fromName:  msg.from_name,
            body:      msg.body,
          }),
        });
        const ai = await res.json();
        setSelected((prev) => prev ? { ...prev, ai_summary: ai.summary, ai_category: ai.category, ai_sentiment: ai.sentiment } : prev);
        setReplySuggestions(ai.replySuggestions || []);
      } finally {
        setAiLoading(false);
      }
    } else if (msg.ai_summary) {
      // Fetch reply suggestions
      setAiLoading(true);
      try {
        const res = await fetch("/api/mail/ai/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "reply_suggest", subject: msg.subject, body: msg.preview }),
        });
        const data = await res.json();
        setReplySuggestions(data.suggestions || []);
      } finally {
        setAiLoading(false);
      }
    }
  }

  async function toggleStar(msg: MailMessage, e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault();
    await fetch("/api/mail/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msg.id, is_starred: !msg.is_starred }),
    });
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_starred: !m.is_starred } : m));
    if (selected?.id === msg.id) setSelected((s) => s ? { ...s, is_starred: !s.is_starred } : s);
  }

  async function sendReply() {
    if (!replyBody.trim() || !selected) return;
    setReplySending(true);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to:      [selected.from_address],
          subject: `Re: ${selected.subject}`,
          content: replyBody,
        }),
      });
      if (res.ok) {
        showToast("Reply sent successfully.", "success");
        setReplyOpen(false);
        setReplyBody("");
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to send reply.", "error");
      }
    } finally {
      setReplySending(false);
    }
  }

  function copyReply(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setReplyBody(text);
    setReplyOpen(true);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  const displayed = messages.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.subject?.toLowerCase().includes(q) || m.from_name?.toLowerCase().includes(q) || m.preview?.toLowerCase().includes(q);
    const matchAi     = !aiFilter || m.ai_category === aiFilter;
    const matchFolder = folder === "Starred" ? m.is_starred : true;
    return matchSearch && matchAi && matchFolder;
  });

  return (
    <DashboardShell
      title="Inbox"
      subtitle="Your emails, AI-classified and organized."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={syncing}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-theme-border bg-theme-raised text-xs font-semibold text-theme-muted hover:text-theme-fg transition-all"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> Sync
          </button>
          <Link href="/admin/mail/compose">
            <button className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all shadow-sm">
              <PenLine size={13} /> Compose
            </button>
          </Link>
        </div>
      }
    >
      <div className="flex h-[calc(100vh-168px)] gap-0 overflow-hidden rounded-2xl border border-theme-border shadow-sm">
        {/* Panel 1: Folder Tree */}
        <div className="w-48 flex-shrink-0 border-r border-theme-border flex flex-col bg-theme-surface">
          <div className="p-3 border-b border-theme-border">
            <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted px-2">Folders</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {FOLDERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setFolder(id); setAiFilter(null); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left",
                  folder === id && !aiFilter
                    ? "bg-theme-primary/10 text-theme-primary"
                    : "text-theme-muted hover:bg-theme-raised hover:text-theme-fg"
                )}
              >
                <Icon size={13} strokeWidth={folder === id && !aiFilter ? 2.5 : 2} className="flex-shrink-0" />
                {label}
                {id === "Inbox" && messages.filter((m) => !m.is_read).length > 0 && (
                  <span className="ml-auto text-[9px] font-black bg-theme-primary/10 text-theme-primary px-1.5 py-0.5 rounded-full">
                    {messages.filter((m) => !m.is_read).length}
                  </span>
                )}
              </button>
            ))}

            <div className="pt-3 pb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted px-3 mb-1.5">AI Labels</p>
            </div>
            {AI_LABELS.map(({ id, label, color, dot }) => (
              <button
                key={id}
                onClick={() => setAiFilter(aiFilter === id ? null : id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left",
                  aiFilter === id ? "bg-theme-raised" : "text-theme-muted hover:bg-theme-raised hover:text-theme-fg"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
                <span className={aiFilter === id ? color : ""}>{label}</span>
                <span className="ml-auto text-[9px] text-theme-muted">
                  {messages.filter((m) => m.ai_category === id).length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Panel 2: Email List */}
        <div className="w-80 flex-shrink-0 border-r border-theme-border flex flex-col bg-theme-page">
          <div className="p-3 border-b border-theme-border">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emails…"
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-theme-border bg-theme-surface text-xs text-theme-fg outline-none focus:border-theme-primary transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-fg">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-theme-border/30">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={20} className="animate-spin text-theme-muted" />
              </div>
            ) : !connected ? (
              <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
                <Mail size={28} className="text-theme-muted/30 mb-3" />
                <p className="text-xs font-semibold text-theme-fg mb-1">Zoho not connected</p>
                <p className="text-[11px] text-theme-muted mb-4">Connect Zoho Mail to start receiving emails.</p>
                <Link href="/admin/mail/config">
                  <button className="px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold">
                    Go to Config
                  </button>
                </Link>
              </div>
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48">
                <MailOpen size={28} className="text-theme-muted/30 mb-3" />
                <p className="text-xs text-theme-muted">No emails found</p>
              </div>
            ) : (
              displayed.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => selectMessage(msg)}
                  className={cn(
                    "px-4 py-3 cursor-pointer transition-all group relative",
                    selected?.id === msg.id
                      ? "bg-theme-primary/5 border-l-2 border-l-theme-primary"
                      : "hover:bg-theme-raised/50",
                    !msg.is_read && "bg-theme-raised/20"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-full bg-theme-primary/10 flex items-center justify-center text-[9px] font-black text-theme-primary flex-shrink-0">
                      {getInitials(msg.from_name)}
                    </div>
                    <span className={cn("text-xs truncate flex-1", !msg.is_read ? "font-bold text-theme-fg" : "font-medium text-theme-muted")}>
                      {msg.from_name || msg.from_address}
                    </span>
                    <span className="text-[9px] text-theme-muted flex-shrink-0">
                      {msg.received_at ? formatDistanceToNow(new Date(msg.received_at), { addSuffix: false }) : "—"}
                    </span>
                  </div>
                  <p className={cn("text-[11px] truncate mb-0.5", !msg.is_read ? "font-semibold text-theme-fg" : "text-theme-muted")}>
                    {msg.subject || "(no subject)"}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] text-theme-muted truncate flex-1">{msg.ai_summary || msg.preview}</p>
                    <AICategoryBadge category={msg.ai_category || "GENERAL"} />
                    {msg.has_attachment && <Paperclip size={9} className="text-theme-muted flex-shrink-0" />}
                  </div>
                  <button
                    onClick={(e) => toggleStar(msg, e)}
                    className="absolute right-3 bottom-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {msg.is_starred
                      ? <Star     size={11} className="text-amber-400 fill-amber-400" />
                      : <StarOff  size={11} className="text-theme-muted" />}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 3: Reading Pane */}
        <div className="flex-1 flex flex-col bg-theme-surface overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full">
              <MailOpen size={40} className="text-theme-muted/20 mb-4" />
              <p className="text-sm font-semibold text-theme-muted">Select an email to read</p>
              <p className="text-xs text-theme-muted/60 mt-1">Click any email in the list</p>
            </div>
          ) : (
            <>
              {/* Email Header */}
              <div className="px-6 pt-6 pb-4 border-b border-theme-border flex-shrink-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className={cn("text-base font-black text-theme-fg leading-snug flex-1 pr-4",
                    `border-l-4 pl-3 rounded-l-sm`,
                    SENTIMENT_COLORS[selected.ai_sentiment] || "border-l-theme-border"
                  )}>
                    {selected.subject || "(no subject)"}
                  </h2>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <AICategoryBadge category={selected.ai_category || "GENERAL"} />
                    <button onClick={(e) => toggleStar(selected, e)} className="p-1.5 rounded-lg hover:bg-theme-raised transition-colors">
                      {selected.is_starred
                        ? <Star    size={14} className="text-amber-400 fill-amber-400" />
                        : <StarOff size={14} className="text-theme-muted" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-theme-primary/10 flex items-center justify-center text-xs font-black text-theme-primary flex-shrink-0">
                    {getInitials(selected.from_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-theme-fg">{selected.from_name || selected.from_address}</p>
                    <p className="text-[10px] text-theme-muted truncate">
                      {selected.from_address}
                      {selected.to_address?.length > 0 && ` → ${selected.to_address.join(", ")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-theme-muted flex-shrink-0">
                    <Clock size={10} />
                    {selected.received_at ? format(new Date(selected.received_at), "MMM d, h:mm a") : "—"}
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {(selected.ai_summary || aiLoading) && (
                <div className="mx-6 my-3 p-3 rounded-xl bg-theme-primary/5 border border-theme-primary/15 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles size={12} className="text-theme-primary" />
                    <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wider">Gemma 4 Summary</span>
                  </div>
                  {aiLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={11} className="animate-spin text-theme-muted" />
                      <span className="text-[11px] text-theme-muted">Analyzing with AI…</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-theme-muted leading-relaxed">{selected.ai_summary}</p>
                  )}
                </div>
              )}

              {/* Email Body */}
              <div className="flex-1 overflow-y-auto px-6 py-3">
                <div className="prose prose-sm max-w-none">
                  {selected.body ? (
                    <div
                      className="text-sm text-theme-fg leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selected.body }}
                    />
                  ) : (
                    <p className="text-sm text-theme-fg leading-relaxed whitespace-pre-wrap">
                      {selected.preview || "No content available. Sync with Zoho to load the full email."}
                    </p>
                  )}
                </div>
              </div>

              {/* AI Reply Suggestions */}
              {replySuggestions.length > 0 && !replyOpen && (
                <div className="px-6 py-3 border-t border-theme-border flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={12} className="text-theme-primary" />
                    <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">AI Reply Suggestions</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {replySuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => copyReply(s, i)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-theme-raised border border-theme-border text-[11px] text-theme-muted hover:text-theme-fg hover:border-theme-primary/30 transition-all max-w-[280px] text-left"
                      >
                        {copiedIdx === i ? <Check size={10} className="text-emerald-500 flex-shrink-0" /> : <Copy size={10} className="flex-shrink-0" />}
                        <span className="truncate">{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply Panel */}
              {replyOpen && (
                <div className="px-6 pb-4 pt-3 border-t border-theme-border flex-shrink-0">
                  <div className="rounded-xl border border-theme-primary/20 bg-theme-primary/3 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-theme-primary/10">
                      <Reply size={12} className="text-theme-primary" />
                      <span className="text-[11px] font-bold text-theme-primary">Reply to {selected.from_name}</span>
                      <button onClick={() => setReplyOpen(false)} className="ml-auto text-theme-muted hover:text-theme-fg">
                        <X size={12} />
                      </button>
                    </div>
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Write your reply…"
                      rows={4}
                      className="w-full px-3 py-2 text-xs text-theme-fg bg-transparent resize-none outline-none placeholder:text-theme-muted/50"
                    />
                    <div className="flex justify-end gap-2 px-3 pb-2">
                      <button
                        onClick={() => setReplyOpen(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-theme-muted hover:bg-theme-raised transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendReply}
                        disabled={replySending || !replyBody.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all disabled:opacity-50"
                      >
                        {replySending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                        Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              {!replyOpen && (
                <div className="flex items-center gap-2 px-6 py-3 border-t border-theme-border flex-shrink-0">
                  <button
                    onClick={() => setReplyOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all"
                  >
                    <Reply size={13} /> Reply
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-theme-border text-theme-muted hover:text-theme-fg hover:bg-theme-raised text-xs font-semibold transition-all">
                    <Forward size={13} /> Forward
                  </button>
                  <button className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-theme-border text-theme-muted hover:text-rose-500 hover:border-rose-500/30 text-xs font-semibold transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
