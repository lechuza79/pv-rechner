import { SEGMENT_OWNER, type ChildYearRow, type RankingRegion } from "./atlas";

/**
 * THE RANKING TABLE'S CELLS, PACKED FOR THE WIRE.
 *
 * The table recombines owner, metric and "rank at the end of last year" in the
 * browser, so it needs every (child × segment × year) cell — for Bayern that is
 * about ten thousand of them. As an array of objects every key was repeated in
 * every cell (1.17 MB of page payload for Bayern). The packed form carries the
 * same cells, in the same order and with the same exact numbers, as columns:
 *
 *  - a region is its index in `regions`, a segment its index in `segmente`;
 *  - one value column: kWh for battery segments, kWp for everything else — the
 *    table reads only kWh from a battery cell and only kWp from any other
 *    (components/atlas/RankingTable.tsx, `build`);
 *  - cells the table can never count are left out: segments whose owner is
 *    explicitly none (pumped storage, "sonstige", "n/a") and regions that are
 *    not in the list.
 *
 * The ORDER is kept on purpose: the table sums floating-point numbers, and a
 * different order could move the last digit of a sum.
 */
export type RankingZellen = {
  segmente: string[];
  /** Region index into the `regions` prop. */
  r: number[];
  /** Segment index into `segmente`. */
  s: number[];
  y: number[];
  n: number[];
  /** kWh for battery segments, kWp otherwise. */
  v: number[];
};

const istBatterie = (segment: string) => segment.startsWith("batterie");

export function packeRankingZellen(cells: ChildYearRow[], regions: RankingRegion[]): RankingZellen {
  const regionIndex = new Map(regions.map((r, i) => [r.region_id, i]));
  const segmentIndex = new Map<string, number>();
  const out: RankingZellen = { segmente: [], r: [], s: [], y: [], n: [], v: [] };
  for (const c of cells) {
    if (SEGMENT_OWNER[c.segment] === null) continue;
    const ri = regionIndex.get(c.region_id);
    if (ri === undefined) continue;
    let si = segmentIndex.get(c.segment);
    if (si === undefined) {
      si = out.segmente.length;
      out.segmente.push(c.segment);
      segmentIndex.set(c.segment, si);
    }
    out.r.push(ri);
    out.s.push(si);
    out.y.push(c.year);
    out.n.push(c.count);
    out.v.push(istBatterie(c.segment) ? c.kwh : c.kwp);
  }
  return out;
}

/** Back to the cell list the table computes on. The unused value is 0. */
export function entpackeRankingZellen(z: RankingZellen, regions: RankingRegion[]): ChildYearRow[] {
  const cells: ChildYearRow[] = new Array(z.r.length);
  for (let i = 0; i < z.r.length; i++) {
    const segment = z.segmente[z.s[i]];
    const batterie = istBatterie(segment);
    cells[i] = {
      region_id: regions[z.r[i]].region_id,
      segment,
      year: z.y[i],
      count: z.n[i],
      kwp: batterie ? 0 : z.v[i],
      kwh: batterie ? z.v[i] : 0,
    };
  }
  return cells;
}
