// Browser-local face verification using @vladmandic/face-api (FaceNet-style 128-D
// embeddings). No AI API, no token cost — the model runs in the candidate's browser
// against weights served from /models. face-api is dynamically imported so it never
// loads during SSR.

let faceapiMod: any = null;
let modelsLoaded = false;

async function getFaceApi(): Promise<any> {
  if (!faceapiMod) faceapiMod = await import("@vladmandic/face-api");
  return faceapiMod;
}

export async function loadFaceModels(): Promise<void> {
  const faceapi = await getFaceApi();
  if (modelsLoaded) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
  modelsLoaded = true;
}

export interface FaceResult {
  descriptor: Float32Array;
  score: number;
  box: { x: number; y: number; width: number; height: number };
  landmarks: any;
}

export async function detectFromImage(
  input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<{ faces: number; result: FaceResult | null }> {
  const faceapi = await getFaceApi();
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
  const all = await faceapi.detectAllFaces(input, opts).withFaceLandmarks().withFaceDescriptors();
  if (!all.length) return { faces: 0, result: null };
  const best = all
    .slice()
    .sort((a: any, b: any) => b.detection.box.width * b.detection.box.height - a.detection.box.width * a.detection.box.height)[0];
  return {
    faces: all.length,
    result: { descriptor: best.descriptor, score: best.detection.score, box: best.detection.box, landmarks: best.landmarks },
  };
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

export interface QualityCheck { key: string; label: string; pass: boolean }
export interface QualityResult { pass: boolean; checks: QualityCheck[]; sharpness: number }

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

interface RStat { r: number; g: number; b: number; lumaVar: number; edge: number; n: number }
function regionStat(data: Uint8ClampedArray, W: number, H: number, x0: number, y0: number, x1: number, y1: number): RStat {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(W, Math.ceil(x1));  y1 = Math.min(H, Math.ceil(y1));
  let r = 0, g = 0, b = 0, ls = 0, lss = 0, edge = 0, n = 0, en = 0;
  const step = Math.max(1, Math.floor(Math.min(x1 - x0, y1 - y0) / 40) || 1);
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
    const i = (y * W + x) * 4;
    const R = data[i], G = data[i + 1], B = data[i + 2];
    r += R; g += G; b += B;
    const lum = 0.299 * R + 0.587 * G + 0.114 * B;
    ls += lum; lss += lum * lum; n++;
    const xr = Math.min(W - 1, x + step);
    const j = (y * W + xr) * 4;
    const lum2 = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
    edge += Math.abs(lum - lum2); en++;
  }
  if (!n) return { r: 0, g: 0, b: 0, lumaVar: 0, edge: 0, n: 0 };
  const mean = ls / n;
  return { r: r / n, g: g / n, b: b / n, lumaVar: Math.max(0, lss / n - mean * mean), edge: en ? edge / en : 0, n };
}
function colorDist(a: RStat, b: RStat): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/**
 * Full photo-quality assessment for a captured face frame. Blur + single-face +
 * frontal + size are reliable; plain-background + glasses/mask/hat are heuristic
 * (cheek-skin reference vs region colour/texture).
 */
export function assessQuality(canvas: HTMLCanvasElement, result: FaceResult, faceCount: number): QualityResult {
  const W = canvas.width, H = canvas.height;
  const data = canvas.getContext("2d")!.getImageData(0, 0, W, H).data;
  const { x: fx, y: fy, width: fw, height: fh } = result.box;

  const skinL = regionStat(data, W, H, fx + 0.12 * fw, fy + 0.48 * fh, fx + 0.32 * fw, fy + 0.66 * fh);
  const skinR = regionStat(data, W, H, fx + 0.68 * fw, fy + 0.48 * fh, fx + 0.88 * fw, fy + 0.66 * fh);
  const skin: RStat = { r: (skinL.r + skinR.r) / 2, g: (skinL.g + skinR.g) / 2, b: (skinL.b + skinR.b) / 2, lumaVar: (skinL.lumaVar + skinR.lumaVar) / 2, edge: (skinL.edge + skinR.edge) / 2, n: skinL.n + skinR.n };
  const mouth    = regionStat(data, W, H, fx + 0.30 * fw, fy + 0.72 * fh, fx + 0.70 * fw, fy + 0.95 * fh);
  const eyes     = regionStat(data, W, H, fx + 0.18 * fw, fy + 0.30 * fh, fx + 0.82 * fw, fy + 0.50 * fh);
  const forehead = regionStat(data, W, H, fx + 0.28 * fw, fy + 0.04 * fh, fx + 0.72 * fw, fy + 0.20 * fh);
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
  const bgTexture = corners.reduce((s, c) => s + c.edge, 0) / 4;

  const single  = faceCount === 1;
  const frontal = isFrontal(result.landmarks);
  const sizeOk  = (fw * fh) / (W * H) > 0.05;
  const sharp   = laplacianVar(canvas) > 45;
  const baseEdge  = Math.max(4, skin.edge);                 // smooth-cheek edge baseline (lighting-normalised)
  const noMask    = colorDist(mouth, skin) < 62;            // mask = colour block over mouth/chin
  // Glasses: a bare nose bridge is smooth skin (edge ≈ cheek). A frame/bridge bar
  // there raises edges well above the cheek baseline; lens reflections add brightness.
  const noGlasses = (bridge.edge / baseEdge) < 1.7 && !(bridge.lumaVar > 240 && bridge.r > skin.r + 25);
  const noHat     = !(colorDist(forehead, skin) > 66 && forehead.lumaVar < 42); // flat non-skin forehead
  const plainBg   = bgSpread < 36 && bgTexture < 17;

  const checks: QualityCheck[] = [
    { key: "single",    label: "Only one person in frame",       pass: single },
    { key: "frontal",   label: "Looking straight at the camera",  pass: frontal },
    { key: "size",      label: "Face close enough to the camera", pass: sizeOk },
    { key: "sharp",     label: "Photo is sharp (not blurry)",     pass: sharp },
    { key: "nomask",    label: "Face uncovered — no mask",        pass: noMask },
    { key: "noglasses", label: "No glasses / spectacles",         pass: noGlasses },
    { key: "nohat",     label: "Head uncovered — no cap / hat",   pass: noHat },
    { key: "plainbg",   label: "Plain, uncluttered background",   pass: plainBg },
  ];
  return { pass: checks.every((c) => c.pass), checks, sharpness: laplacianVar(canvas) };
}
