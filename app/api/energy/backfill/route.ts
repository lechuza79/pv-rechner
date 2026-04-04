import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { fetchPublicPower, fetchCrossBorderFlows } from "../../../../lib/energy-api";
import { GENERATION_STACK_KEYS } from "../../../../lib/chart-utils";

// Backfill route: Fetches Energy-Charts data year by year,
// aggregates to weekly GWh totals, stores in Supabase.
// GET /api/energy/backfill?key=CRON_SECRET&year=2022
// GET /api/energy/backfill?key=CRON_SECRET&all=true  (2015–now)

const CRON_SECRET = process.env.CRON_SECRET;

// ─── ISO week helpers ───────────────────────────────────────────────────────

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getISOWeekYear(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return date.getUTCFullYear();
}

// ─── Nuclear import calculation ────────────────────────────────────────────

const NUCLEAR_COUNTRIES = ["fr", "cz", "ch", "se", "be", "nl"] as const;

const CBPF_NAME_TO_CODE: Record<string, string> = {
  france: "fr",
  czech_republic: "cz",
  switzerland: "ch",
  sweden: "se",
  belgium: "be",
  netherlands: "nl",
};

// ─── Aggregate raw data to weekly GWh ──────────────────────────────────────

interface WeekRow {
  week_key: string;     // "2022-W14"
  year: number;
  week: number;
  country: string;
  [key: string]: number | string;
}

