/**
 * Build the per-municipality data package for the new municipality page.
 *
 * The reviewed prototype (scripts/municipality-preview) prepared its data for
 * ONE town, with the key typed into six adapters. This run does the same work
 * for any town, with the SAME calculation functions, and writes one package per
 * town. Nothing here runs during a page request (lesson from the award list,
 * 09/2026: precompute, never compute in the page build).
 *
 * Inputs (local caches of the nationwide preparation, one register edition):
 *   scripts/.cache/story-discovery/<ags>.json            discovery report
 *   scripts/.cache/story-prepared/<edition>/<ags>.json   month/year/value baseline
 *   scripts/.cache/bnetza/story-history-<edition>/cities/<ags>.json  daily solar cohorts
 *   scripts/.cache/bnetza/story-history-<edition>/storage.json        storage cohorts
 *   scripts/.cache/story-radial/<ags>-value-units.json    unit valuation inventory
 *   scripts/.cache/era5-archive                           ERA5 blocks (offline)
 *   ranking stats: read live from the Atlas (loadAwardStatsFresh), i.e. the
 *   SAME figures the public ranking pages show — the prototype's local stats
 *   file was an older edition and differed in 117 towns (measured 22.09.2026)
 *   Atlas database (read only): names, slugs, population, register sums
 *
 * Output: scripts/.cache/gemeinde-pakete/<edition>/<ags>.json and a run summary.
 * A town whose inputs are missing gets a package with the element listed in
 * `missing` and a reason — never a borrowed or zero value.
 *
 *   npx tsx --conditions=react-server scripts/gemeinde-paket.ts --ags=09679147
 *   npx tsx --conditions=react-server scripts/gemeinde-paket.ts --alle
 */
import { loadEnvConfig } from "@next/env";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildStoryPool } from "../lib/story-pool";
import { conceptFromFinding } from "../lib/story-finding-concept";
import { storyVisualTemplate } from "../lib/story-approved-visual";
import { attachPreparedStories } from "../lib/story-prepared-server";
import { municipalChartsFromReport } from "../lib/municipal-chart-catalog";
import { appendRankingMonth, rankingDistinction, rankingMonthRows } from "../lib/story-ranking-month";
import type { RankMonthSnapshot } from "../lib/story-ranking-month";
import { atlasRankMonth } from "../lib/story-ranking-atlas";
import { rankingKategorien } from "../lib/atlas-ranking";
import { klasseVon } from "../lib/gemeindegroesse";
import { RANKING_FELDER } from "../lib/ranking-felder";
import type { GemeindeStats } from "../lib/awards";
import { compareRanks, comparisonText } from "../lib/rank-comparison";
import { era5StoryWeather } from "../lib/story-weather-provider";
import { solarMonth } from "../lib/story-monthly-solar";
import { energyYear } from "../lib/story-energy-year";
import { unitMonthValue } from "../lib/story-unit-value";
import type { DiscoveryReport } from "../lib/story-discovery";
import { GEMEINDE_PAKET_VERSION, type GemeindePaket, type PaketLuecke } from "../lib/gemeinde-paket";

loadEnvConfig(process.cwd());
const arg = (key: string) => process.argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3);
const CACHE = "scripts/.cache";
const EDITION = arg("stand") ?? "2026-09-10";
let RANG_STAND = "";
const OUT = path.join(CACHE, "gemeinde-pakete", EDITION);
/** Last complete calendar month of the weather archive and the register edition. */
const LETZTER_MONAT = arg("monat") ?? "2026-08";
const MONATE = Number(arg("monate") ?? 20);
const JAHRE = (arg("jahre") ?? "2025,2024,2023").split(",").map(Number);

const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("Atlas-Datenbank nicht konfiguriert (SUPABASE_URL / SUPABASE_SERVICE_KEY).");
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
async function db<T>(route: string, body?: unknown): Promise<T> {
  // Sequential, bounded reads: this is a batch run against the live database.
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(new URL("/rest/v1/" + route, url), {
      headers,
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    }).catch((e) => e as Error);
    if (!(r instanceof Error) && r.ok) return (await r.json()) as T;
    if (attempt >= 2) throw new Error(`Atlas-Lesezugriff ${route.split("?")[0]} fehlgeschlagen: ${r instanceof Error ? r.message : r.status}`);
    await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
  }
}

