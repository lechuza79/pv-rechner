/**
 * The precomputed package behind one district page (Landkreis).
 *
 * WHY IT EXISTS (25.09.2026): a cold district render fetched and decoded every
 * member town's package (up to 200+ objects, several MB) before the monitor
 * and story sections could stream. Measured live: 3.5–3.6 s for normal
 * districts, 12 s for the Eifelkreis. The result depends only on the published
 * town packages and the region register, both of which change monthly — so it
 * is computed once, when those change, and the page reads ONE small object.
 *
 * The aggregation itself is unchanged: `computeDistrictContent` is the former
 * request-time loader (lib/district-monitor-server.ts until 25.09.2026), fed
 * with the same town packages through the same reader. Missing towns, mixed
 * editions and incomplete history stay "unavailable", never partial totals.
 *
 * Publication is by GENERATION (lib/district-package-publish.ts): every
 * district object of a run is written under a new generation folder and only
 * then does the pointer `kreise/v<N>/aktuell.json` switch. A failed or partial
 * run leaves the previous pointer — and so the last complete generation — live.
 *
 * Bump DISTRICT_PACKAGE_VERSION whenever the package shape or the aggregation
 * / story selection changes: the pointer path carries the version, so an older
 * deployment keeps reading its own generation while the new one is built.
 */
import { createHash } from "node:crypto";
import { GEMEINDE_PAKET_VERSION, type GemeindePaket } from "./gemeinde-paket";
import { aggregateDistrictMonitor, type DistrictMonitorResult } from "./district-monitor";
import { aggregateDistrictEnergy, type DistrictEnergy } from "./district-energy";
import { selectDistrictStories } from "./district-stories";
import type { StoryConcept } from "./story-konzepte";
import { paketFuer } from "../components/gemeinde/paket-teile";
import { aktuellerGemeindeschluessel } from "./ags-nachfolger";

export const DISTRICT_PACKAGE_VERSION = 1;
export const DISTRICT_PACKAGE_PREFIX = `kreise/v${DISTRICT_PACKAGE_VERSION}`;
export const DISTRICT_POINTER_PATH = `${DISTRICT_PACKAGE_PREFIX}/aktuell.json`;
/** unstable_cache and the fetch data cache refuse entries above 2 MB; stay well below. */
export const DISTRICT_PACKAGE_MAX_BYTES = 1_500_000;

export type DistrictSite = { ags: string; kwp: number };
export type DistrictMonitor = DistrictMonitorResult & { energy: DistrictEnergy | null; sites: DistrictSite[] | null };
export type DistrictComputed = { monitor: DistrictMonitor; stories: StoryConcept[] };

/** One district's members, straight from the region register. */
export type DistrictMembership = { regionId: string; name: string; members: string[] };

export type DistrictPackage = {
  version: number;
  townPackageVersion: number;
  regionId: string;
  name: string;
  /** Member AGS, sorted. The page refuses the package if the register now says otherwise. */
  members: string[];
  /** Distinct register editions of the member packages that exist, sorted. */
  editions: string[];
  /** Members without a published town package (their data is absent, not zero). */
  missing: string[];
  fingerprint: string;
  builtAt: string;
  content: DistrictComputed;
};

export type DistrictManifestEntry = { path: string; fingerprint: string; members: number; editions: string[]; missing: number; bytes: number };
export type DistrictManifest = {
  version: number;
  townPackageVersion: number;
  generation: string;
  publishedAt: string;
  previousGeneration: string | null;
  districts: Record<string, DistrictManifestEntry>;
};

const sorted = (xs: string[]) => [...xs].sort();

/**
 * The former request-time aggregation, verbatim in behaviour. `ids` must be in
 * the page's order (ranking by output per resident, lib/atlas getChildren):
 * the story selection and the summation follow it. Every town read once, monitor and energy from complete same-edition packets only, sites only
 * when every town is present and on one edition, stories by the accepted
 * selection. `packets[i]` belongs to `ids[i]`; null means "no package".
 */
