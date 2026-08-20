// Browser-local face verification using @vladmandic/face-api (FaceNet-style 128-D
// embeddings). No AI API, no token cost — the model runs in the candidate's browser
// against weights served from /models. face-api is dynamically imported so it never
// loads during SSR.

let faceapiMod: any = null;
let detectLoad: Promise<void> | null = null;      // detector + landmarks (~550 KB)
let recogLoad: Promise<void> | null = null;       // recognition net (~6.4 MB)

async function getFaceApi(): Promise<any> {
  if (!faceapiMod) faceapiMod = await import("@vladmandic/face-api");
  return faceapiMod;
}

/**
 * Load the face models. The recognition net is 6.4 MB of the ~7 MB total and is
 * ONLY needed to produce identity embeddings — the enrolment selfie just runs
 * quality checks, so it passes `recognition: false` and skips that download
 * entirely. Nets load in parallel and each load is memoised, so repeated calls
 * (and both call sites on a page) share one in-flight promise.
 */
export async function loadFaceModels(opts: { recognition?: boolean } = {}): Promise<void> {
  const wantRecognition = opts.recognition !== false;
  const faceapi = await getFaceApi();

  if (!detectLoad) {
    detectLoad = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    ]).then(() => undefined);
  }
  if (wantRecognition && !recogLoad) {
    recogLoad = faceapi.nets.faceRecognitionNet.loadFromUri("/models").then(() => undefined);
  }

  try {
    await (wantRecognition ? Promise.all([detectLoad, recogLoad]) : detectLoad);
  } catch (e) {
    // Let a later attempt retry rather than caching a rejected promise forever.
    detectLoad = null;
    if (wantRecognition) recogLoad = null;
    throw e;
  }
}

/** Kick off model downloads early (e.g. on page mount) without blocking the UI. */
export function warmFaceModels(opts: { recognition?: boolean } = {}): void {
  loadFaceModels(opts).catch(() => { /* warm-up is best-effort */ });
}

export interface FaceResult {
  descriptor: Float32Array;
  score: number;
  box: { x: number; y: number; width: number; height: number };
  landmarks: any;
}

// Inference runs on a downscaled copy — TinyFaceDetector resizes to `inputSize`
// internally anyway, so handing it a full 1280×720 frame only costs us the tensor
// upload. Results are mapped back to the original canvas so the pixel-level
// quality checks below keep working in the source resolution.
const DETECT_MAX_DIM = 640;

// Escalation ladder. Stage 1 is the fast common case; stage 2 is a slower, far more
// permissive sweep that rescues soft-focus / uneven-light frames that the strict
// pass misses. Previously there was only a single strict pass at threshold 0.5,
// which is why perfectly visible faces were being rejected outright.
const DETECT_STAGES = [
  { inputSize: 416, scoreThreshold: 0.45 },
  { inputSize: 512, scoreThreshold: 0.22 },
];

function sourceDims(input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): { w: number; h: number } {
  if (typeof HTMLVideoElement !== "undefined" && input instanceof HTMLVideoElement)
    return { w: input.videoWidth, h: input.videoHeight };
  if (typeof HTMLImageElement !== "undefined" && input instanceof HTMLImageElement)
    return { w: input.naturalWidth || input.width, h: input.naturalHeight || input.height };
  return { w: (input as HTMLCanvasElement).width, h: (input as HTMLCanvasElement).height };
}

function toDetectCanvas(
  input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): { canvas: HTMLCanvasElement; origW: number; origH: number } | null {
  const { w, h } = sourceDims(input);
  if (!w || !h) return null;
  const scale = Math.min(1, DETECT_MAX_DIM / Math.max(w, h));
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(input, 0, 0, dw, dh);
  return { canvas, origW: w, origH: h };
}