type Region = { region_id: string; name: string; slug: string; population: number | null; population_as_of: string | null; parent_region_id: string | null };
type SolarCell = { region_id: string; segment: string; count: number; kwp: number };
type Award = { region_id: string; batterie_privat_count: number; batterie_gewerbe_count: number; batterie_privat_kwh: number; batterie_gewerbe_kwh: number };

const PRIVAT = ["privat_dach", "steckersolar"];
/** Solar topics of a discovery report's coverage. Everything else there is
 *  storage — battery, pumped or other; the prototype only excluded "batterie"
 *  and would have counted other storage as solar systems (Höchberg has none). */
const SOLAR_TOPICS = new Set(["gebaeude", "steckersolar", "freiflaeche", "sonstige"]);
const GEWERBE = ["gewerbe_dach", "freiflaeche"];

/** District peers, exactly as the prototype built them (refresh-register.mjs). */
async function districtData(kreis: string) {
  const [solar, storage, regions] = await Promise.all([
    db<SolarCell[]>("rpc/mastr_children", { p_prefix: kreis, p_child_len: 8, p_traeger: ["solar"], p_year_recent: null, p_year_max: null }),
    db<Award[]>(`mastr_gemeinde_award?select=region_id,batterie_privat_count,batterie_gewerbe_count,batterie_privat_kwh,batterie_gewerbe_kwh&region_id=like.${kreis}*`),
    db<Region[]>(`mastr_regions?select=region_id,name,slug,population,population_as_of,parent_region_id&parent_region_id=eq.${kreis}`),
  ]);
  const peers = regions
    .filter((r) => (r.population ?? 0) > 0)
    .flatMap((r) => {
      const battery = storage.find((s) => s.region_id === r.region_id);
      if (!battery) return []; // A town without an award row has no comparable storage figure.
      const rows = solar.filter((s) => s.region_id === r.region_id);
      const sums = Object.fromEntries(
        (["alle", "privat", "gewerbe"] as const).map((owner) => {
          const allowed = owner === "alle" ? null : owner === "privat" ? PRIVAT : GEWERBE;
          const cells = rows.filter((s) => !allowed || allowed.includes(s.segment));
          return [owner, {
            count: cells.reduce((n, s) => n + Number(s.count), 0),
            kwp: cells.reduce((n, s) => n + Number(s.kwp), 0),
            speicher: (owner !== "gewerbe" ? Number(battery.batterie_privat_kwh) : 0) + (owner !== "privat" ? Number(battery.batterie_gewerbe_kwh) : 0),
          }];
        }),
      );
      return [{ ...r, sums, batteryCount: Number(battery.batterie_privat_count) + Number(battery.batterie_gewerbe_count) }];
    });
  for (const row of peers)
    for (const metric of ["count", "kwp", "speicher"] as const) {
      const s = row.sums as Record<string, Record<string, number>>;
      if (!Number.isFinite(s.alle[metric]) || Math.abs(s.alle[metric] - s.privat[metric] - s.gewerbe[metric]) > 0.1)
        throw new Error(`Eigentümer-Summen gehen in ${row.name} nicht auf`);
    }
  return { regions, peers };
}


