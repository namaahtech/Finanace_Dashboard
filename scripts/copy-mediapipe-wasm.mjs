// Copies the MediaPipe tasks-vision WASM runtime out of node_modules into
// public/mediapipe/wasm so it is served from our own origin instead of a CDN.
// The copied files are committed; re-run this after bumping @mediapipe/tasks-vision.
//
//   node scripts/copy-mediapipe-wasm.mjs
//
// Only the two variants FilesetResolver actually loads are copied (SIMD and the
// no-SIMD fallback); the `*_module_*` builds are for ES-module workers and unused.
import { mkdir, copyFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dest = join(root, "public", "mediapipe", "wasm");

const FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

await mkdir(dest, { recursive: true });
let total = 0;
for (const f of FILES) {
  await copyFile(join(src, f), join(dest, f));
  total += (await stat(join(dest, f))).size;
}
console.log(`[mediapipe] copied ${FILES.length} files (${(total / 1024 / 1024).toFixed(1)} MB) → public/mediapipe/wasm`);
