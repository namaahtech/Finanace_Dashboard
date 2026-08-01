// Read-only database size report — what is actually consuming the Supabase quota.
// Prints table sizes, row counts, and how much of it is inline base64 file content.
// No data values are printed, only aggregates.  Run: node scripts/db-size-report.mjs
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const mb = (n) => `${(Number(n) / 1048576).toFixed(2)} MB`;

async function count(table, filter) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: c, error } = await q;
  return error ? `err: ${error.message}` : c;
}

console.log("\n═══ ROW COUNTS ═══");
for (const t of [
  "mail_file_shares", "candidate_documents", "candidate_document_requests",
  "onboarding_packets", "employees", "audit_log",
]) {
  console.log(`  ${t.padEnd(30)} ${await count(t)}`);
}

console.log("\n═══ mail_file_shares BREAKDOWN ═══");
const active = await count("mail_file_shares", (q) => q.eq("is_active", true));
const inactive = await count("mail_file_shares", (q) => q.eq("is_active", false));
console.log(`  active                         ${active}`);
console.log(`  soft-deleted (is_active=false) ${inactive}   <- reclaimable`);

// Measure inline base64 payload without printing any of it.
const { data: rows, error } = await supabase
  .from("mail_file_shares")
  .select("id, filename, file_size, storage_path, storage_url, is_active, created_at");
if (error) {
  console.log("  ERROR:", error.message);
} else {
  let inlineBytes = 0, inlineCount = 0, pathBytes = 0, pathCount = 0, deadBytes = 0;
  for (const r of rows) {
    const u = r.storage_url || "";
    if (u.startsWith("data:")) {
      inlineCount++; inlineBytes += u.length;
      if (r.is_active === false) deadBytes += u.length;
    } else if (r.storage_path) { pathCount++; pathBytes += u.length; }
  }
  console.log(`\n  stored INLINE as base64 in DB : ${inlineCount} files, ${mb(inlineBytes)}`);
  console.log(`  stored as Storage path        : ${pathCount} files, ${mb(pathBytes)}`);
  console.log(`  inline bytes in DELETED rows  : ${mb(deadBytes)}  <- immediately reclaimable`);
  console.log(`\n  >> Every File Share page load currently transfers ~${mb(inlineBytes)} of egress.`);

  // What the same files would cost if moved to Supabase Storage (path string only).
  const asPaths = rows.length * 120; // ~120 chars for a bucket path
  console.log(`  >> Same rows if migrated to Storage: ~${mb(asPaths)} in DB (${(inlineBytes / Math.max(asPaths, 1)).toFixed(0)}x smaller)`);
}

console.log("\n═══ CANDIDATE DOC TYPES ═══");
const { data: docs } = await supabase.from("candidate_documents").select("document_type, file_size");
const byType = {};
for (const d of docs || []) {
  byType[d.document_type] ??= { n: 0, bytes: 0 };
  byType[d.document_type].n++;
  byType[d.document_type].bytes += d.file_size || 0;
}
for (const [k, v] of Object.entries(byType)) {
  console.log(`  ${k.padEnd(16)} ${String(v.n).padStart(3)} files   ${mb(v.bytes).padStart(10)}   avg ${mb(v.bytes / v.n)}`);
}
console.log("");
