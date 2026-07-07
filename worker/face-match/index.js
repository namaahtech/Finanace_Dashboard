// ── Namaah e-sign face-match worker ──────────────────────────────────────────
// TRUE server-side face verification: the CNN runs HERE (under @tensorflow/tfjs-node),
// so the match no longer trusts the browser. The main Vercel app POSTs two images
// (the candidate's reference selfie + the live capture); this service extracts a
// 128-D descriptor from each with face-api and returns the distance + verdict.
//
// Deploy on a CONTAINER host (Cloud Run / Render / Railway / Fly) — NOT serverless.
// Serverless can't reliably ship tfjs-node's native binary and would time out
// loading the model on every cold start. See README.md.
//
// No image is persisted — buffers are decoded, described, and discarded per request.

const express = require("express");
// The package main is the Node build, which binds to @tensorflow/tfjs-node.
const faceapi = require("@vladmandic/face-api");
const canvas = require("@napi-rs/canvas");

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const PORT = process.env.PORT || 8080;
const SECRET = process.env.WORKER_SECRET || "";
const MODELS_DIR = process.env.MODELS_DIR || "./models";
// Same threshold as the client/app (face-api euclidean ≤0.55 ≈ strict same person).
const MATCH_MAX_DISTANCE = Number(process.env.MATCH_MAX_DISTANCE || 0.55);

const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });

let ready = false;
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_DIR);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_DIR);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_DIR);
  ready = true;
  console.log(`[worker] models loaded from ${MODELS_DIR}`);
}

function toBuffer(input) {
  if (typeof input !== "string" || !input) return null;
  const m = input.match(/^data:[^;]+;base64,([\s\S]+)$/);
  const b64 = m ? m[1] : input;
  try { return Buffer.from(b64, "base64"); } catch { return null; }
}

async function describe(buffer) {
  const tf = faceapi.tf;
  let tensor = null;
  try {
    tensor = tf.node.decodeImage(buffer, 3);
    const det = await faceapi.detectSingleFace(tensor, options).withFaceLandmarks().withFaceDescriptor();
    return det ? { descriptor: det.descriptor, count: 1 } : { descriptor: null, count: 0 };
  } finally {
    if (tensor) tensor.dispose();
  }
}

function euclidean(a, b) { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; } return Math.sqrt(s); }
function cosine(a, b) { let dot = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1); }

const app = express();
app.use(express.json({ limit: "12mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, ready }));

app.post("/match", async (req, res) => {
  if (SECRET && req.get("x-worker-secret") !== SECRET) return res.status(401).json({ ok: false, error: "unauthorized" });
  if (!ready) return res.status(503).json({ ok: false, error: "models not ready yet" });

  const refBuf = toBuffer(req.body && req.body.referenceImage);
  const liveBuf = toBuffer(req.body && req.body.liveImage);
  if (!refBuf || !liveBuf) return res.status(400).json({ ok: false, error: "referenceImage and liveImage (base64 / data URL) are required" });

  try {
    const ref = await describe(refBuf);
    const live = await describe(liveBuf);
    if (!ref.descriptor || !live.descriptor) {
      return res.json({ ok: true, matched: false, distance: 1, similarity: 0, refFaces: ref.count, liveFaces: live.count, reason: "face not detected" });
    }
    const distance = euclidean(ref.descriptor, live.descriptor);
    const similarity = cosine(ref.descriptor, live.descriptor);
    res.json({
      ok: true,
      matched: distance <= MATCH_MAX_DISTANCE,
      distance: Math.round(distance * 1000) / 1000,
      similarity: Math.round(similarity * 1000) / 1000,
      refFaces: ref.count,
      liveFaces: live.count,
    });
  } catch (e) {
    console.error("[worker] /match error:", e);
    res.status(500).json({ ok: false, error: e.message || "match failed" });
  }
});

loadModels().catch((e) => console.error("[worker] model load failed:", e));
app.listen(PORT, () => console.log(`[worker] face-match listening on :${PORT}`));
