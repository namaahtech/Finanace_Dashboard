"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, RefreshCw, Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadFaceModels, detectFromImage, detectFaceBox, assessQuality, type QualityResult } from "@/lib/face-verify-client";

// Live front-camera selfie with on-device face-quality checks (single face,
// frontal, size, sharpness, plain background, no mask/glasses/hat). Produces a
// JPEG File only when the checks pass. Camera starts on an explicit tap so the
// permission prompt appears on every device/browser.
export function SelfieCapture({ onCapture, onCancel }: { onCapture: (file: File) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<File | null>(null);

  const [camStarted, setCamStarted] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [hasMulti, setHasMulti] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<QualityResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [centered, setCentered] = useState(false); // face inside the oval guide

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => { loadFaceModels().then(() => setModelsReady(true)).catch(() => setModelsReady(true)); }, []);

  useEffect(() => {
    if (!camStarted) return;
    let active = true;
    (async () => {
      setCamErr(null);
      try {
        stop();
        if (!navigator.mediaDevices?.getUserMedia) { setCamErr("This browser doesn't support the camera. Try Chrome or Safari."); return; }
        let s: MediaStream;
        try { s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false }); }
        catch (e: any) {
          if (e?.name === "OverconstrainedError" || e?.name === "ConstraintNotSatisfiedError") s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          else throw e;
        }
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
        try { const d = await navigator.mediaDevices.enumerateDevices(); if (active) setHasMulti(d.filter((x) => x.kind === "videoinput").length > 1); } catch { /* ignore */ }
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
  }, [camStarted, facing, stop]);

  useEffect(() => () => stop(), [stop]);

  // Live oval guide: a few times a second, detect the face box and decide if it
  // sits centered + large enough inside the guide → green oval, else red.
  useEffect(() => {
    if (!camStarted || preview || !modelsReady) { setCentered(false); return; }
    let stopped = false, running = false;
    const id = setInterval(async () => {
      const v = videoRef.current;
      if (running || !v || !v.videoWidth) return;
      running = true;
      try {
        const { count, box } = await detectFaceBox(v);
        if (stopped) return;
        if (count === 1 && box) {
          const cx = (box.x + box.width / 2) / v.videoWidth;
          const cy = (box.y + box.height / 2) / v.videoHeight;
          const wR = box.width / v.videoWidth;
          setCentered(cx > 0.34 && cx < 0.66 && cy > 0.26 && cy < 0.72 && wR > 0.28 && wR < 0.82);
        } else setCentered(false);
      } catch { /* ignore */ } finally { running = false; }
    }, 450);
    return () => { stopped = true; clearInterval(id); };
  }, [camStarted, preview, modelsReady]);

  async function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setBusy(true); setResult(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth; canvas.height = v.videoHeight;
      canvas.getContext("2d")!.drawImage(v, 0, 0);
      const { faces, result: det } = await detectFromImage(canvas);
      if (!det) {
        setResult({ pass: false, sharpness: 0, checks: [{ key: "face", label: "A face is clearly visible", pass: false }] });
        setBusy(false);
        return;
      }
      const q = assessQuality(canvas, det, faces);
      setResult(q);
      canvas.toBlob((blob) => {
        if (blob) { fileRef.current = new File([blob], `selfie_${Date.now()}.jpg`, { type: "image/jpeg" }); setPreview(URL.createObjectURL(blob)); }
        setBusy(false);
      }, "image/jpeg", 0.92);
    } catch {
      setBusy(false);
      setResult({ pass: false, sharpness: 0, checks: [{ key: "err", label: "Could not analyse the photo — please retake", pass: false }] });
    }
  }

  function useIt() { if (fileRef.current) { stop(); onCapture(fileRef.current); } }
  function retake() { setResult(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); fileRef.current = null; }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Camera size={15} /> Take a live selfie</h3>
          <button onClick={onCancel} className="rounded p-1 hover:bg-muted"><X size={16} /></button>
        </div>

        <div className="space-y-3 p-5">
          {!camStarted ? (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                We'll take a <strong>live photo</strong> of your face for verification. Please <strong>remove glasses, mask, and any cap/hat</strong>,
                face the camera in good light, and use a plain background.
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
                {/* Face-centering oval guide — green when the face is centered. */}
                {!preview && (
                  <>
                    <div
                      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] border-dashed transition-colors"
                      style={{ width: "64%", height: "74%", borderColor: centered ? "#22c55e" : "#f43f5e" }}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white", centered ? "bg-emerald-600/85" : "bg-rose-600/85")}>
                        {centered ? "Perfect — hold still & capture" : "Center your face in the oval"}
                      </span>
                    </div>
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
                  <p className={cn("mb-1 text-xs font-semibold", result.pass ? "text-emerald-600" : "text-rose-600")}>
                    {result.pass ? "Looks good!" : "Please fix the highlighted items"}
                  </p>
                  {result.checks.map((c) => (
                    <div key={c.key} className="flex items-center gap-1.5 text-[11px]">
                      {c.pass ? <Check size={12} className="flex-shrink-0 text-emerald-500" /> : <X size={12} className="flex-shrink-0 text-rose-500" />}
                      <span className={c.pass ? "text-muted-foreground" : "text-rose-600"}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {!preview ? (
                <Button className="w-full" onClick={capture} disabled={busy || !modelsReady || !!camErr || !centered}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}{" "}
                  {!modelsReady ? "Loading checks…" : !centered ? "Center your face…" : "Capture"}
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
