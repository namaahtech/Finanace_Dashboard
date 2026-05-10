import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const BUCKET = "mail-files";

export async function GET(req: NextRequest) {
  const supabase   = getSupabaseAdmin();
  const employeeId = req.nextUrl.searchParams.get("employee_id");
  const scope      = req.nextUrl.searchParams.get("scope") || "all"; // all | mine | shared

  let query = supabase
    .from("mail_file_shares")
    .select("*, sharer:employees!mail_file_shares_shared_by_fkey(id,name,designation)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (scope === "mine" && employeeId) {
    query = query.eq("shared_by", employeeId);
  } else if (scope === "shared" && employeeId) {
    query = query.contains("shared_with", [employeeId]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const formData = await req.formData();

  const file       = formData.get("file")        as File | null;
  const employeeId = formData.get("employee_id") as string;
  const sharedWith = formData.get("shared_with") as string;
  const expiryAt   = formData.get("expiry_at")   as string;

  if (!file || !employeeId) {
    return NextResponse.json({ error: "File and employee_id are required." }, { status: 400 });
  }

  const ext      = file.name.split(".").pop();
  const path     = `${employeeId}/${Date.now()}.${ext}`;
  const buffer   = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const sharedWithArr = sharedWith
    ? JSON.parse(sharedWith)
    : null;

  const { data, error } = await supabase
    .from("mail_file_shares")
    .insert({
      shared_by:    employeeId,
      filename:     file.name,
      file_size:    file.size,
      file_type:    file.type,
      storage_path: path,
      storage_url:  publicUrl,
      shared_with:  sharedWithArr,
      expiry_at:    expiryAt || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, url: publicUrl });
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const id       = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: file } = await supabase
    .from("mail_file_shares")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (file?.storage_path) {
    await supabase.storage.from(BUCKET).remove([file.storage_path]);
  }

  const { error } = await supabase
    .from("mail_file_shares")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
