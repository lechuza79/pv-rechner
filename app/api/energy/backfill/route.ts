import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { fetchPublicPower, fetchCrossBorderFlows } from "../../../../lib/energy-api";
import { GENERATION_STACK_KEYS } from "../../../../lib/chart-utils";

// Backfill route: Fetches Energy-Charts data year by year,
// aggregates to weekly GWh totals, stores in Supabase.
// Auth: send Authorization: Bearer $CRON_SECRET header.
// GET /api/energy/backfill            → current year (default, used by weekly cron)
// GET /api/energy/backfill?year=2022  → specific year
// GET /api/energy/backfill?all=true   → 2015–now

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

    // Nuclear import: GW × hours = GWh (values from calcNuclearImport are already in GW)
    const nucImportGw = nuclearImportByTs?.get(d.ts) ?? 0;
    if (nucImportGw > 0) {
      bucket.nuclear_import = (bucket.nuclear_import as number) + nucImportGw * intervalHours;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.week_key.localeCompare(b.week_key));
}

// ─── Aggregate raw data to monthly GWh (energy_monthly) ────────────────────

// Monatssummen für die Solar-Trend-Auswertung (Zubau vs. Wetter). Dieselben
// Rohdaten wie die Wochen-Aggregation — kein zusätzlicher Upstream-Abruf.
// Nur VOLLSTÄNDIGE Monate werden geschrieben: ein angebrochener Monat stünde
// sonst als stille Untertreibung in jeder Vorjahres-Rechnung.
function aggregateToMonths(
  data: { ts: string; data: Record<string, string | number | null> }[],
  country: string,
): { source: string; metric: string; country: string; period: string; data: Record<string, number> }[] {
  if (data.length < 2) return [];
  const t0 = new Date(data[0].ts).getTime();
  const t1 = new Date(data[1].ts).getTime();
  const intervalHours = (t1 - t0) / (1000 * 60 * 60);
  if (!(intervalHours > 0)) return [];

  const buckets = new Map<string, { sums: Record<string, number>; points: number }>();
  for (const d of data) {
    // Monatszuordnung in fester +01:00-Konvention — dieselbe, mit der die
    // Abruf-Zeiträume dieser Route gebildet werden.
    const period = new Date(new Date(d.ts).getTime() + 3600_000).toISOString().slice(0, 7);
    let bucket = buckets.get(period);
    if (!bucket) {
      bucket = { sums: {}, points: 0 };
      for (const key of GENERATION_STACK_KEYS) bucket.sums[key] = 0;
      bucket.sums.load = 0;
      buckets.set(period, bucket);
    }
    bucket.points++;
    for (const key of GENERATION_STACK_KEYS) {
      const val = d.data[key];
      if (typeof val === "number" && val > 0) bucket.sums[key] += (val * intervalHours) / 1000;
    }
    const load = d.data.load;
    if (typeof load === "number" && load > 0) bucket.sums.load += (load * intervalHours) / 1000;
  }

  const currentPeriod = new Date(Date.now() + 3600_000).toISOString().slice(0, 7);
  const rows: { source: string; metric: string; country: string; period: string; data: Record<string, number> }[] = [];
  for (const [period, bucket] of buckets) {
    if (period >= currentPeriod) continue; // laufender Monat: unvollständig
    const [y, m] = period.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const expected = (daysInMonth * 24) / intervalHours;
    if (bucket.points < expected * 0.97) continue; // Datenlücke: lieber gar nicht
    const rounded: Record<string, number> = {};
    for (const [k, v] of Object.entries(bucket.sums)) rounded[k] = Math.round(v * 10) / 10;
    rows.push({ source: "energy-charts", metric: "generation_monthly", country, period, data: rounded });
  }
  return rows.sort((a, b) => a.period.localeCompare(b.period));
}

// Installierte PV-Leistung (Solar DC, GWp) je Monat — Grundlage der
// Zubau-Komponente. Ein Abruf deckt die komplette Reihe seit 2002 ab;
// gespeichert wird ab 2015 (Beginn unserer Erzeugungsdaten).
async function backfillInstalledSolar(country: string): Promise<{ months: number; error?: string }> {
  if (!supabase) return { months: 0, error: "No database" };
  try {
    const res = await fetch(
      `https://api.energy-charts.info/installed_power?country=${country}&time_step=monthly&installation_decommission=false`,
      { signal: AbortSignal.timeout(60_000) },
    );
    if (!res.ok) return { months: 0, error: `HTTP ${res.status} from api.energy-charts.info` };
    const json = (await res.json()) as { time: string[]; production_types: { name: string; data: (number | null)[] }[] };
    const solar = json.production_types.find((p) => p.name === "Solar DC");
    if (!solar) return { months: 0, error: "Solar DC series missing" };

    const currentPeriod = new Date(Date.now() + 3600_000).toISOString().slice(0, 7);
    const rows: { source: string; metric: string; country: string; period: string; data: Record<string, number> }[] = [];
    for (let i = 0; i < json.time.length; i++) {
      const m = /^(\d{2})\.(\d{4})$/.exec(json.time[i]);
      const val = solar.data[i];
      if (!m || typeof val !== "number" || val <= 0) continue;
      const period = `${m[2]}-${m[1]}`;
      // Der laufende Monat ist bei Energy-Charts bereits gefüllt (Stand des
      // Registers), aber unsere Erzeugungs-Monate enden beim Vormonat — mehr
      // Leistungs-Monate schaden nicht, sie warten auf ihre Erzeugung.
      if (period < "2015-01" || period > currentPeriod) continue;
      rows.push({ source: "energy-charts", metric: "installed_solar_monthly", country, period, data: { solar_dc_gw: val } });
    }
    if (rows.length === 0) return { months: 0, error: "No rows parsed" };
    const { error } = await supabase.from("energy_monthly").upsert(rows, { onConflict: "source,metric,country,period" });
    if (error) return { months: rows.length, error: error.message };
    return { months: rows.length };
  } catch (e) {
    return { months: 0, error: (e as Error).message };
  }
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

    // Fetch nuclear countries generation mixes sequentially (avoid rate limiting)
    // Full year of 15-min data per country is large — needs generous timeout
    const countryGenRows = new Map<string, Map<string, { nuclear: number; total: number }>>();
    const countryResults: { code: string; rows: Awaited<ReturnType<typeof fetchPublicPower>> }[] = [];
    for (const code of NUCLEAR_COUNTRIES) {
      try {
        const rows = await fetchPublicPower(code, startStr, endStr, 45000, 3);
        countryResults.push({ code, rows });
      } catch (e) {
        console.warn(`Nuclear import: ${code} fetch failed:`, (e as Error).message);
      }
      // Small delay between countries to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    for (const res of countryResults) {
      const { code, rows } = res;
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

    // Monatssummen aus denselben Rohdaten — Fehler hier sind nicht fatal für
    // den Wochen-Pfad, tauchen aber im Ergebnis auf.
    const months = aggregateToMonths(rows, country);
    if (months.length > 0) {
      const { error: em } = await supabase
        .from("energy_monthly")
        .upsert(months, { onConflict: "source,metric,country,period" });
      if (em) return { year, weeks: weeks.length, error: `monthly: ${em.message}` };
    }
    return { year, weeks: weeks.length };
  } catch (e) {
    return { year, weeks: 0, error: (e as Error).message };
  }
}

