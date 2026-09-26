/**
 * Today's (and tomorrow's) solar output curve for the 16 Länder and
 * Deutschland, from the hourly weather snapshot (lib/region-solar-day.ts).
 *
 *   npm run wetter:regionen             reads the snapshot, writes regionen/solartag.json
 *   npm run wetter:regionen -- --trocken computes and prints, writes nothing
 *
 * Runs in the hourly weather workflow right after `wetter:schnappschuss`, which
 * leaves its files on disk (`--auch-lokal`); set WEATHER_SNAPSHOT_DIR to that
 * folder and nothing is downloaded. Without it the 96 files come from storage.
 * No weather service is called: the curves use exactly the snapshot the district
 * route and the live gauge use.
 *
 * Town lists come from the Bundesland packages of the current district
 * generation. Without them (not yet built) every Land is written "unavailable",
 * never an empty curve.
 */
import { loadEnvConfig } from "@next/env";
import { readFileSync, readdirSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";

loadEnvConfig(process.cwd());
const trocken = process.argv.includes("--trocken");

async function main() {
  const { SNAPSHOT_BUCKET } = await import("../lib/icon-d2");
  const { GEMEINDE_PAKET_BUCKET } = await import("../lib/gemeinde-paket-server");
  const { DISTRICT_POINTER_PATH, checkManifest } = await import("../lib/district-package");
  const { REGION_PACKAGE_VERSION } = await import("../lib/region-package");
  const { REGION_SOLAR_DAY_PATH, REGION_SOLAR_DAY_VERSION, REGION_IDS, mergeDays, regionDay } = await import("../lib/region-solar-day");
  const { gemeindeWetterpunkt } = await import("../lib/atlas-geo");
  const { berlinTagesgrenzen, heuteInBerlin } = await import("../lib/zeit");
  type Shard = import("../lib/icon-d2").IconD2Shard;
  type Site = import("../lib/district-package").DistrictSite;
  type DayFile = import("../lib/region-solar-day").RegionSolarDayFile;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase-Zugang fehlt");
  const kopf = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async (bucket: string, path: string): Promise<Buffer | null> => {
    const r = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, { headers: { ...kopf, "Cache-Control": "no-cache" } });
    if (r.status === 400 || r.status === 404) return null;
    if (!r.ok) throw new Error(`${bucket}/${path}: HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  };

  // Weather: the snapshot this hour's job just wrote.
  const shards = new Map<string, Shard>();
  const dir = process.env.WEATHER_SNAPSHOT_DIR;
  if (dir) for (const f of readdirSync(dir).filter((n) => /^\d\d\.json$/.test(n))) shards.set(f.slice(0, 2), JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
  else {
    const list = await fetch(`${url}/storage/v1/object/list/${SNAPSHOT_BUCKET}`, { method: "POST", headers: { ...kopf, "Content-Type": "application/json" }, body: JSON.stringify({ prefix: "icon-d2", limit: 1000 }) });
    for (const { name } of (await list.json()) as { name: string }[]) {
      if (!/^\d\d\.json$/.test(name)) continue;
      const b = await get(SNAPSHOT_BUCKET, `icon-d2/${name}`);
      if (b) shards.set(name.slice(0, 2), JSON.parse(b.toString("utf8")));
    }
  }
  if (!shards.size) throw new Error("Kein Wetter-Schnappschuss gefunden — nichts geschrieben");
  const newest = [...shards.values()].sort((a, b) => b.runInit.localeCompare(a.runInit))[0];

  // Towns: the Bundesland packages of the current generation.
  const pointerRaw = await get(GEMEINDE_PAKET_BUCKET, DISTRICT_POINTER_PATH);
  const manifest = pointerRaw ? JSON.parse(pointerRaw.toString("utf8")) : null;
  const generation = manifest && checkManifest(manifest) && manifest.regions ? manifest.generation : null;
  const states: Record<string, Site[] | null> = {};
  for (const id of REGION_IDS.slice(0, 16)) {
    const entry = generation ? manifest.regions[id] : null;
    const body = entry ? await get(GEMEINDE_PAKET_BUCKET, entry.path) : null;
    const pkg = body ? JSON.parse(brotliDecompressSync(body).toString("utf8")) : null;
    states[id] = pkg && pkg.version === REGION_PACKAGE_VERSION && pkg.regionId === id ? pkg.content?.monitor?.sites ?? null : null;
  }
  const geo = new Map<string, Awaited<ReturnType<typeof gemeindeWetterpunkt>>>();
  for (const sites of Object.values(states)) for (const s of sites ?? []) geo.set(s.ags, await gemeindeWetterpunkt(s.ags));

  // Today and tomorrow in German time; tomorrow is today's after midnight.
  const now = new Date();
  const heute = berlinTagesgrenzen(now);
  const morgen = berlinTagesgrenzen(new Date(heute[1] + 3600000));
  const tage: [string, [number, number]][] = [[heuteInBerlin(now), heute], [heuteInBerlin(new Date(heute[1] + 3600000)), morgen]];
  const t0 = Date.now();
  const next: DayFile["days"] = {};
  for (const [tag, bounds] of tage) next[tag] = regionDay(states, geo, (k) => shards.get(k) ?? null, bounds, newest.runInit);
  const rechenzeit = ((Date.now() - t0) / 1000).toFixed(1);

  const prevRaw = await get(SNAPSHOT_BUCKET, REGION_SOLAR_DAY_PATH);
  const prev = prevRaw ? (JSON.parse(prevRaw.toString("utf8")) as DayFile) : null;
  const file: DayFile = {
    version: REGION_SOLAR_DAY_VERSION,
    generatedAt: now.toISOString(),
    runInit: newest.runInit,
    snapshotFirstHour: newest.firstHour,
    generation,
    days: mergeDays(prev, next, tage.map(([t]) => t)),
  };
  for (const [tag] of tage) {
    const z = file.days[tag];
    const ready = REGION_IDS.filter((id) => z[id].status === "ready");
    const gruende = REGION_IDS.filter((id) => z[id].status !== "ready").map((id) => { const d = z[id]; return d.status === "ready" ? "" : `${id}:${d.reason}${d.detail ? `(${d.detail})` : ""}`; });
    console.log(`${tag}: ${ready.length}/17 fertig${gruende.length ? ` — nicht verfügbar: ${gruende.join(" ")}` : ""}`);
  }
  const de = file.days[tage[0][0]].de;
  if (de.status === "ready") console.log(`Deutschland heute: ${de.towns} Gemeinden, ${(de.installedKwp / 1e6).toFixed(1)} GWp, Mittagswert ${Math.max(...de.points.map((p) => p.powerPct)).toFixed(1)} % (Modelllauf ${de.runInit})`);
  console.log(`Rechenzeit ${rechenzeit} s, ${shards.size} Wetterdateien, ${geo.size} Gemeinden, Generation ${generation ?? "keine"}`);
  if (trocken) return;
  const r = await fetch(`${url}/storage/v1/object/${SNAPSHOT_BUCKET}/${REGION_SOLAR_DAY_PATH}`, {
    method: "POST",
    headers: { ...kopf, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "300" },
    body: JSON.stringify(file),
  });
  if (!r.ok) throw new Error(`Hochladen: HTTP ${r.status} ${await r.text()}`);
  console.log(`${REGION_SOLAR_DAY_PATH} geschrieben (${(JSON.stringify(file).length / 1024).toFixed(0)} kB).`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
