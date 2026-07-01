"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Loader2, CheckCircle2, AlertTriangle, ShieldCheck, UploadCloud,
  Camera, CreditCard, Fingerprint, FileText, X, Mail, Lock, Check, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { validatePhotoLocally } from "@/lib/photo-validate-client";

type Status = "ready" | "invalid" | "expired" | "submitted" | "error";

const DOC_ICON: Record<string, any> = {
  face_photo: Camera,
  aadhaar: Fingerprint,
  pan: CreditCard,
  other: FileText,
};

export default function DocumentsPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>("ready");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [company, setCompany] = useState("Namaah");
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});

  const [files, setFiles] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [photoCheck, setPhotoCheck] = useState<{
    loading: boolean;
    result: { ok: boolean; pass: boolean; checks?: { key: string; label: string; pass: boolean }[]; reason?: string; error?: string } | null;
  }>({ loading: false, result: null });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/documents/${token}`);
        const json = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        setCandidateName(json.candidateName);
        setCandidateEmail(json.candidateEmail || "");
        setCompany(json.companyName);
        setRequiredDocs(json.requiredDocs || []);
        setLabels(json.docLabels || {});
        if (json.alreadySubmitted) setStatus("submitted");
        else if (json.expired) setStatus("expired");
        else setStatus("ready");
      } catch {
        setStatus("error");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function validatePhoto(file: File) {
    setPhotoCheck({ loading: true, result: null });
    // Runs entirely in the browser — instant, free, and the photo never leaves the device.
    const result = await validatePhotoLocally(file);
    setPhotoCheck({ loading: false, result });
  }

  function pickFile(docType: string, file: File | null) {
    setErr(null);
    if (!file) return;
    setFiles((p) => ({ ...p, [docType]: file }));
    if (file.type.startsWith("image/")) {
      setPreviews((p) => ({ ...p, [docType]: URL.createObjectURL(file) }));
    } else {
      setPreviews((p) => { const n = { ...p }; delete n[docType]; return n; });
    }
    if (docType === "face_photo") {
      if (file.type.startsWith("image/")) validatePhoto(file);
      else setPhotoCheck({ loading: false, result: { ok: true, pass: false, reason: "Please upload an image (not a PDF) for your photo.", checks: [] } });
    }
  }

  function clearFile(docType: string) {
    setFiles((p) => { const n = { ...p }; delete n[docType]; return n; });
    setPreviews((p) => { const n = { ...p }; delete n[docType]; return n; });
    if (docType === "face_photo") setPhotoCheck({ loading: false, result: null });
  }

  async function submit() {
    setErr(null);
    const missing = requiredDocs.find((d) => !files[d]);
    if (missing) return setErr(`Please upload your ${labels[missing] || missing}.`);
    if (requiredDocs.includes("face_photo")) {
      if (photoCheck.loading) return setErr("Please wait — your photo is still being checked.");
      if (photoCheck.result?.ok === true && photoCheck.result?.pass === false)
        return setErr("Your profile photo didn't pass the checks. Please upload a clearer, front-facing photo.");
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      for (const d of requiredDocs) fd.append(d, files[d]);
      fd.append("message", message);
      const res = await fetch(`/api/documents/${token}`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit");
      setDone(true);
      setStatus("submitted");
    } catch (e: any) {
      setErr(e.message || "Failed to submit your documents.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Centered>
        <Loader2 className="animate-spin text-primary" size={28} />
        <p className="text-sm text-muted-foreground">Loading your secure upload page…</p>
      </Centered>
    );
  }
  if (status === "invalid" || status === "error") {
    return (
      <Centered>
        <Badge tone="rose"><AlertTriangle size={26} /></Badge>
        <h1 className="text-lg font-semibold text-foreground">Link not valid</h1>
        <p className="text-sm text-muted-foreground max-w-sm text-center">This upload link is invalid or has been revoked. Please contact your HR coordinator.</p>
      </Centered>
    );
  }
  if (status === "expired") {
    return (
      <Centered>
        <Badge tone="amber"><AlertTriangle size={26} /></Badge>
        <h1 className="text-lg font-semibold text-foreground">Link expired</h1>
        <p className="text-sm text-muted-foreground max-w-sm text-center">This upload link has expired. Please ask HR to send you a fresh one.</p>
      </Centered>
    );
  }
  if (status === "submitted") {
    return (
      <Centered>
        <Badge tone="emerald"><CheckCircle2 size={32} /></Badge>
        <h1 className="text-xl font-bold text-foreground">{done ? "Documents submitted!" : "Already submitted"}</h1>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          {done
            ? `Thank you, ${candidateName?.split(" ")[0] || "and welcome"}. Your documents have been sent securely to the ${company} HR team.`
            : `Your documents have already been received by the ${company} HR team. There's nothing more to do here.`}
        </p>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            {company.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{company}</p>
            <p className="text-xs text-muted-foreground">Document Submission</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <Card>
          <CardContent className="p-5">
            <h1 className="text-xl font-bold text-foreground">Welcome, {candidateName}!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Please upload the documents below to complete your onboarding. Clear photos or scans are fine — each file can be up to 8&nbsp;MB.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
              <Mail size={14} className="text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground">Uploading as</span>
              <span className="text-xs font-medium text-foreground truncate">{candidateEmail}</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                <Lock size={11} /> Locked
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {requiredDocs.map((docType) => {
            const Icon = DOC_ICON[docType] || FileText;
            const file = files[docType];
            const preview = previews[docType];
            return (
              <Card key={docType}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{labels[docType] || docType}</p>
                      <p className="text-xs text-muted-foreground">{file ? "Ready to send" : "JPG, PNG or PDF"}</p>
                    </div>
                    {file ? (
                      <Button variant="ghost" size="sm" onClick={() => clearFile(docType)} className="text-muted-foreground">
                        <X size={14} /> Remove
                      </Button>
                    ) : (
                      <Label
                        htmlFor={`f-${docType}`}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        <UploadCloud size={14} /> Choose file
                      </Label>
                    )}
                    <input
                      id={`f-${docType}`}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => pickFile(docType, e.target.files?.[0] || null)}
                    />
                  </div>

                  {docType === "face_photo" && (
                    <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                      <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                        <Info size={12} className="flex-shrink-0" /> Please also make sure your photo has:
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        No sunglasses · no mask · no heavy filter · not a screenshot · not a cartoon or AI-generated avatar.
                        These aren&apos;t checked automatically and are reviewed by our team — an invalid photo can delay your onboarding.
                      </p>
                    </div>
                  )}

                  {file && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2.5">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="preview" className="h-12 w-12 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-card text-muted-foreground">
                          <FileText size={18} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{file.name}</p>
                        <p className="text-[11px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                    </div>
                  )}

                  {docType === "face_photo" && file && <PhotoChecklist state={photoCheck} />}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-5 space-y-2">
            <Label className="text-xs text-muted-foreground">Message (optional)</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Anything you'd like to add for the HR team…"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </CardContent>
        </Card>

        {err && <p className="text-xs text-rose-600 dark:text-rose-400">{err}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pb-8">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck size={13} /> Sent securely to the {company} HR team. Your link is private to you.
          </p>
          <Button
            onClick={submit}
            disabled={submitting || (requiredDocs.includes("face_photo") && (photoCheck.loading || (photoCheck.result?.ok === true && photoCheck.result?.pass === false)))}
            className="sm:min-w-[170px]"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            Send Documents
          </Button>
        </div>
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-muted/30 px-4">
      {children}
    </div>
  );
}

function PhotoChecklist({ state }: { state: { loading: boolean; result: { ok: boolean; pass: boolean; checks?: { key: string; label: string; pass: boolean }[]; reason?: string; error?: string } | null } }) {
  if (state.loading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Loader2 size={14} className="animate-spin text-primary" /> Checking your photo…
      </div>
    );
  }
  const r = state.result;
  if (!r) return null;
  if (!r.ok) {
    return (
      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
        Couldn&apos;t auto-check the photo ({r.error || "service unavailable"}). Please make sure it&apos;s a clear, front-facing photo — you can still continue.
      </div>
    );
  }
  return (
    <div className={cn("mt-3 rounded-lg border p-3", r.pass ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5")}>
      <div className="mb-2 flex items-center gap-2">
        {r.pass ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" /> : <AlertTriangle size={15} className="text-rose-500 flex-shrink-0" />}
        <p className={cn("text-xs font-semibold", r.pass ? "text-emerald-600" : "text-rose-600")}>
          {r.pass ? "Photo looks good — all checks passed" : (r.reason || "Please upload a better photo")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {(r.checks || []).map((c) => (
          <div key={c.key} className="flex items-center gap-1.5 text-[11px]">
            {c.pass ? <Check size={12} className="text-emerald-500 flex-shrink-0" /> : <X size={12} className="text-rose-500 flex-shrink-0" />}
            <span className={c.pass ? "text-muted-foreground" : "text-rose-600"}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "rose" | "amber" | "emerald"; children: React.ReactNode }) {
  const map = {
    rose: "bg-rose-500/10 text-rose-500",
    amber: "bg-amber-500/10 text-amber-500",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  return <div className={cn("flex h-16 w-16 items-center justify-center rounded-full", map[tone])}>{children}</div>;
}