// Nur die Monats-Aggregation eines Jahres (ohne Wochen, ohne Kernimport) —
// für den einmaligen Rückfüll-Lauf der Trend-Historie deutlich billiger als
// der volle Jahres-Backfill.
async function backfillYearMonthlyOnly(year: number, country: string): Promise<{ year: number; months: number; error?: string }> {
  if (!supabase) return { year, months: 0, error: "No database" };
  const currentYear = new Date().getFullYear();
  const startStr = `${year}-01-01T00:00:00+01:00`;
  const endStr = year === currentYear
    ? new Date().toISOString().slice(0, 19) + "+01:00"
    : `${year}-12-31T23:59:59+01:00`;
  try {
    // Ein volles Jahr 15-Minuten-Werte ist ein großer Abruf — der 15-s-Default
    // reicht dafür nicht zuverlässig (die Hälfte der Jahre lief im ersten
    // Rückfüll-Lauf in die Zeitüberschreitung).
    const rows = await fetchPublicPower(country, startStr, endStr, 90_000, 3);
    if (rows.length === 0) return { year, months: 0, error: "No data from Energy-Charts" };
    const months = aggregateToMonths(rows, country);
    if (months.length === 0) return { year, months: 0 };
    const { error } = await supabase.from("energy_monthly").upsert(months, { onConflict: "source,metric,country,period" });
    if (error) return { year, months: months.length, error: error.message };
    return { year, months: months.length };
  } catch (e) {
    return { year, months: 0, error: (e as Error).message };
  }
}

// ─── GET Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const country = req.nextUrl.searchParams.get("country") || "de";
  const yearParam = req.nextUrl.searchParams.get("year");
  const all = req.nextUrl.searchParams.get("all") === "true";

  // Rückfüll-Lauf der Monats-Historie (Trend-Auswertung): nur Monatssummen +
  // installierte Leistung, ohne den teuren Kernimport-Teil.
  // GET /api/energy/backfill?monthly=all      → 2015 bis heute
  // GET /api/energy/backfill?monthly=2021,2025 → gezielt einzelne Jahre
  //   (Nachfassen, wenn ein Jahr in die Zeitüberschreitung gelaufen ist)
  const monthlyParam = req.nextUrl.searchParams.get("monthly");
  if (monthlyParam) {
    const currentYear = new Date().getFullYear();
    const years = monthlyParam === "all"
      ? Array.from({ length: currentYear - 2015 + 1 }, (_, i) => 2015 + i)
      : monthlyParam.split(",").map((y) => parseInt(y.trim(), 10))
          .filter((y) => Number.isInteger(y) && y >= 2015 && y <= currentYear);
    if (years.length === 0) {
      return NextResponse.json({ error: "monthly must be 'all' or years 2015–now" }, { status: 400 });
    }
    const results: { year: number; months: number; error?: string }[] = [];
    for (const y of years) {
      results.push(await backfillYearMonthlyOnly(y, country));
      if (y !== years[years.length - 1]) await new Promise((r) => setTimeout(r, 2000));
    }
    const installed = await backfillInstalledSolar(country);
    const errors = results.filter((r) => r.error);
    return NextResponse.json({
      success: errors.length === 0 && !installed.error,
      totalMonths: results.reduce((s, r) => s + r.months, 0),
      installed,
      results,
    });
  }

  // Default: current year (so the weekly cron can call this URL without
  // any params and never needs maintenance at year-rollover).
  if (!all) {
    const currentYear = new Date().getFullYear();
    const year = yearParam ? parseInt(yearParam, 10) : currentYear;
    if (Number.isNaN(year) || year < 2015 || year > currentYear) {
      return NextResponse.json({ error: "Year must be 2015–now" }, { status: 400 });
    }
    const result = await backfillYear(year, country);
    // Die Leistungs-Reihe wandert im Wochen-Cron gleich mit — ein kleiner
    // Abruf, und der Trend bleibt ohne eigenen Cron-Eintrag aktuell.
    const installed = await backfillInstalledSolar(country);
    return NextResponse.json({ ...result, installed }, { status: result.error ? 500 : 200 });
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
