// District-vs-district rankings: Landkreise and kreisfreie Städte compared with
// each other, within a Bundesland or across Deutschland.
//
// PURE — no DB, no Next. The server reader is lib/kreis-ranking-server.ts; the
// data contract for page integration is docs/kreis-ranking-daten.md.
//
// WHY THIS IS NOT A SECOND RANKING ENGINE
// The Gemeinde rankings already define what is measured (lib/awards.ts), how a
// tie is ranked (`rankGemeinden`: sport rank, name as tie-breaker) and how a
// value is written (`formatAwardValue` → lib/atlas-format.ts). This module only
// builds the same input shape (`GemeindeStats`) for a district — from the
// district's ROLLUP, never from summed Gemeinde rows — and hands it to those
// very functions. A second definition of "private Solarleistung je Einwohner"
// would drift from the Gemeinde one, and the press release and the linked page
// would then disagree.
//
// LANDKREIS VS KREISFREIE STADT — a structural marker, not the name.
// `mastr_regions.bezeichnung` on the level='landkreis' row is the official
// designation. "Kreisfreie Stadt" and "Stadtkreis" (the Baden-Württemberg term)
// are cities; "Landkreis", "Kreis" (NRW, Schleswig-Holstein) and
// "Regionalverband" (Saarbrücken, a Kommunalverband in the place of a
// Landkreis) are districts. Same set as lib/ranking-felder.ts and
// lib/kfw-kreis-zuordnung.ts. Name heuristics fail both ways: "Region Hannover"
// is a Landkreis without the word, "Kaiserslautern" exists as both.
// Rows WITHOUT a designation are retired keys (Göttingen 03152, Osterode
// 03156, Eisenach 16056 — measured 01.10.2026: no population, no slug, no
// rollup) and are not districts.

import {
  AWARD_CATEGORY_BY_KEY,
  FREIFLAECHE_DEDUP_ABZUG,
  formatAwardValue,
  rankGemeinden,
  type AwardCategory,
  type GemeindeStats,
} from "./awards";
import { MIN_MENGE_FUER_AUFHAENGER, MIN_WERT_FUER_AUFHAENGER } from "./award-hook";
import { istStadtstaat } from "./atlas-orte";

export type KreisArt = "landkreis" | "kreisfrei";

/** Which districts take part in a comparison. */
export type KreisGruppe = "landkreise" | "alle";

export type KreisEbene = "bundesland" | "de";

/** One row of mastr_regions with level='landkreis'. */
export type KreisRegisterZeile = {
  regionId: string; // 5-digit AGS
  name: string;
  bezeichnung: string | null;
  population: number | null;
  slug: string | null;
};

/** One row of mastr_region_rollup. */
export type RollupZeile = {
  regionKey: string;
  energietraeger: string;
  segment: string;
  year: number;
  count: number;
  kwp: number;
  kwh: number;
};

export type KreisStats = GemeindeStats & { art: KreisArt; landId: string };

const KREISFREI = new Set(["Kreisfreie Stadt", "Stadtkreis"]);
const LANDKREIS = new Set(["Landkreis", "Kreis", "Regionalverband"]);

/** Landkreis, kreisfreie Stadt, or null for a retired / unknown key. An
 *  unknown designation is NOT guessed into either group. */
export function kreisArtVon(bezeichnung: string | null | undefined): KreisArt | null {
  if (!bezeichnung) return null;
  if (KREISFREI.has(bezeichnung)) return "kreisfrei";
  if (LANDKREIS.has(bezeichnung)) return "landkreis";
  return null;
}

// ─── Metrics ────────────────────────────────────────────────────────────────

/**
 * Total installed solar per inhabitant — DISTRICT ONLY.
 *
 * At Gemeinde level this was rejected on purpose (Büttel: 120 inhabitants next
 * to an industrial plant → 4.2 million Wp per head, see `solar-gesamt` in
 * lib/awards.ts). A district averages over ~100,000 inhabitants, the value is
 * readable, and the district page shows exactly this number. It still contains
 * solar parks and commercial roofs: it measures the LOCATION, not what the
 * residents did — never phrase it as a citizens' achievement.
 */
