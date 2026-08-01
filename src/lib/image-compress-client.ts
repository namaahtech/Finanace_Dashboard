// Client-side image compression, run before ANY document leaves the browser.
//
// Documents are stored inline in the database as base64 data URLs, and base64
// inflates bytes by ~33% — so an uncompressed 4 MB phone photo becomes a ~5.3 MB
// text column. Everything is therefore downscaled + re-encoded here until it fits
// a KB-scale budget, which keeps the DB small and makes uploads fast on mobile data.
//
// Pure canvas work: no library, no upload, no cost. Non-images (PDFs) pass through
// untouched — the server enforces the hard ceiling for those.

export interface CompressOptions {
  /** Longest edge of the output image, in pixels. */
  maxDim: number;
  /** Byte budget to land under. Quality is stepped down until the blob fits. */
  targetBytes: number;
  /** Lowest JPEG quality we'll accept before giving up on further shrinking. */
  minQuality?: number;
}

export interface CompressResult {
  file: File;
  originalBytes: number;
  bytes: number;
  width: number;
  height: number;
  /** False when the input wasn't a compressible image and was passed through. */
  compressed: boolean;
}

// Profiles per document type. Face images only feed a 128-D embedding + pixel
// quality checks, so 900px is far more than enough; ID cards keep a little more
// detail so the printed numbers stay legible to a human reviewer.
export const COMPRESS_PROFILES: Record<string, CompressOptions> = {
  face_photo:    { maxDim: 900,  targetBytes: 220 * 1024 },
  profile_photo: { maxDim: 900,  targetBytes: 220 * 1024 },
  aadhaar:       { maxDim: 1400, targetBytes: 400 * 1024 },
  pan:           { maxDim: 1400, targetBytes: 400 * 1024 },
};
export const DEFAULT_PROFILE: CompressOptions = { maxDim: 1400, targetBytes: 400 * 1024 };

export function profileFor(docType: string): CompressOptions {
  return COMPRESS_PROFILES[docType] || DEFAULT_PROFILE;
}

function loadBitmap(file: File): Promise<{ src: CanvasImageSource; width: number; height: number; close: () => void }> {
  // createImageBitmap is much faster than an <img> decode and avoids a layout pass.
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).then((bmp) => ({
      src: bmp,
      width: bmp.width,
      height: bmp.height,
      close: () => bmp.close?.(),
    }));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      resolve({
        src: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        close: () => URL.revokeObjectURL(url),
      });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Downscale + re-encode an image so it lands under `targetBytes`.
 * Quality is stepped down first; if that isn't enough the pixels are halved and
 * the sweep repeats, so even huge camera originals converge to a KB-scale file.
 */
export async function compressImage(file: File, opts: CompressOptions): Promise<CompressResult> {
  const originalBytes = file.size;
  const passthrough = (): CompressResult => ({
    file, originalBytes, bytes: originalBytes, width: 0, height: 0, compressed: false,
  });

  if (!file.type.startsWith("image/")) return passthrough();

  let bmp: Awaited<ReturnType<typeof loadBitmap>>;
  try {
    bmp = await loadBitmap(file);
  } catch {
    return passthrough(); // undecodable — let the server's cap deal with it
  }

  try {
    const minQuality = opts.minQuality ?? 0.55;
    let scale = Math.min(1, opts.maxDim / Math.max(bmp.width, bmp.height));
    let best: { blob: Blob; w: number; h: number } | null = null;

    // Up to 3 size passes; within each, walk the quality ladder down.
    for (let pass = 0; pass < 3; pass++) {
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return passthrough();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp.src, 0, 0, w, h);

      for (const q of [0.86, 0.78, 0.7, 0.62, minQuality]) {
        if (q < minQuality) break;
        const blob = await toBlob(canvas, q);
        if (!blob) break;
        // Keep the smallest thing we've produced, so we always return *something*.
        if (!best || blob.size < best.blob.size) best = { blob, w, h };
        if (blob.size <= opts.targetBytes) {
          return finish(best!, file, originalBytes);
        }
      }
      scale *= 0.7; // still too big — drop the resolution and sweep again
    }

    if (!best) return passthrough();
    return finish(best, file, originalBytes);
  } finally {
    bmp.close();
  }
}

function finish(best: { blob: Blob; w: number; h: number }, original: File, originalBytes: number): CompressResult {
  // Never hand back something larger than we were given.
  if (best.blob.size >= originalBytes && original.type === "image/jpeg") {
    return { file: original, originalBytes, bytes: originalBytes, width: best.w, height: best.h, compressed: false };
  }
  const name = original.name.replace(/\.[^.]+$/, "") + ".jpg";
  return {
    file: new File([best.blob], name, { type: "image/jpeg" }),
    originalBytes,
    bytes: best.blob.size,
    width: best.w,
    height: best.h,
    compressed: true,
  };
}

/** Convenience wrapper keyed by document type. */
export function compressForDoc(file: File, docType: string): Promise<CompressResult> {
  return compressImage(file, profileFor(docType));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
