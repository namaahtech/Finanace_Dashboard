// Copies the face-api model weights from the main app's public/models into this
// worker's ./models folder, so the Docker build (context = this folder) can bundle
// them. Run once before building the image:  node copy-models.mjs
import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../../public/models");
const dst = path.resolve(here, "models");

if (!existsSync(src)) {
  console.error(`Source models not found at ${src}. Run this from worker/face-match inside the repo.`);
  process.exit(1);
}
await mkdir(dst, { recursive: true });
await cp(src, dst, { recursive: true });
console.log(`Copied face-api models → ${dst}`);
