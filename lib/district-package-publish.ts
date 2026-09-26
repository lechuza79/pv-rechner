/**
 * Build and publish district packages as ONE complete generation.
 *
 * Storage and town reads are injected, so the whole decision path — what is
 * rebuilt, when a run aborts, that the pointer only moves after every object
 * is written and read back — is testable without a network.
 *
 * Invariants (each has a test in lib/__tests__/district-package-publish.test.ts):
 *   - The pointer moves last, and only when every district of the register has
 *     a verified entry. Any failure before that leaves the previous generation
 *     live; the half-written folder is removed by the next successful run.
 *   - A town read that FAILS aborts the run (never treated as "no package").
 *     A town that has no package is recorded as missing; the aggregation then
 *     reports the monitor as unavailable instead of summing the rest.
 *   - A district whose towns are ALL missing, or more than 2 % missing
 *     overall, is a systemic fault (wrong version, half an upload) — abort.
 *   - Two runs may overlap (local monthly run, CI recovery). A writing run
 *     holds the database lease (lib/district-package-lock.ts) from before it
 *     reads the pointer until after cleanup, and renews it before building each
 *     district, before the pointer switch and before cleanup; a lost lease
 *     stops the run before its next write. The pointer is additionally re-read
 *     before the switch (second line of defence, not the lock).
 */
import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";
import type { GemeindePaket } from "./gemeinde-paket";
import { GEMEINDE_PAKET_VERSION } from "./gemeinde-paket";
import {
  DISTRICT_PACKAGE_MAX_BYTES,
  DISTRICT_PACKAGE_PREFIX,
  DISTRICT_PACKAGE_VERSION,
  DISTRICT_POINTER_PATH,
  buildDistrictPackage,
  checkDistrictPackage,
  checkManifest,
  districtFingerprint,
  isEmptyTown,
  newGeneration,
  planRefresh,
  type DistrictManifest,
  type DistrictManifestEntry,
  type DistrictMembership,
} from "./district-package";
import type { DistrictLock } from "./district-package-lock";
import type { EnergyPacket } from "./district-energy";
import { buildRegionPackage, checkRegionPackage, partFromAggregate, partFromTown, regionFingerprint, type RegionMembership, type RegionPackage } from "./region-package";

export type DistrictStore = {
  /** Parsed JSON, or null when the object does not exist. Throws on read failure. */
  getJson(path: string): Promise<unknown | null>;
  getBytes(path: string): Promise<Buffer | null>;
  put(path: string, body: Buffer, contentType: string): Promise<void>;
  /** Names directly below a folder (files and sub-folders). */
  list(prefix: string): Promise<string[]>;
  remove(paths: string[]): Promise<void>;
};

export const MAX_MISSING_TOWN_SHARE = 0.02;

export type RefreshResult =
  | { status: "gesperrt" }
  | { status: "aktuell"; generation: string; districts: number }
  | { status: "plan"; rebuild: { id: string; why: string }[]; drop: string[]; regions: boolean; generation: string | null }
  | { status: "veröffentlicht"; generation: string; previous: string | null; rebuilt: number; kept: number; dropped: string[]; missingTowns: number; bytes: number; regionsRebuilt: number; warnings: string[] };

async function pool<T>(items: T[], n: number, work: (item: T, index: number) => Promise<void>) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await work(items[i], i);
    }
  }));
}

const genOf = (path: string) => path.slice(DISTRICT_PACKAGE_PREFIX.length + 1).split("/")[0];

export async function refreshDistricts(opts: {
  store: DistrictStore;
  readTown: (ags: string) => Promise<GemeindePaket | null>;
  districts: DistrictMembership[];
  townTags: ReadonlyMap<string, string>;
  all?: boolean;
  dryRun?: boolean;
  /** The database's register import; part of every fingerprint (see districtFingerprint). */
  registerEdition?: string;
  /** Members in the page's order. Must return exactly the district's members. */
  orderMembers?: (d: DistrictMembership) => Promise<string[]>;
  now?: () => Date;
  concurrency?: number;
  log?: (line: string) => void;
  /** Required for writing runs; a dry run only reads. */
  lock?: DistrictLock;
  /**
   * Bundesländer and Deutschland (lib/region-package.ts). Built in the same
   * generation as the districts, all together, whenever any of them is stale.
   * Omitted: the run publishes districts only and keeps no region entries.
   */
  regions?: RegionMembership[];
  /**
   * Of the given region ids (towns, or Kreise/areas as a key prefix), those the
   * register lists with NO plant of any kind. Asked only for towns whose package
   * holds nothing to sum and for the children a Land does not sum. Omitted:
   * none counts as empty, and the affected level stays "unavailable".
   */
  confirmEmpty?: (ags: string[]) => Promise<ReadonlySet<string>>;
}): Promise<RefreshResult> {
  if (opts.dryRun || !opts.lock) {
    if (!opts.dryRun) throw new Error("Schreibender Lauf ohne Sperre — Abbruch");
    return run(opts);
  }
  const lock = opts.lock;
  if (!(await lock.hold())) return { status: "gesperrt" };
  try {
    return await run({ ...opts, keep: async (step: string) => {
      if (!(await lock.hold())) throw new Error(`Sperre verloren vor „${step}" — ein anderer Lauf hat übernommen, dieser schreibt nichts mehr`);
    } });
  } finally {
    await lock.release().catch(() => {});
  }
}