export const KREIS_SOLAR_GESAMT_PK: AwardCategory = {
  key: "kreis-solar-gesamt-pk",
  label: "Solar gesamt je Einwohner",
  merit: "Meiste installierte Solarleistung je Einwohner — Dächer, Balkone und Freiflächen zusammen.",
  bestleistung: "die meiste installierte Solarleistung je Einwohner",
  thema: "installierte Solarleistung je Einwohner",
  themaDativ: "installierter Solarleistung je Einwohner",
  betreffPhrase: "bei der installierten Solarleistung",
  traeger: "gewerbe",
  messart: "proKopf",
  format: "wattProKopf",
  metric: (g) => (g.population > 0 && (g.solarKwp ?? 0) > 0 ? ((g.solarKwp ?? 0) * 1000) / g.population : null),
  metricVorjahr: (g) => (g.population > 0 && (g.solarKwpLy ?? 0) > 0 ? ((g.solarKwpLy ?? 0) * 1000) / g.population : null),
};

/**
 * The district metrics: every per-capita / ratio metric of the Gemeinde
 * rankings (the definitions are taken, not copied) plus total solar per head.
 * Absolute metrics are left out for the reason given in lib/awards.ts: across
 * districts an absolute ranking is a population ranking with another title.
 */
export const KREIS_KATEGORIEN: AwardCategory[] = [
  ...["dach-privat-pk", "balkon-pk", "speicherquote", "batterie-privat-pk", "tempo-1j", "tempo-3j", "tempo-5j"].map((k) => {
    const c = AWARD_CATEGORY_BY_KEY[k];
    if (!c) throw new Error(`kreis-ranking: award category ${k} missing`);
    return c;
  }),
  KREIS_SOLAR_GESAMT_PK,
];

export const KREIS_KATEGORIE_BY_KEY: Record<string, AwardCategory> = Object.fromEntries(
  KREIS_KATEGORIEN.map((c) => [c.key, c]),
);

/**
 * How far a metric carries a press hook at district level. Facts about the
 * metric, not a ranking rule: the ranking itself lists every district.
 */
export const KREIS_PRESSE_EIGNUNG: Record<string, { traegt: boolean; hinweis: string }> = {
  "dach-privat-pk": { traegt: true, hinweis: "Bürgerleistung; die sauberste Aussage für eine Pressemeldung." },
  "balkon-pk": { traegt: true, hinweis: "Bürgerleistung; zählt Geräte, nicht Leistung." },
  speicherquote: { traegt: true, hinweis: "Verhalten, größenneutral; kann über 100 liegen, nie als Prozent schreiben." },
  "batterie-privat-pk": { traegt: true, hinweis: "Bürgerleistung; Einheit Wh/kWh je Einwohner." },
  "tempo-1j": { traegt: true, hinweis: "Zeitraum „seit Ende <Jahr>“ wörtlich nennen; zu Jahresbeginn kurz und zufällig." },
  "tempo-3j": { traegt: true, hinweis: "Zeitraum „seit Ende <Jahr>“ wörtlich nennen." },
  "tempo-5j": { traegt: true, hinweis: "Zeitraum „seit Ende <Jahr>“ wörtlich nennen." },
  "kreis-solar-gesamt-pk": {
    traegt: false,
    hinweis: "Enthält Solarparks und Gewerbe: misst den Standort, nicht die Bürger. Nur als Einordnung, nicht als Auszeichnung.",
  },
};

// ─── Building district stats from the rollup ───────────────────────────────

/** Known Freiflächen double counts (lib/awards.ts) are Gemeinde pairs inside
 *  ONE district, so the rollup carries the park twice: subtract the sum of the
 *  Gemeinde deductions under this district's prefix. */
export function freiflaecheDedupAbzugKreis(kreisId: string): number {
  let sum = 0;
  for (const [ags, abzug] of Object.entries(FREIFLAECHE_DEDUP_ABZUG)) if (ags.startsWith(kreisId)) sum += abzug;
  return sum;
}

/**
 * The same aggregation as mastr_refresh_gemeinde_award() (lib/mastr-award-sql.ts),
 * applied to one region's rollup rows. `ly` = last full year, injected (the SQL
 * uses CURRENT_DATE − 1 year; the reader passes the German calendar year − 1).
 */
