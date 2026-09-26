/**
 * Precomputed monitor package for a Bundesland and for Deutschland.
 *
 * WHY (26.09.2026): the shared regional page shows the package-based monitor
 * widgets (monthly KPI history, monthly solar day curves, annual energy
 * profile, electricity value, feed-in tariff) only where a prepared package
 * exists — until now districts only. Summing ~11,000 town packages at request
 * time is exactly what the district package replaced (3–12 s per page), so the
 * upper levels are built in the SAME run and the SAME generation as the
 * district packages: every level of one generation rests on one register
 * edition, and the page never mixes a district from one month with a state
 * from another.
 *
 * Inputs, no new calculation:
 *   Bundesland = its districts (their published package content)
 *              + its kreisfreie Städte (their single town package)
 *   Deutschland = the 16 Bundesland results
 * Each part is fed into the unchanged district aggregation
 * (aggregateDistrictMonitor / aggregateDistrictEnergy) as one "packet". Their
 * rules therefore hold one level up: every part present, one register edition,
 * complete aligned months/years only, missing hours stay missing, value only on
 * one common valuation basis. A part that is incomplete makes the level
 * "unavailable" — never a partial sum shown as a total.
 *
 * Deliberately NOT here: stories (the page shows no insights on these levels)
 * and the site list of the live power widget (for Deutschland it would be
 * ~11,000 weather lookups per request; that widget needs its own approach).
 */
import { createHash } from "node:crypto";
import { GEMEINDE_PAKET_VERSION, type GemeindePaket } from "./gemeinde-paket";
import { aggregateDistrictMonitor } from "./district-monitor";
import { aggregateDistrictEnergy, type EnergyPacket } from "./district-energy";
import { DISTRICT_PACKAGE_VERSION, isDistrictMember, type DistrictComputed, type DistrictMembership, type DistrictMonitor } from "./district-package";

/** Bump when the region package shape or its aggregation changes. */
export const REGION_PACKAGE_VERSION = 1;

export type RegionLevel = "bundesland" | "de";
/** `district`: a Landkreis package · `town`: the town package of a kreisfreie Stadt · `state`: a Bundesland result (Deutschland only). */
export type RegionPart = { id: string; kind: "district" | "town" | "state"; town?: string };
/**
 * `excluded`: children the page lists that are no part of the sum — retired
 * Kreise (merged away, their plants re-keyed to the successor) and unincorporated
 * areas directly below the state (coastal waters, a shared border territory).
 * The build confirms each carries no plant; an unconfirmed one makes the level
 * incomplete instead of silently smaller.
 */
export type RegionMembership = { regionId: string; name: string; level: RegionLevel; parts: RegionPart[]; excluded: string[] };

export type RegionPackage = {
  version: number;
  districtPackageVersion: number;
  townPackageVersion: number;
  regionId: string;
  name: string;
  level: RegionLevel;
  /** Child region ids (the page's children: Kreise resp. Bundesländer), sorted. */
  parts: string[];
  /** Register editions of the parts that were usable, sorted. */
  editions: string[];
  /** Parts without usable input (no package, several editions, members missing), and excluded children NOT confirmed plant-free. */
  missing: string[];
  /** Page children confirmed plant-free and therefore not summed (see RegionMembership). */
  excluded: string[];
  fingerprint: string;
  builtAt: string;
  content: DistrictComputed;
};

const sorted = (xs: string[]) => [...xs].sort();

type RegisterRow = { region_id: string; name: string; level: string; bezeichnung: string | null; parent_region_id: string | null };

/**
 * Bundesländer and Deutschland as the page sees them. A Kreis with more than
 * one child is a district (its package); a Kreis with exactly one child is a
 * kreisfreie Stadt (that town's package), if the town is a current
 * municipality. A Kreis without a current municipality (retired key) carries
 * no plants of its own and is left out; the caller logs it.
 */
export function regionsFromRegister(rows: RegisterRow[], districts: DistrictMembership[]): { regions: RegionMembership[]; skipped: string[] } {
  const districtIds = new Set(districts.map((d) => d.regionId));
  const children = new Map<string, RegisterRow[]>();
  for (const r of rows) if (r.parent_region_id) children.set(r.parent_region_id, [...(children.get(r.parent_region_id) ?? []), r]);
  const skipped: string[] = [];
  const states: RegionMembership[] = rows
    .filter((r) => r.level === "bundesland")
    .map((s) => {
      const parts: RegionPart[] = [];
      const excluded: string[] = [];
      for (const k of children.get(s.region_id) ?? []) {
        const kids = children.get(k.region_id) ?? [];
        if (k.level !== "landkreis") excluded.push(k.region_id);
        else if (districtIds.has(k.region_id)) parts.push({ id: k.region_id, kind: "district" });
        else if (kids.length === 1 && isDistrictMember(kids[0], k.region_id)) parts.push({ id: k.region_id, kind: "town", town: kids[0].region_id });
        else excluded.push(k.region_id);
      }
      skipped.push(...excluded);
      return { regionId: s.region_id, name: s.name, level: "bundesland" as const, parts: parts.sort((a, b) => a.id.localeCompare(b.id)), excluded: sorted(excluded) };
    })
    .sort((a, b) => a.regionId.localeCompare(b.regionId));
  const de = rows.find((r) => r.level === "de");
  const regions = [...states];
  if (de) regions.push({ regionId: de.region_id, name: de.name, level: "de", parts: states.map((s) => ({ id: s.regionId, kind: "state" as const })), excluded: [] });
  return { regions, skipped };
}

