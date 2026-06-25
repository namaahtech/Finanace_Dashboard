"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, ShieldCheck, AlertTriangle, PenTool, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DocumentPreview } from "@/components/onboarding/DocumentPreview";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import type { TemplateData } from "@/lib/onboarding/types";

type SignState = "ready" | "invalid" | "expired" | "signed" | "error";

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<SignState>("ready");
  const [data, setData] = useState<TemplateData | null>(null);
  const [company, setCompany] = useState("Namaah Private Limited");
  const [candidateName, setCandidateName] = useState("");

  const [sigImage, setSigImage] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sign/${token}`);
        const json = await res.json();
        if (!res.ok) { setState("invalid"); return; }
        setCompany(json.companyName);
        setCandidateName(json.candidateName);
        setData(json.data);
        setTypedName(json.candidateName || "");
        if (json.alreadySigned) setState("signed");
        else if (json.expired) setState("expired");
        else setState("ready");
      } catch {
        setState("error");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function submit() {
    setErr(null);
    if (!agreed) return setErr("Please tick the acknowledgement to continue.");
    if (!typedName.trim()) return setErr("Please type your full legal name.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: sigImage, typed_name: typedName, agreed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit");
      setState("signed");
    } catch (e: any) {
      setErr(e.message || "Failed to submit your signature.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / terminal states ────────────────────────────────────────────
  if (loading) {
    return (
      <Centered>
        <Loader2 className="animate-spin text-primary" size={28} />
        <p className="text-sm text-muted-foreground">Loading your offer…</p>
      </Centered>
    );
  }
  if (state === "invalid" || state === "error") {
    return (
      <Centered>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10">
          <AlertTriangle className="text-rose-500" size={28} />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Link not valid</h1>
        <p className="text-sm text-muted-foreground max-w-sm text-center">This signing link is invalid or has been revoked. Please contact your hiring coordinator.</p>
      </Centered>
    );
  }
  if (state === "expired") {
    return (
      <Centered>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
          <AlertTriangle className="text-amber-500" size={28} />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Link expired</h1>
        <p className="text-sm text-muted-foreground max-w-sm text-center">This signing link has expired. Please request a fresh offer from your hiring coordinator.</p>
      </Centered>
    );
  }
  if (state === "signed") {
    return (
      <Centered>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={36} />
        </div>
        <h1 className="text-xl font-bold text-foreground">Thank you, {candidateName?.split(" ")[0] || "and welcome"}!</h1>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          Your internship offer and NDA have been signed successfully. A confirmation has been recorded and the {company} team has been notified. We look forward to having you on board.
        </p>
      </Centered>
    );
  }

  // ── Ready: review + sign ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header — consistent with the workspace */}
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            {company.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{company}</p>
            <p className="text-xs text-muted-foreground">Internship Offer &amp; Onboarding</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        {/* Welcome */}
        <Card>
          <CardContent className="p-5">
            <h1 className="text-xl font-bold text-foreground">Welcome, {candidateName}!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Please review your <strong className="text-foreground font-semibold">Offer Letter</strong>,{" "}
              <strong className="text-foreground font-semibold">NDA</strong>, and{" "}
              <strong className="text-foreground font-semibold">Handbook</strong> below, then sign at the bottom to accept your internship offer.
            </p>
          </CardContent>
        </Card>

        {/* Document viewer */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileSignature size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Your Documents</h2>
            </div>
            {data && <DocumentPreview data={data} className="h-[62vh]" />}
          </CardContent>
        </Card>

        {/* Signature */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <PenTool size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Your Signature</h2>
            </div>

            <SignaturePad onChange={setSigImage} />

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Full legal name</Label>
              <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder="Type your full name" />
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I have read, understood, and agree to the terms of the Internship Offer Letter, the Non-Disclosure Agreement, and the Internship Handbook. I understand this electronic signature is legally binding.
              </span>
            </label>

            {err && <p className="text-xs text-rose-600 dark:text-rose-400">{err}</p>}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck size={13} /> Secured · your IP &amp; timestamp are recorded for verification
              </p>
              <Button onClick={submit} disabled={submitting} className="sm:min-w-[180px]">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Accept &amp; Sign Offer
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground pb-6">
          © {company}. This signing link is unique to you — please do not share it.
        </p>
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