export function computeDistrictContent(ids: string[], packets: (GemeindePaket | null)[], town: string): DistrictComputed {
  const stories: StoryConcept[][] = packets.map((p) => (p ? (paketFuer("geschichten", p).stories as StoryConcept[]) : []));
  const sites = packets.flatMap((p) => (p?.register ? [{ ags: p.ags, kwp: p.register.own.sums.alle.kwp }] : []));
  const slim = packets.map((p) => (p ? { ags: p.ags, registerStand: p.registerStand, monitorHistory: p.monitorHistory, monitorPeriods: p.monitorPeriods } : null));
  const monitor: DistrictMonitor = {
    ...aggregateDistrictMonitor(ids, slim, slim[0]?.registerStand ?? ""),
    energy: aggregateDistrictEnergy(ids, slim, town),
    sites: sites.length === ids.length && slim.every((p) => p?.registerStand === slim[0]?.registerStand) ? sites : null,
  };
  return { monitor, stories: selectDistrictStories(stories) };
}

/** What a district's package is computed from; changes whenever any input changes. */
/**
 * `registerEdition` is the database's register import. It decides the ORDER of
 * the members (the page's ranking by output per resident), and the order is an
 * input: story selection prefers earlier towns on ties, and float sums follow
 * it. A new import therefore rebuilds every district once.
 */