async function buildPackage(
  ags: string,
  ctx: { stats: GemeindeStats[]; storageRows: { region_id: string; segment: string; month: string; count: number; kwh: number }[]; kreise: Map<string, Awaited<ReturnType<typeof districtData>>>; slugs: Record<string, string>; regionNames: Map<string, string> },
): Promise<GemeindePaket> {
  const missing: PaketLuecke[] = [];
  const reportFile = `${CACHE}/story-discovery/${ags}.json`;
  if (!existsSync(reportFile)) throw new Error(`Kein Entdeckungsbericht für ${ags}`);
  const report = read(reportFile) as DiscoveryReport;
  if (report.sourceDate !== EDITION) throw new Error(`${ags}: Bericht vom ${report.sourceDate}, Lauf für ${EDITION}`);
  const kreis = ags.slice(0, 5);
  if (!ctx.kreise.has(kreis)) ctx.kreise.set(kreis, await districtData(kreis));
  const district = ctx.kreise.get(kreis)!;
  const districtName = ctx.regionNames.get(kreis) ?? kreis;

  // ── Ranking positions (atlasRankMonth over the nationwide stats edition) ──
  const rankMonth: RankMonthSnapshot = atlasRankMonth(ctx.stats, ags, RANG_STAND, districtName, ctx.slugs);
  appendRankingMonth(report, rankMonth);

  // ── Charts: prepared availability + municipal catalogue (prepare-charts.ts) ──
  // Stories and charts read the SAME report: ranking month appended, prepared
  // month/year/value data attached (the prototype's bundled report had both).
  const withPrepared = await attachPreparedStories(report).catch(() => null);
  if (!withPrepared?.prepared) missing.push({ bereich: "diagramme", grund: "Vorbereitete Monats- und Jahreswerte fehlen." });
  const charts = withPrepared ? municipalChartsFromReport(withPrepared) : null;

  // ── Stories: selection unchanged from the prototype (stories.ts) ──
  const seen = new Set<string>();
  const storyReport = withPrepared ?? report;
  const concepts = buildStoryPool(storyReport)
    .topics.flatMap((topic) => topic.observations.map((_, index) => conceptFromFinding(storyReport, topic, index)))
    .sort((a, b) => Number(b.kind === "yield" && (b.yieldSeries?.length ?? 0) > 24) - Number(a.kind === "yield" && (a.yieldSeries?.length ?? 0) > 24))
    .filter((story) => {
      const type = storyVisualTemplate(story);
      if (!type || seen.has(type)) return false;
      seen.add(type);
      return true;
    });
  const compared = compareRanks(rankMonth, []);
  const byKey = new Map(compared.map((row) => [row.key, row]));
  const stories = concepts.map((story) => {
    if (!story.rankSummary) return story;
    const rankComparisons = story.rankSummary.map((row) => byKey.get(row.key)).filter((r): r is NonNullable<typeof r> => Boolean(r));
    const rankComparisonCopy = rankComparisons.flatMap((row) =>
      (["month", "year"] as const).map((kind) => {
        const text = comparisonText(row, kind);
        return text ? `${row.label} · ${row.scope}: ${text}` : null;
      }).filter((t): t is string => Boolean(t)),
    );
    return { ...story, rankComparisons, rankComparisonCopy };
  });

  // ── Register block + district peers (refresh-register.mjs) ──
  const own = district.peers.find((r) => r.region_id === ags) ?? null;
  const series = await db<unknown[]>("rpc/mastr_region_series", { p_prefix: ags, p_traeger: ["solar"] });
  const stock = report.candidates.find((c) => c.family === "Speicherbestand");
  const mix = charts?.charts.find((c) => c.template === "anteilsdonut")?.story ?? null;
  const coverage = report.coverage ?? [];
  let registerAbweichung: string | null = null;
  if (own) {
    const reportCount = coverage.filter((r) => SOLAR_TOPICS.has(r.topic)).reduce((n, r) => n + r.count, 0);
    const reportPower = mix?.values?.reduce((n: number, r: { value: number }) => n + r.value, 0) ?? NaN;
    const storageCount = stock?.evidence.find((r) => r.unit === "Einheiten")?.value;
    if (own.sums.alle.count !== reportCount || Math.abs(own.sums.alle.kwp - reportPower) > 0.1 || (storageCount != null && own.batteryCount !== storageCount))
      registerAbweichung = `Atlas ${own.sums.alle.count} Anlagen / ${own.sums.alle.kwp.toFixed(1)} kWp / ${own.batteryCount} Speicher, Bericht ${reportCount} / ${Number(reportPower).toFixed(1)} / ${storageCount ?? "—"}`;
  } else missing.push({ bereich: "register", grund: "Gemeinde ohne Einwohner oder ohne Speicherzeile im Atlas." });

  // The same size class the rankings use (e.g. 5.000–19.999 inhabitants).
  const size = own?.population ? klasseVon(own.population) : null;
  const populationMin = size?.min ?? null;
  const populationMaxExclusive = size?.max ?? null;
  const peersInClass = district.peers.filter(
    (r) => populationMin != null && (r.population ?? 0) >= populationMin && (populationMaxExclusive == null || (r.population ?? 0) < populationMaxExclusive),
  );

  // ── Monitor history: 25 month-end cohorts (prepare-monitor-history.mjs) ──
  const cityFile = `${CACHE}/bnetza/story-history-${EDITION}/cities/${ags}.json`;
  let monitorHistory: GemeindePaket["monitorHistory"] = null;
  const daily: { segment: string; day: string; count: number; kwp: number }[] | null = existsSync(cityFile) ? read(cityFile).daily : null;
  if (!daily) missing.push({ bereich: "verlauf", grund: "Keine Anlagen mit Inbetriebnahmedatum im Register." });
  else {
    // Batteries only: the storage file also carries pumped and other storage,
    // which the "Speicher" figures of the page do not mean (same prototype gap).
    const batteries = ctx.storageRows.filter((row) => row.region_id === ags && row.segment === "batterie");
    const sum = <T,>(rows: T[], k: keyof T) => rows.reduce((t, r) => t + Number(r[k]), 0);
    const solarCount = coverage.filter((r) => SOLAR_TOPICS.has(r.topic)).reduce((n, r) => n + r.count, 0);
    const storageCount = stock?.evidence.find((r) => r.unit === "Einheiten")?.value;
    const reconciles = sum(daily, "count") === solarCount && (storageCount == null || sum(batteries, "count") === storageCount);
    if (!reconciles) missing.push({ bereich: "verlauf", grund: "Tagesverlauf und Bestand des Berichts stimmen nicht überein." });
    else {
      const [year, month] = EDITION.split("-").map(Number);
      const observations = Array.from({ length: 25 }, (_, index) => {
        const end = new Date(Date.UTC(year, month - 1 - index, 0)).toISOString().slice(0, 10);
        const systems = daily.filter((row) => row.day <= end);
        const stores = batteries.filter((row) => row.month <= end.slice(0, 7));
        return {
          end,
          solarCounts: Object.fromEntries(["gebaeude", "steckersolar"].map((s) => [s, sum(systems.filter((r) => r.segment === s), "count")])),
          solarMix: ["gebaeude", "steckersolar"].map((s) => ({ label: s === "gebaeude" ? "Gebäudeanlagen" : "Balkonkraftwerke", value: sum(systems.filter((r) => r.segment === s), "kwp") })),
          solarCount: sum(systems, "count"),
          solarKwp: sum(systems, "kwp"),
          solarAdditions: sum(systems.filter((r) => r.day.slice(0, 4) === end.slice(0, 4)), "count"),
          batteryCount: sum(stores, "count"),
          batteryKwh: sum(stores, "kwh"),
        };
      });
      monitorHistory = { method: "active-register-by-commissioning-date", observations };
    }
  }

  // ── Monitor periods: months, years, values (prepare-monitor-periods.cjs) ──
  const baselineFile = `${CACHE}/story-prepared/${EDITION}/${ags}.json`;
  const unitsFile = `${CACHE}/story-radial/${ags}-value-units.json`;
  let monitorPeriods: GemeindePaket["monitorPeriods"] = null;
  if (!existsSync(baselineFile) || !daily) missing.push({ bereich: "zeitraeume", grund: "Vorbereitete Wetter- und Anlagengrundlage fehlt." });
  else {
    const baseline = read(baselineFile);
    const inventory = existsSync(unitsFile) ? read(unitsFile) : null;
    if (inventory && inventory.sourceDate !== baseline.sourceDate) throw new Error(`${ags}: Bewertungsbestand aus anderem Registerstand`);
    const original = baseline.values?.[LETZTER_MONAT] ?? null;
    const saved = baseline.monthly?.sourceUrl ? new URL(baseline.monthly.sourceUrl) : null;
    const position = saved ? { latitude: Number(saved.searchParams.get("latitude")), longitude: Number(saved.searchParams.get("longitude")) } : null;
    if (!position || !Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)) missing.push({ bereich: "zeitraeume", grund: "Keine örtliche Wetterkoordinate." });
    else {
      const result: NonNullable<GemeindePaket["monitorPeriods"]> = {
        valuationAssumptionDate: original?.valuationDate ?? null,
        privateSelfConsumption: original?.privateSelfConsumption ?? null,
        weatherPoint: position,
        monthly: [],
        annual: [],
      };
      const [ly, lm] = LETZTER_MONAT.split("-").map(Number);
      for (let offset = 0; offset < MONATE; offset++) {
        const monthIndex = lm - 1 - offset;
        const month = new Date(Date.UTC(ly, monthIndex, 15)).toISOString().slice(0, 7);
        const startDate = new Date(Date.UTC(ly, monthIndex, 0)).toISOString().slice(0, 10);
        const endDate = new Date(Date.UTC(ly, monthIndex + 1, 0)).toISOString().slice(0, 10);
        try {
          const weather = era5StoryWeather({ ...position, startDate, endDate, wind: false });
          const solar = { ...solarMonth(weather.weather as never, daily, month, baseline.sourceDate, weather.retrievedAt, weather.sourceUrl), town: report.name };
          let value: ReturnType<typeof unitMonthValue> extends infer V ? Omit<V & object, "rows"> | null : never = null;
          if (inventory && original) {
            try {
              const { rows: _rows, ...v } = unitMonthValue(inventory.units, weather.weather as never, month, original.privateSelfConsumption);
              void _rows;
              if (Math.abs(v.totalMwh - solar.totalMwh) > Math.max(0.001, solar.totalMwh * 0.00001)) throw new Error("Monatsdiagramm und Anlagenbewertung weichen ab.");
              if (month === LETZTER_MONAT && Math.abs(v.euro - original.euro) > Math.max(1, original.euro * 0.0001)) throw new Error("Gespeicherte Bewertung des Basismonats hat sich verändert.");
              value = v;
            } catch (e) {
              missing.push({ bereich: "wert", zeitraum: month, grund: (e as Error).message });
            }
          }
          result.monthly.push({ month, solar, value });
        } catch (e) {
          missing.push({ bereich: "monat", zeitraum: month, grund: (e as Error).message });
        }
      }
      // Wind stock at a year end: the Atlas series by commissioning year, summed —
      // the same active-register method as wind_kwp_ly behind the prepared year.
      // Guard: the series must reproduce the prepared year's stock exactly, or
      // no other year is offered (different editions, different answer).
      const windSeries = await db<{ year: number; kwp: number }[]>("rpc/mastr_region_series", { p_prefix: ags, p_traeger: ["wind"] });
      const windBis = (y: number) => windSeries.filter((r) => r.year <= y).reduce((n, r) => n + Number(r.kwp), 0);
      const windPasst = baseline.annual?.windKw != null && Math.abs(windBis(baseline.annual.year) - baseline.annual.windKw) < 0.01;
      for (const year of JAHRE) {
        try {
          const baseWind = baseline.annual?.windKw ?? null;
          if (baseWind == null) throw new Error("Kein Jahresprofil in der Grundlage.");
          if (year !== baseline.annual.year && !windPasst) throw new Error("Windbestand der Jahresreihe passt nicht zum vorbereiteten Jahr.");
          const windKw = year === baseline.annual.year ? baseWind : windBis(year);
          const weather = era5StoryWeather({ ...position, startDate: `${year}-01-01`, endDate: `${year}-12-31`, wind: true });
          const solarKwp = daily.filter((row) => row.day < `${year + 1}-01-01`).reduce((s, row) => s + row.kwp, 0);
          result.annual.push(energyYear(weather.weather as never, { town: report.name, year, solarKwp, windKw, sourceDate: baseline.sourceDate, retrievedAt: weather.retrievedAt, sourceUrl: weather.sourceUrl }));
        } catch (e) {
          missing.push({ bereich: "jahr", zeitraum: String(year), grund: (e as Error).message });
        }
      }
      monitorPeriods = result;
    }
  }

  // ── Ranking entries: own position per list; full lists stay global ──
  const categories = new Map(rankingKategorien().map((c) => [c.key, c]));
  const fields = new Map(RANKING_FELDER.map((f) => [f.slug, f]));
  const rankings = rankingMonthRows(rankMonth)
    .map((saved) => {
      const [categoryKey, , fieldSlug] = saved.key.split(":");
      const category = categories.get(categoryKey);
      const field = fieldSlug === "all" ? null : fields.get(fieldSlug) ?? null;
      if (!category) throw new Error(`Unbekannte Ranglisten-Kategorie ${categoryKey}`);
      void field;
      const comparison = byKey.get(saved.key);
      return {
        ...saved,
        distinction: saved.rank <= 3 ? `Platz ${saved.rank}` : rankingDistinction(saved.rank, saved.size),
        format: category.format,
        asOf: rankMonth.observedAt,
        comparisonMonth: comparison ? comparisonText(comparison, "month") : null,
        comparisonYear: comparison ? comparisonText(comparison, "year") : null,
        changePeriod: category.metricVorjahr ? "Seit Jahresbeginn" : null,
      };
    })
    .sort((a, b) => Number(b.rank <= 3) - Number(a.rank <= 3) || a.rank / a.size - b.rank / b.size);
  if (!rankings.length) missing.push({ bereich: "ranglisten", grund: "Keine Rangliste mit mindestens drei Orten." });

  return {
    version: GEMEINDE_PAKET_VERSION,
    ags,
    name: report.name,
    kreis: { ags: kreis, name: districtName },
    registerStand: EDITION,
    rangStand: RANG_STAND,
    atlasStand: own ? (district.regions[0]?.population_as_of ?? null) : null,
    gebautAm: new Date().toISOString(),
    stories,
    charts,
    register: own ? { own, coverage, storage: stock?.evidence ?? [], series, chartMix: mix, abweichung: registerAbweichung } : null,
    district: { populationMin, populationMaxExclusive, peers: peersInClass, districtPeers: district.peers },
    monitorHistory,
    monitorPeriods,
    rankings,
    missing,
  };
}