export function statsAusRollup(
  rows: readonly RollupZeile[],
  meta: { regionId: string; name: string; bezeichnung: string; population: number; slug?: string | null },
  ly: number,
): GemeindeStats {
  let privatDachKwp = 0, privatDachCount = 0, gewerbeDachKwp = 0, freiflaecheKwp = 0;
  let balkonCount = 0, balkonKwp = 0, batteriePrivatKwh = 0, batteriePrivatCount = 0, batterieGewerbeKwh = 0;
  let windKwp = 0, biomasseKwp = 0, wasserKwp = 0, solarZubauKwp = 0;
  let solarKwp = 0, solarKwpLy = 0, solarKwpL3 = 0, solarKwpL5 = 0;
  let privatDachKwpLy = 0, privatDachKwpL3 = 0, privatDachKwpL5 = 0;
  let balkonCountLy = 0, batteriePrivatKwhLy = 0, freiflaecheKwpLy = 0, windKwpLy = 0;
  for (const r of rows) {
    const { energietraeger: et, segment: seg, year: y } = r;
    if (et === "solar") {
      solarKwp += r.kwp;
      if (y === ly) solarZubauKwp += r.kwp;
      if (y <= ly) solarKwpLy += r.kwp;
      if (y <= ly - 2) solarKwpL3 += r.kwp;
      if (y <= ly - 4) solarKwpL5 += r.kwp;
      if (seg === "privat_dach") {
        privatDachKwp += r.kwp;
        privatDachCount += r.count;
        if (y <= ly) privatDachKwpLy += r.kwp;
        if (y <= ly - 2) privatDachKwpL3 += r.kwp;
        if (y <= ly - 4) privatDachKwpL5 += r.kwp;
      } else if (seg === "gewerbe_dach") gewerbeDachKwp += r.kwp;
      else if (seg === "freiflaeche") {
        freiflaecheKwp += r.kwp;
        if (y <= ly) freiflaecheKwpLy += r.kwp;
      } else if (seg === "steckersolar") {
        balkonCount += r.count;
        balkonKwp += r.kwp;
        if (y <= ly) balkonCountLy += r.count;
      }
    } else if (et === "speicher") {
      if (seg === "batterie_privat") {
        batteriePrivatKwh += r.kwh;
        batteriePrivatCount += r.count;
        if (y <= ly) batteriePrivatKwhLy += r.kwh;
      } else if (seg === "batterie_gewerbe") batterieGewerbeKwh += r.kwh;
    } else if (et === "wind") {
      windKwp += r.kwp;
      if (y <= ly) windKwpLy += r.kwp;
    } else if (et === "biomasse") biomasseKwp += r.kwp;
    else if (et === "wasser") wasserKwp += r.kwp;
  }
  // Same as loadAwardStats: only freiflaecheKwp is de-duplicated, the total
  // solar sum stays as the rollup (and the district page) has it.
  const abzug = meta.regionId.length === 5 ? Math.min(freiflaecheDedupAbzugKreis(meta.regionId), freiflaecheKwp) : 0;
  return {
    regionId: meta.regionId,
    name: meta.name,
    bezeichnung: meta.bezeichnung,
    slug: meta.slug ?? null,
    population: meta.population,
    privatDachKwp, privatDachCount, gewerbeDachKwp,
    freiflaecheKwp: freiflaecheKwp - abzug,
    balkonCount, balkonKwp, batteriePrivatKwh, batteriePrivatCount, batterieGewerbeKwh,
    windKwp, biomasseKwp, wasserKwp, solarZubauKwp,
    solarKwp, solarKwpLy, solarKwpL3, solarKwpL5,
    privatDachKwpLy, privatDachKwpL3, privatDachKwpL5,
    balkonCountLy, batteriePrivatKwhLy,
    freiflaecheKwpLy,
    windKwpLy,
  };
}

/** All comparable districts: designation known, population > 0. Returns the
 *  excluded keys too, so a caller can show what is left out instead of hiding it. */
export function kreiseAusRegister(
  register: readonly KreisRegisterZeile[],
  rollup: readonly RollupZeile[],
  ly: number,
): { kreise: KreisStats[]; ausgeschlossen: string[] } {
  const byKey = new Map<string, RollupZeile[]>();
  for (const r of rollup) {
    if (r.regionKey.length !== 5) continue;
    const arr = byKey.get(r.regionKey);
    if (arr) arr.push(r);
    else byKey.set(r.regionKey, [r]);
  }
  const kreise: KreisStats[] = [];
  const ausgeschlossen: string[] = [];
  for (const z of register) {
    const art = kreisArtVon(z.bezeichnung);
    if (!art || !z.population || z.population <= 0) {
      ausgeschlossen.push(z.regionId);
      continue;
    }
    const s = statsAusRollup(byKey.get(z.regionId) ?? [], { regionId: z.regionId, name: z.name, bezeichnung: z.bezeichnung!, population: z.population, slug: z.slug }, ly);
    kreise.push({ ...s, art, landId: z.regionId.slice(0, 2) });
  }
  kreise.sort((a, b) => a.regionId.localeCompare(b.regionId));
  return { kreise, ausgeschlossen: ausgeschlossen.sort() };
}

