# Namaah e-sign face-match worker

Standalone Node service that performs **true server-side face verification** for the
e-sign gate. The face-recognition CNN runs *here* (under `@tensorflow/tfjs-node`),
so the identity match no longer trusts the browser — the main app just forwards the
candidate's reference selfie + the live capture and gets back a verdict.

- No image is stored — each request decodes, describes, compares, and discards.
- Same model + threshold as the app (`face-api` TinyFaceDetector + FaceNet, euclidean ≤ 0.55).

## Why this is a separate service (not a Vercel function)

The main app is on **serverless** (Vercel). Serverless **cannot** reliably run this:

- `@tensorflow/tfjs-node` ships a **native binary** that doesn't bundle cleanly into a
  Lambda/Vercel function.
- The model (~7 MB) would reload on every **cold start**, and CPU inference (no GPU on
  Vercel) is multi-second — it would routinely hit the function timeout.

So it must run on a **container host that stays warm**. Vercel stays as-is for the app;
only this worker moves.

## Endpoints

- `GET /health` → `{ ok, ready }`
- `POST /match` (header `x-worker-secret: <WORKER_SECRET>`)
  body `{ "referenceImage": "<base64|dataURL>", "liveImage": "<base64|dataURL>" }`
  → `{ ok, matched, distance, similarity, refFaces, liveFaces }`

## Env

| var | purpose |
|---|---|
| `WORKER_SECRET` | shared secret; must equal the app's `FACE_MATCH_WORKER_SECRET` |
| `MATCH_MAX_DISTANCE` | optional, default `0.55` |
| `PORT` | optional, default `8080` |
| `MODELS_DIR` | optional, default `./models` |

## Build & run locally

```bash
cd worker/face-match
node copy-models.mjs        # copies ../../public/models -> ./models
npm install
WORKER_SECRET=dev-secret npm start
# test:
curl localhost:8080/health
```

## Deploy (pick one container host)

**Google Cloud Run (recommended — scales to zero, pay per use, generous timeout):**
```bash
cd worker/face-match
node copy-models.mjs
gcloud run deploy face-match \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 1Gi --cpu 1 --timeout 60 \
  --set-env-vars WORKER_SECRET=<long-random-secret>
# → prints a https URL
```

**Render / Railway / Fly.io** — create a service from the `Dockerfile` in this folder,
set `WORKER_SECRET`, and note the public URL. (Run `node copy-models.mjs` first so
`./models` exists in the build context.)

## Connect the main app

In the Vercel project env (and `.env.local` for dev):

```
FACE_MATCH_WORKER_URL=https://<your-worker-url>
FACE_MATCH_WORKER_SECRET=<same value as WORKER_SECRET>
```

When these are set, `/api/sign/[token]/verify` calls this worker and uses its verdict
as the **authoritative** face decision. When unset, the app falls back to the in-app
encrypted-template descriptor comparison. Either way signing stays fail-closed.
