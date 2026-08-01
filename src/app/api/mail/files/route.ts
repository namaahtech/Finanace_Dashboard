import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { uploadToStorage, deleteFromStorage } from "@/lib/file-storage";

function guessContentType(fileName: string): string {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    bmp: "image/bmp", ico: "image/x-icon",
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    mkv: "video/x-matroska", webm: "video/webm",
    zip: "application/zip", rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed", tar: "application/x-tar", gz: "application/gzip",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain", csv: "text/csv", json: "application/json",
    xml: "application/xml", html: "text/html", md: "text/markdown",
  };
  return map[ext] || "application/octet-stream";
}

// Shape an uploaded row for the client. `storage_url` is rebuilt as a short link
// to the streaming endpoint instead of carrying the file's bytes, so the existing
// UI (thumbnails, preview, download) keeps working unchanged while the listing
// payload drops from megabytes to a few hundred bytes per row.
const toUploadRow = (f: any) => ({
  ...f,
  storage_url: `/api/mail/files/open?id=${f.id}`,
  source: "upload",
});

// scope: all | mine | shared | trash
export async function GET(req: NextRequest) {
  const supabase   = getSupabaseAdmin();
  const employeeId = req.nextUrl.searchParams.get("employee_id");
  const scope      = req.nextUrl.searchParams.get("scope") || "all";
  const userEmail  = req.nextUrl.searchParams.get("email") || "";

  // ── 1. Manual uploads ─────────────────────────────────────────
  // NOTE: `storage_url` is deliberately NOT selected. It holds the entire file as
  // a base64 data URL on legacy rows, so `select("*")` here shipped every file in
  // the system out of the database on every page load (~17 MB per request, which
  // was essentially the whole egress bill). Each row instead gets a tiny pointer
  // to /api/mail/files/open, and bytes are fetched only for what's actually shown.
  let query = supabase
    .from("mail_file_shares")
    .select(
      "id, filename, file_size, file_type, storage_path, shared_by, shared_with, expiry_at, download_count, is_active, created_at, external_from, sharer:employees!mail_file_shares_shared_by_fkey(id,name,designation)"
    )
    .order("created_at", { ascending: false });

  if (scope === "trash") {
    // Trash: soft-deleted manual uploads only
    query = query.eq("is_active", false);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      data: (data || []).map(toUploadRow),
    });
  }

  if (scope === "uploaded") {
    // Manually uploaded files only — no email attachments
    query = query.eq("is_active", true);
    if (employeeId) query = query.eq("shared_by", employeeId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      data: (data || []).map(toUploadRow),
    });
  }

  // Active files for all other scopes
  query = query.eq("is_active", true);

  if (scope === "mine" && employeeId) {
    query = query.eq("shared_by", employeeId);
  } else if (scope === "shared" && employeeId) {
    query = query.contains("shared_with", [employeeId]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const uploadedFiles = (data || []).map(toUploadRow);

  // ── 2. Email attachments from mail_messages.body ───────────────
  const emailFiles: any[] = [];

  let msgQuery = supabase
    .from("mail_messages")
    .select("id, employee_id, folder, zoho_message_id, body, received_at, subject, from_address")
    .eq("has_attachment", true)
    .not("body", "is", null)
    .order("received_at", { ascending: false })
    .limit(300);

  if (scope === "mine") {
    // Sent by me — use from_address when available (most reliable)
    if (userEmail) {
      msgQuery = msgQuery.ilike("from_address", `%${userEmail}%`);
    } else {
      msgQuery = msgQuery.ilike("folder", "Sent%");
    }
  } else if (scope === "shared") {
    // Received — not sent by me
    if (userEmail) {
      // Cast to any to avoid Supabase deep-generic type instantiation error
      msgQuery = (msgQuery as any).not("from_address", "ilike", `%${userEmail}%`);
    } else {
      msgQuery = msgQuery.ilike("folder", "Inbox%");
    }
  }

  const { data: msgData } = await msgQuery;

  for (const msg of msgData || []) {
    if (!msg.body) continue;
    const urlRegex = /href="(\/api\/mail\/attachments\?[^"]+)"/g;
    let match;
    while ((match = urlRegex.exec(msg.body)) !== null) {
      try {
        const urlStr = match[1];
        const qIdx = urlStr.indexOf("?");
        if (qIdx === -1) continue;
        const params = new URLSearchParams(urlStr.substring(qIdx + 1));
        const fileName    = decodeURIComponent(params.get("fileName") || "attachment");
        const messageId   = params.get("messageId") || "";
        const attachmentId = params.get("attachmentId") || "";
        const fileSize    = parseInt(params.get("fileSize") || "0", 10);
        if (!messageId || !attachmentId) continue;
        emailFiles.push({
          id:            `email_${messageId}_${attachmentId}`,
          filename:      fileName,
          file_size:     fileSize,
          file_type:     guessContentType(fileName),
          storage_url:   urlStr,
          shared_by:     msg.employee_id,
          shared_with:   null,
          expiry_at:     null,
          download_count: 0,
          is_active:     true,
          created_at:    msg.received_at,
          source:        "email",
          sharer:        null,
          subject:       msg.subject,
          from_address:  msg.from_address,
          folder:        msg.folder,
        });
      } catch (_) {}
    }
  }

  // ── 3. Deduplicate & merge ────────────────────────────────────
  const uploadedIds = new Set(uploadedFiles.map((f: any) => f.id));
  const seenEmail   = new Set<string>();
  const uniqueEmail = emailFiles.filter(f => {
    if (uploadedIds.has(f.id) || seenEmail.has(f.id)) return false;
    seenEmail.add(f.id);
    return true;
  });

  const combined = [...uploadedFiles, ...uniqueEmail];
  combined.sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
  return NextResponse.json({ data: combined });
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const formData = await req.formData();
  const file        = formData.get("file")        as File | null;
  const sharedWith  = formData.get("shared_with") as string;
  const expiryAt    = formData.get("expiry_at")   as string;
  const email       = (formData.get("email")       as string || "").trim();
  let   employeeId  =  formData.get("employee_id") as string || "";

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum allowed size is 10 MB." },
      { status: 413 }
    );
  }

  // If client didn't send employee_id, resolve it server-side from email
  // (admin client bypasses RLS — works even when browser client is blocked)
  if (!employeeId && email) {
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    employeeId = emp?.id || "";
  }

  if (!employeeId) {
    return NextResponse.json(
      { error: "Could not identify your employee account. Please contact your admin." },
      { status: 403 }
    );
  }

  // Bytes go to Supabase Storage; the row keeps only the object path. Files used
  // to be inlined here as base64 data URLs, which charged the database quota ~1.33×
  // the file size and made every listing read ship the contents.
  const mimeType = file.type || guessContentType(file.name);
  const buffer   = Buffer.from(await file.arrayBuffer());
  const storagePath = await uploadToStorage(buffer, file.name, mimeType, "file-share");

  const { data, error } = await supabase
    .from("mail_file_shares")
    .insert({
      shared_by:    employeeId,
      filename:     file.name,
      file_size:    file.size,
      file_type:    mimeType,
      storage_path: storagePath || "",
      // Fall back to the legacy inline form only if Storage is unavailable, so an
      // upload never hard-fails on a bucket misconfiguration.
      storage_url:  storagePath ? null : `data:${mimeType};base64,${buffer.toString("base64")}`,
      shared_with:  sharedWith ? JSON.parse(sharedWith) : null,
      expiry_at:    expiryAt || null,
    })
    .select("id, filename, file_size, file_type, storage_path, shared_by, shared_with, expiry_at, download_count, is_active, created_at")
    .single();

  if (error) {
    const friendly = error.message?.includes("not-null")
      ? "Upload failed: a required field is missing. Please contact your admin."
      : error.message?.includes("foreign key") || error.message?.includes("violates")
        ? "Upload failed: employee account not linked. Please contact your admin."
        : "Upload failed. Please try again.";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
  // Return the streaming link rather than the file's bytes.
  const url = `/api/mail/files/open?id=${data.id}`;
  return NextResponse.json({ data: { ...data, storage_url: url, source: "upload" }, url });
}

// PATCH — restore a soft-deleted file
export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("mail_file_shares")
    .update({ is_active: true })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE — soft delete by default; permanent=true removes from storage + DB
export async function DELETE(req: NextRequest) {
  const supabase  = getSupabaseAdmin();
  const id        = req.nextUrl.searchParams.get("id");
  const permanent = req.nextUrl.searchParams.get("permanent") === "true";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (permanent) {
    const { data: file } = await supabase
      .from("mail_file_shares").select("storage_path").eq("id", id).single();
    // Was removing from a bucket named "mail-files", which does not exist in this
    // project — so the object was never actually deleted. Files now live in the
    // shared FILE_BUCKET; legacy inline rows have no object and the DB row delete
    // below is what reclaims their space.
    await deleteFromStorage(file?.storage_path);
    const { error } = await supabase.from("mail_file_shares").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Soft delete — keep storage so restore is possible
  const { error } = await supabase
    .from("mail_file_shares").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
