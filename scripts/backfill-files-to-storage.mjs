// One-time backfill: move files that live INSIDE the database (as base64 data
// URLs in mail_file_shares.storage_url) into Supabase Storage, leaving only a
// short object path on the row.
//
//   node scripts/backfill-files-to-storage.mjs --dry-run   # report only
//   node scripts/backfill-files-to-storage.mjs             # actually migrate
//
// Safe to re-run: rows that already have a storage_path are skipped, and the row
// is only cleared AFTER the object is confirmed uploaded. Read paths understand
// both formats, so the app keeps working at every point during the migration.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const l = line.trim();
  if (!l || l.startsWith("#")) continue;
  const p = l.split("=");
  if (p.length < 2) continue;
  let v = p.slice(1).join("=").trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[p[0].trim()] = v;
}

const DRY = process.argv.includes("--dry-run");
const BUCKET = "documents";
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;

function safeName(name) {
  const base = String(name).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60) || "file";
  const ext = (String(name).match(/\.([a-zA-Z0-9]{1,8})$/)?.[1] || "bin").toLowerCase();
  return `${base}.${ext}`;
}

const { data: rows, error } = await supabase
  .from("mail_file_shares")
  .select("id, filename, file_type, storage_path, storage_url, created_at")
  .order("created_at", { ascending: true });

if (error) { console.error("Query failed:", error.message); process.exit(1); }

const pending = (rows || []).filter((r) => !r.storage_path && (r.storage_url || "").startsWith("data:"));
const totalBytes = pending.reduce((s, r) => s + r.storage_url.length, 0);

console.log(`\n${rows.length} rows total · ${pending.length} still inline · ${mb(totalBytes)} to move`);
if (DRY) {
  for (const r of pending) console.log(`  would move  ${mb(r.storage_url.length).padStart(9)}  ${r.filename}`);
  console.log("\nDry run — nothing changed. Re-run without --dry-run to migrate.\n");
  process.exit(0);
}
if (!pending.length) { console.log("Nothing to do.\n"); process.exit(0); }

let ok = 0, failed = 0, moved = 0;
for (const r of pending) {
  const m = r.storage_url.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!m) { console.log(`  SKIP (unparseable)  ${r.filename}`); failed++; continue; }

  const contentType = m[1] || r.file_type || "application/octet-stream";
  const buffer = Buffer.from(m[2], "base64");
  const key = `backfill/${new Date(r.created_at).getTime()}-${r.id.slice(0, 8)}-${safeName(r.filename)}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType, upsert: true, cacheControl: "3600" });
  if (upErr) { console.log(`  FAIL upload  ${r.filename}: ${upErr.message}`); failed++; continue; }

  // Only drop the inline copy once the object is safely uploaded.
  const { error: updErr } = await supabase
    .from("mail_file_shares")
    .update({ storage_path: key, storage_url: null })
    .eq("id", r.id);
  if (updErr) { console.log(`  FAIL update  ${r.filename}: ${updErr.message}`); failed++; continue; }

  ok++; moved += r.storage_url.length;
  console.log(`  moved  ${mb(r.storage_url.length).padStart(9)}  ${r.filename}`);
}

console.log(`\nDone: ${ok} moved, ${failed} failed. Reclaimed ~${mb(moved)} of database space.`);
console.log("Note: Postgres reclaims the space on autovacuum; run VACUUM FULL for it to show immediately.\n");
