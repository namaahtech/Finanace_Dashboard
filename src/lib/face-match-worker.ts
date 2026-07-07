// Client for the optional standalone face-match worker (worker/face-match), which
// does TRUE server-side face extraction under tfjs-node on a container host. When
// FACE_MATCH_WORKER_URL is set, the e-sign verify route forwards the reference +
// live images here and uses the returned verdict as authoritative. When unset, the
// app falls back to its in-app encrypted-template descriptor comparison.

export interface WorkerVerdict {
  matched: boolean;
  distance: number;
  similarity: number;
  refFaces: number;
  liveFaces: number;
}

export function faceMatchWorkerConfigured(): boolean {
  return !!process.env.FACE_MATCH_WORKER_URL;
}

export async function matchViaWorker(referenceImage: string, liveImage: string): Promise<WorkerVerdict | null> {
  const base = process.env.FACE_MATCH_WORKER_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": process.env.FACE_MATCH_WORKER_SECRET || "",
      },
      body: JSON.stringify({ referenceImage, liveImage }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const j: any = await res.json().catch(() => null);
    if (!j?.ok) return null;
    return {
      matched: !!j.matched,
      distance: Number(j.distance),
      similarity: Number(j.similarity),
      refFaces: Number(j.refFaces) || 0,
      liveFaces: Number(j.liveFaces) || 0,
    };
  } catch {
    return null;
  }
}
