import type { ChildYearRow } from "./atlas";

/**
 * THE RANKING TABLE'S CELLS, PRECOMPUTED INTO THE REGION PACKAGE.
 *
 * WHY (28.09.2026): a cold Bundesland page read its ranking cells from the
 * database in ~13 pages of 1,000 rows (Bayern), and every page re-ran the
 * aggregation there — about 1.6 s before the page could render. The cells
 * depend only on the register import, which changes monthly; the package run
 * (scripts/kreis-paket.ts) now reads them ONCE per region, with the page's own
 * reader (loadRankingCells in lib/atlas.ts), and stores them in the Land,
 * Deutschland and district packages. The page then needs no cell query at all.
 *
 * LOSSLESS, not the table's packed wire form (lib/ranking-zellen.ts): besides
 * the table, the page sums these cells for the map, the race chart and the
 * monitor (foldSiblings, districtSolarCells), and the monitor sums kWh of every
 * segment. So every column is kept, and the ORDER is kept — the consumers add
 * floating-point numbers, and a different order could move a last digit.
 *
 * `stand` is the register import (mastr_meta.imported_at, date) the cells were
 * read from. The page uses them only when its own import date is the same;
 * otherwise (a new import, packages not yet rebuilt) it reads the database as
 * before. A package without the field (built before this change) likewise
 * falls back — packages are rebuilt only by the package run.
 */
export type RankingSnapshot = {
  stand: string;
  /** Distinct region ids, in first-appearance order. */
  ids: string[];
  /** Distinct segments, in first-appearance order. */
  segs: string[];
  /** Per cell: index into `ids`. */
  r: number[];
  /** Per cell: index into `segs`. */
  s: number[];
  y: number[];
  n: number[];
  /** kWp */
  p: number[];
  /** kWh */
  h: number[];
};

export function encodeRankingCells(cells: ChildYearRow[], stand: string): RankingSnapshot {
  const out: RankingSnapshot = { stand, ids: [], segs: [], r: [], s: [], y: [], n: [], p: [], h: [] };
  const idIndex = new Map<string, number>();
  const segIndex = new Map<string, number>();
  for (const c of cells) {
    let ri = idIndex.get(c.region_id);
    if (ri === undefined) {
      ri = out.ids.length;
      out.ids.push(c.region_id);
      idIndex.set(c.region_id, ri);
    }
    let si = segIndex.get(c.segment);
    if (si === undefined) {
      si = out.segs.length;
      out.segs.push(c.segment);
      segIndex.set(c.segment, si);
    }
    out.r.push(ri);
    out.s.push(si);
    out.y.push(c.year);
    out.n.push(c.count);
    out.p.push(c.kwp);
    out.h.push(c.kwh);
  }
  return out;
}

const isNumArray = (x: unknown, len: number) => Array.isArray(x) && x.length === len && x.every((v) => typeof v === "number" && Number.isFinite(v));
const isStrArray = (x: unknown) => Array.isArray(x) && x.every((v) => typeof v === "string");

/**
 * The cells exactly as the database path returns them — or null when the
 * snapshot is absent, malformed, or from another register import than `stand`
 * (the caller then reads the database).
 */
export function decodeRankingCells(snapshot: unknown, stand: string | null): ChildYearRow[] | null {
  const z = snapshot as Partial<RankingSnapshot> | null | undefined;
  if (!z || typeof z !== "object" || !stand || z.stand !== stand) return null;
  if (!isStrArray(z.ids) || !isStrArray(z.segs) || !Array.isArray(z.r)) return null;
  const len = z.r.length;
  if (!isNumArray(z.r, len) || !isNumArray(z.s, len) || !isNumArray(z.y, len) || !isNumArray(z.n, len) || !isNumArray(z.p, len) || !isNumArray(z.h, len)) return null;
  const ids = z.ids!, segs = z.segs!;
  const cells: ChildYearRow[] = new Array(len);
  for (let i = 0; i < len; i++) {
    const region_id = ids[z.r[i]];
    const segment = segs[z.s![i]];
    if (region_id === undefined || segment === undefined) return null;
    cells[i] = { region_id, segment, year: z.y![i], count: z.n![i], kwp: z.p![i], kwh: z.h![i] };
  }
  return cells;
}