export async function detectFromImage(
  input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  opts: { descriptor?: boolean } = {}
): Promise<{ faces: number; result: FaceResult | null }> {
  const faceapi = await getFaceApi();
  const wantDescriptor = opts.descriptor !== false;
  const prepared = toDetectCanvas(input);
  if (!prepared) return { faces: 0, result: null };
  const { canvas, origW, origH } = prepared;

  for (const stage of DETECT_STAGES) {
    const detOpts = new faceapi.TinyFaceDetectorOptions(stage);
    const chain = faceapi.detectAllFaces(canvas, detOpts).withFaceLandmarks();
    const all = await (wantDescriptor ? chain.withFaceDescriptors() : chain);
    if (!all.length) continue;

    // Map detections from the downscaled inference canvas back to source pixels.
    const scaled = faceapi.resizeResults(all, { width: origW, height: origH });
    const best = scaled
      .slice()
      .sort((a: any, b: any) => b.detection.box.width * b.detection.box.height - a.detection.box.width * a.detection.box.height)[0];
    return {
      faces: scaled.length,
      result: {
        descriptor: best.descriptor ?? new Float32Array(0),
        score: best.detection.score,
        box: best.detection.box,
        landmarks: best.landmarks,
      },
    };
  }
  return { faces: 0, result: null };
}

/**
 * Detection WITHOUT the 128-D descriptor — used by the enrolment selfie, which
 * only needs box + landmarks for the quality checks. Skipping descriptors means
 * the 6.4 MB recognition net never has to be downloaded or run.
 */