function aggregateToWeeks(
  data: { ts: string; data: Record<string, string | number | null> }[],
  country: string,
  nuclearImportByTs?: Map<string, number>,
): WeekRow[] {
  if (data.length < 2) return [];

  const t0 = new Date(data[0].ts).getTime();
  const t1 = new Date(data[1].ts).getTime();
  const intervalHours = (t1 - t0) / (1000 * 60 * 60);

  const buckets = new Map<string, WeekRow>();

  for (const d of data) {
    const date = new Date(d.ts);
    const wk = getISOWeek(date);
    const yr = getISOWeekYear(date);
    const weekKey = `${yr}-W${String(wk).padStart(2, "0")}`;

    if (!buckets.has(weekKey)) {
      const row: WeekRow = { week_key: weekKey, year: yr, week: wk, country };
      for (const key of GENERATION_STACK_KEYS) row[key] = 0;
      row.load = 0;
      row.nuclear_import = 0;
      buckets.set(weekKey, row);
    }

    const bucket = buckets.get(weekKey)!;
    for (const key of GENERATION_STACK_KEYS) {
      const val = d.data[key];
      if (typeof val === "number" && val > 0) {
        bucket[key] = (bucket[key] as number) + val * intervalHours / 1000; // MW×h → GWh
      }
    }
    const load = d.data.load;
    if (typeof load === "number" && load > 0) {
      bucket.load = (bucket.load as number) + load * intervalHours / 1000;
    }

    // Nuclear import: GW × hours → GWh
    const nucImportGw = nuclearImportByTs?.get(d.ts) ?? 0;
    if (nucImportGw > 0) {
      bucket.nuclear_import = (bucket.nuclear_import as number) + nucImportGw * intervalHours / 1000;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.week_key.localeCompare(b.week_key));
}

// ─── Fetch + store one year ────────────────────────────────────────────────

async function calcNuclearImport(
  startStr: string,
  endStr: string,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  try {
    // Fetch cross-border flows for Germany
    const cbpfRows = await fetchCrossBorderFlows("de", startStr, endStr);
    if (cbpfRows.length === 0) return result;

    // Fetch nuclear countries generation mixes in parallel
    const countryGenRows = new Map<string, Map<string, { nuclear: number; total: number }>>();
    const countryResults = await Promise.allSettled(
      NUCLEAR_COUNTRIES.map(code =>
        fetchPublicPower(code, startStr, endStr, 6000, 1).then(rows => ({ code, rows }))
      )
    );

    for (const res of countryResults) {
      if (res.status === "rejected") continue;
      const { code, rows } = res.value;
      const tsMap = new Map<string, { nuclear: number; total: number }>();
      for (const row of rows) {
        const nuclear = (row.data.nuclear as number) ?? 0;
        let total = 0;
        for (const [key, val] of Object.entries(row.data)) {
          if (
            typeof val === "number" && val > 0 &&
            !key.includes("load") && !key.includes("share") &&
            !key.includes("cross_border") && !key.includes("consumption")
          ) {
            total += val;
          }
        }
        tsMap.set(row.ts, { nuclear, total });
      }
      countryGenRows.set(code, tsMap);
    }

    // Calculate nuclear import per timestamp
    for (const row of cbpfRows) {
      let nuclearGw = 0;
      for (const [name, val] of Object.entries(row.data)) {
        if (name === "net" || typeof val !== "number" || val <= 0) continue;
        const code = CBPF_NAME_TO_CODE[name];
        if (!code) continue;
        const mix = countryGenRows.get(code)?.get(row.ts);
        if (!mix || mix.total <= 0) continue;
        nuclearGw += val * (mix.nuclear / mix.total);
      }
      if (nuclearGw > 0) result.set(row.ts, nuclearGw);
    }
  } catch (e) {
    console.warn("Nuclear import calc failed (non-fatal):", (e as Error).message);
  }

  return result;
}

async function backfillYear(year: number, country: string): Promise<{ year: number; weeks: number; error?: string }> {
  if (!supabase) return { year, weeks: 0, error: "No database" };

  const currentYear = new Date().getFullYear();
  const startStr = `${year}-01-01T00:00:00+01:00`;
  const endStr = year === currentYear
    ? new Date().toISOString().slice(0, 19) + "+01:00"
    : `${year}-12-31T23:59:59+01:00`;

  try {
    // Fetch generation data + nuclear import in parallel
    const [rows, nuclearImportByTs] = await Promise.all([
      fetchPublicPower(country, startStr, endStr),
      calcNuclearImport(startStr, endStr),
    ]);
    if (rows.length === 0) return { year, weeks: 0, error: "No data from Energy-Charts" };

    const weeks = aggregateToWeeks(rows, country, nuclearImportByTs);
    if (weeks.length === 0) return { year, weeks: 0, error: "No weeks aggregated" };

    // Upsert into Supabase
    const { error } = await supabase
      .from("energy_weekly")
      .upsert(weeks, { onConflict: "week_key,country" });

    if (error) return { year, weeks: weeks.length, error: error.message };
    return { year, weeks: weeks.length };
  } catch (e) {
    return { year, weeks: 0, error: (e as Error).message };
  }
}

// ─── GET Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const authHeader = req.headers.get("authorization");

  if (!CRON_SECRET || (key !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const country = req.nextUrl.searchParams.get("country") || "de";
  const yearParam = req.nextUrl.searchParams.get("year");
  const all = req.nextUrl.searchParams.get("all") === "true";

  if (!yearParam && !all) {
    return NextResponse.json({ error: "Provide ?year=2022 or ?all=true" }, { status: 400 });
  }

  if (yearParam) {
    const year = parseInt(yearParam, 10);
    if (year < 2015 || year > new Date().getFullYear()) {
      return NextResponse.json({ error: "Year must be 2015–now" }, { status: 400 });
    }
    const result = await backfillYear(year, country);
    return NextResponse.json(result, { status: result.error ? 500 : 200 });
  }

  // Backfill all years sequentially (to not overwhelm Energy-Charts)
  const currentYear = new Date().getFullYear();
  const results: { year: number; weeks: number; error?: string }[] = [];

  for (let y = 2015; y <= currentYear; y++) {
    const result = await backfillYear(y, country);
    results.push(result);
    // Small delay between years to be nice to the API
    if (y < currentYear) await new Promise(r => setTimeout(r, 2000));
  }

  const totalWeeks = results.reduce((s, r) => s + r.weeks, 0);
  const errors = results.filter(r => r.error);

  return NextResponse.json({
    success: errors.length === 0,
    totalWeeks,
    results,
  });
}
