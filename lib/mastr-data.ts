// MaStR data access layer — wraps the Supabase aggregate queries.
// Falls back to placeholder numbers (rough 2025 stock estimates) while the
// real data pipeline is still being populated. Once mastr_aggregates is
// filled, only `loadFromSupabase` needs to flip to true.

import { BUNDESLAENDER, bundeslandByAgs } from "./mastr-regions";

export type Energietraeger = "solar" | "wind" | "biomasse" | "wasser" | "speicher";
export type Segment = "privat_dach" | "gewerbe_dach" | "freiflaeche" | "n/a";
export type Level = "de" | "bundesland" | "landkreis";

export type ChoroplethEntry = {
  region_id: string;
  count: number;
  kwp: number;
};

export type SegmentBreakdown = {
  segment: Segment;
  count: number;
  kwp: number;
};

export type RegionSummary = {
  region_id: string;
  name: string;
  level: Level;
  energietraeger: Energietraeger;
  total_count: number;
  total_kwp: number;
  by_segment: SegmentBreakdown[];
  source: "supabase" | "placeholder";
  data_as_of: string;
};

// ─── Placeholder stock per Bundesland (MW, approx. Jan 2025) ─────────────────
// Derived from public Bundesnetzagentur monthly statistics. These are stand-ins
// until the real MaStR aggregates land in Supabase.

type PlaceholderBl = {
  ags: string;
  solar_mw: number;
  wind_mw: number;
  biomasse_mw: number;
  wasser_mw: number;
  speicher_mw: number;
};

const PLACEHOLDER: PlaceholderBl[] = [
  { ags: "01", solar_mw: 3200, wind_mw: 8900, biomasse_mw: 190, wasser_mw: 30, speicher_mw: 420 },
  { ags: "02", solar_mw: 300, wind_mw: 130, biomasse_mw: 20, wasser_mw: 5, speicher_mw: 60 },
  { ags: "03", solar_mw: 8500, wind_mw: 13200, biomasse_mw: 1800, wasser_mw: 85, speicher_mw: 1100 },
  { ags: "04", solar_mw: 200, wind_mw: 240, biomasse_mw: 25, wasser_mw: 2, speicher_mw: 25 },
  { ags: "05", solar_mw: 11200, wind_mw: 7400, biomasse_mw: 900, wasser_mw: 430, speicher_mw: 1450 },
  { ags: "06", solar_mw: 4100, wind_mw: 2500, biomasse_mw: 500, wasser_mw: 85, speicher_mw: 550 },
  { ags: "07", solar_mw: 4800, wind_mw: 4050, biomasse_mw: 330, wasser_mw: 110, speicher_mw: 650 },
  { ags: "08", solar_mw: 13500, wind_mw: 1950, biomasse_mw: 920, wasser_mw: 920, speicher_mw: 1850 },
  { ags: "09", solar_mw: 25800, wind_mw: 2700, biomasse_mw: 2100, wasser_mw: 2350, speicher_mw: 3600 },
  { ags: "10", solar_mw: 900, wind_mw: 540, biomasse_mw: 60, wasser_mw: 15, speicher_mw: 120 },
  { ags: "11", solar_mw: 400, wind_mw: 10, biomasse_mw: 50, wasser_mw: 3, speicher_mw: 90 },
  { ags: "12", solar_mw: 7200, wind_mw: 8500, biomasse_mw: 540, wasser_mw: 15, speicher_mw: 1050 },
  { ags: "13", solar_mw: 3900, wind_mw: 3800, biomasse_mw: 320, wasser_mw: 10, speicher_mw: 480 },
  { ags: "14", solar_mw: 5600, wind_mw: 1550, biomasse_mw: 400, wasser_mw: 120, speicher_mw: 740 },
  { ags: "15", solar_mw: 4400, wind_mw: 5700, biomasse_mw: 420, wasser_mw: 35, speicher_mw: 580 },
  { ags: "16", solar_mw: 2700, wind_mw: 1800, biomasse_mw: 210, wasser_mw: 130, speicher_mw: 370 },
];

// Rough share of solar installations by segment (nation-wide approximation).
// Will be replaced by actual segment counts from MaStR per region.
const SOLAR_SEGMENT_SHARE: Record<Exclude<Segment, "n/a">, number> = {
  privat_dach: 0.35,
  gewerbe_dach: 0.30,
  freiflaeche: 0.35,
};

