/**
 * Build and publish the district packages (lib/district-package.ts) from the
 * PUBLISHED town packages and the region register.
 *
 *   npm run kreise:pakete                       recovery: rebuild only what is stale
 *   npm run kreise:pakete -- --alle             rebuild every district (monthly run)
 *   npm run kreise:pakete -- --trocken          plan only, writes nothing
 *   … --ohne-invalidierung                      publish, but leave the page caches
 *                                               (the monthly run invalidates everything after)
 *
 * Runs in two places, the same code both times:
 *   - the monthly town-package run (scripts/gemeinde-monatslauf.ts, step "kreise"),
 *     right after the town packages are uploaded;
 *   - the daily recovery workflow (.github/workflows/kreis-pakete.yml): a district
 *     is rebuilt when a member's town package, the register membership, its name
 *     or the package version changed, or its object is missing. Nothing to do →
 *     one pointer read, one storage listing, no town download.
 *
 * Reads towns through lib/gemeinde-paket-server.ts, the page's own reader, so the
 * district result is what the request-time loader computed. Never reads a local
 * package folder: the district must match what is published.
 * Deterministic, no model calls. Exit code 1 on any failure; the previous
 * generation then stays live.
 */
import { loadEnvConfig } from "@next/env";
import { appendFileSync } from "node:fs";

loadEnvConfig(process.cwd());
delete process.env.GEMEINDE_PAKET_LOKAL;

const flag = (n: string) => process.argv.includes(`--${n}`);
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("Supabase-Zugang fehlt");
const kopf = { apikey: key, Authorization: `Bearer ${key}` };
const warte = (ms: number) => new Promise((w) => setTimeout(w, ms));