export function detectForQuality(
  input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<{ faces: number; result: FaceResult | null }> {
  return detectFromImage(input, { descriptor: false });
}

// Fast box-only detection for the live camera oval guide (no landmarks/descriptors
// → cheap enough to run a few times a second). Returns face count + largest box.
export async function detectFaceBox(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<{ count: number; box: { x: number; y: number; width: number; height: number } | null }> {
  const faceapi = await getFaceApi();
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
  const all = await faceapi.detectAllFaces(input, opts);
  if (!all.length) return { count: 0, box: null };
  const best = all.slice().sort((a: any, b: any) => b.box.width * b.box.height - a.box.width * a.box.height)[0];
  return { count: all.length, box: best.box };
}

function euclidean(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}
function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
function center(pts: any[]): { x: number; y: number } {
  let x = 0, y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  return { x: x / pts.length, y: y / pts.length };
}
// Eye Aspect Ratio from a face-api 6-point eye — high open, ~0 closed.
function eyeEAR(eye: Array<{ x: number; y: number }>): number {
  if (!eye || eye.length < 6) return 0.3;
  const d = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
  return (d(eye[1], eye[5]) + d(eye[2], eye[4])) / (2 * (d(eye[0], eye[3]) || 1));
}

// Frontal-pose proxy: nose tip should sit near the midpoint between the eyes.
function isFrontal(landmarks: any): boolean {
  try {
    const le = center(landmarks.getLeftEye());
    const re = center(landmarks.getRightEye());
    const nose = landmarks.getNose();
    const tip = nose[nose.length - 1] || nose[3];
    const mid = (le.x + re.x) / 2;
    const eyeDist = Math.abs(re.x - le.x) || 1;
    return Math.abs(tip.x - mid) / eyeDist < 0.4;
  } catch {
    return true;
  }
}

export interface FaceVerdict {
  pass: boolean;
  similarity: number; // cosine, 0..1
  distance: number; // euclidean
  checks: { label: string; pass: boolean }[];
}

// Compare a live capture against the reference (profile) descriptor.
// face-api descriptors are calibrated for euclidean distance (≤0.6 = same person);
// we use ≤0.55 to be a touch strict, and surface cosine similarity for display.
export function verifyAgainst(ref: Float32Array, live: FaceResult, frameArea: number, faceCount: number): FaceVerdict {
  const distance = euclidean(ref, live.descriptor);
  const similarity = cosine(ref, live.descriptor);
  const sizeOk = (live.box.width * live.box.height) / frameArea > 0.04;
  const confident = live.score >= 0.6;
  const single = faceCount <= 1;
  const frontal = isFrontal(live.landmarks);
  const identity = distance <= 0.55;
  const checks = [
    { label: "Same person as profile photo", pass: identity },
    { label: "Only one face in frame", pass: single },
    { label: "Looking at the camera", pass: frontal },
    { label: "Face clear and close enough", pass: sizeOk },
    { label: "Good detection confidence", pass: confident },
  ];
  return { pass: identity && single && frontal && sizeOk && confident, similarity, distance, checks };
}

// ── Photo-quality / anti-spoof checks (identity-independent) ─────────────────
// All computed locally from pixels + face-api landmarks. The occlusion checks
// (glasses / mask / hat) are heuristic — tuned to block clear cases without
// rejecting normal selfies; thresholds live here for easy tuning.

export interface QualityCheck { key: string; label: string; pass: boolean; hint?: string }
export interface QualityResult {
  pass: boolean;
  checks: QualityCheck[];
  sharpness: number;
  /** Headline explanation of the first thing that failed, shown prominently. */
  reason?: string;
  /** Actionable one-liner telling the candidate how to fix `reason`. */
  hint?: string;
}

// What to tell the candidate for each failed check. Written as instructions
// ("do this") rather than diagnoses ("this is wrong") so the fix is obvious.
const QUALITY_HINTS: Record<string, { reason: string; hint: string }> = {
  face:      { reason: "We couldn't detect your face",        hint: "Center your face in the oval, hold the phone at arm's length, and make sure the light is on your face — not behind you." },
  single:    { reason: "More than one person is in frame",    hint: "Make sure you're the only person visible before capturing." },
  eyes:      { reason: "Your eyes aren't clearly visible",    hint: "Look straight at the camera with both eyes open, and remove anything covering them." },
  size:      { reason: "Your face is too far from the camera", hint: "Move a little closer until your face comfortably fills the oval." },
  toobig:    { reason: "Your face is too close to the camera", hint: "Hold the phone about an arm's length away so your whole head fits with a little space around it." },
  sharp:     { reason: "The photo came out blurry",           hint: "Hold the phone steady, tap the screen to focus, then capture again." },
  nomask:    { reason: "Your face looks partly covered",      hint: "Please remove any mask, scarf, or anything covering your mouth and chin." },
  noglasses: { reason: "Something is covering your eyes",     hint: "Please remove glasses, sunglasses, or any cap shadowing your eyes." },
  plainbg:   { reason: "The background is too busy",          hint: "Stand facing a plain wall so the background is a single, even colour." },
  dark:      { reason: "The photo is too dark",               hint: "Move somewhere brighter, or face a window or light source." },
  bright:    { reason: "The photo is over-exposed",           hint: "Move out of direct light and avoid having a bright window behind you." },
};

export function hintFor(key: string): { reason: string; hint: string } {
  return QUALITY_HINTS[key] || { reason: "The photo didn't pass our checks", hint: "Please retake it in even light with a plain background." };
}

/**
 * Explains WHY no face was found, using the live MediaPipe box (which tracks the
 * face even when face-api's detector misses it) plus overall exposure. Without
 * this the candidate only saw "A face is clearly visible ✗" on a frame where
 * their face was plainly visible — accurate about the detector, useless as advice.
 */
export function diagnoseNoFace(
  canvas: HTMLCanvasElement,
  hintBox?: { x: number; y: number; width: number; height: number } | null
): { key: string; reason: string; hint: string } {
  // The live tracker saw a face — so the problem is framing, not presence.
  if (hintBox) {
    if (hintBox.width > 0.55) return { key: "toobig", ...hintFor("toobig") };
    if (hintBox.width < 0.22) return { key: "size", ...hintFor("size") };
  }
  try {
    const W = canvas.width, H = canvas.height;
    const stat = regionStat(canvas.getContext("2d")!.getImageData(0, 0, W, H).data, W, H, 0, 0, W, H);
    const luma = 0.299 * stat.r + 0.587 * stat.g + 0.114 * stat.b;
    if (luma < 55) return { key: "dark", ...hintFor("dark") };
    if (luma > 215) return { key: "bright", ...hintFor("bright") };
    if (laplacianVar(canvas) < 25) return { key: "sharp", ...hintFor("sharp") };
  } catch { /* fall through to the generic message */ }
  return { key: "face", ...hintFor("face") };
}

/** Sharpness via Laplacian variance on a downscaled copy — low = blurry. */
export function laplacianVar(src: HTMLCanvasElement): number {
  const maxDim = 320;
  const scale = Math.min(1, maxDim / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!; ctx.drawImage(src, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float64Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  let sum = 0, sumSq = 0, cnt = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const idx = y * w + x;
    const lap = 4 * gray[idx] - gray[idx - 1] - gray[idx + 1] - gray[idx - w] - gray[idx + w];
    sum += lap; sumSq += lap * lap; cnt++;
  }
  const mean = cnt ? sum / cnt : 0;
  return cnt ? sumSq / cnt - mean * mean : 0;
}

interface RStat { r: number; g: number; b: number; lumaVar: number; edge: number; bright: number; n: number }
function regionStat(data: Uint8ClampedArray, W: number, H: number, x0: number, y0: number, x1: number, y1: number): RStat {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(W, Math.ceil(x1));  y1 = Math.min(H, Math.ceil(y1));
  let r = 0, g = 0, b = 0, ls = 0, lss = 0, edge = 0, n = 0, en = 0, bright = 0;
  const step = Math.max(1, Math.floor(Math.min(x1 - x0, y1 - y0) / 40) || 1);
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
    const i = (y * W + x) * 4;
    const R = data[i], G = data[i + 1], B = data[i + 2];
    r += R; g += G; b += B;
    const lum = 0.299 * R + 0.587 * G + 0.114 * B;
    if (lum > 232) bright++;               // near-white specular pixel (lens glare)
    ls += lum; lss += lum * lum; n++;
    const xr = Math.min(W - 1, x + step);
    const j = (y * W + xr) * 4;
    const lum2 = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
    edge += Math.abs(lum - lum2); en++;
  }
  if (!n) return { r: 0, g: 0, b: 0, lumaVar: 0, edge: 0, bright: 0, n: 0 };
  const mean = ls / n;
  return { r: r / n, g: g / n, b: b / n, lumaVar: Math.max(0, lss / n - mean * mean), edge: en ? edge / en : 0, bright: bright / n, n };
}

// Eye Aspect Ratio (EAR) from a 6-point face-api eye — high when open, drops
// toward 0 on a blink. Used for real-time liveness (a photo can't blink).
function eyeAspect(eye: Array<{ x: number; y: number }>): number {
  if (!eye || eye.length < 6) return 0.3;
  const d = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
  const v = (d(eye[1], eye[5]) + d(eye[2], eye[4])) / 2;
  const h = d(eye[0], eye[3]) || 1;
  return v / h;
}

// One live-frame read for the camera guide + blink liveness: face count, largest
// box, and mean eye-openness. Landmarks only (no descriptor) → cheap per tick.
export async function detectLive(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<{ count: number; box: { x: number; y: number; width: number; height: number } | null; ear: number | null }> {
  const faceapi = await getFaceApi();
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
  const all = await faceapi.detectAllFaces(input, opts).withFaceLandmarks();
  if (!all.length) return { count: 0, box: null, ear: null };
  const best = all.slice().sort((a: any, b: any) => b.detection.box.width * b.detection.box.height - a.detection.box.width * a.detection.box.height)[0];
  const lm = best.landmarks;
  const ear = (eyeAspect(lm.getLeftEye()) + eyeAspect(lm.getRightEye())) / 2;
  return { count: all.length, box: best.detection.box, ear };
}
function colorDist(a: RStat, b: RStat): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/**
 * Full photo-quality assessment for a captured face frame. Blur + single-face +
 * frontal + size are reliable; plain-background + glasses/mask/hat are heuristic
 * (cheek-skin reference vs region colour/texture).
 */
export function assessQuality(
  canvas: HTMLCanvasElement,
  result: FaceResult,
  faceCount: number,
  // "presence" keeps only the checks that decide whether the photo is USABLE —
  // one person, framed well, in focus. The appearance/anti-spoof checks
  // (eyes-open, mask, glasses, plain background) are skipped so ordinary
  // candidates aren't blocked. See lib/face-verify-mode.ts.
  opts: { mode?: "presence" | "strict" } = {}
): QualityResult {
  const strict = opts.mode !== "presence";
  const W = canvas.width, H = canvas.height;
  const data = canvas.getContext("2d")!.getImageData(0, 0, W, H).data;
  const { x: fx, y: fy, width: fw, height: fh } = result.box;

  const skinL = regionStat(data, W, H, fx + 0.12 * fw, fy + 0.48 * fh, fx + 0.32 * fw, fy + 0.66 * fh);
  const skinR = regionStat(data, W, H, fx + 0.68 * fw, fy + 0.48 * fh, fx + 0.88 * fw, fy + 0.66 * fh);
  const skin: RStat = { r: (skinL.r + skinR.r) / 2, g: (skinL.g + skinR.g) / 2, b: (skinL.b + skinR.b) / 2, lumaVar: (skinL.lumaVar + skinR.lumaVar) / 2, edge: (skinL.edge + skinR.edge) / 2, bright: (skinL.bright + skinR.bright) / 2, n: skinL.n + skinR.n };
  const mouth    = regionStat(data, W, H, fx + 0.30 * fw, fy + 0.72 * fh, fx + 0.70 * fw, fy + 0.95 * fh);
  const eyes     = regionStat(data, W, H, fx + 0.18 * fw, fy + 0.30 * fh, fx + 0.82 * fw, fy + 0.50 * fh);
  // Nose bridge (between the eyes): smooth skin bare-faced, but a glasses bridge
  // bar / frame rims put strong edges + often bright reflections right here — a
  // far more reliable glasses signal than the always-edgy eye band.
  const bridge   = regionStat(data, W, H, fx + 0.42 * fw, fy + 0.32 * fh, fx + 0.58 * fw, fy + 0.46 * fh);

  const cw = W * 0.18, ch = H * 0.18;
  const corners = [
    regionStat(data, W, H, 0, 0, cw, ch),
    regionStat(data, W, H, W - cw, 0, W, ch),
    regionStat(data, W, H, 0, H - ch, cw, H),
    regionStat(data, W, H, W - cw, H - ch, W, H),
  ];
  const bgR = corners.reduce((s, c) => s + c.r, 0) / 4, bgG = corners.reduce((s, c) => s + c.g, 0) / 4, bgB = corners.reduce((s, c) => s + c.b, 0) / 4;
  const bgSpread = corners.reduce((s, c) => s + Math.sqrt((c.r - bgR) ** 2 + (c.g - bgG) ** 2 + (c.b - bgB) ** 2), 0) / 4;

  const single  = faceCount === 1;
  const frontal = isFrontal(result.landmarks);
  // "Eye-ball read": eyes open + looking at camera (EAR from the eye landmarks).
  let earOpen = true;
  try {
    const le = result.landmarks.getLeftEye?.() || [];
    const re = result.landmarks.getRightEye?.() || [];
    earOpen = (eyeEAR(le) + eyeEAR(re)) / 2 > 0.15;
  } catch { /* keep true if landmarks unavailable */ }
  const faceRatio = (fw * fh) / (W * H);
  const sizeOk  = faceRatio > 0.05;
  // A face filling most of the frame is the single most common cause of a failed
  // capture (the detector loses it entirely), so it's now an explicit check rather
  // than a mystery rejection further down the line.
  const notTooBig = fw / W < 0.72;
  // laplacianVar walks every pixel — compute it ONCE and reuse (it used to be
  // called twice per capture, doubling the cost of the slowest check).
  const sharpness = laplacianVar(canvas);
  const sharp   = sharpness > 45;
  const baseEdge  = Math.max(4, skin.edge);
  const noMask    = colorDist(mouth, skin) < 62;            // mask = colour block over mouth/chin
  // Glasses: require BOTH elevated bridge edges AND a lens reflection, so a bare
  // face never trips it (catches "anything on the face" over the eyes).
  const glareFrac = Math.max(bridge.bright, eyes.bright);
  const noGlasses = !((bridge.edge / baseEdge) > 2.0 && glareFrac > 0.05);
  // Plain background = ONE uniform colour (any colour). Only the 4 corners being
  // similar to each other matters — brightness/texture don't. Rejects mixed /
  // cluttered backgrounds only.
  const plainBg   = bgSpread < 44;

  // Usability checks — applied in both modes.
  const baseChecks = [
    { key: "single",    label: "Only one person in frame",         pass: single },
    { key: "size",      label: "Face close enough to the camera",  pass: sizeOk },
    { key: "toobig",    label: "Face not too close to the camera", pass: notTooBig },
    { key: "sharp",     label: "Photo is sharp (not blurry)",      pass: sharp },
  ];
  // Appearance / anti-spoof checks — strict mode only.
  const strictChecks = strict
    ? [
        { key: "eyes",      label: "Eyes open, looking at camera",     pass: earOpen && frontal },
        { key: "nomask",    label: "Face uncovered — no mask",         pass: noMask },
        { key: "noglasses", label: "Nothing on the face — no glasses", pass: noGlasses },
        { key: "plainbg",   label: "Plain single-colour background",   pass: plainBg },
      ]
    : [];

  const checks: QualityCheck[] = [...baseChecks, ...strictChecks].map((c) => ({ ...c, hint: hintFor(c.key).hint }));

  const failed = checks.find((c) => !c.pass);
  const headline = failed ? hintFor(failed.key) : null;
  return {
    pass: !failed,
    checks,
    sharpness,
    reason: headline?.reason,
    hint: headline?.hint,
  };
}
