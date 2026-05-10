"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Send, Search, Loader2, PenLine, Paperclip, X, MailOpen } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type MailMessage = {
  id: string; zoho_message_id: string; subject: string;
  from_name: string; from_address: string; to_address: string[];
  preview: string; received_at: string; has_attachment: boolean;
  ai_category: string; ai_priority: number;
};

function getInitials(n: string) {
  return (n || "?").split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2);
}

export default function SentPage() {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<MailMessage | null>(null);

  useEffect(() => {
    supabase
      .from("mail_messages")
      .select("*")
      .eq("folder", "Sent")
      .order("received_at", { ascending: false })
      .then(({ data }) => { setMessages(data || []); setLoading(false); });

    const ch = supabase
      .channel("sent_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "mail_messages" }, () => {
        supabase.from("mail_messages").select("*").eq("folder","Sent")
          .order("received_at",{ascending:false})
          .then(({data})=>setMessages(data||[]));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = messages.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.subject?.toLowerCase().includes(q) || (m.to_address||[]).join(",").toLowerCase().includes(q);
  });

  return (
    <DashboardShell
      title="Sent"
      subtitle="Emails you've sent."
      actions={
        <Link href="/admin/mail/compose">
          <button className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all shadow-sm">
            <PenLine size={13} /> Compose
          </button>
        </Link>
      }
    >
      <div className="flex h-[calc(100vh-168px)] gap-0 overflow-hidden rounded-2xl border border-theme-border shadow-sm">
        {/* List */}
        <div className="w-96 flex-shrink-0 border-r border-theme-border flex flex-col bg-theme-page">
          <div className="p-3 border-b border-theme-border">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sent mail…"
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-theme-border bg-theme-surface text-xs text-theme-fg outline-none focus:border-theme-primary" />
              {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted"><X size={12} /></button>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-theme-border/30">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-theme-muted" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48">
                <Send size={28} className="text-theme-muted/20 mb-3" />
                <p className="text-xs text-theme-muted">No sent emails yet</p>
              </div>
            ) : filtered.map((m) => (
              <div key={m.id} onClick={() => setSelected(m)}
                className={cn("px-4 py-3 cursor-pointer transition-all",
                  selected?.id === m.id ? "bg-theme-primary/5 border-l-2 border-l-theme-primary" : "hover:bg-theme-raised/50")}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-[9px] font-black text-emerald-500">
                    {getInitials((m.to_address||[])[0] || "?")}
                  </div>
                  <span className="text-xs font-semibold text-theme-fg truncate flex-1">
                    To: {(m.to_address||[]).join(", ") || "—"}
                  </span>
                  <span className="text-[9px] text-theme-muted">{m.received_at ? formatDistanceToNow(new Date(m.received_at), {addSuffix:false}) : "—"}</span>
                </div>
                <p className="text-[11px] font-medium text-theme-muted truncate mb-0.5">{m.subject || "(no subject)"}</p>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-theme-muted truncate flex-1">{m.preview}</p>
                  {m.has_attachment && <Paperclip size={9} className="text-theme-muted" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reading Pane */}
        <div className="flex-1 bg-theme-surface overflow-auto">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full">
              <MailOpen size={36} className="text-theme-muted/20 mb-3" />
              <p className="text-sm font-semibold text-theme-muted">Select an email to view</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <h2 className="text-base font-black text-theme-fg">{selected.subject || "(no subject)"}</h2>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-black text-emerald-500">
                  {getInitials((selected.to_address||[])[0]||"?")}
                </div>
                <div>
                  <p className="text-xs font-bold text-theme-fg">To: {(selected.to_address||[]).join(", ")}</p>
                  <p className="text-[10px] text-theme-muted">
                    {selected.received_at ? format(new Date(selected.received_at), "MMM d, yyyy h:mm a") : "—"}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-page p-4">
                <p className="text-sm text-theme-fg leading-relaxed whitespace-pre-wrap">
                  {selected.preview || "No preview available."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
