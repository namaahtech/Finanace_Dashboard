import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readStoredFile } from "@/lib/file-storage";

// GET /api/mail/files/open?id=<uuid>
// Streams a single file's bytes — from Supabase Storage, or from a legacy inline
// base64 data URL — so Chrome opens it as a proper file (no "Not secure" /
// about:blank issues). This is the ONLY place file contents are read; the listing
// endpoint deliberately never selects them.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new NextResponse("Missing id", { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: file, error } = await supabase
    .from("mail_file_shares")
    .select("storage_path, storage_url, filename, file_type")
    .eq("id", id)
    .single();

  if (error || !file) return new NextResponse("File not found", { status: 404 });

  const { storage_url, filename, file_type } = file as {
    storage_path: string | null;
    storage_url: string | null;
    filename: string;
    file_type: string;
  };

  // A plain http(s) URL (not Storage-backed, not inline) — hand it straight over.
  if (storage_url && !storage_url.startsWith("data:") && !storage_url.startsWith("/")) {
    return NextResponse.redirect(storage_url);
  }

  // Storage-backed rows and legacy inline base64 rows both resolve here.
  const stored = await readStoredFile(file);
  if (!stored) return new NextResponse("No file content", { status: 404 });

  const mime = file_type || stored.contentType || "application/octet-stream";
  const buffer = stored.buffer;
  const safeFilename = encodeURIComponent(filename || "file");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        mime,
      "Content-Disposition": `inline; filename="${safeFilename}"`,
      "Content-Length":      String(buffer.length),
      "Cache-Control":       "private, max-age=3600",
    },
  });
}