// ─── Ranking ────────────────────────────────────────────────────────────────

export type KreisScope = { ebene: "bundesland"; landId: string } | { ebene: "de" };

export type KreisRangZeile = {
  regionId: string;
  name: string;
  art: KreisArt;
  population: number;
  /** Sport rank: equal values share a rank, the next rank skips. */
  rank: number;
  /** Another district in this list has exactly the same value. */
  geteilt: boolean;
  value: number;
  valueText: string;
  /** Count behind the rate (installations, storage units); null where none. */
  menge: number | null;
  basisText: string | null;
};

export type KreisRangliste = {
  kategorie: string;
  scope: KreisScope;
  gruppe: KreisGruppe;
  /** Ranked districts. Districts without a value (0 / none) are not ranked. */
  zeilen: KreisRangZeile[];
  /** Districts in the comparison group, ranked or not. */
  gruppeGroesse: number;
  /** Districts dropped by the category's plausibility check (never expected at
   *  district level; listed so a drop is visible, not silent). */
  unplausibel: string[];
};

function inScope(k: KreisStats, scope: KreisScope, gruppe: KreisGruppe): boolean {
  if (scope.ebene === "bundesland" && k.landId !== scope.landId) return false;
  return gruppe === "alle" || k.art === "landkreis";
}

/** One ranking list. Tie rule and ordering are exactly those of the public
 *  Gemeinde rankings (`rankGemeinden`). */
export function kreisRangliste(
  kreise: readonly KreisStats[],
  kategorieKey: string,
  scope: KreisScope,
  gruppe: KreisGruppe,
): KreisRangliste {
  const cat = KREIS_KATEGORIE_BY_KEY[kategorieKey];
  if (!cat) throw new Error(`kreis-ranking: unknown category ${kategorieKey}`);
  const gruppeKreise = kreise.filter((k) => inScope(k, scope, gruppe));
  const unplausibel = cat.plausibel ? gruppeKreise.filter((k) => !cat.plausibel!(k)).map((k) => k.regionId) : [];
  const pool = gruppeKreise.filter((k) => !unplausibel.includes(k.regionId));
  const byId = new Map(pool.map((k) => [k.regionId, k]));
  const ranked = rankGemeinden(pool, cat);
  const rankCount = new Map<number, number>();
  for (const r of ranked) rankCount.set(r.rank, (rankCount.get(r.rank) ?? 0) + 1);
  return {
    kategorie: cat.key,
    scope,
    gruppe,
    gruppeGroesse: gruppeKreise.length,
    unplausibel,
    zeilen: ranked.map((r) => {
      const k = byId.get(r.regionId)!;
      return {
        regionId: r.regionId,
        name: r.name,
        art: k.art,
        population: r.population,
        rank: r.rank,
        geteilt: (rankCount.get(r.rank) ?? 0) > 1,
        value: r.value,
        valueText: formatAwardValue(r.value, cat.format),
        menge: cat.menge ? cat.menge(k) : null,
        basisText: cat.basis ? cat.basis(k) : null,
      };
    }),
  };
}

/** Sum of several regions' stats — for a reference value from summed districts
 *  (only as a cross-check; the reader takes the Land's own rollup). */