// Rough median kWp per unit per segment (for count ↔ kWp sanity)
const AVG_KWP: Record<Energietraeger, number> = {
  solar: 12,       // mix of EFH (9 kWp) and larger commercial (40+ kWp)
  wind: 3500,      // avg onshore turbine
  biomasse: 450,
  wasser: 180,
  speicher: 9,
};

function mwToKwp(mw: number): number {
  return mw * 1000;
}

function placeholderByBl(bl: PlaceholderBl, et: Energietraeger): { count: number; kwp: number } {
  const mw = {
    solar: bl.solar_mw,
    wind: bl.wind_mw,
    biomasse: bl.biomasse_mw,
    wasser: bl.wasser_mw,
    speicher: bl.speicher_mw,
  }[et];
  const kwp = mwToKwp(mw);
  const count = Math.round(kwp / AVG_KWP[et]);
  return { count, kwp };
}

function placeholderTotal(et: Energietraeger): { count: number; kwp: number } {
  let count = 0;
  let kwp = 0;
  for (const bl of PLACEHOLDER) {
    const e = placeholderByBl(bl, et);
    count += e.count;
    kwp += e.kwp;
  }
  return { count, kwp };
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Data-source toggle. Flip to true once Supabase is populated.
const LOAD_FROM_SUPABASE = false;
const PLACEHOLDER_AS_OF = "2025-01-31";

export async function getChoroplethData(
  parent: string,
  energietraeger: Energietraeger,
): Promise<{ data: ChoroplethEntry[]; source: "supabase" | "placeholder"; data_as_of: string }> {
  if (LOAD_FROM_SUPABASE) {
    // TODO(phase-3): SELECT region_id, SUM(kwp), SUM(count) FROM mastr_aggregates
    // JOIN mastr_regions r ON a.region_id = r.region_id
    // WHERE r.parent_region_id = $parent AND a.energietraeger = $et
    // GROUP BY region_id
    throw new Error("Supabase path not yet wired");
  }

  if (parent === "de") {
    const data = PLACEHOLDER.map((bl) => {
      const { count, kwp } = placeholderByBl(bl, energietraeger);
      return { region_id: bl.ags, count, kwp };
    });
    return { data, source: "placeholder", data_as_of: PLACEHOLDER_AS_OF };
  }

  // Landkreis-level not supported yet (phase 2 feature)
  return { data: [], source: "placeholder", data_as_of: PLACEHOLDER_AS_OF };
}

export async function getRegionSummary(
  regionId: string,
  energietraeger: Energietraeger,
): Promise<RegionSummary> {
  if (LOAD_FROM_SUPABASE) {
    throw new Error("Supabase path not yet wired");
  }

  let level: Level;
  let name: string;
  let total: { count: number; kwp: number };

  if (regionId === "de") {
    level = "de";
    name = "Deutschland";
    total = placeholderTotal(energietraeger);
  } else {
    const bl = bundeslandByAgs(regionId);
    if (!bl) throw new Error(`Unknown region: ${regionId}`);
    const placeholder = PLACEHOLDER.find((p) => p.ags === regionId);
    if (!placeholder) throw new Error(`No placeholder for AGS ${regionId}`);
    level = "bundesland";
    name = bl.name;
    total = placeholderByBl(placeholder, energietraeger);
  }

  const by_segment: SegmentBreakdown[] =
    energietraeger === "solar"
      ? (Object.entries(SOLAR_SEGMENT_SHARE) as [Exclude<Segment, "n/a">, number][]).map(([seg, share]) => ({
          segment: seg,
          count: Math.round(total.count * share),
          kwp: Math.round(total.kwp * share),
        }))
      : [{ segment: "n/a", count: total.count, kwp: total.kwp }];

  return {
    region_id: regionId,
    name,
    level,
    energietraeger,
    total_count: total.count,
    total_kwp: total.kwp,
    by_segment,
    source: "placeholder",
    data_as_of: PLACEHOLDER_AS_OF,
  };
}

export function allBundeslaenderSummary(energietraeger: Energietraeger): Promise<RegionSummary[]> {
  return Promise.all(BUNDESLAENDER.map((bl) => getRegionSummary(bl.ags, energietraeger)));
}