function atomic(file: string, data: unknown) {
  const tmp = file + ".tmp";
  writeFileSync(tmp, JSON.stringify(data));
  renameSync(tmp, file);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { loadAwardStatsFresh } = await import("../lib/awards-server");
  const stats = await loadAwardStatsFresh();
  if (stats.length < 10_000) throw new Error(`Ranglisten-Grundlage unvollständig (${stats.length} Orte)`);
  // The ranking date is the Atlas import the stats come from, not today.
  const meta = await db<{ imported_at: string }[]>("mastr_meta?select=imported_at&id=eq.1");
  RANG_STAND = meta[0]?.imported_at?.slice(0, 10) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(RANG_STAND)) throw new Error("Atlas-Importdatum fehlt");
  const storage = read(`${CACHE}/bnetza/story-history-${EDITION}/storage.json`);
  if (storage.sourceDate !== EDITION) throw new Error("Speicher-Verlauf aus anderem Registerstand");
  const regions = await db<Region[]>("mastr_regions?select=region_id,name,slug&region_id=not.like.________&limit=1000");
  const slugs = Object.fromEntries(regions.map((r) => [r.region_id, r.slug]));
  const regionNames = new Map(regions.map((r) => [r.region_id, r.name]));
  const ids = arg("ags")?.split(",") ?? (process.argv.includes("--alle")
    ? readdirSync(`${CACHE}/story-discovery`).filter((f) => /^\d{8}\.json$/.test(f)).map((f) => f.slice(0, 8)).sort()
    : []);
  if (!ids.length) throw new Error("--ags=<schlüssel,…> oder --alle angeben");
  const skip = process.argv.includes("--neu") ? false : true;
  const ctx = { stats, storageRows: storage.rows, kreise: new Map(), slugs, regionNames };
  const summary = { edition: EDITION, rangStand: RANG_STAND, gebaut: 0, uebersprungen: 0, fehler: [] as { ags: string; grund: string }[], luecken: {} as Record<string, number>, abweichungen: 0 };
  for (const ags of ids) {
    const file = path.join(OUT, `${ags}.json`);
    if (skip && existsSync(file)) { summary.uebersprungen++; continue; }
    try {
      const pkg = await buildPackage(ags, ctx);
      atomic(file, pkg);
      summary.gebaut++;
      if (pkg.register?.abweichung) summary.abweichungen++;
      for (const l of pkg.missing) summary.luecken[`${l.bereich}: ${l.grund}`] = (summary.luecken[`${l.bereich}: ${l.grund}`] ?? 0) + 1;
      if (ids.length <= 5) console.log(`${pkg.name}: ${pkg.stories.length} Geschichten, ${pkg.rankings.length} Ranglisten, ${pkg.monitorPeriods?.monthly.length ?? 0} Monate, ${pkg.monitorPeriods?.annual.length ?? 0} Jahre, Lücken ${pkg.missing.length}${pkg.register?.abweichung ? `, Abweichung: ${pkg.register.abweichung}` : ""}`);
      else if (summary.gebaut % 250 === 0) console.log(`${summary.gebaut} gebaut …`);
    } catch (e) {
      summary.fehler.push({ ags, grund: (e as Error).message });
      console.error(`${ags}: ${(e as Error).message}`);
    }
  }
  atomic(path.join(OUT, "_lauf.json"), { ...summary, beendet: new Date().toISOString() });
  console.log(JSON.stringify({ ...summary, fehler: summary.fehler.length }, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
