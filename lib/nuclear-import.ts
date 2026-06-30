import { fetchCrossBorderFlows, fetchPublicPower } from "./energy-api";

// Countries with active nuclear power plants that border / feed into Germany.
export const NUCLEAR_COUNTRIES = ["fr", "cz", "ch", "se", "be", "nl"] as const;

// CBPF country names → country codes (Energy-Charts uses full names).
const CBPF_NAME_TO_CODE: Record<string, string> = {
  france: "fr",
  czech_republic: "cz",
  switzerland: "ch",
  sweden: "se",
  belgium: "be",
  netherlands: "nl",
};

export interface NuclearDataPoint {
  ts: string;
  nuclear_gw: number;
}

export interface NuclearImportResponse {
  data: NuclearDataPoint[];
  avg_gw: number;
  avg_share_pct: number;
  source: string;
  license: string;
}

/** Thrown when upstream data is missing — callers decide whether to serve stale or fail. */
export class NuclearImportDataError extends Error {
  constructor(public reason: "no-cbpf" | "no-neighbour-mix") {
    super(reason);
    this.name = "NuclearImportDataError";
  }
}

export function downsample(data: NuclearDataPoint[], factor: number): NuclearDataPoint[] {
  if (factor <= 1 || data.length === 0) return data;
  const result: NuclearDataPoint[] = [];
  for (let i = 0; i < data.length; i += factor) {
    const chunk = data.slice(i, i + factor);
    let sum = 0;
    let count = 0;
    for (const d of chunk) {
      if (d.nuclear_gw != null) { sum += d.nuclear_gw; count++; }
    }
    result.push({
      ts: chunk[Math.floor(chunk.length / 2)].ts,
      nuclear_gw: count > 0 ? Math.round(sum / count * 1000) / 1000 : 0,
    });
  }
  return result;
}

/**
 * Compute Germany's calculated nuclear-power imports from its 6 nuclear
 * neighbours over a time window. The number is derived, not metered: for each
 * timestamp and each neighbour that is physically exporting to Germany, we take
 * the cross-border flow and weight it by that country's nuclear share of its own
 * generation mix at the same moment, then sum across neighbours.
 *
 * Shared by the /api/energy/nuclear-import route (live dashboard) and the
 * /atomstrom-import data page so both render from one source — they can never
 * disagree on the figure.
 *
 * Throws {@link NuclearImportDataError} when upstream data is unusable so the
 * caller can serve a stale cache or fail loudly instead of caching a false 0.
 */
export async function computeNuclearImport(
  startStr: string,
  endStr: string,
  rangeHours: number,
): Promise<NuclearImportResponse> {
  // Yearly chunking for multi-year ranges (Energy-Charts caps a single query).
  const fetchChunked = async <T,>(
    fetcher: (s: string, e: string) => Promise<T[]>,
  ): Promise<T[]> => {
    if (rangeHours > 8784) {
      const startYear = new Date(startStr).getFullYear();
      const endYear = new Date(endStr).getFullYear();
      const chunks: Promise<T[]>[] = [];
      for (let y = startYear; y <= endYear; y++) {
        const cs = y === startYear ? startStr : `${y}-01-01T00:00:00+01:00`;
        const ce = y === endYear ? endStr : `${y}-12-31T23:59:59+01:00`;
        chunks.push(fetcher(cs, ce));
      }
      return (await Promise.all(chunks)).flat();
    }
    return fetcher(startStr, endStr);
  };

  // Step 1: cross-border physical flows (positive = import into Germany).
  const cbpfRows = await fetchChunked((s, e) => fetchCrossBorderFlows("de", s, e));
  if (cbpfRows.length === 0) throw new NuclearImportDataError("no-cbpf");

  // Step 2: generation mix of each nuclear neighbour (partial data is fine).
  const countryGenRows = new Map<string, Map<string, { nuclear: number; total: number }>>();
  const countryResults = await Promise.allSettled(
    NUCLEAR_COUNTRIES.map(code =>
      fetchChunked((s, e) => fetchPublicPower(code, s, e, 10000, 2)).then(rows => ({ code, rows }))
    )
  );
  for (const result of countryResults) {
    if (result.status === "rejected") {
      console.warn("Nuclear import: skipping country:", result.reason?.message || result.reason);
      continue;
    }
    const { code, rows } = result.value;
    const tsMap = new Map<string, { nuclear: number; total: number }>();
    for (const row of rows) {
      const nuclear = (row.data.nuclear as number) ?? 0;
      let total = 0;
      for (const [key, val] of Object.entries(row.data)) {
        if (
          typeof val === "number" && val > 0 &&
          !key.includes("load") &&
          !key.includes("share") &&
          !key.includes("cross_border") &&
          !key.includes("consumption")
        ) {
          total += val;
        }
      }
      tsMap.set(row.ts, { nuclear, total });
    }
    countryGenRows.set(code, tsMap);
  }

  // If every neighbour-generation fetch failed we cannot compute the share —
  // returning 0 would be physically false (and worse, cacheable as valid).
  if (countryGenRows.size === 0) throw new NuclearImportDataError("no-neighbour-mix");

  // Build lookup: ts → { country_code → flow_gw }
  const cbpfByTs = new Map<string, Record<string, number>>();
  for (const row of cbpfRows) {
    const flows: Record<string, number> = {};
    for (const [name, val] of Object.entries(row.data)) {
      if (name === "net" || typeof val !== "number") continue;
      const code = CBPF_NAME_TO_CODE[name];
      if (code) flows[code] = val;
    }
    cbpfByTs.set(row.ts, flows);
  }

  let data: NuclearDataPoint[] = [];
  let totalNuclear = 0;
  let count = 0;

  cbpfByTs.forEach((flows, ts) => {
    let nuclearGw = 0;
    let positiveFlows = 0;
    let mixHits = 0;

    for (const code of NUCLEAR_COUNTRIES) {
      const flowGw = flows[code] ?? 0;
      if (flowGw <= 0) continue; // Only imports (positive = import to DE)
      positiveFlows++;

      const mix = countryGenRows.get(code)?.get(ts);
      if (!mix || mix.total <= 0) continue;
      mixHits++;

      const nuclearShare = mix.nuclear / mix.total;
      nuclearGw += flowGw * nuclearShare;
    }

    // Skip timestamps that have imports but no usable neighbour mix (data gap):
    // counting them as 0 would drag the average down. Timestamps with no imports
    // at all are a legitimate 0 and stay counted.
    if (positiveFlows > 0 && mixHits === 0) return;

    data.push({ ts, nuclear_gw: Math.round(nuclearGw * 1000) / 1000 });
    totalNuclear += nuclearGw;
    count++;
  });

  data.sort((a, b) => a.ts.localeCompare(b.ts));

  // Downsample for longer ranges to keep payloads small.
  if (rangeHours > 17520) {
    data = downsample(data, 96); // >2 years: daily
  } else if (rangeHours > 2160) {
    data = downsample(data, 24);
  } else if (rangeHours > 720) {
    data = downsample(data, 12);
  } else if (rangeHours > 168) {
    data = downsample(data, 4);
  }

  const avgGw = count > 0 ? Math.round(totalNuclear / count * 100) / 100 : 0;
  // Rough share vs. a typical DE load (~45 GW); the dashboard refines this with
  // its own generation data.
  const avgSharePct = count > 0 ? Math.round(avgGw / 45 * 100 * 10) / 10 : 0;

  return {
    data,
    avg_gw: avgGw,
    avg_share_pct: avgSharePct,
    source: "Fraunhofer ISE / Energy-Charts",
    license: "CC BY 4.0",
  };
}
