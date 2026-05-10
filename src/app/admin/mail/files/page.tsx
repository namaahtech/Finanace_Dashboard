"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/layout/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  Paperclip, Upload, Download, Trash2, Share2, Search, X, Loader2,
  FileText, Image, Film, Archive, File, Eye, Clock, Users,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type FileShare = {
  id: string; filename: string; file_size: number; file_type: string;
  storage_url: string; shared_by: string; shared_with: string[] | null;
  expiry_at: string | null; download_count: number; is_active: boolean;
  created_at: string;
  sharer?: { id: string; name: string; designation: string };
};

function fileIcon(type: string) {
  if (type?.startsWith("image/"))  return <Image  size={20} className="text-blue-400" />;
  if (type?.startsWith("video/"))  return <Film   size={20} className="text-purple-400" />;
  if (type?.includes("pdf"))       return <FileText size={20} className="text-rose-400" />;
  if (type?.includes("zip") || type?.includes("rar")) return <Archive size={20} className="text-amber-400" />;
  return <File size={20} className="text-theme-muted" />;
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024**2)    return `${(bytes/1024).toFixed(1)} KB`;
  if (bytes < 1024**3)    return `${(bytes/1024**2).toFixed(1)} MB`;
  return `${(bytes/1024**3).toFixed(2)} GB`;
}