async function mitWiederholung<T>(was: string, f: () => Promise<T>): Promise<T> {
  // 0 s, 3 s, 15 s: the last pause outlasts the 10-s circuit breaker in db-timeout.
  for (const [i, pause] of [0, 3000, 15000].entries()) {
    if (pause) await warte(pause);
    try {
      return await f();
    } catch (e) {
      if (i === 2) throw e;
      console.warn(`  Wiederholung ${was}: ${e instanceof Error ? e.message : e}`);
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const { GEMEINDE_PAKET_BUCKET, ladeGemeindePaket } = await import("../lib/gemeinde-paket-server");
  const { districtsFromRegister, isDistrictMember } = await import("../lib/district-package");
  const { getChildrenUncached } = await import("../lib/atlas");
  const { refreshDistricts } = await import("../lib/district-package-publish");
  const { DISTRICT_LEASE_DDL, DISTRICT_LEASE_SECONDS } = await import("../lib/district-package-lock");
  const { randomUUID } = await import("node:crypto");
  const rpc = (fn: string, body: unknown) =>
    mitWiederholung(fn, async () => {
      const r = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...kopf, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`${fn}: HTTP ${r.status} ${await r.text()}`);
      const t = await r.text();
      return t ? JSON.parse(t) : null;
    });
  // The lease lives in the database both runs share (see lib/district-package-lock.ts).
  const holder = randomUUID();
  const lock = {
    hold: async () => (await rpc("kreis_paket_sperre_nehmen", { wer: holder, sekunden: DISTRICT_LEASE_SECONDS })) === true,
    release: async () => void (await rpc("kreis_paket_sperre_freigeben", { wer: holder })),
  };
  if (!flag("trocken")) {
    await rpc("exec_sql", { sql: DISTRICT_LEASE_DDL });
    // A fresh function may need a moment until the REST layer knows it.
    for (let i = 0; ; i++) {
      try { await lock.release(); break; } catch (e) { if (i >= 5) throw e; await warte(1500); }
    }
  }
  const B = GEMEINDE_PAKET_BUCKET;

  const store = {
    async getBytes(path: string) {
      return mitWiederholung(path, async () => {
        const r = await fetch(`${url}/storage/v1/object/${B}/${path}`, { headers: { ...kopf, "Cache-Control": "no-cache" } });
        if (r.status === 400 || r.status === 404) return null;
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
        return Buffer.from(await r.arrayBuffer());
      });
    },
    async getJson(path: string) {
      const b = await store.getBytes(path);
      return b ? JSON.parse(b.toString("utf8")) : null;
    },
    async put(path: string, body: Buffer, contentType: string) {
      await mitWiederholung(path, async () => {
        const r = await fetch(`${url}/storage/v1/object/${B}/${path}`, {
          method: "POST",
          headers: { ...kopf, "Content-Type": contentType, "x-upsert": "true", "Cache-Control": "no-cache" },
          body: new Uint8Array(body),
        });
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${await r.text()}`);
      });
    },
    async listEntries(prefix: string) {
      const out: { name: string; metadata: { eTag?: string } | null }[] = [];
      for (let offset = 0; ; offset += 1000) {
        const page = await mitWiederholung(`list ${prefix}`, async () => {
          const r = await fetch(`${url}/storage/v1/object/list/${B}`, {
            method: "POST",
            headers: { ...kopf, "Content-Type": "application/json" },
            body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
          });
          if (!r.ok) throw new Error(`list ${prefix}: HTTP ${r.status}`);
          return (await r.json()) as { name: string; metadata: { eTag?: string } | null }[];
        });
        out.push(...page);
        if (page.length < 1000) return out;
      }
    },
    async list(prefix: string) {
      return (await store.listEntries(prefix)).map((e) => e.name).filter((n) => n !== ".emptyFolderPlaceholder");
    },
    async remove(paths: string[]) {
      for (let i = 0; i < paths.length; i += 100) {
        const r = await fetch(`${url}/storage/v1/object/${B}`, {
          method: "DELETE",
          headers: { ...kopf, "Content-Type": "application/json" },
          body: JSON.stringify({ prefixes: paths.slice(i, i + 100) }),
        });
        if (!r.ok) throw new Error(`remove: HTTP ${r.status}`);
      }
    },
  };

  // The register as the page reads it (mastr_regions, parent → children).
  const rows: { region_id: string; name: string; level: string; bezeichnung: string | null; parent_region_id: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await mitWiederholung("mastr_regions", async () => {
      const r = await fetch(`${url}/rest/v1/mastr_regions?select=region_id,name,level,bezeichnung,parent_region_id&level=in.(landkreis,gemeinde)&order=region_id`, {
        headers: { ...kopf, Range: `${from}-${from + 999}` },
      });
      if (!r.ok) throw new Error(`mastr_regions: HTTP ${r.status}`);
      return (await r.json()) as typeof rows;
    });
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const districts = districtsFromRegister(rows);
  const townTags = new Map(
    (await store.listEntries(""))
      .filter((e) => /^\d{8}\.json\.br$/.test(e.name) && e.metadata?.eTag)
      .map((e) => [e.name.slice(0, 8), e.metadata!.eTag!]),
  );
  console.log(`Register: ${districts.length} Landkreise, ${districts.reduce((s, d) => s + d.members.length, 0)} Gemeinden · veröffentlichte Gemeindepakete: ${townTags.size}`);

  // The register import the page's ranking order comes from.
  const meta = await mitWiederholung("mastr_meta", async () => {
    const r = await fetch(`${url}/rest/v1/mastr_meta?select=source_url,imported_at&order=id.desc&limit=1`, { headers: kopf });
    if (!r.ok) throw new Error(`mastr_meta: HTTP ${r.status}`);
    return ((await r.json()) as { source_url: string; imported_at: string }[])[0];
  });
  if (!meta?.source_url) throw new Error("Registerstand der Datenbank nicht lesbar");
  const registerEdition = `${meta.source_url}|${meta.imported_at}`;

  const t0 = Date.now();
  const result = await refreshDistricts({
    store,
    readTown: (ags) => mitWiederholung(ags, () => ladeGemeindePaket(ags)),
    districts,
    townTags,
    all: flag("alle"),
    registerEdition,
    // Exactly the page's order: the uncached body of lib/atlas getChildren.
    orderMembers: async (d) =>
      (await mitWiederholung(`Reihenfolge ${d.regionId}`, () => getChildrenUncached({ region_id: d.regionId, level: "landkreis" } as never)))
        .filter((c) => isDistrictMember(c, d.regionId))
        .map((c) => c.region_id),
    dryRun: flag("trocken"),
    log: (l) => console.log(l),
    lock: flag("trocken") ? undefined : lock,
  });
  const dauer = ((Date.now() - t0) / 1000).toFixed(0);

  let zeile: string;
  if (result.status === "gesperrt") {
    // Another run is publishing. The monthly full rebuild must not pass silently;
    // the daily check simply defers to the running one.
    zeile = "Ein anderer Lauf veröffentlicht gerade Kreispakete — dieser schreibt nichts.";
    if (flag("alle")) throw new Error(zeile + " Nach dessen Ende erneut starten.");
  } else if (result.status === "aktuell") zeile = `Alle ${result.districts} Kreispakete aktuell (Generation ${result.generation}); nichts neu gebaut.`;
  else if (result.status === "plan") {
    const why = result.rebuild.reduce<Record<string, number>>((a, r) => ({ ...a, [r.why]: (a[r.why] ?? 0) + 1 }), {});
    zeile = `Plan: ${result.rebuild.length} Kreise bauen (${Object.entries(why).map(([k, v]) => `${k} ${v}`).join(", ")}), ${result.drop.length} entfallen. Nichts geschrieben.`;
  } else {
    zeile = `Generation ${result.generation} veröffentlicht (vorher ${result.previous ?? "keine"}): ${result.rebuilt} gebaut, ${result.kept} übernommen, ${result.dropped.length} entfallen, ${result.missingTowns} Gemeinden ohne Paket, ${(result.bytes / 1e6).toFixed(1)} MB, ${dauer} s.`;
    for (const w of result.warnings) console.warn(`⚠ ${w}`);
    if (!flag("ohne-invalidierung")) {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
      if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET fehlt — Generation ist veröffentlicht, aber die Seiten zeigen sie erst nach Invalidierung");
      const r = await fetch(`${base}/api/atlas/revalidate?umfang=kreise`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "User-Agent": "solar-check-health-check" },
      });
      if (!r.ok) throw new Error(`Invalidierung der Kreisseiten: HTTP ${r.status} — Generation ist veröffentlicht, die Seiten zeigen sie erst nach erneutem Aufruf`);
      zeile += " Kreisseiten für ungültig erklärt.";
    }
  }
  console.log(zeile);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${zeile}\n`);
}

main().catch((e) => {
  const msg = `✖ Kreispakete: ${e instanceof Error ? e.message : String(e)} — die bisherige Generation bleibt live.`;
  console.error(msg);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${msg}\n`);
  process.exit(1);
});
