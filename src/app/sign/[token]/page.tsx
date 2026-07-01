"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, ShieldCheck, AlertTriangle, PenTool, FileSignature, Mail, Lock, Camera, ScanFace, RefreshCw, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DocumentPreview } from "@/components/onboarding/DocumentPreview";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { loadFaceModels, detectFromImage, verifyAgainst, type FaceVerdict } from "@/lib/face-verify-client";
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

  // Identity gate (email OTP → live face → sign)
  const [step, setStep] = useState<"gate" | "face" | "sign">("gate");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [otpErr, setOtpErr] = useState<string | null>(null);

  // Live face verification
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const refDescRef = useRef<Float32Array | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [faceStatus, setFaceStatus] = useState<"init" | "ready" | "verifying">("init");
  const [faceMsg, setFaceMsg] = useState("");
  const [faceResult, setFaceResult] = useState<FaceVerdict | null>(null);
  const [refMissing, setRefMissing] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [faceFails, setFaceFails] = useState(0);
  const [camAttempt, setCamAttempt] = useState(0);
  const [hasMultiCam, setHasMultiCam] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sign/${token}`);
        const json = await res.json();
        if (!res.ok) { setState("invalid"); return; }
        setCompany(json.companyName);
        setCandidateName(json.candidateName);
        setEmail(json.candidateEmail || "");
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

  // OTP countdown — ticks while a code is live.
  useEffect(() => {
    if (!otpSent) return;
    const t = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [otpSent]);

  async function sendOtp() {
    setOtpErr(null);
    setOtpSending(true);
    try {
      const res = await fetch(`/api/sign/${token}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't send the code.");
      setOtpSent(true);
      setOtp("");
      setSecondsLeft(60);
    } catch (e: any) {
      setOtpErr(e.message || "Couldn't send the code.");
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyOtp() {
    setOtpErr(null);
    setOtpVerifying(true);
    try {
      const res = await fetch(`/api/sign/${token}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", otp }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Verification failed.");
      setStep("face");
    } catch (e: any) {
      setOtpErr(e.message || "Verification failed.");
    } finally {
      setOtpVerifying(false);
    }
  }

  // ── Live face verification ─────────────────────────────────────────────────
  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function loadImageEl(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("load failed"));
      img.src = src;
    });
  }

  // Load the model + the reference (profile) descriptor on entering the face step.
  useEffect(() => {
    if (step !== "face") return;
    let cancelled = false;
    (async () => {
      try {
        setFaceStatus("init");
        setFaceMsg("Loading face verification…");
        await loadFaceModels();
        try {
          const img = await loadImageEl(`/api/sign/${token}/profile-photo`);
          const { result } = await detectFromImage(img);
          if (result) refDescRef.current = result.descriptor;
          else if (!cancelled) setRefMissing(true);
        } catch {
          if (!cancelled) setRefMissing(true);
        }
        if (!cancelled) { setFaceStatus("ready"); setFaceMsg(""); }
      } catch {
        if (!cancelled) { setFaceStatus("ready"); setRefMissing(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [step, token]);

  // Camera lifecycle — (re)start on entering the face step, switching camera, or retry.
  useEffect(() => {
    if (step !== "face") { stopStream(); return; }
    let active = true;
    (async () => {
      setCamError(null);
      try {
        stopStream();
        if (!navigator.mediaDevices?.getUserMedia) {
          setCamError("This browser doesn't support camera access. Try Chrome, Safari, or Edge.");
          return;
        }
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
        } catch (e: any) {
          // Constraint not satisfiable (e.g. no rear camera on a laptop) → any camera.
          if (e?.name === "OverconstrainedError" || e?.name === "ConstraintNotSatisfiedError") {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw e;
          }
        }
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        // Show the flip control only when more than one camera exists (mobiles).
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (active) setHasMultiCam(devices.filter((d) => d.kind === "videoinput").length > 1);
        } catch { /* ignore */ }
      } catch (e: any) {
        if (!active) return;
        const name = e?.name || "";
        if (name === "NotAllowedError" || name === "SecurityError")
          setCamError("Camera permission is blocked. Allow it from the camera icon in your address bar, then tap Retry.");
        else if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError")
          setCamError("Your camera is being used by another app or tab. Close it and tap Retry.");
        else if (name === "NotFoundError" || name === "DevicesNotFoundError")
          setCamError("No camera was found on this device.");
        else
          setCamError("Couldn't start the camera. Tap Retry, or check your browser's camera settings.");
      }
    })();
    return () => { active = false; stopStream(); };
  }, [step, facing, camAttempt]);

  async function captureVerify() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setFaceStatus("verifying");
    setFaceResult(null);
    setFaceMsg("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const { faces, result } = await detectFromImage(canvas);
      if (!result) {
        setFaceResult({ pass: false, similarity: 0, distance: 1, checks: [{ label: "Face detected in frame", pass: false }] });
        setFaceStatus("ready");
        setFaceFails((n) => n + 1);
        return;
      }
      if (refMissing || !refDescRef.current) {
        stopStream();
        setStep("sign");
        return;
      }
      const verdict = verifyAgainst(refDescRef.current, result, canvas.width * canvas.height, faces);
      setFaceResult(verdict);
      setFaceStatus("ready");
      if (verdict.pass) {
        setTimeout(() => { stopStream(); setStep("sign"); }, 900);
      } else {
        setFaceFails((n) => n + 1);
      }
    } catch {
      setFaceStatus("ready");
      setFaceMsg("Verification failed — please retry.");
    }
  }

  function restartFromOtp() {
    stopStream();
    setFaceResult(null);
    setFaceFails(0);
    setRefMissing(false);
    setOtp("");
    setOtpSent(false);
    setStep("gate");
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

  // ── Identity gate: email OTP ───────────────────────────────────────────────
  if (state === "ready" && step === "gate") {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col">
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

        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-5">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><ShieldCheck size={22} /></div>
                <h1 className="text-lg font-bold text-foreground">Verify it&apos;s you</h1>
                <p className="text-sm text-muted-foreground">We&apos;ll email a 6-digit code to confirm your identity before you sign.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Your email</Label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <Mail size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate flex-1">{email}</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0"><Lock size={11} /> Locked</span>
                </div>
              </div>

              {!otpSent ? (
                <>
                  <Button onClick={sendOtp} disabled={otpSending || !email} className="w-full">
                    {otpSending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Send code
                  </Button>
                  {otpErr && <p className="text-xs text-rose-600 dark:text-rose-400 text-center">{otpErr}</p>}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Enter the 6-digit code</Label>
                      <span className={cn("text-xs font-medium tabular-nums", secondsLeft > 0 ? "text-muted-foreground" : "text-rose-500")}>
                        {secondsLeft > 0 ? `Expires in 0:${String(secondsLeft).padStart(2, "0")}` : "Code expired"}
                      </span>
                    </div>
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      placeholder="000000"
                      className="text-center text-lg font-mono tracking-[0.5em]"
                    />
                  </div>
                  {otpErr && <p className="text-xs text-rose-600 dark:text-rose-400">{otpErr}</p>}
                  <Button onClick={verifyOtp} disabled={otpVerifying || otp.length !== 6 || secondsLeft === 0} className="w-full">
                    {otpVerifying ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Verify &amp; continue
                  </Button>
                  <Button variant="ghost" size="sm" onClick={sendOtp} disabled={otpSending || secondsLeft > 0} className="w-full text-xs">
                    {secondsLeft > 0 ? `Resend code in 0:${String(secondsLeft).padStart(2, "0")}` : "Resend code"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ── Live face verification ─────────────────────────────────────────────────
  if (state === "ready" && step === "face") {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col">
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

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><ScanFace size={22} /></div>
                <h1 className="text-lg font-bold text-foreground">Face verification</h1>
                <p className="text-sm text-muted-foreground">Look into the camera and capture a photo — we&apos;ll match it to your profile photo on file.</p>
              </div>

              {refMissing ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                    No profile photo is on file for you, so face matching is skipped. You can continue to sign.
                  </div>
                  <Button className="w-full" onClick={() => { stopStream(); setStep("sign"); }}>Continue</Button>
                </div>
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-xl border border-border bg-black aspect-[4/3]">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                      style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
                    />
                    {(faceStatus === "init" || faceStatus === "verifying") && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
                        <Loader2 className="animate-spin" size={22} />
                        <span className="text-xs">{faceStatus === "init" ? (faceMsg || "Loading…") : "Verifying…"}</span>
                      </div>
                    )}
                    {hasMultiCam && (
                      <button
                        type="button"
                        onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                        className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] text-white hover:bg-black/70"
                        title="Switch camera"
                      >
                        <RefreshCw size={12} /> Flip
                      </button>
                    )}
                  </div>

                  {camError && (
                    <div className="space-y-2">
                      <p className="text-xs text-rose-600 dark:text-rose-400">{camError}</p>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => { setCamError(null); setCamAttempt((n) => n + 1); }}>
                        <RefreshCw size={14} /> Retry camera
                      </Button>
                    </div>
                  )}

                  {faceResult && (
                    <div className={cn("rounded-lg border p-3", faceResult.pass ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5")}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className={cn("text-xs font-semibold", faceResult.pass ? "text-emerald-600" : "text-rose-600")}>
                          {faceResult.pass ? "Identity confirmed" : "Couldn't confirm your identity"}
                        </p>
                        {faceResult.distance < 1 && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">match {Math.round(faceResult.similarity * 100)}%</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {faceResult.checks.map((c) => (
                          <div key={c.label} className="flex items-center gap-1.5 text-[11px]">
                            {c.pass ? <Check size={12} className="text-emerald-500 flex-shrink-0" /> : <X size={12} className="text-rose-500 flex-shrink-0" />}
                            <span className={c.pass ? "text-muted-foreground" : "text-rose-600"}>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {faceResult?.pass ? (
                    <Button className="w-full" disabled><CheckCircle2 size={15} /> Verified — continuing…</Button>
                  ) : (
                    <Button className="w-full" onClick={captureVerify} disabled={faceStatus !== "ready" || !!camError}>
                      {faceStatus === "verifying" ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                      {faceResult ? "Retry capture" : "Capture & verify"}
                    </Button>
                  )}

                  {faceFails >= 2 && !faceResult?.pass && (
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={restartFromOtp}>
                      <RotateCcw size={12} /> Start over from email verification
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
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
