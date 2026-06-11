"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useToast } from "@/components/ui/ToastLegacy";
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
  const [attachments, setAttachments] = useState<{
    id: string;
    name: string;
    size: number;
    progress: number;
    error: string | null;
    storeName: string | null;
    attachmentName: string | null;
    attachmentPath: string | null;
    xhr?: XMLHttpRequest | null;
  }[]>([]);

  const [templates,        setTemplates]        = useState<Template[]>([]);
  const [showTemplates,    setShowTemplates]    = useState(false);
  const [employeeSuggestions, setEmployeeSuggestions] = useState<Employee[]>([]);
  const [activeInput,      setActiveInput]      = useState<"to" | "cc" | "bcc" | null>(null);

  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiPanel,     setAiPanel]     = useState(false);
  const [improvedBody,    setImprovedBody]    = useState("");
  const [improvedSubject, setImprovedSubject] = useState("");
  const [improvedIsHtml,  setImprovedIsHtml]  = useState(false);
  const [suggestedSubject, setSuggestedSubject] = useState("");
  const [isHtmlBody,  setIsHtmlBody]  = useState(false);
  const [showSource,  setShowSource]  = useState(false);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const htmlBodyRef  = useRef<HTMLDivElement>(null);
  const lastSetBody  = useRef("");

  useEffect(() => {
    supabase.from("mail_templates").select("id,name,category,subject,body").eq("status","active")
      .then(({ data }) => setTemplates(data || []));
  }, []);

  // Sync external body changes (AI / template apply) into the contentEditable div.
  // Skip when the change came from user typing (lastSetBody already matches body).
  useEffect(() => {
    if (isHtmlBody && htmlBodyRef.current && body !== lastSetBody.current) {
      htmlBodyRef.current.innerHTML = body;
      lastSetBody.current = body;
    }
  }, [body, isHtmlBody]);

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

      if (!res.ok) {
        showToast(data.error || "AI unavailable — try again in 30 seconds.", "warning");
        return;
      }

      if (type === "improve_tone") {
        const result = data.improved || "";
        if (!result) { showToast("AI returned empty response — try again.", "warning"); return; }
        setImprovedBody(result);
        setImprovedSubject(data.improvedSubject || subject || "");
        setImprovedIsHtml(data.isHtml === true);
        setAiPanel(true);
      } else if (type === "shorten") {
        const result = data.shortened || "";
        if (!result) { showToast("AI returned empty response — try again.", "warning"); return; }
        setImprovedBody(result);
        setImprovedSubject(data.shortenedSubject || subject || "");
        setImprovedIsHtml(data.isHtml === true);
        setAiPanel(true);
      } else if (type === "suggest_subject") {
        setSuggestedSubject(data.subject || "");
      }
    } catch (e: any) {
      showToast("Network error — check your connection.", "error");
    } finally {
      setAiLoading(false);
    }
  }

  async function saveDraft() {
    if (!body && !subject && !to.length) { showToast("Nothing to save.", "warning"); return; }
    setSaving(true);
    try {
      const employeeId = (user as any)?.id;
      const uploadedAttachments = attachments
        .filter((att) => att.progress === 100 && !att.error && att.storeName)
        .map((att) => ({
          storeName: att.storeName,
          attachmentName: att.attachmentName,
          attachmentPath: att.attachmentPath,
        }));

      await fetch("/api/mail/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          to,
          cc,
          bcc,
          subject,
          body,
          attachments: uploadedAttachments,
        }),
      });
      showToast("Draft saved.", "success");
    } finally {
      setSaving(false);
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      uploadFile(file);
    });
    e.target.value = "";
  }

  function uploadFile(file: File) {
    const id = Math.random().toString(36).substring(7);
    const newAttachment = {
      id,
      name: file.name,
      size: file.size,
      progress: 0,
      error: null,
      storeName: null,
      attachmentName: null,
      attachmentPath: null,
      xhr: null as XMLHttpRequest | null,
    };

    setAttachments((prev) => [...prev, newAttachment]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("employee_id", (user as any)?.id || "");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/mail/attachments", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setAttachments((prev) =>
          prev.map((att) => (att.id === id ? { ...att, progress: percent } : att))
        );
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.data && res.data.length > 0) {
            const uploaded = res.data[0];
            setAttachments((prev) =>
              prev.map((att) =>
                att.id === id
                  ? {
                      ...att,
                      progress: 100,
                      storeName: uploaded.storeName,
                      attachmentName: uploaded.attachmentName,
                      attachmentPath: uploaded.attachmentPath,
                    }
                  : att
              )
            );
          } else {
            throw new Error("Invalid response");
          }
        } catch {
          setAttachments((prev) =>
            prev.map((att) => (att.id === id ? { ...att, error: "Invalid response from server" } : att))
          );
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          setAttachments((prev) =>
            prev.map((att) => (att.id === id ? { ...att, error: res.error || "Upload failed" } : att))
          );
        } catch {
          setAttachments((prev) =>
            prev.map((att) => (att.id === id ? { ...att, error: "Upload failed" } : att))
          );
        }
      }
    };

    xhr.onerror = () => {
      setAttachments((prev) =>
        prev.map((att) => (att.id === id ? { ...att, error: "Network error occurred" } : att))
      );
    };

    xhr.send(formData);

    // Track the XHR in state
    setAttachments((prev) =>
      prev.map((att) => (att.id === id ? { ...att, xhr } : att))
    );
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((att) => att.id === id);
      if (target && target.xhr) {
        target.xhr.abort();
      }
      return prev.filter((att) => att.id !== id);
    });
  }

  async function handleSend() {
    if (!to.length)    { showToast("Add at least one recipient.", "warning"); return; }
    if (!subject)      { showToast("Subject is required.", "warning"); return; }
    if (!body.trim())  { showToast("Email body cannot be empty.", "warning"); return; }

    const isUploading = attachments.some((att) => att.progress < 100 && !att.error);
    if (isUploading) {
      showToast("Please wait for all attachments to finish uploading.", "warning");
      return;
    }

    const hasUploadErrors = attachments.some((att) => att.error !== null);
    if (hasUploadErrors) {
      showToast("Some attachments failed to upload. Please remove or retry them before sending.", "error");
      return;
    }

    const uploadedAttachments = attachments
      .filter((att) => att.progress === 100 && !att.error && att.storeName)
      .map((att) => ({
        storeName: att.storeName,
        attachmentName: att.attachmentName,
        attachmentPath: att.attachmentPath,
      }));

    if (uploadedAttachments.length < attachments.length) {
      showToast("Not all attachments have uploaded successfully.", "error");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          cc,
          bcc,
          subject,
          content: body,
          fromName: (user as any)?.name,
          employeeId: (user as any)?.id,
          attachments: uploadedAttachments,
        }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Server returned non-JSON response");
      }

      if (res.ok) {
        showToast("Email sent successfully.", "success");
        
        // Broadcast real-time notifications for each recipient
        if (data.recipients && Array.isArray(data.recipients)) {
          const channelsToNotify = ["mail_realtime_sidebar", "mail_realtime_inbox", "mail_realtime_kanban", "mail_realtime_sent"];
          channelsToNotify.forEach((chanName) => {
            const channel = supabase.channel(chanName);
            channel.subscribe((status) => {
              if (status === "SUBSCRIBED") {
                data.recipients.forEach((rec: any) => {
                  channel.send({
                    type: "broadcast",
                    event: "new_mail",
                    payload: {
                      id: rec.id,
                      employee_id: rec.employee_id,
                      sender_name: (user as any)?.name || "Namaah",
                      subject: subject,
                      is_internal: rec.is_internal,
                    },
                  });
                });
                setTimeout(() => {
                  supabase.removeChannel(channel);
                }, 1000);
              }
            });
          });
        }

        setTo([]); setCc([]); setBcc([]); setSubject(""); setBody("");
        setAttachments([]);
      } else {
        showToast(data.error || "Failed to send.", "error");
      }
    } catch (e: any) {
      console.error("Failed to send email:", e);
      showToast(e.message || "An error occurred while sending.", "error");
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
      moduleKey="mail_compose"
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

          {/* Body — plain textarea OR rich HTML (contentEditable for inline editing) */}
          {isHtmlBody && !showSource ? (
            <div className="relative">
              {/* ContentEditable lets the user click and type directly in the HTML preview.
                  innerHTML is set via useEffect (ref pattern) to avoid React cursor-reset issues. */}
              <div
                ref={htmlBodyRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  if (htmlBodyRef.current) {
                    const html = htmlBodyRef.current.innerHTML;
                    lastSetBody.current = html;
                    setBody(html);
                  }
                }}
                className="w-full px-4 py-4 text-sm text-theme-fg leading-relaxed outline-none cursor-text"
                style={{ minHeight: 320 }}
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="text-[9px] text-theme-muted/50 font-medium select-none">Click to edit</span>
                <button
                  onClick={() => setShowSource(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-theme-raised border border-theme-border text-[10px] font-semibold text-theme-muted hover:text-theme-fg transition-all"
                >
                  Edit Source
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => { setBody(e.target.value); }}
                placeholder="Write your email here…&#10;&#10;Tip: Use the AI buttons above to improve tone, shorten, or apply a template."
                className="w-full flex-1 px-4 py-4 text-sm text-theme-fg bg-transparent resize-none outline-none placeholder:text-theme-muted/40 leading-relaxed"
                style={{ minHeight: 320 }}
              />
              {isHtmlBody && showSource && (
                <button
                  onClick={() => setShowSource(false)}
                  className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-theme-primary/10 border border-theme-primary/20 text-[10px] font-semibold text-theme-primary hover:bg-theme-primary/20 transition-all"
                >
                  Preview
                </button>
              )}
            </div>
          )}

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="border-t border-theme-border/50 bg-theme-raised/10 px-4 py-3 space-y-2">
              {attachments.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2 rounded-xl bg-theme-surface border border-theme-border/50">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText size={16} className="text-theme-muted flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-theme-fg truncate">{file.name}</span>
                        <span className="text-[10px] text-theme-muted flex-shrink-0">({formatFileSize(file.size)})</span>
                      </div>
                      {file.progress < 100 && !file.error && (
                        <div className="w-full bg-theme-border/30 rounded-full h-1 mt-1.5 overflow-hidden">
                          <div 
                            className="bg-theme-primary h-1 rounded-full transition-all duration-300" 
                            style={{ width: `${file.progress}%` }} 
                          />
                        </div>
                      )}
                      {file.error && (
                        <p className="text-[10px] text-red-500 font-medium mt-0.5">{file.error}</p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => removeAttachment(file.id)} 
                    className="p-1 rounded-lg text-theme-muted hover:text-theme-fg hover:bg-theme-raised transition-all ml-4"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-theme-border bg-theme-raised/20">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-theme-border text-theme-muted hover:text-theme-fg cursor-pointer text-xs font-semibold transition-all">
              <Paperclip size={13} /> Attach File
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
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
        {aiPanel && improvedBody && (
          <div className="w-80 flex-shrink-0 page-card flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-xl bg-theme-primary/10 flex items-center justify-center">
                <Sparkles size={14} className="text-theme-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-theme-fg">AI Suggestion</p>
                {improvedIsHtml && (
                  <p className="text-[10px] text-emerald-500 font-semibold">Rich HTML · professionally formatted</p>
                )}
              </div>
              <button onClick={() => setAiPanel(false)} className="text-theme-muted hover:text-theme-fg"><X size={13} /></button>
            </div>

            {improvedSubject && improvedSubject !== subject && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1">Subject</p>
                <div className="rounded-lg bg-theme-primary/5 border border-theme-primary/20 px-3 py-2 text-xs font-semibold text-theme-fg leading-relaxed">
                  {improvedSubject}
                </div>
              </div>
            )}

            <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-1.5">Preview</p>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-theme-border p-3 mb-3 overflow-y-auto flex-1" style={{ maxHeight: 340, minHeight: 120 }}>
              {improvedIsHtml ? (
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: improvedBody }}
                />
              ) : (
                <p className="text-xs text-theme-muted leading-relaxed whitespace-pre-wrap">{improvedBody}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBody(improvedBody);
                  if (improvedSubject) setSubject(improvedSubject);
                  setIsHtmlBody(improvedIsHtml);
                  setShowSource(false);
                  setAiPanel(false);
                  showToast("AI suggestion applied.", "success");
                }}
                className="flex-1 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all"
              >
                <Check size={11} className="inline mr-1" /> Apply
              </button>
              <button
                onClick={() => { setAiPanel(false); setImprovedBody(""); setImprovedSubject(""); setImprovedIsHtml(false); }}
                className="flex-1 py-2 rounded-xl border border-theme-border text-theme-muted text-xs font-semibold hover:bg-theme-raised transition-all"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