export function districtFingerprint(d: DistrictMembership, townTags: ReadonlyMap<string, string>, registerEdition = ""): string {
  const input = [DISTRICT_PACKAGE_VERSION, GEMEINDE_PAKET_VERSION, registerEdition, d.regionId, d.name, sorted(d.members).map((a) => [a, townTags.get(a) ?? null])];
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function buildDistrictPackage(d: DistrictMembership, packets: (GemeindePaket | null)[], fingerprint: string, builtAt: string): DistrictPackage {
  if (packets.length !== d.members.length) throw new Error(`${d.regionId}: ${packets.length} Pakete für ${d.members.length} Gemeinden`);
  packets.forEach((p, i) => {
    if (p && p.ags !== d.members[i]) throw new Error(`${d.regionId}: Paket ${p.ags} an Stelle von ${d.members[i]}`);
  });
  return {
    version: DISTRICT_PACKAGE_VERSION,
    townPackageVersion: GEMEINDE_PAKET_VERSION,
    regionId: d.regionId,
    name: d.name,
    members: sorted(d.members),
    editions: sorted([...new Set(packets.flatMap((p) => (p ? [p.registerStand] : [])))]),
    missing: d.members.filter((_, i) => !packets[i]),
    fingerprint,
    builtAt,
    content: computeDistrictContent(d.members, packets, d.name),
  };
}

export type DistrictRefusal = "version" | "region" | "membership" | "shape";

/**
 * May the page show this package for this district and these register members?
 * A changed membership (merger, district change) makes the totals wrong, so it
 * is refused — never partially reused.
 */
export function checkDistrictPackage(pkg: unknown, regionId: string, members: string[]): { ok: true; pkg: DistrictPackage } | { ok: false; reason: DistrictRefusal } {
  const p = pkg as Partial<DistrictPackage> | null;
  if (!p || typeof p !== "object") return { ok: false, reason: "shape" };
  if (p.version !== DISTRICT_PACKAGE_VERSION || p.townPackageVersion !== GEMEINDE_PAKET_VERSION) return { ok: false, reason: "version" };
  if (p.regionId !== regionId) return { ok: false, reason: "region" };
  if (!Array.isArray(p.members) || !Array.isArray(p.editions) || !p.content?.monitor || !Array.isArray(p.content.stories)) return { ok: false, reason: "shape" };
  const want = sorted(members);
  if (p.members.length !== want.length || p.members.some((a, i) => a !== want[i])) return { ok: false, reason: "membership" };
  return { ok: true, pkg: p as DistrictPackage };
}

export function checkManifest(m: unknown): m is DistrictManifest {
  const x = m as Partial<DistrictManifest> | null;
  return !!x && x.version === DISTRICT_PACKAGE_VERSION && x.townPackageVersion === GEMEINDE_PAKET_VERSION && typeof x.generation === "string" && !!x.districts && typeof x.districts === "object";
}

/**
 * Which districts a run must build. A district is rebuilt when it is new, its
 * fingerprint changed (a member's town package, the member list, its name or a
 * version), or its published object is gone. Districts that left the register
 * are dropped from the next generation.
 */
export function planRefresh(
  manifest: DistrictManifest | null,
  districts: DistrictMembership[],
  townTags: ReadonlyMap<string, string>,
  presentPaths: ReadonlySet<string>,
  all = false,
  registerEdition = "",
) {
  const rebuild: { d: DistrictMembership; fingerprint: string; why: "neu" | "geändert" | "fehlt" | "alle" }[] = [];
  const keep: string[] = [];
  for (const d of districts) {
    const fingerprint = districtFingerprint(d, townTags, registerEdition);
    const entry = manifest?.districts[d.regionId];
    if (all) rebuild.push({ d, fingerprint, why: "alle" });
    else if (!entry) rebuild.push({ d, fingerprint, why: "neu" });
    else if (entry.fingerprint !== fingerprint) rebuild.push({ d, fingerprint, why: "geändert" });
    else if (!presentPaths.has(entry.path)) rebuild.push({ d, fingerprint, why: "fehlt" });
    else keep.push(d.regionId);
  }
  const wanted = new Set(districts.map((d) => d.regionId));
  const drop = Object.keys(manifest?.districts ?? {}).filter((id) => !wanted.has(id));
  return { rebuild, keep, drop };
}

type RegisterRow = { region_id: string; bezeichnung: string | null; parent_region_id: string | null };

/**
 * Is this register row a current municipality of the district? THE membership
 * rule, shared by the page (map, ranking race, monitor) and the package build.
 *
 *   - parent is the district: an enclosed independent city has its own parent
 *     (it is a district-level region) and never appears;
 *   - not an unincorporated area ("Gemeindefreies Gebiet": forests, lakes);
 *   - not a retired key. The register keeps municipalities dissolved by a
 *     merger as rows without designation, population or page (measured
 *     25.09.2026: 304 rows, every one of them in the official Destatis list of
 *     territorial changes, lib/ags-nachfolger.ts). Counted as members they made
 *     the district monitor "unavailable" — Mainz-Bingen showed no monitor and
 *     "map outline missing" for Heidesheim and Wackernheim, part of Ingelheim
 *     since 2019. Their plants are re-keyed to the successor on import.
 * Never derived from map geometry.
 */
export function isDistrictMember(row: RegisterRow, districtId: string): boolean {
  return row.parent_region_id === districtId && row.bezeichnung !== "Gemeindefreies Gebiet" && aktuellerGemeindeschluessel(row.region_id) === row.region_id;
}

/**
 * The register's districts as the page sees them (members: isDistrictMember).
 * A district with a single child is a kreisfreie Stadt; its page redirects to
 * the town and needs no package.
 */
export function districtsFromRegister(rows: { region_id: string; name: string; level: string; bezeichnung: string | null; parent_region_id: string | null }[]): DistrictMembership[] {
  const children = new Map<string, typeof rows>();
  for (const r of rows) if (r.parent_region_id) children.set(r.parent_region_id, [...(children.get(r.parent_region_id) ?? []), r]);
  return rows
    .filter((r) => r.level === "landkreis")
    .flatMap((k) => {
      const kids = children.get(k.region_id) ?? [];
      const members = kids.filter((c) => isDistrictMember(c, k.region_id)).map((c) => c.region_id);
      return kids.length > 1 && members.length ? [{ regionId: k.region_id, name: k.name, members: sorted(members) }] : [];
    })
    .sort((a, b) => a.regionId.localeCompare(b.regionId));
}

/** Generation ids sort chronologically and are unique per run. */
export function newGeneration(now: Date) {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z") + "-" + createHash("sha256").update(String(Math.random())).digest("hex").slice(0, 6);
}
