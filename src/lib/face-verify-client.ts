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
