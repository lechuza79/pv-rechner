import "server-only";

/**
 * Live German generation mix from SMARD (Bundesnetzagentur) — the fallback
 * source while Energy-Charts is down.
 *
 * Why it exists: from 29.09.2026 Energy-Charts' API answered 503 on and off,
 * from 04.10. almost continuously, and the strommix page went blank. SMARD
 * publishes the same quantity (realised generation per carrier, quarter-hourly)
 * under CC BY 4.0 with attribution "Bundesnetzagentur | SMARD.de" (licence read
 * at the source, docs/quellen/smard-lizenz/).
 *
 * Units, measured not assumed (05.10.2026, ISO week 2026-W39 against our own
 * energy_weekly copy of Energy-Charts): SMARD values are ENERGY per interval
 * (MWh per quarter-hour, MWh per hour). Summed over the week: solar 2,129 vs
 * 2,130 GWh, lignite 1,535 vs 1,538, load 8,513 vs 8,507, wind onshore 1,653
 * vs 1,623. We convert to average power in MW — the unit every consumer of
 * the generation route expects — by dividing by the interval length.
 *
 * What does NOT map one-to-one, and stays visible in the code instead of being
 * smoothed over:
 * - "Sonstige Konventionelle" bundles oil, coal-derived gas and non-renewable
 *   waste. Energy-Charts splits them (oil and coal gas count as fossil), SMARD
 *   doesn't, so the whole bundle lands in `others`. The fossil share therefore
 *   reads roughly one point lower under SMARD; the page says which source it
 *   shows.
 * - "Sonstige Erneuerbare" (geothermal, landfill and sewage gas; ~0.2 % of
 *   generation) is folded into `biomass`: it is renewable — dropping it would
 *   understate the EE share — and mostly biogenic gas, the closest label we
 *   have. A `geothermal` bar would claim a split SMARD does not deliver.
 * - Cross-border nuclear import is NOT derivable from SMARD (it needs the
 *   neighbours' mix); the nuclear-import route has no SMARD fallback.
 */

export const SMARD_BASE = "https://www.smard.de/app/chart_data";

/** SMARD filter id → our generation key (see GENERATION_STACK_KEYS), plus load. */
export const SMARD_FILTER: Record<number, string> = {
  1223: "fossil_brown_coal_lignite", // Braunkohle
  4069: "fossil_hard_coal", // Steinkohle
  4071: "fossil_gas", // Erdgas
  1227: "others", // Sonstige Konventionelle (see header)
  // Kernenergie (1224) is deliberately absent: SMARD stopped the series in
  // January 2024 (no files for later weeks — a request 404s and would sink
  // the whole fallback). Domestic nuclear has been zero since April 2023.
  1225: "wind_offshore",
  4067: "wind_onshore",
  4068: "solar",
  1226: "hydro_run_of_river", // Wasserkraft (without pumped storage)
  4070: "hydro_pumped_storage", // Pumpspeicher (generation)
  4066: "biomass",
  1228: "biomass", // Sonstige Erneuerbare, folded in (see header)
  410: "load", // Netzlast
};

export type SmardResolution = "quarterhour" | "hour";

const INTERVAL_HOURS: Record<SmardResolution, number> = { quarterhour: 0.25, hour: 1 };

/** SMARD files are weekly chunks; a chunk starting at t covers [t, t + 7 d). */
const CHUNK_MS = 7 * 86400000;

export interface SmardPoint {
  ts: string;
  [key: string]: number | string | null;
}

async function getJson<T>(url: string, timeoutMs: number): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from smard.de`);
  return res.json() as Promise<T>;
}

/** Chunk starts overlapping [startMs, endMs]. Pure, for the test. */
export function chunksFuer(index: number[], startMs: number, endMs: number): number[] {
  return index.filter((t) => t <= endMs && t + CHUNK_MS > startMs);
}

/**
 * Merge per-filter series into points keyed by timestamp. A point exists only
 * once at least one carrier reports it; carriers not yet reported stay null
 * (SMARD fills a chunk's future slots with null) — trimIncompleteTail in the
 * route then cuts the latency tail exactly as for Energy-Charts.
 */
export function zusammenfuehren(
  reihen: { key: string; series: [number, number | null][] }[],
  startMs: number,
  endMs: number,
  resolution: SmardResolution,
): SmardPoint[] {
  const perTs = new Map<number, SmardPoint>();
  const faktor = 1 / INTERVAL_HOURS[resolution]; // MWh per interval → MW
  for (const { key, series } of reihen) {
    for (const [t, wert] of series) {
      if (t < startMs || t > endMs || wert == null) continue;
      let p = perTs.get(t);
      if (!p) {
        p = { ts: new Date(t).toISOString() };
        perTs.set(t, p);
      }
      const mw = wert * faktor;
      // Two SMARD filters can map to one key (biomass): add, don't overwrite.
      p[key] = Math.round(((typeof p[key] === "number" ? (p[key] as number) : 0) + mw) * 10) / 10;
    }
  }
  const keys = new Set(reihen.map((r) => r.key));
  return [...perTs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, p]) => {
      for (const k of keys) if (!(k in p)) p[k] = null;
      return p;
    });
}

/**
 * Generation + load for Germany between startMs and endMs, as average MW per
 * interval. Throws on any failed file: a mix with one carrier missing would
 * show a wrong share, which is worse than falling through to the stored copy.
 */
export async function fetchSmardGeneration(
  startMs: number,
  endMs: number,
  resolution: SmardResolution,
  timeoutMs = 10000,
): Promise<SmardPoint[]> {
  // All filters share the same chunk grid; one index is enough.
  const { timestamps } = await getJson<{ timestamps: number[] }>(
    `${SMARD_BASE}/4068/DE/index_${resolution}.json`,
    timeoutMs,
  );
  const chunks = chunksFuer(timestamps, startMs, endMs);
  if (chunks.length === 0) return [];

  const ids = Object.keys(SMARD_FILTER).map(Number);
  const reihen = await Promise.all(
    ids.flatMap((id) =>
      chunks.map(async (t) => {
        const j = await getJson<{ series: [number, number | null][] }>(
          `${SMARD_BASE}/${id}/DE/${id}_DE_${resolution}_${t}.json`,
          timeoutMs,
        );
        return { key: SMARD_FILTER[id], series: j.series ?? [] };
      }),
    ),
  );
  return zusammenfuehren(reihen, startMs, endMs, resolution);
}
