"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, RefreshCw, Check, X, RotateCcw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadFaceModels, detectForQuality, assessQuality, diagnoseNoFace, hintFor, type QualityResult } from "@/lib/face-verify-client";
import {
  loadFaceLandmarker, detectFrame, makeChallengeSequence, newProgress, stepChallenge,
  scoreRisk, type Challenge, type ChallengeProgress, type FrameSignals,
} from "@/lib/liveness-client";
import { compressForDoc, formatBytes } from "@/lib/image-compress-client";
import { FACE_VERIFY_MODE, isStrictVerify } from "@/lib/face-verify-mode";

// Live front-camera selfie with enterprise active-liveness: a randomized
// challenge sequence (blink / turn / smile) proven live via MediaPipe Face
// Landmarker, then on-device face-quality (face-api) + a weighted risk score.
// Produces a JPEG File only when liveness + quality pass. Camera starts on a tap
// so the permission prompt appears on every device.
export function SelfieCapture({ onCapture, onCancel }: { onCapture: (file: File) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<File | null>(null);
  const rafRef = useRef<number | null>(null);
  const tsRef = useRef(0);

  const [camStarted, setCamStarted] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [hasMulti, setHasMulti] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<QualityResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [centered, setCentered] = useState(false);
  // Live framing feedback so the candidate is corrected BEFORE they capture,
  // instead of being rejected afterwards with no explanation.
  const [framing, setFraming] = useState<"none" | "far" | "close" | "off" | "ok">("none");
  const [sizeNote, setSizeNote] = useState<string | null>(null);
  // Last live tracker reading — used to explain a failed capture.
  const lastSignalsRef = useRef<FrameSignals | null>(null);

  // Liveness challenge sequence
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [chIdx, setChIdx] = useState(0);
  const [chCount, setChCount] = useState(0);        // progress for the active challenge
  const [liveDone, setLiveDone] = useState(false);
  const progRef = useRef<ChallengeProgress>(newProgress());
  const idxRef = useRef(0);
  const doneRef = useRef(false);
  const challengesRef = useRef<Challenge[]>([]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Preload both models. The enrolment selfie never compares identities, so the
  // 6.4 MB face-recognition net is skipped entirely — only the ~550 KB detector +
  // landmark nets are fetched, which is the single biggest load-time saving here.
  useEffect(() => {
    Promise.allSettled([loadFaceLandmarker(), loadFaceModels({ recognition: false })]).then(() => setModelsReady(true));
  }, []);

  function resetChallenges() {
    if (!isStrictVerify()) {
      // Presence mode: no blink/gaze steps. Capture unlocks on framing alone.
      challengesRef.current = [];
      setChallenges([]);
      idxRef.current = 0; setChIdx(0);
      progRef.current = newProgress(); setChCount(0);
      doneRef.current = true; setLiveDone(true);
      return;
    }
    const seq = makeChallengeSequence();
    challengesRef.current = seq;
    setChallenges(seq);
    idxRef.current = 0; setChIdx(0);
    progRef.current = newProgress(); setChCount(0);
    doneRef.current = false; setLiveDone(false);
  }

  useEffect(() => {
    if (!camStarted) return;
    let active = true;
    (async () => {
      setCamErr(null);
      try {
        stop();
        if (!navigator.mediaDevices?.getUserMedia) { setCamErr("This browser doesn't support the camera. Try Chrome or Safari."); return; }
        let s: MediaStream;
        try { s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
        catch (e: any) {
          if (e?.name === "OverconstrainedError" || e?.name === "ConstraintNotSatisfiedError") s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          else throw e;
        }
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
        try { const d = await navigator.mediaDevices.enumerateDevices(); if (active) setHasMulti(d.filter((x) => x.kind === "videoinput").length > 1); } catch { /* ignore */ }
        resetChallenges();
        startLoop();
      } catch (e: any) {
        if (!active) return;
        const n = e?.name || "";
        if (n === "NotAllowedError" || n === "SecurityError") setCamErr("Camera permission is blocked. Allow it from your browser's site settings, then tap Retry.");
        else if (n === "NotReadableError" || n === "TrackStartError" || n === "AbortError") setCamErr("Your camera is being used by another app or tab. Close it and tap Retry.");
        else if (n === "NotFoundError" || n === "DevicesNotFoundError") setCamErr("No camera was found on this device.");
        else setCamErr("Couldn't start the camera. Tap Retry, or check your browser's camera settings.");
      }
    })();
    return () => { active = false; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camStarted, facing]);

  useEffect(() => () => stop(), [stop]);

  // rAF loop (throttled ~15fps): centering + drive the challenge sequence.
  function startLoop() {
    let lastRun = 0;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const v = videoRef.current;
      if (!v || !v.videoWidth || preview) return;
      const now = performance.now();
      if (now - lastRun < 66) return; // ~15fps
      lastRun = now;
      tsRef.current = Math.max(tsRef.current + 1, Math.round(now));
      const s = detectFrame(v, tsRef.current);
      lastSignalsRef.current = s;

      // Framing. The upper bound is 0.58 (was 0.85): a face wider than ~60% of the
      // frame is exactly where the capture detector starts failing, so we now push
      // the candidate back BEFORE they capture rather than rejecting them after.
      if (s.present && s.faceCount === 1 && s.box) {
        const cx = s.box.x + s.box.width / 2, cy = s.box.y + s.box.height / 2;
        const inFrame = cx > 0.34 && cx < 0.66 && cy > 0.24 && cy < 0.74;
        const good = inFrame && s.box.width >= 0.24 && s.box.width <= 0.58;
        setFraming(!inFrame ? "off" : s.box.width < 0.24 ? "far" : s.box.width > 0.58 ? "close" : "ok");
        setCentered(good);
      } else { setCentered(false); setFraming("none"); }

      // Only advance challenges when a single face is present (strict mode only).
      if (!isStrictVerify() || doneRef.current || !s.present || s.faceCount !== 1) return;
      const seq = challengesRef.current;
      const ch = seq[idxRef.current];
      if (!ch) return;
      const p = stepChallenge(ch, s, progRef.current);
      setChCount(p.count);
      if (p.done) {
        if (idxRef.current + 1 >= seq.length) { doneRef.current = true; setLiveDone(true); }
        else { idxRef.current += 1; setChIdx(idxRef.current); progRef.current = newProgress(); setChCount(0); }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setBusy(true); setResult(null); setSizeNote(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth; canvas.height = v.videoHeight;
      canvas.getContext("2d")!.drawImage(v, 0, 0);

      // Quality-only detection — no 128-D descriptor, so the heavy recognition
      // net is never touched on this page.
      const { faces, result: det } = await detectForQuality(canvas);
      if (!det) {
        // Explain WHY, using the live tracker's last box (it usually still sees the
        // face) plus exposure/blur, instead of the old bare "no face" rejection.
        const d = diagnoseNoFace(canvas, lastSignalsRef.current?.box ?? null);
        setResult({
          pass: false,
          sharpness: 0,
          reason: d.reason,
          hint: d.hint,
          checks: [{ key: d.key, label: d.reason, pass: false, hint: d.hint }],
        });
        setBusy(false);
        return;
      }

      const q = assessQuality(canvas, det, faces, { mode: FACE_VERIFY_MODE });

      // In presence mode the photo passes on its own merits — one person, framed,
      // in focus. No risk score is computed or shown, because no liveness or
      // anti-spoof check ran and displaying a "security score" would misrepresent
      // what was actually verified.
      let finalPass = q.pass;
      const checks = [...q.checks];
      if (isStrictVerify()) {
        const noSun = (q.checks.find((c) => c.key === "noglasses")?.pass ?? true) && (q.checks.find((c) => c.key === "nomask")?.pass ?? true);
        const risk = scoreRisk({
          faceDetected: true,
          qualityPass: q.pass,
          noSunglassesMask: noSun,
          eyesVisible: q.checks.find((c) => c.key === "eyes")?.pass ?? true,
          livenessPass: doneRef.current,
          identityMatch: null, // registration selfie has no prior reference
        });
        finalPass = q.pass && risk.pass;
        checks.push({ key: "risk", label: `Security score ${risk.score}/${risk.max}`, pass: risk.pass, hint: hintFor("face").hint });
      }

      setResult({
        pass: finalPass,
        sharpness: q.sharpness,
        reason: q.reason,
        hint: q.hint,
        checks,
      });

      if (!finalPass) { setBusy(false); return; }

      // Compress before it ever leaves the device — the file is stored inline in
      // the database, so a raw 1280×720 frame would bloat the row by ~33% again
      // once base64-encoded.
      canvas.toBlob(async (blob) => {
        try {
          if (!blob) { setBusy(false); return; }
          const raw = new File([blob], `selfie_${Date.now()}.jpg`, { type: "image/jpeg" });
          const { file, bytes, originalBytes, width, height } = await compressForDoc(raw, "face_photo");
          fileRef.current = file;
          setPreview(URL.createObjectURL(file));
          setSizeNote(`${width}×${height} · ${formatBytes(bytes)}${originalBytes > bytes ? ` (from ${formatBytes(originalBytes)})` : ""}`);
        } finally {
          setBusy(false);
        }
      }, "image/jpeg", 0.92);
    } catch {
      setBusy(false);
      setResult({
        pass: false,
        sharpness: 0,
        reason: "We couldn't analyse that photo",
        hint: "Please tap Capture again — if it keeps happening, reload the page and retry.",
        checks: [{ key: "err", label: "Could not analyse the photo — please retake", pass: false }],
      });
    }
  }

  function useIt() { if (fileRef.current) { stop(); onCapture(fileRef.current); } }
  function retake() {
    setResult(null); setSizeNote(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null); fileRef.current = null;
    resetChallenges();
  }

  const activeChallenge = challenges[chIdx];
  // Specific, actionable framing guidance — "move back" instead of a generic
  // "center your face" that gives the candidate nothing to act on.
  const FRAMING_GUIDE: Record<typeof framing, string> = {
    none:  "Position your face inside the oval",
    off:   "Center your face in the oval",
    far:   "Move a little closer to the camera",
    close: "Move back a little — you're too close",
    ok:    "",
  };
  const guide = !centered
    ? FRAMING_GUIDE[framing] || "Center your face in the oval"
    : !liveDone && activeChallenge
      ? (activeChallenge.type === "blink" ? `${activeChallenge.label} (${chCount}/${activeChallenge.target})` : activeChallenge.label)
      : isStrictVerify() ? "Liveness confirmed — capture now" : "Looking good — tap Capture";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={15} /> {isStrictVerify() ? "Live face verification" : "Live photo capture"}</h3>
          <button onClick={onCancel} className="rounded p-1 hover:bg-muted"><X size={16} /></button>
        </div>

        <div className="space-y-3 p-5">
          {!camStarted ? (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {isStrictVerify()
                  ? <>We&apos;ll verify a <strong>live</strong> photo of your face. Please <strong>remove glasses, mask, and any cap/hat</strong>, face the camera in good light with a plain background, then follow the on-screen prompts.</>
                  : <>We&apos;ll take a <strong>live</strong> photo of your face. Make sure you&apos;re the <strong>only person in frame</strong>, in good light, then tap Capture.</>}
              </p>
              <Button className="w-full" onClick={() => { setCamErr(null); setCamStarted(true); }}>
                <Camera size={15} /> Enable camera
              </Button>
            </>
          ) : (
            <>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-black">
                {preview ? (
                  <img src={preview} alt="selfie" className="h-full w-full object-cover" />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }} />
                )}
                {!preview && (
                  <>
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] border-dashed transition-colors"
                      style={{ width: "64%", height: "74%", borderColor: centered && liveDone ? "#22c55e" : centered ? "#f59e0b" : "#f43f5e" }} />
                    <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-3">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-center text-[11px] font-medium text-white", liveDone ? "bg-emerald-600/85" : centered ? "bg-amber-600/90" : "bg-rose-600/85")}>
                        {guide}
                      </span>
                    </div>
                    {/* Challenge step dots */}
                    {challenges.length > 0 && (
                      <div className="pointer-events-none absolute left-1/2 top-2 flex -translate-x-1/2 gap-1.5">
                        {challenges.map((_, i) => (
                          <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i < chIdx || liveDone ? "bg-emerald-400" : i === chIdx ? "bg-amber-400" : "bg-white/40")} />
                        ))}
                      </div>
                    )}
                  </>
                )}
                {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white"><Loader2 className="animate-spin" size={22} /></div>}
                {hasMulti && !preview && (
                  <button type="button" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] text-white hover:bg-black/70">
                    <RefreshCw size={12} /> Flip
                  </button>
                )}
              </div>

              {camErr && (
                <div className="space-y-2">
                  <p className="text-xs text-rose-600 dark:text-rose-400">{camErr}</p>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => { setCamErr(null); setCamStarted(false); setTimeout(() => setCamStarted(true), 60); }}>
                    <RefreshCw size={13} /> Retry camera
                  </Button>
                </div>
              )}

              {result && (
                <div className={cn("space-y-1 rounded-lg border p-3", result.pass ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5")}>
                  {result.pass ? (
                    <p className="mb-1 text-xs font-semibold text-emerald-600">Verified — all checks passed</p>
                  ) : (
                    // Lead with the single reason it failed and how to fix it; the
                    // full checklist stays below for detail.
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-rose-600">{result.reason || "Please fix the highlighted items"}</p>
                      {result.hint && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{result.hint}</p>}
                    </div>
                  )}
                  {result.checks.map((c) => (
                    <div key={c.key} className="flex items-center gap-1.5 text-[11px]">
                      {c.pass ? <Check size={12} className="flex-shrink-0 text-emerald-500" /> : <X size={12} className="flex-shrink-0 text-rose-500" />}
                      <span className={c.pass ? "text-muted-foreground" : "text-rose-600"}>{c.label}</span>
                    </div>
                  ))}
                  {result.pass && sizeNote && (
                    <p className="pt-1 text-[10px] text-muted-foreground">Optimised for upload · {sizeNote}</p>
                  )}
                </div>
              )}

              {!preview ? (
                <Button className="w-full" onClick={capture} disabled={busy || !modelsReady || !!camErr || !centered || !liveDone}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}{" "}
                  {!modelsReady
                    ? "Loading verification…"
                    : !centered
                      ? (framing === "close" ? "Move back a little…" : framing === "far" ? "Move closer…" : "Center your face…")
                      : !liveDone ? "Follow the prompts…" : "Capture"}
                </Button>
              ) : result?.pass ? (
                <Button className="w-full" onClick={useIt}><Check size={15} /> Use this photo</Button>
              ) : (
                <Button variant="outline" className="w-full" onClick={retake}><RotateCcw size={13} /> Retake</Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
