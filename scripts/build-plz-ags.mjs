// One-time generator: PLZ → AGS lookup from the OpenPLZ API (OSM-derived, free,
// CC-licensed). Output: public/plz-ags.json = { plz: [{ ort, ags, kreis, land }] }.
//   ags  = 8-digit Gemeindeschlüssel (municipality.key)
//   kreis = ags[:5] (= MaStR region_id), land = ags[:2]
// Multiple municipalities per PLZ → multiple entries (drives the "X oder Y?"
// disambiguation). Resumable: re-run continues where it left off.
//
// Run: node scripts/build-plz-ags.mjs   (throttled, polite to the free API)

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const PLZ_FILE = "public/plz.json";
const OUT_FILE = "public/plz-ags.json";
const CONCURRENCY = 5;
const RETRIES = 3;

const plz = Object.keys(JSON.parse(readFileSync(PLZ_FILE, "utf8")));
const out = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, "utf8")) : {};
const todo = plz.filter((p) => !(p in out));
console.log(`${plz.length} PLZ total, ${todo.length} todo, ${Object.keys(out).length} done`);

async function fetchPlz(p) {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const res = await fetch(`https://openplzapi.org/de/Localities?postalCode=${p}`);
      if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Dedupe by AGS — one PLZ can list several localities of the same Gemeinde.
      const byAgs = new Map();
      for (const e of data) {
        const ags = e?.municipality?.key;
        if (!ags) continue;
        if (!byAgs.has(ags)) {
          byAgs.set(ags, {
            ort: e.municipality.name,
            ags,
            kreis: e.district?.key ?? ags.slice(0, 5),
            land: e.federalState?.key ?? ags.slice(0, 2),
          });
        }
      }
      return Array.from(byAgs.values());
    } catch (err) {
      if (attempt === RETRIES - 1) { console.warn(`  ${p}: failed (${err.message})`); return null; }
      await sleep(500 * (attempt + 1));
    }
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let done = 0;
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  const batch = todo.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map((p) => fetchPlz(p)));
  batch.forEach((p, j) => { if (results[j]) out[p] = results[j]; });
  done += batch.length;
  if (done % 250 < CONCURRENCY) {
    writeFileSync(OUT_FILE, JSON.stringify(out));
    console.log(`  ${Object.keys(out).length}/${plz.length} written`);
  }
  await sleep(120);
}
writeFileSync(OUT_FILE, JSON.stringify(out));
console.log(`Done: ${Object.keys(out).length} PLZ → AGS written to ${OUT_FILE}`);
