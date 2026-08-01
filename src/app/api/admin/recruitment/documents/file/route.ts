import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readStoredFile } from "@/lib/file-storage";

// Serve a single uploaded candidate document inline (opens in a new browser tab).
// The bytes live as a base64 data URL on the linked mail_file_shares row.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: doc } = await supabase
    .from("candidate_documents")
    .select("filename, file_type, file_share_id")
    .eq("id", id)
    .maybeSingle();

  if (!doc || !doc.file_share_id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: share } = await supabase
    .from("mail_file_shares")
    .select("storage_path, storage_url, file_type")
    .eq("id", doc.file_share_id)
    .maybeSingle();

  const file = await readStoredFile(share);
  if (!file) return NextResponse.json({ error: "File unavailable" }, { status: 404 });

  const contentType = file.contentType || doc.file_type || "application/octet-stream";
  const buffer = file.buffer;

  // HTTP headers are Latin-1 only — strip non-ASCII (e.g. the em dash in the
  // stored name) for the plain filename, and use RFC 5987 for the real one.
  const rawName = doc.filename || "document";
  const asciiName = rawName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const utf8Name = encodeURIComponent(rawName);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      // Document thumbnails are re-rendered on every visit to the tracker; an
      // hour of private caching stops each one being pulled from storage again.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
