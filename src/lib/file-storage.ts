// Server-side file storage helper.
//
// Files used to be written straight into Postgres as base64 data URLs in
// `mail_file_shares.storage_url`. That is expensive twice over: base64 inflates
// every file by ~33%, and the bytes then count against the (small) database
// quota AND against egress on every single read — a listing query that selected
// `*` shipped every file in the system out of the database.
//
// New uploads go to Supabase Storage and the row keeps only a short path.
// Reads still transparently support the legacy inline rows, so nothing breaks
// before/while the backfill runs (scripts/backfill-files-to-storage.mjs).

import { getSupabaseAdmin } from "@/lib/supabase";

// Private bucket — candidate KYC documents must never be publicly addressable.
// Served only through our own authenticated API routes.
export const FILE_BUCKET = "documents";

export interface StoredFileRow {
  storage_path?: string | null;
  storage_url?: string | null;
  file_type?: string | null;
  filename?: string | null;
}

export interface StoredFile {
  buffer: Buffer;
  contentType: string;
}

/** Strip anything that would be awkward or unsafe in an object key. */
function safeName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60) || "file";
  const ext = (name.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1] || "bin").toLowerCase();
  return `${base}.${ext}`;
}

/**
 * Upload a buffer to Supabase Storage.
 * Returns the object path on success, or null if Storage is unavailable — the
 * caller then falls back to the legacy inline data URL so an upload never fails
 * outright just because the bucket is misconfigured.
 */
export async function uploadToStorage(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder = "misc"
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(filename)}`;
    const { error } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(key, buffer, { contentType, upsert: false, cacheControl: "3600" });
    if (error) {
      console.error(`[file-storage] upload failed (bucket "${FILE_BUCKET}"):`, error.message);
      return null;
    }
    return key;
  } catch (e: any) {
    console.error("[file-storage] upload threw:", e?.message || e);
    return null;
  }
}

const DATA_URL_RE = /^data:([^;]+);base64,([\s\S]*)$/;

/**
 * Read a stored file, whichever way it was saved.
 * Prefers Storage (`storage_path`); falls back to a legacy inline data URL.
 */
export async function readStoredFile(row: StoredFileRow | null | undefined): Promise<StoredFile | null> {
  if (!row) return null;

  if (row.storage_path) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage.from(FILE_BUCKET).download(row.storage_path);
      if (!error && data) {
        return {
          buffer: Buffer.from(await data.arrayBuffer()),
          contentType: row.file_type || data.type || "application/octet-stream",
        };
      }
      console.error("[file-storage] download failed:", error?.message);
    } catch (e: any) {
      console.error("[file-storage] download threw:", e?.message || e);
    }
  }

  // Legacy: the whole file lives inline in the row as a base64 data URL.
  const m = (row.storage_url || "").match(DATA_URL_RE);
  if (m) return { buffer: Buffer.from(m[2], "base64"), contentType: m[1] || "application/octet-stream" };

  return null;
}

/** Same as readStoredFile but returns a `data:` URL — for the face-match worker. */
export async function readStoredFileAsDataUrl(row: StoredFileRow | null | undefined): Promise<string | null> {
  // Legacy rows already hold exactly this, so skip the round trip.
  if (row?.storage_url?.startsWith("data:")) return row.storage_url;
  const f = await readStoredFile(row);
  return f ? `data:${f.contentType};base64,${f.buffer.toString("base64")}` : null;
}

/** Remove an object from Storage. Safe to call with a null/legacy path. */
export async function deleteFromStorage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(FILE_BUCKET).remove([path]);
    if (error) console.error("[file-storage] delete failed:", error.message);
  } catch (e: any) {
    console.error("[file-storage] delete threw:", e?.message || e);
  }
}