export function summeStats(regionId: string, name: string, teile: readonly GemeindeStats[]): GemeindeStats {
  const out: GemeindeStats = {
    regionId, name, bezeichnung: "", population: 0,
    privatDachKwp: 0, privatDachCount: 0, gewerbeDachKwp: 0, freiflaecheKwp: 0, balkonCount: 0, balkonKwp: 0,
    batteriePrivatKwh: 0, batteriePrivatCount: 0, batterieGewerbeKwh: 0, windKwp: 0, biomasseKwp: 0, wasserKwp: 0,
    solarZubauKwp: 0, solarKwp: 0, solarKwpLy: 0, solarKwpL3: 0, solarKwpL5: 0, privatDachKwpLy: 0,
    privatDachKwpL3: 0, privatDachKwpL5: 0, balkonCountLy: 0, batteriePrivatKwhLy: 0, freiflaecheKwpLy: 0, windKwpLy: 0,
  };
  const o = out as unknown as Record<string, number>;
  for (const t of teile) {
    for (const [k, v] of Object.entries(t)) if (typeof v === "number") o[k] = (o[k] ?? 0) + v;
  }
  return out;
}

export type KreisPlatzierung = {
  kategorie: string;
  scope: KreisScope;
  gruppe: KreisGruppe;
  rank: number;
  /** Ranked districts in the list ("Platz 3 von 24"). */
  von: number;
  geteilt: boolean;
  value: number;
  valueText: string;
  /** Value of the whole scope (Land or Deutschland, its own rollup over ALL
   *  districts incl. cities — the same for both groups). Null if not supplied. */
  scopeWert: number | null;
  scopeWertText: string | null;
  menge: number | null;
  /** Can this placement carry a press hook? See `hinweise` for why not. */
  aufhaengerTauglich: boolean;
  hinweise: string[];
};

/**
 * Every placement of one district: categories × {Bundesland, Deutschland} ×
 * {Landkreise, alle}. A kreisfreie Stadt has no "landkreise" placements.
 *
 * `scopeStats`: stats from the scopes' own rollups, keyed by Land id ("07")
 * and "de". Missing → scopeWert null (no fallback to a sum of districts).
 */
export function kreisPlatzierungen(
  kreise: readonly KreisStats[],
  kreisId: string,
  scopeStats: Readonly<Record<string, GemeindeStats>> = {},
): KreisPlatzierung[] {
  const k = kreise.find((x) => x.regionId === kreisId);
  if (!k) return [];
  const out: KreisPlatzierung[] = [];
  const scopes: KreisScope[] = [{ ebene: "bundesland", landId: k.landId }, { ebene: "de" }];
  const gruppen: KreisGruppe[] = k.art === "landkreis" ? ["landkreise", "alle"] : ["alle"];
  for (const cat of KREIS_KATEGORIEN) {
    for (const scope of scopes) {
      const ref = scopeStats[scope.ebene === "de" ? "de" : scope.landId];
      const scopeWert = ref ? cat.metric(ref) : null;
      for (const gruppe of gruppen) {
        const liste = kreisRangliste(kreise, cat.key, scope, gruppe);
        const z = liste.zeilen.find((x) => x.regionId === kreisId);
        if (!z) continue;
        const hinweise: string[] = [];
        const eignung = KREIS_PRESSE_EIGNUNG[cat.key];
        if (eignung && !eignung.traegt) hinweise.push(eignung.hinweis);
        if (liste.zeilen.length < 2) hinweise.push("Einziger Kreis der Vergleichsgruppe — ein Rang ist hier ein Selbstvergleich.");
        if (scope.ebene === "bundesland" && istStadtstaat(kreisId)) hinweise.push("Stadtstaat: Land und Kreis sind dieselbe Fläche.");
        if (z.menge != null && z.menge < MIN_MENGE_FUER_AUFHAENGER) hinweise.push(`Weniger als ${MIN_MENGE_FUER_AUFHAENGER} Anlagen hinter der Zahl.`);
        const minWert = MIN_WERT_FUER_AUFHAENGER[cat.key];
        if (minWert != null && z.value < minWert) hinweise.push(`Wert unter ${formatAwardValue(minWert, cat.format)} — als Nachricht zu klein.`);
        if (z.geteilt) hinweise.push("Platz geteilt — „gemeinsam mit …“ schreiben.");
        out.push({
          kategorie: cat.key,
          scope,
          gruppe,
          rank: z.rank,
          von: liste.zeilen.length,
          geteilt: z.geteilt,
          value: z.value,
          valueText: z.valueText,
          scopeWert,
          scopeWertText: scopeWert != null ? formatAwardValue(scopeWert, cat.format) : null,
          menge: z.menge,
          // A shared place still carries a hook; only the wording changes.
          aufhaengerTauglich: hinweise.every((h) => h.startsWith("Platz geteilt")),
          hinweise,
        });
      }
    }
  }
  return out;
}
