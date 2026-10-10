// Upload prepared landscape places to the scene bucket.
//   npx tsx --env-file=.env.local scripts/landscape-szenen-hochladen.ts [--root <dir>] [--nur <ags,ags>] [--cors]
// Every file of a place goes up gzip-compressed; unchanged files (same content hash) are skipped.
import { gzipSync } from "node:zlib";
import crypto from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { keysFromEnv, putCors, putObject, s3Request } from "../lib/hetzner-s3";
import { sceneDefekte } from "../lib/landscape-scene-check";

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const root = opt("--root") ?? "public/geo/landscape-tours";
const nur = opt("--nur")?.split(",");
const keys = keysFromEnv();

export const SZENEN_ORIGINS = ["https://solar-check.io", "https://www.solar-check.io", "http://localhost:*"];

async function uploadFile(local: string, key: string) {
  const raw = readFileSync(local);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const head = await s3Request(keys, "HEAD", key);
  if (head.ok && head.headers.get("x-amz-meta-sha256") === hash) return false;
  await putObject(keys, key, gzipSync(raw, { level: 9 }), {
    "content-type": key.endsWith(".json") ? "application/json" : "application/octet-stream",
    "content-encoding": "gzip",
    // Scenes are republished after repairs; an hour keeps that visible the same day.
    "cache-control": "public, max-age=3600",
    "x-amz-meta-sha256": hash,
  });
  return true;
}

async function main() {
  if (args.includes("--cors")) { await putCors(keys, SZENEN_ORIGINS); console.log("CORS set:", SZENEN_ORIGINS.join(", ")); }
  const places = readdirSync(root).filter(p => statSync(join(root, p)).isDirectory() && (!nur || nur.includes(p))).sort();
  // Gate: a place with an incomplete turbine or a tower duplicate is not published at all.
  const refused = places.flatMap(place => {
    const file = join(root, place, "scene.json");
    try { return sceneDefekte(JSON.parse(readFileSync(file, "utf8"))).map(d => `${place}: ${d}`); }
    catch { return [`${place}: scene.json missing or unreadable`]; }
  });
  if (refused.length) { console.error("Not published:\n" + refused.join("\n")); process.exit(1); }
  const jobs = places.flatMap(place => readdirSync(join(root, place)).filter(f => statSync(join(root, place, f)).isFile())
    .map(f => ({ local: join(root, place, f), key: `landscape-tours/${place}/${f}` })));
  let uploaded = 0, skipped = 0, next = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      if (await uploadFile(job.local, job.key)) uploaded++; else skipped++;
    }
  }));
  console.log(`${places.length} places, ${uploaded} files uploaded, ${skipped} unchanged`);
}

main().catch(error => { console.error(error); process.exit(1); });