export default function FilesPage() {
  const { user }       = useAuth();
  const { showToast }  = useToast();
  const inputRef       = useRef<HTMLInputElement>(null);

  const [files,     setFiles]     = useState<FileShare[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search,    setSearch]    = useState("");
  const [scope,     setScope]     = useState<"all" | "mine" | "shared">("all");
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [preview,   setPreview]   = useState<FileShare | null>(null);

  const [currentEmployee, setCurrentEmployee] = useState<{ id: string } | null>(null);

  useEffect(() => {
    supabase.from("employees").select("id").eq("email", (user as any)?.email || "").maybeSingle()
      .then(({ data }) => { setCurrentEmployee(data); load(scope, data?.id); });
  }, []);

  async function load(sc = scope, empId?: string) {
    setLoading(true);
    const eid = empId || currentEmployee?.id || "";
    const res = await fetch(`/api/mail/files?scope=${sc}${eid ? `&employee_id=${eid}` : ""}`);
    const data = await res.json();
    setFiles(data.data || []);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentEmployee) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("employee_id", currentEmployee.id);
      const res = await fetch("/api/mail/files", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        showToast(`${file.name} uploaded successfully.`, "success");
        load();
      } else {
        showToast(data.error || "Upload failed.", "error");
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function deleteFile(id: string) {
    setDeleting(id);
    await fetch(`/api/mail/files?id=${id}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f.id !== id));
    showToast("File removed.", "success");
    setDeleting(null);
  }

  const filtered = files.filter((f) => {
    const q = search.toLowerCase();
    return !q || f.filename?.toLowerCase().includes(q);
  });

  const totalSize = files.reduce((a, f) => a + (f.file_size || 0), 0);

  return (
    <DashboardShell
      title="File Share"
      subtitle="Securely share files across your organization."
      actions={
        <label className={cn(
          "flex items-center gap-1.5 h-9 px-4 rounded-xl cursor-pointer text-xs font-bold transition-all shadow-sm",
          uploading ? "bg-theme-raised text-theme-muted" : "bg-theme-primary text-white hover:bg-theme-primary/90"
        )}>
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? "Uploading…" : "Upload File"}
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        {[
          { label: "Total Files",     value: files.length,   icon: Paperclip, color: "text-blue-500",    bg: "bg-blue-500/10" },
          { label: "Total Size",      value: formatBytes(totalSize), icon: Archive, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Shared By Me",    value: files.filter(f => f.shared_by === currentEmployee?.id).length, icon: Share2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Downloads",       value: files.reduce((a,f)=>a+f.download_count,0), icon: Download, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="page-card flex items-center gap-3">
            <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", bg)}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-[11px] text-theme-muted">{label}</p>
              <p className={cn("text-lg font-black leading-tight", color)}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="page-card mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex rounded-xl border border-theme-border bg-theme-raised p-1 gap-0.5">
            {(["all", "mine", "shared"] as const).map((s) => (
              <button key={s} onClick={() => { setScope(s); load(s); }}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize",
                  scope === s ? "bg-theme-surface text-theme-fg shadow-sm" : "text-theme-muted hover:text-theme-fg")}>
                {s === "all" ? "All Files" : s === "mine" ? "Uploaded by Me" : "Shared with Me"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…"
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-theme-border bg-theme-page text-xs text-theme-fg outline-none focus:border-theme-primary" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted"><X size={12} /></button>}
          </div>
        </div>
      </div>

      {/* File Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-theme-muted" /></div>
      ) : filtered.length === 0 ? (
        <div className="page-card flex flex-col items-center justify-center py-16">
          <Paperclip size={36} className="text-theme-muted/20 mb-4" />
          <p className="text-sm font-semibold text-theme-muted mb-1">No files yet</p>
          <p className="text-xs text-theme-muted/60">Upload files to share with your team</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((f) => (
            <div key={f.id}
              className="page-card group cursor-pointer hover:border-theme-primary/30 transition-all hover:shadow-md relative"
              onClick={() => setPreview(f)}
            >
              {/* File Type Icon */}
              <div className="flex items-center justify-center h-16 mb-3 rounded-xl bg-theme-raised">
                {fileIcon(f.file_type)}
              </div>

              <p className="text-xs font-semibold text-theme-fg truncate mb-1" title={f.filename}>{f.filename}</p>
              <p className="text-[10px] text-theme-muted mb-2">{formatBytes(f.file_size)}</p>

              <div className="flex items-center gap-1 text-[9px] text-theme-muted">
                <Clock size={9} />
                {f.created_at ? formatDistanceToNow(new Date(f.created_at), { addSuffix: true }) : "—"}
              </div>

              {f.shared_with === null && (
                <span className="absolute top-3 right-3 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">ORG</span>
              )}
              {f.expiry_at && new Date(f.expiry_at) < new Date() && (
                <span className="absolute top-3 right-3 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500">EXP</span>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-theme-surface rounded-b-2xl">
                <a href={f.storage_url} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-theme-raised hover:bg-theme-primary hover:text-white text-theme-muted transition-all">
                  <Download size={11} />
                </a>
                {f.shared_by === currentEmployee?.id && (
                  <button onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }} disabled={deleting === f.id}
                    className="p-1.5 rounded-lg bg-theme-raised hover:bg-rose-500/10 hover:text-rose-500 text-theme-muted transition-all">
                    {deleting === f.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface border border-theme-border shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-theme-fg">File Details</h3>
              <button onClick={() => setPreview(null)} className="text-theme-muted hover:text-theme-fg"><X size={15} /></button>
            </div>
            <div className="flex items-center justify-center h-20 mb-4 rounded-xl bg-theme-raised">
              {fileIcon(preview.file_type)}
            </div>
            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between"><span className="text-theme-muted">Filename</span><span className="font-semibold text-theme-fg truncate ml-4">{preview.filename}</span></div>
              <div className="flex justify-between"><span className="text-theme-muted">Size</span><span className="font-semibold text-theme-fg">{formatBytes(preview.file_size)}</span></div>
              <div className="flex justify-between"><span className="text-theme-muted">Type</span><span className="font-semibold text-theme-fg">{preview.file_type || "Unknown"}</span></div>
              <div className="flex justify-between"><span className="text-theme-muted">Uploaded</span><span className="font-semibold text-theme-fg">{preview.created_at ? format(new Date(preview.created_at),"MMM d, yyyy") : "—"}</span></div>
              <div className="flex justify-between"><span className="text-theme-muted">Downloads</span><span className="font-semibold text-theme-fg">{preview.download_count}</span></div>
              {preview.expiry_at && <div className="flex justify-between"><span className="text-theme-muted">Expires</span><span className="font-semibold text-rose-500">{format(new Date(preview.expiry_at),"MMM d, yyyy")}</span></div>}
              {preview.shared_with === null && <div className="flex justify-between"><span className="text-theme-muted">Visibility</span><Badge variant="success">Org-Wide</Badge></div>}
            </div>
            <div className="flex gap-2">
              <a href={preview.storage_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all">
                <Download size={13} /> Download
              </a>
              <button onClick={() => setPreview(null)}
                className="flex-1 py-2.5 rounded-xl border border-theme-border text-theme-muted text-xs font-semibold hover:bg-theme-raised transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
