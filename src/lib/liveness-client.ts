// Client-side active-liveness engine on MediaPipe Face Landmarker (478 landmarks
// + blendshapes + iris), self-hosted from /public/mediapipe (offline, all-device,
// no CDN/CSP dependency). Drives randomized challenge sequences (blink / turn /
// smile) that a printed photo or replayed video cannot satisfy on demand.
//
// Identity embedding + pixel quality still come from face-api (see
// face-verify-client.ts); this module owns landmarks, head pose and liveness.

let landmarkerMod: any = null;
let landmarker: any = null;
let loading: Promise<void> | null = null;

async function getVision(): Promise<any> {
  if (!landmarkerMod) landmarkerMod = await import("@mediapipe/tasks-vision");
  return landmarkerMod;
}

export async function loadFaceLandmarker(): Promise<void> {
  if (landmarker) return;
  if (loading) return loading;
  loading = (async () => {
    const vision = await getVision();
    // WASM from the pinned MediaPipe CDN (no CSP configured, so this is allowed);
    // the model itself is self-hosted under /public for control + integrity.
    const fileset = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm");
    const opts = (delegate: "GPU" | "CPU") => ({
      baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate },
      runningMode: "VIDEO" as const,
      numFaces: 2,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });
    // GPU is faster where WebGL2 is available; fall back to CPU so it still runs
    // on low-end / older devices (all-device support).
    try { landmarker = await vision.FaceLandmarker.createFromOptions(fileset, opts("GPU")); }
    catch { landmarker = await vision.FaceLandmarker.createFromOptions(fileset, opts("CPU")); }
  })();
  try { await loading; } catch { landmarker = null; loading = null; throw new Error("Could not load the liveness model."); }
}

export interface FrameSignals {
  present: boolean;
  faceCount: number;
  blink: number;   // 0..1, high = eyes closed
  smile: number;   // 0..1
  yaw: number;     // <0 turned one way, >0 the other (image space, normalized)
  box: { x: number; y: number; width: number; height: number } | null; // normalized 0..1
}

/** One frame → normalized liveness signals. Call inside a requestAnimationFrame/interval loop. */
export function detectFrame(video: HTMLVideoElement, tsMs: number): FrameSignals {
  const none: FrameSignals = { present: false, faceCount: 0, blink: 0, smile: 0, yaw: 0, box: null };
  if (!landmarker || !video.videoWidth) return none;
  let res: any;
  try { res = landmarker.detectForVideo(video, tsMs); } catch { return none; }
  const faces = res?.faceLandmarks || [];
  if (!faces.length) return none;
  const pts = faces[0];

  const cats = res?.faceBlendshapes?.[0]?.categories || [];
  const bs = (name: string) => cats.find((c: any) => c.categoryName === name)?.score ?? 0;
  const blink = (bs("eyeBlinkLeft") + bs("eyeBlinkRight")) / 2;
  const smile = (bs("mouthSmileLeft") + bs("mouthSmileRight")) / 2;

  let minx = 1, miny = 1, maxx = 0, maxy = 0;
  for (const p of pts) { if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x; if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y; }
  const box = { x: minx, y: miny, width: maxx - minx, height: maxy - miny };

  // Yaw proxy: nose (1) distance to each eye corner (33 / 263), normalized.
  const nose = pts[1], le = pts[33], re = pts[263];
  const dl = Math.hypot(nose.x - le.x, nose.y - le.y);
  const dr = Math.hypot(nose.x - re.x, nose.y - re.y);
  const yaw = (dr - dl) / ((dl + dr) || 1);

  return { present: true, faceCount: faces.length, blink, smile, yaw, box };
}

// ── Randomized challenge sequence ────────────────────────────────────────────
export type ChallengeType = "blink" | "turn_left" | "turn_right" | "smile";
export interface Challenge { type: ChallengeType; label: string; target: number }

export function makeChallengeSequence(): Challenge[] {
  const blinkN = 2 + Math.floor(Math.random() * 2); // 2 or 3
  const pool: Challenge[] = [
    { type: "blink", label: `Blink your eyes ${blinkN} times`, target: blinkN },
    { type: "turn_left", label: "Slowly turn your head to the LEFT", target: 1 },
    { type: "turn_right", label: "Slowly turn your head to the RIGHT", target: 1 },
    { type: "smile", label: "Give a big SMILE", target: 1 },
  ];
  // Fisher–Yates shuffle, take 3 (blink first if present feels natural, but random is stronger)
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}

// Per-challenge progress tracker. Feed frames; returns updated internal state.
export interface ChallengeProgress { count: number; phase: "waitOpen" | "wasOpen" | "wasClosed"; done: boolean }
export function newProgress(): ChallengeProgress { return { count: 0, phase: "waitOpen", done: false }; }

/** Advance a challenge with one frame's signals. Mutates & returns the progress. */
export function stepChallenge(ch: Challenge, s: FrameSignals, p: ChallengeProgress): ChallengeProgress {
  if (p.done || !s.present) return p;
  switch (ch.type) {
    case "blink": {
      // count open→closed→open transitions
      if (p.phase === "waitOpen" && s.blink < 0.25) p.phase = "wasOpen";
      else if (p.phase === "wasOpen" && s.blink > 0.55) p.phase = "wasClosed";
      else if (p.phase === "wasClosed" && s.blink < 0.25) { p.count++; p.phase = "wasOpen"; }
      if (p.count >= ch.target) p.done = true;
      break;
    }
    case "turn_left":  if (s.yaw < -0.28) p.done = true; break;
    case "turn_right": if (s.yaw > 0.28) p.done = true; break;
    case "smile":      if (s.smile > 0.5) p.done = true; break;
  }
  return p;
}

// ── Risk scoring ─────────────────────────────────────────────────────────────
export interface RiskInput {
  faceDetected: boolean;
  qualityPass: boolean;   // blur/size/exposure/plain-bg from assessQuality
  noSunglassesMask: boolean;
  eyesVisible: boolean;
  livenessPass: boolean;  // all challenges completed
  headMovement: boolean;  // at least one turn challenge done
  identityMatch?: boolean | null; // null when no reference photo
}
export interface RiskResult { score: number; max: number; pass: boolean; breakdown: { label: string; got: number; of: number }[] }

// Weighted score (matches the enterprise spec). Passive CNN anti-spoof (20) is
// reserved for the backend phase and excluded from the client max.
export function scoreRisk(i: RiskInput): RiskResult {
  const rows: { label: string; got: number; of: number }[] = [
    { label: "Face detected", got: i.faceDetected ? 5 : 0, of: 5 },
    { label: "Image quality", got: i.qualityPass ? 10 : 0, of: 10 },
    { label: "No sunglasses / mask", got: i.noSunglassesMask ? 10 : 0, of: 10 },
    { label: "Eyes visible", got: i.eyesVisible ? 10 : 0, of: 10 },
    { label: "Blink challenge", got: i.livenessPass ? 10 : 0, of: 10 },
    { label: "Head movement", got: i.headMovement ? 10 : 0, of: 10 },
  ];
  if (i.identityMatch != null) rows.push({ label: "Face match", got: i.identityMatch ? 15 : 0, of: 15 });
  const score = rows.reduce((s, r) => s + r.got, 0);
  const max = rows.reduce((s, r) => s + r.of, 0);
  // Approve at ≥90% of the achievable score AND liveness+quality must be present.
  const pass = i.livenessPass && i.qualityPass && i.faceDetected && (i.identityMatch !== false) && score / max >= 0.9;
  return { score, max, pass, breakdown: rows };
}