/** What a region package is computed from. Parts' fingerprints carry every input below them. */
export function regionFingerprint(r: RegionMembership, partPrints: ReadonlyMap<string, string>): string {
  const input = [REGION_PACKAGE_VERSION, DISTRICT_PACKAGE_VERSION, GEMEINDE_PAKET_VERSION, r.regionId, r.name, r.level, r.parts.map((p) => [p.id, p.kind, p.town ?? null, partPrints.get(p.id) ?? null]), r.excluded];
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

/** A town package as one part (kreisfreie Stadt), keyed by its Kreis id. */
export function partFromTown(id: string, p: GemeindePaket | null): EnergyPacket | null {
  return p ? { ags: id, registerStand: p.registerStand, monitorHistory: p.monitorHistory, monitorPeriods: p.monitorPeriods } : null;
}

/**
 * An aggregate (district package or Bundesland result) as one part. Usable only
 * when it covers ALL its members on ONE edition; its monitor/energy may still
 * be unavailable, which the aggregation then reports for the level above.
 */
export function partFromAggregate(id: string, a: { editions: string[]; missing: string[]; content: { monitor: DistrictMonitor } } | null): EnergyPacket | null {
  if (!a || a.missing.length || a.editions.length !== 1) return null;
  const m = a.content.monitor;
  return {
    ags: id,
    registerStand: a.editions[0],
    monitorHistory: m.status === "ready" && m.registerStand === a.editions[0] ? m.history : null,
    // The weather point is a single town's coordinate and not used by the aggregation.
    monitorPeriods: m.energy ? { ...m.energy, weatherPoint: { latitude: Number.NaN, longitude: Number.NaN } } : null,
    aggregate: true,
  };
}

export function computeRegionContent(ids: string[], parts: (EnergyPacket | null)[], name: string): DistrictComputed {
  const monitor: DistrictMonitor = {
    ...aggregateDistrictMonitor(ids, parts, parts[0]?.registerStand ?? ""),
    energy: aggregateDistrictEnergy(ids, parts, name),
    sites: null,
  };
  return { monitor, stories: [] };
}

export function buildRegionPackage(r: RegionMembership, parts: (EnergyPacket | null)[], fingerprint: string, builtAt: string, confirmedEmpty: ReadonlySet<string> = new Set()): RegionPackage {
  if (parts.length !== r.parts.length) throw new Error(`${r.regionId}: ${parts.length} Teile für ${r.parts.length} Kinder`);
  const ids = r.parts.map((p) => p.id);
  const unconfirmed = r.excluded.filter((id) => !confirmedEmpty.has(id));
  return {
    version: REGION_PACKAGE_VERSION,
    districtPackageVersion: DISTRICT_PACKAGE_VERSION,
    townPackageVersion: GEMEINDE_PAKET_VERSION,
    regionId: r.regionId,
    name: r.name,
    level: r.level,
    parts: sorted(ids),
    editions: sorted([...new Set(parts.flatMap((p) => (p ? [p.registerStand] : [])))]),
    missing: [...ids.filter((_, i) => !parts[i]), ...unconfirmed],
    excluded: [...r.excluded],
    fingerprint,
    builtAt,
    content: ids.length && !unconfirmed.length ? computeRegionContent(ids, parts, r.name) : { monitor: { status: "unavailable", reason: "missing-town", energy: null, sites: null }, stories: [] },
  };
}

export type RegionRefusal = "version" | "region" | "membership" | "shape";

/** May the page show this package for this region and these children (the page's full child list, parts plus excluded)? A changed list is refused. */
export function checkRegionPackage(pkg: unknown, regionId: string, parts: string[]): { ok: true; pkg: RegionPackage } | { ok: false; reason: RegionRefusal } {
  const p = pkg as Partial<RegionPackage> | null;
  if (!p || typeof p !== "object") return { ok: false, reason: "shape" };
  if (p.version !== REGION_PACKAGE_VERSION || p.districtPackageVersion !== DISTRICT_PACKAGE_VERSION || p.townPackageVersion !== GEMEINDE_PAKET_VERSION) return { ok: false, reason: "version" };
  if (p.regionId !== regionId) return { ok: false, reason: "region" };
  if (!Array.isArray(p.parts) || !Array.isArray(p.excluded) || !Array.isArray(p.editions) || !p.content?.monitor) return { ok: false, reason: "shape" };
  const want = sorted(parts);
  const have = sorted([...p.parts, ...p.excluded]);
  if (have.length !== want.length || have.some((a, i) => a !== want[i])) return { ok: false, reason: "membership" };
  return { ok: true, pkg: p as RegionPackage };
}

