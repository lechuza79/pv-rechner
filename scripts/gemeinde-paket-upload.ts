/**
 * Publish a package edition to Supabase Storage (bucket `gemeinde-pakete`,
 * private), one Brotli-compressed object per town: `<ags>.json.br`.
 *
 *   npx tsx scripts/gemeinde-paket-upload.ts --stand=2026-09-10 [--nur=<ags,…>]
 *
 * Reads scripts/.cache/gemeinde-pakete/<edition>/, uploads with upsert, six at
 * a time (the storage shares the project with the database). Writes nothing
 * but the objects; the page reads them through lib/gemeinde-paket-server.ts.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, constants } from "node:zlib";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const BUCKET = "gemeinde-pakete";
const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const stand = arg("stand");
if (!stand) throw new Error("--stand=<edition> fehlt");
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("Supabase-Zugang fehlt");
const kopf = { apikey: key, Authorization: `Bearer ${key}` };

async function bucket() {
  const r = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers: kopf });
  if (r.ok) return;
  const c = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...kopf, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  });
  if (!c.ok) throw new Error(`Bucket anlegen: ${c.status} ${await c.text()}`);
}

async function main() {
  const dir = path.join("scripts/.cache/gemeinde-pakete", stand!);
  const nur = arg("nur")?.split(",");
  const dateien = (await readdir(dir)).filter((f) => /^\d{8}\.json$/.test(f) && (!nur || nur.includes(f.slice(0, 8))));
  await bucket();
  let fertig = 0,
    fehler = 0,
    bytes = 0;
  const warteschlange = [...dateien];
  async function arbeiter() {
    for (;;) {
      const f = warteschlange.shift();
      if (!f) return;
      const roh = await readFile(path.join(dir, f));
      const br = brotliCompressSync(roh, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } });
      let ok = false;
      for (let versuch = 0; versuch < 4 && !ok; versuch++) {
        const r = await fetch(`${url}/storage/v1/object/${BUCKET}/${f}.br`, {
          method: "POST",
          headers: { ...kopf, "Content-Type": "application/octet-stream", "x-upsert": "true", "Cache-Control": "no-cache" },
          body: br,
        }).catch(() => null);
        ok = !!r?.ok;
        if (!ok) await new Promise((w) => setTimeout(w, 1000 * (versuch + 1)));
      }
      if (ok) {
        fertig++;
        bytes += br.length;
      } else {
        fehler++;
        console.error("Fehlgeschlagen:", f);
      }
      if ((fertig + fehler) % 500 === 0) console.log(`${fertig + fehler}/${dateien.length} …`);
    }
  }
  await Promise.all(Array.from({ length: 6 }, arbeiter));
  console.log(`hochgeladen ${fertig}, fehlgeschlagen ${fehler}, ${(bytes / 1e6).toFixed(0)} MB`);
  if (fehler) process.exit(1);
}
main();