async function run(opts: Parameters<typeof refreshDistricts>[0] & { keep?: (step: string) => Promise<void> }): Promise<RefreshResult> {
  const keep = opts.keep ?? (async () => {});
  const { store, readTown, districts, townTags } = opts;
  const now = opts.now ?? (() => new Date());
  const log = opts.log ?? (() => {});
  if (!districts.length) throw new Error("Register ohne Landkreise — Abbruch statt leerer Generation");

  const raw = await store.getJson(DISTRICT_POINTER_PATH);
  const manifest = raw && checkManifest(raw) ? raw : null;
  if (raw && !manifest) log("Zeiger hat eine andere Version — alle Kreise werden neu gebaut.");

  const present = new Set<string>();
  for (const gen of new Set(Object.values(manifest?.districts ?? {}).map((e) => genOf(e.path))))
    for (const name of await store.list(`${DISTRICT_PACKAGE_PREFIX}/${gen}`)) present.add(`${DISTRICT_PACKAGE_PREFIX}/${gen}/${name}`);

  const plan = planRefresh(manifest, districts, townTags, present, opts.all, opts.registerEdition ?? "");
  // Region fingerprints rest on the district fingerprints of THIS register state.
  const regions = opts.regions ?? [];
  const partPrints = new Map(districts.map((d) => [d.regionId, districtFingerprint(d, townTags, opts.registerEdition ?? "")]));
  const regionPrints = new Map<string, string>();
  for (const r of regions) {
    for (const p of r.parts) if (p.kind === "town") partPrints.set(p.id, `town:${townTags.get(p.town!) ?? "fehlt"}`);
    const fp = regionFingerprint(r, partPrints);
    regionPrints.set(r.regionId, fp);
    partPrints.set(r.regionId, fp);
  }
  const regionsStale =
    !!opts.all ||
    regions.some((r) => {
      const e = manifest?.regions?.[r.regionId];
      return !e || e.fingerprint !== regionPrints.get(r.regionId) || !present.has(e.path);
    }) ||
    Object.keys(manifest?.regions ?? {}).some((id) => !regionPrints.has(id));
  if (!plan.rebuild.length && !plan.drop.length && !regionsStale) return { status: "aktuell", generation: manifest!.generation, districts: districts.length };
  if (opts.dryRun) return { status: "plan", rebuild: plan.rebuild.map((r) => ({ id: r.d.regionId, why: r.why })), drop: plan.drop, regions: regionsStale, generation: manifest?.generation ?? null };

  const generation = newGeneration(now());
  const builtAt = now().toISOString();
  const entries: Record<string, DistrictManifestEntry> = {};
  let missingTowns = 0, towns = 0, bytes = 0;
  const started = Date.now();
  for (const [n, { d: registered, fingerprint }] of plan.rebuild.entries()) {
    await keep(`Kreis ${registered.regionId}`);
    const order = opts.orderMembers ? await opts.orderMembers(registered) : registered.members;
    if (order.length !== registered.members.length || [...order].sort().some((a, i) => a !== [...registered.members].sort()[i]))
      throw new Error(`${registered.regionId}: Reihenfolge der Seite nennt andere Gemeinden als das Register (${order.length}/${registered.members.length}) — Abbruch`);
    const d = { ...registered, members: order };
    const packets: (GemeindePaket | null)[] = new Array(d.members.length);
    await pool(d.members, opts.concurrency ?? 8, async (ags, i) => {
      packets[i] = await readTown(ags);
    });
    const candidates = d.members.filter((_, i) => isEmptyTown(packets[i]));
    const empty = candidates.length && opts.confirmEmpty ? await opts.confirmEmpty(candidates) : new Set<string>();
    const pkg = buildDistrictPackage(d, packets, fingerprint, builtAt, empty);
    if (pkg.empty?.length) log(`${d.regionId} ${d.name}: ohne jede Anlage im Register, Summe ohne sie: ${pkg.empty.join(" ")}`);
    if (pkg.missing.length === d.members.length) throw new Error(`${d.regionId} ${d.name}: kein einziges Gemeindepaket gefunden — Abbruch, die bisherige Generation bleibt`);
    missingTowns += pkg.missing.length;
    towns += d.members.length;
    const json = Buffer.from(JSON.stringify(pkg));
    if (json.length > DISTRICT_PACKAGE_MAX_BYTES) throw new Error(`${d.regionId}: Paket ${json.length} Byte, Grenze ${DISTRICT_PACKAGE_MAX_BYTES}`);
    const br = brotliCompressSync(json, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } });
    const path = `${DISTRICT_PACKAGE_PREFIX}/${generation}/${d.regionId}.json.br`;
    await store.put(path, br, "application/octet-stream");
    entries[d.regionId] = { path, fingerprint, members: d.members.length, editions: pkg.editions, missing: pkg.missing.length, bytes: br.length };
    bytes += br.length;
    if ((n + 1) % 25 === 0) log(`${n + 1}/${plan.rebuild.length} Kreise gebaut (${towns} Gemeinden, ${Math.round((Date.now() - started) / 1000)} s) …`);
  }
  if (towns && missingTowns / towns > MAX_MISSING_TOWN_SHARE)
    throw new Error(`${missingTowns} von ${towns} Gemeindepaketen fehlen (> ${MAX_MISSING_TOWN_SHARE * 100} %) — Abbruch, die bisherige Generation bleibt`);

  // Read every new object back before anything points at it.
  const byId = new Map(districts.map((d) => [d.regionId, d]));
  await pool(Object.entries(entries), 6, async ([id, entry]) => {
    const back = await store.getBytes(entry.path);
    if (!back) throw new Error(`${entry.path}: nach dem Schreiben nicht lesbar`);
    const check = checkDistrictPackage(JSON.parse(brotliDecompressSync(back).toString("utf8")), id, byId.get(id)!.members);
    if (!check.ok || check.pkg.fingerprint !== entry.fingerprint) throw new Error(`${entry.path}: Rücklese-Prüfung fehlgeschlagen (${check.ok ? "Fingerabdruck" : check.reason})`);
  });

  // Bundesländer and Deutschland from the district packages of THIS generation
  // (freshly built or kept) plus the kreisfreie Städte. Rebuilt together so the
  // levels never rest on different editions; ~25 MB of reads, only when stale.
  const regionEntries: Record<string, DistrictManifestEntry> = {};
  let regionsRebuilt = 0;
  if (regions.length && regionsStale) {
    const pathOf = (id: string) => entries[id]?.path ?? manifest?.districts[id]?.path;
    const results = new Map<string, RegionPackage>();
    // States first (their parts are districts/towns), Deutschland last (its parts are states).
    for (const r of [...regions].sort((a, b) => (a.level === "de" ? 1 : 0) - (b.level === "de" ? 1 : 0))) {
      await keep(`Region ${r.regionId}`);
      const parts: (EnergyPacket | null)[] = new Array(r.parts.length);
      await pool(r.parts, 6, async (p, i) => {
        if (p.kind === "town") parts[i] = partFromTown(p.id, await readTown(p.town!));
        else if (p.kind === "state") parts[i] = partFromAggregate(p.id, results.get(p.id) ?? null);
        else {
          const path = pathOf(p.id);
          const back = path ? await store.getBytes(path) : null;
          if (!back) throw new Error(`${r.regionId}: Kreispaket ${p.id} nicht lesbar — Abbruch`);
          const check = checkDistrictPackage(JSON.parse(brotliDecompressSync(back).toString("utf8")), p.id, byId.get(p.id)!.members);
          if (!check.ok) throw new Error(`${r.regionId}: Kreispaket ${p.id} abgelehnt (${check.reason}) — Abbruch`);
          parts[i] = partFromAggregate(p.id, check.pkg);
        }
      });
      const confirmed = r.excluded.length && opts.confirmEmpty ? await opts.confirmEmpty(r.excluded) : new Set<string>();
      const pkg = buildRegionPackage(r, parts, regionPrints.get(r.regionId)!, builtAt, confirmed);
      results.set(r.regionId, pkg);
      const json = Buffer.from(JSON.stringify(pkg));
      if (json.length > DISTRICT_PACKAGE_MAX_BYTES) throw new Error(`${r.regionId}: Paket ${json.length} Byte, Grenze ${DISTRICT_PACKAGE_MAX_BYTES}`);
      const br = brotliCompressSync(json, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } });
      const path = `${DISTRICT_PACKAGE_PREFIX}/${generation}/region-${r.regionId}.json.br`;
      await store.put(path, br, "application/octet-stream");
      regionEntries[r.regionId] = { path, fingerprint: pkg.fingerprint, members: r.parts.length, editions: pkg.editions, missing: pkg.missing.length, bytes: br.length };
      bytes += br.length;
      regionsRebuilt++;
      const m = pkg.content.monitor;
      log(`Region ${r.regionId} ${r.name}: ${r.parts.length} Teile, Monitor ${m.status === "ready" ? "vollständig" : `nicht verfügbar (${m.reason})`}, Energie ${m.energy ? `${m.energy.monthly.length} Monate/${m.energy.annual.length} Jahre, Wert ${m.energy.monthly.filter((x) => x.value).length} Monate` : "nicht verfügbar"}${pkg.missing.length ? `, ohne verwertbare Daten: ${pkg.missing.join(" ")}` : ""}`);
    }
    await pool(Object.entries(regionEntries), 6, async ([id, entry]) => {
      const back = await store.getBytes(entry.path);
      const r = regions.find((x) => x.regionId === id)!;
      const check = back ? checkRegionPackage(JSON.parse(brotliDecompressSync(back).toString("utf8")), id, [...r.parts.map((p) => p.id), ...r.excluded]) : null;
      if (!check?.ok || check.pkg.fingerprint !== entry.fingerprint) throw new Error(`${entry.path}: Rücklese-Prüfung fehlgeschlagen`);
    });
  } else for (const r of regions) regionEntries[r.regionId] = manifest!.regions![r.regionId];

  const next: DistrictManifest = {
    version: DISTRICT_PACKAGE_VERSION,
    townPackageVersion: GEMEINDE_PAKET_VERSION,
    generation,
    publishedAt: now().toISOString(),
    previousGeneration: manifest?.generation ?? null,
    districts: {},
  };
  for (const d of districts) {
    const entry = entries[d.regionId] ?? manifest?.districts[d.regionId];
    if (!entry) throw new Error(`${d.regionId}: ohne Eintrag — Generation unvollständig`);
    next.districts[d.regionId] = entry;
  }
  if (regions.length) next.regions = regionEntries;

  // Overlap protection: the lease first, then the pointer this run started from.
  await keep("Zeigerwechsel");
  const again = await store.getJson(DISTRICT_POINTER_PATH);
  const againGen = again && checkManifest(again) ? again.generation : null;
  if (againGen !== (manifest?.generation ?? null))
    throw new Error(`Zeiger wurde während des Laufs verändert (${manifest?.generation ?? "leer"} → ${againGen ?? "leer"}) — ein anderer Lauf hat veröffentlicht, dieser verwirft seine Generation`);
  await store.put(DISTRICT_POINTER_PATH, Buffer.from(JSON.stringify(next)), "application/json");

  // Keep what the new and the previous pointer reference; everything else is
  // an abandoned or superseded generation. A failed cleanup is a warning only:
  // the pointer has already moved.
  const warnings: string[] = [];
  try {
    await keep("Aufräumen");
    const keepGens = new Set([next, manifest].flatMap((m) => [...Object.values(m?.districts ?? {}), ...Object.values(m?.regions ?? {})]).map((e) => genOf(e.path)));
    for (const name of await store.list(DISTRICT_PACKAGE_PREFIX)) {
      if (name === "aktuell.json" || keepGens.has(name)) continue;
      const files = await store.list(`${DISTRICT_PACKAGE_PREFIX}/${name}`);
      if (files.length) await store.remove(files.map((f) => `${DISTRICT_PACKAGE_PREFIX}/${name}/${f}`));
    }
  } catch (e) {
    warnings.push(`Aufräumen alter Generationen fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { status: "veröffentlicht", generation, previous: manifest?.generation ?? null, rebuilt: plan.rebuild.length, kept: plan.keep.length, dropped: plan.drop, missingTowns, bytes, regionsRebuilt, warnings };
}
