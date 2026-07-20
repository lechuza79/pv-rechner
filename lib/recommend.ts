import { PERSONEN, NUTZUNG, HAUSTYPEN, DACHARTEN, SPEICHER } from "./constants";
import { calcEigenverbrauch, estimateCost, calc, selectByMarginalReturn, batteryReplaceCost } from "./calc";
import { simulatePvYear } from "./pv-sim";
import { calcEaAnnual, calcKlimaAnnual, KLIMA_DEFAULT_M2, type HouseholdProfile } from "./consumption";
import { calcWpAnnualElectricity, DEFAULT_WP_BUILDING } from "./heatpump";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";
import { DEFAULT_FEED_IN, type FeedInRates } from "./feedin-config";

// ─── Tunables ───────────────────────────────────────────────────────────────
const KWP_STEP = 0.5;
const KWP_MIN = 3;
const SPEICHER_OPTIONS_KWH = [0, 5, 7.5, 10, 12.5, 15];
const DAYS_PER_YEAR = 365;
const MAX_SPEICHER_DAYS = 2;          // Speicher max. ~2× Tagesverbrauch
const SPEICHER_PER_MWH = 1.2;         // Faustregel: ~1,2 kWh Speicher pro MWh Jahresverbrauch
const ALT_SIZE_DIFF_KWP = 3;          // "Max Dachnutzung" wird angeboten ab diesem Abstand
const ALT_NPV_TOLERANCE = 0.95;       // Alternativen müssen ≥ 95 % NPV der Hauptempfehlung erreichen
const ALT_MIN_INVEST_DELTA = 2000;    // "Günstiger Einstieg" braucht min. 2.000 € Investitions-Abstand
const ALT_MIN_INVEST_DELTA_RATIO = 0.15; // ODER min. 15 % weniger Investition
const DEFAULT_ERTRAG = 950;

export interface RecommendInput {
  personen: number;        // Index in PERSONEN
  nutzung: number;         // Index in NUTZUNG
  wp: string;              // "nein" | "geplant" | "ja"
  ea: string;              // "nein" | "geplant" | "ja"
  eaKm: number;
  klima?: string;          // "nein" | "geplant" | "ja" (Kühlung, nur Sommer)
  klimaM2?: number;        // gekühlte Wohnfläche (Default KLIMA_DEFAULT_M2)
  haustyp: number;         // Index in HAUSTYPEN
  dachart: number;         // Index in DACHARTEN
  budgetLimit: number | null;
  ertragKwp?: number;
  // 12 × kWh/kWp aus PVGIS (Monatsform des Standorts) für die angezeigte Autarkie.
  // Ohne PLZ null → deutscher Durchschnitt. Muss durchgereicht werden, damit Zwischen-
  // und Ergebnisseite dieselbe Autarkie zeigen (die Ergebnisseite nutzt dasselbe Profil).
  monthlyYieldPerKwp?: number[] | null;
  customRoofM2?: number;   // Override für nutzbare Dachfläche in m² (sonst aus haustyp × dachart)
  // WP-Gebäudedaten für den exakten Heizstrom (sonst Standard-Gebäude)
  wpWohnflaeche?: number;
  wpInsulation?: number;   // Index in INSULATION_BESTAND
  wpHeizsystem?: "fbh" | "hk_neu" | "hk_alt";
}

export interface RecommendReasoning {
  totalConsumption: number;
  baseConsumption: number;
  wpConsumption: number;
  eaConsumption: number;
  klimaConsumption: number;
  maxRoofKwp: number;
  nutzbarM2: number;
  eigenverbrauch: number;
  eigenverbrauchOhneSpeicher: number;
  autarkie: number;                // aus der Stundensimulation (wie im PV-Rechner)
  autarkieOhneSpeicher: number;    // gleiche Anlage, ohne Speicher → Speicher-Effekt
  paybackYears: number | null;
  budgetConstrained: boolean;
  investition: number;
  npv25: number;           // Rendite nach 25 J (Gesamtgewinn nach Investitionsabzug)
}

export interface Alternative {
  label: string;
  kwp: number;
  speicherKwh: number;
  eigenverbrauch: number;
  paybackYears: number | null;
  investition: number;
  npv25: number;
  reason: string;
}

export interface Recommendation {
  kwp: number;
  speicherKwh: number;
  speicherIdx: number;     // Index in SPEICHER
  reasoning: RecommendReasoning;
  alternatives: Alternative[];
}

// Gewichteter Einspeise-Mischsatz für Anlagen über der 10-kWp-Schwelle.
// Exported for testing only: the shared-base invariant test pins this against
// calcWeightedFeedIn (calc.ts) — same EEG formula, must never drift apart.
export function effectiveFeedInCtPerKwh(kwp: number, feedIn: FeedInRates): number {
  if (kwp <= 10) return feedIn.teilUnder10;
  return (10 * feedIn.teilUnder10 + (kwp - 10) * feedIn.teilOver10) / kwp;
}

function findSpeicherIdx(kwh: number): number {
  const idx = SPEICHER.findIndex(s => s.kwh === kwh);
  return idx >= 0 ? idx : 0;
}

interface Candidate {
  kwp: number;
  speicherKwh: number;
  ev: number;             // EV-Quote in %
  investition: number;
  npv25: number;          // Rendite nach 25 J
  paybackYears: number | null;
}

/** Gemeinsamer Rechen-Kontext: alles, was NICHT von der Anlagengröße abhängt.
 *  Von recommend() und evalConfig() geteilt, damit die Empfehlung und die
 *  Szenario-Rendite garantiert dasselbe Modell benutzen (kein Drift). */
interface EvalCtx {
  input: RecommendInput;
  p: PriceConfig;
  f: FeedInRates;
  ertragKwp: number;
  strompreis: number;
  stromSteigerung: number;
  wpKwh: number;
  klima: string;
  klimaM2: number;
  totalConsumption: number;
  monthlyYieldPerKwp: number[] | null;
}

function buildCtx(input: RecommendInput, prices?: PriceConfig, feedIn?: FeedInRates, stromSteigerungOverride?: number): EvalCtx {
  const p = prices ?? DEFAULT_PRICES;
  const f = feedIn ?? DEFAULT_FEED_IN;
  const ertragKwp = input.ertragKwp ?? DEFAULT_ERTRAG;
  // Defensive: fallback to defaults if upstream caller passed an incomplete PriceConfig
  // (e.g. stale browser cache). Otherwise NaN propagates through calc() and ranks first.
  const strompreis = Number.isFinite(p.electricityPrice) && p.electricityPrice > 0
    ? p.electricityPrice
    : DEFAULT_PRICES.electricityPrice;
  const stromSteigerung = stromSteigerungOverride ?? (Number.isFinite(p.electricityIncrease)
    ? p.electricityIncrease
    : DEFAULT_PRICES.electricityIncrease);

  const baseConsumption = PERSONEN[input.personen].verbrauch;
  const wpKwh = calcWpAnnualElectricity({
    ...DEFAULT_WP_BUILDING,
    wohnflaeche: input.wpWohnflaeche ?? DEFAULT_WP_BUILDING.wohnflaeche,
    insulationIdx: input.wpInsulation ?? DEFAULT_WP_BUILDING.insulationIdx,
    heizsystem: input.wpHeizsystem ?? DEFAULT_WP_BUILDING.heizsystem,
    personen: PERSONEN[input.personen].count,
    haustypFaktor: HAUSTYPEN[input.haustyp].wpFaktor,
  });
  const klima = input.klima ?? "nein";
  const klimaM2 = input.klimaM2 ?? KLIMA_DEFAULT_M2;
  const totalConsumption = baseConsumption
    + (input.wp !== "nein" ? wpKwh : 0)
    + (input.ea !== "nein" ? calcEaAnnual(input.eaKm) : 0)
    + (klima !== "nein" ? calcKlimaAnnual(klimaM2) : 0);
  const monthlyYieldPerKwp = input.monthlyYieldPerKwp ?? null;
  return { input, p, f, ertragKwp, strompreis, stromSteigerung, wpKwh, klima, klimaM2, totalConsumption, monthlyYieldPerKwp };
}

/** Autarkiegrad einer Konfiguration aus der Stunden-Jahressimulation (wie im
 *  PV-Rechner) — NICHT für die Empfehlungs-Logik (die bleibt wirtschaftlich/NPV),
 *  nur für die Anzeige. Nutzt dasselbe PVGIS-Monatsprofil wie die Ergebnisseite
 *  (ctx.monthlyYieldPerKwp), damit Zwischen- und Ergebnisseite dieselbe Autarkie
 *  zeigen. Nur ohne PLZ (Profil null) fällt es auf die deutsche Durchschnittsform
 *  zurück — dann sieht die Ergebnisseite mangels PLZ ebenfalls den Schnitt. */
function autarkyFor(ctx: EvalCtx, kwp: number, speicherKwh: number): number {
  const household: HouseholdProfile = {
    baseKwh: PERSONEN[ctx.input.personen].verbrauch,
    tagQuote: NUTZUNG[ctx.input.nutzung].tagQuote,
    wpActive: ctx.input.wp !== "nein",
    eaActive: ctx.input.ea !== "nein",
    klimaActive: ctx.klima !== "nein",
    klimaM2: ctx.klimaM2,
    wpAnnualKwh: ctx.input.wp !== "nein" ? ctx.wpKwh : undefined,
    eaAnnualKwh: ctx.input.ea !== "nein" ? calcEaAnnual(ctx.input.eaKm) : undefined,
    klimaAnnualKwh: ctx.klima !== "nein" ? calcKlimaAnnual(ctx.klimaM2) : undefined,
  };
  return simulatePvYear({ kwp, speicherKwh, monthlyYieldPerKwp: ctx.monthlyYieldPerKwp, ertragKwp: ctx.ertragKwp, household }).autarky;
}

/** Bewertet EINE Konfiguration (kWp × Speicher). evDelta verschiebt die
 *  Eigenverbrauchsquote wie in den PV-Szenarien (±5 pp), gekappt am
 *  physikalischen Maximum (man kann nie mehr nutzen als man verbraucht). */
function evalConfig(ctx: EvalCtx, kwpRounded: number, speicherKwh: number, evDelta = 0): Candidate {
  const feedInCt = effectiveFeedInCtPerKwh(kwpRounded, ctx.f);
  const evBase = calcEigenverbrauch({
    personenIdx: ctx.input.personen, nutzungIdx: ctx.input.nutzung,
    speicherKwh, wp: ctx.input.wp, ea: ctx.input.ea, eaKm: ctx.input.eaKm,
    klima: ctx.klima, klimaM2: ctx.klimaM2, wpKwh: ctx.wpKwh,
    kwp: kwpRounded, ertragKwp: ctx.ertragKwp,
  });
  const jahresertrag = kwpRounded * ctx.ertragKwp;
  const evMax = jahresertrag > 0 ? (ctx.totalConsumption / jahresertrag) * 100 : 95;
  const ev = evDelta === 0 ? evBase : Math.min(evBase + evDelta, 95, evMax);
  const investition = estimateCost(kwpRounded, speicherKwh, ctx.p);
  const result = calc({
    kwp: kwpRounded, kosten: investition, strompreis: ctx.strompreis,
    eigenverbrauch: ev, einspeisung: feedInCt,
    stromSteigerung: ctx.stromSteigerung, ertragKwp: ctx.ertragKwp, monthly: null,
    batteryReplace: batteryReplaceCost(speicherKwh, ctx.p),
  });
  return {
    kwp: kwpRounded, speicherKwh, ev, investition,
    npv25: result.total,
    paybackYears: result.be?.i ?? null,
  };
}

/** Rendite/Amortisation der EMPFOHLENEN Anlage unter einem Strompreis-Szenario.
 *  Die Empfehlung selbst bleibt am realistischen Szenario verankert (sonst würde
 *  die empfohlene Anlagengröße beim Umschalten springen) — nur ihre gezeigte
 *  Wirtschaftlichkeit schwankt. Nutzt exakt dasselbe Modell wie recommend(). */
export function economicsForScenario(
  input: RecommendInput,
  kwp: number,
  speicherKwh: number,
  scenario: { strom: number; evDelta: number },
  prices?: PriceConfig,
  feedIn?: FeedInRates,
): { npv25: number; paybackYears: number | null; investition: number; eigenverbrauch: number } {
  const ctx = buildCtx(input, prices, feedIn, scenario.strom);
  const c = evalConfig(ctx, kwp, speicherKwh, scenario.evDelta);
  return { npv25: c.npv25, paybackYears: c.paybackYears, investition: c.investition, eigenverbrauch: c.ev };
}

export function recommend(input: RecommendInput, prices?: PriceConfig, feedIn?: FeedInRates): Recommendation {
  const ctx = buildCtx(input, prices, feedIn);
  const { ertragKwp, wpKwh } = ctx;

  // 1. Verbrauchsgrößen (WP-Strom, Klima etc. kommen aus dem geteilten Kontext,
  // damit Empfehlung und Szenario-Rendite dasselbe Modell nutzen).
  const { klima, klimaM2, totalConsumption } = ctx;
  const baseConsumption = PERSONEN[input.personen].verbrauch;
  const wpConsumption = input.wp !== "nein" ? wpKwh : 0;
  const eaConsumption = input.ea !== "nein" ? calcEaAnnual(input.eaKm) : 0;
  const klimaConsumption = klima !== "nein" ? calcKlimaAnnual(klimaM2) : 0;
  const dailyConsumption = totalConsumption / DAYS_PER_YEAR;

  // 2. Dachfläche → max. kWp (customRoofM2 hat Vorrang vor haustyp × dachart)
  const footprint = HAUSTYPEN[input.haustyp].footprint;
  const dachFactor = DACHARTEN[input.dachart].factor;
  const nutzbarM2 = input.customRoofM2 != null && input.customRoofM2 > 0
    ? Math.round(input.customRoofM2)
    : Math.round(footprint * dachFactor);
  const maxRoofKwp = Math.round(nutzbarM2 * 0.2 * 2) / 2; // 200 Wp/m², gerundet auf 0,5

  // 3. Grid-Search: alle (kWp × Speicher)-Kombinationen NPV-bewertet.
  // Speichergröße zusätzlich per Branchen-Faustregel deckeln (~1,2 kWh pro MWh
  // Jahresverbrauch). Ein Akku, der größer ist als der Haushalt nutzen kann,
  // steht nur teuer herum — vor allem bei WP-Haushalten, deren Last im Winter
  // anfällt, wenn der Speicher mangels Sonne kaum gefüllt wird.
  const ruleOfThumbMax = (totalConsumption / 1000) * SPEICHER_PER_MWH;
  const maxSpeicherSinnvoll = Math.min(15, MAX_SPEICHER_DAYS * dailyConsumption, ruleOfThumbMax);
  const speicherTestOptions = SPEICHER_OPTIONS_KWH.filter(kwh => kwh <= maxSpeicherSinnvoll);
  const candidates: Candidate[] = [];

  // Nie mehr empfehlen, als aufs Dach passt. Gibt das Dach weniger als die
  // Mindestgröße (KWP_MIN) her, ist die dachbegrenzte Größe selbst der einzige
  // Kandidat — sonst würde bei einem winzigen Dach trotzdem KWP_MIN empfohlen.
  const roofCapKwp = Math.round(maxRoofKwp * 2) / 2;
  const maxKwp = maxRoofKwp >= KWP_MIN ? maxRoofKwp : Math.max(roofCapKwp, KWP_STEP);
  const startKwp = Math.min(KWP_MIN, maxKwp);
  for (let kwp = startKwp; kwp <= maxKwp + 1e-6; kwp += KWP_STEP) {
    const kwpRounded = Math.round(kwp * 2) / 2;
    for (const speicherKwh of speicherTestOptions) {
      candidates.push(evalConfig(ctx, kwpRounded, speicherKwh));
    }
  }

  // 4. Beste Empfehlung: Panele nach NPV (Dach möglichst voll — Module sind
  // billig und zahlen sich über Einspeisung + steigende Strompreise aus), aber
  // den Speicher pro Anlagengröße über das zentrale Grenzrendite-Gate (calc.ts)
  // deckeln. Reine NPV-Maximierung würde sonst immer den größten Akku wählen,
  // auch wenn dessen letzte kWh sich erst nach 15+ Jahren rechnet.
  const valid = candidates.filter(c => Number.isFinite(c.npv25));
  function gatedBest(pool: Candidate[]): Candidate | undefined {
    const byKwp = new Map<number, Candidate[]>();
    for (const c of pool) {
      const arr = byKwp.get(c.kwp) ?? [];
      arr.push(c);
      byKwp.set(c.kwp, arr);
    }
    // Pro Anlagengröße: wirtschaftlich sinnvolle Speichergröße via Gate.
    // Über die Anlagengrößen hinweg: höchster NPV (= vollstes Dach gewinnt).
    const perKwp: Candidate[] = [];
    for (const arr of Array.from(byKwp.values())) {
      const pick = selectByMarginalReturn<Candidate>(arr);
      if (pick) perKwp.push(pick);
    }
    perKwp.sort((a, b) => b.npv25 - a.npv25);
    return perKwp[0];
  }
  let best = gatedBest(valid) ?? valid.sort((a, b) => b.npv25 - a.npv25)[0] ?? candidates[0];

  // 5. Budget-Constraint: nur Kombinationen die ins Budget passen, dann dasselbe Gate
  let budgetConstrained = false;
  if (input.budgetLimit !== null) {
    const affordable = valid.filter(c => c.investition <= input.budgetLimit!);
    const affordableBest = gatedBest(affordable);
    if (affordableBest) {
      if (affordableBest.kwp !== best.kwp || affordableBest.speicherKwh !== best.speicherKwh) {
        budgetConstrained = true;
        best = affordableBest;
      }
    } else {
      budgetConstrained = true;
      // Kleinste verfügbare Kombination als Fallback
      const cheapest = [...candidates].sort((a, b) => a.investition - b.investition)[0];
      best = cheapest;
    }
  }

  const evOhneSpeicher = calcEigenverbrauch({
    personenIdx: input.personen, nutzungIdx: input.nutzung,
    speicherKwh: 0, wp: input.wp, ea: input.ea, eaKm: input.eaKm, wpKwh,
    kwp: best.kwp, ertragKwp,
  });

  // 6. Alternativen aus den Top-NPV-Kandidaten
  const alternatives: Alternative[] = [];

  // "Ohne Speicher" — selbe kWp, kein Akku
  if (best.speicherKwh > 0) {
    const alt = candidates.find(c => c.kwp === best.kwp && c.speicherKwh === 0);
    if (alt) {
      alternatives.push({
        label: "Ohne Speicher",
        kwp: alt.kwp,
        speicherKwh: 0,
        eigenverbrauch: alt.ev,
        paybackYears: alt.paybackYears,
        investition: alt.investition,
        npv25: alt.npv25,
        reason: `${(best.investition - alt.investition).toLocaleString("de-DE")} € günstiger, schneller amortisiert`,
      });
    }
  }

  // "Maximale Dachnutzung" — größtes kWp, falls signifikant größer
  if (maxRoofKwp - best.kwp >= ALT_SIZE_DIFF_KWP) {
    const altCandidates = candidates.filter(c => c.kwp === maxRoofKwp);
    altCandidates.sort((a, b) => b.npv25 - a.npv25);
    const alt = altCandidates[0];
    if (alt && alt.kwp !== best.kwp) {
      const diff = best.npv25 - alt.npv25;
      const reason = diff > 0
        ? `Volles Dach: mehr Stromertrag, ${Math.round(diff).toLocaleString("de-DE")} € weniger Rendite über 25 J`
        : `Volles Dach mit ähnlich guter Rendite (${Math.round(alt.npv25).toLocaleString("de-DE")} €)`;
      alternatives.push({
        label: "Maximale Dachnutzung",
        kwp: alt.kwp,
        speicherKwh: alt.speicherKwh,
        eigenverbrauch: alt.ev,
        paybackYears: alt.paybackYears,
        investition: alt.investition,
        npv25: alt.npv25,
        reason,
      });
    }
  }

  // "Günstiger" — substantiell kleinere Investition, fast gleicher NPV (innerhalb Toleranz).
  // Damit's nicht nur ein 500-€-Cosmetics-Vorschlag wird, fordern wir
  // entweder min. 2.000 € absoluten Abstand ODER min. 15 % relativen Abstand
  // gegenüber der Hauptempfehlung.
  const cheaper = candidates
    .filter(c => {
      if (c.kwp === best.kwp && c.speicherKwh === best.speicherKwh) return false;
      if (c.investition >= best.investition) return false;
      if (c.npv25 < best.npv25 * ALT_NPV_TOLERANCE) return false;
      if (alternatives.some(a => a.kwp === c.kwp && a.speicherKwh === c.speicherKwh)) return false;
      const delta = best.investition - c.investition;
      const ratio = delta / best.investition;
      return delta >= ALT_MIN_INVEST_DELTA || ratio >= ALT_MIN_INVEST_DELTA_RATIO;
    })
    .sort((a, b) => a.investition - b.investition);
  if (cheaper.length > 0 && alternatives.length < 2) {
    const alt = cheaper[0];
    alternatives.push({
      label: "Günstiger Einstieg",
      kwp: alt.kwp,
      speicherKwh: alt.speicherKwh,
      eigenverbrauch: alt.ev,
      paybackYears: alt.paybackYears,
      investition: alt.investition,
      npv25: alt.npv25,
      reason: `${(best.investition - alt.investition).toLocaleString("de-DE")} € weniger Investition, fast gleiche Rendite`,
    });
  }

  return {
    kwp: best.kwp,
    speicherKwh: best.speicherKwh,
    speicherIdx: findSpeicherIdx(best.speicherKwh),
    reasoning: {
      totalConsumption,
      baseConsumption,
      wpConsumption,
      eaConsumption,
      klimaConsumption,
      maxRoofKwp,
      nutzbarM2,
      eigenverbrauch: best.ev,
      eigenverbrauchOhneSpeicher: evOhneSpeicher,
      autarkie: autarkyFor(ctx, best.kwp, best.speicherKwh),
      autarkieOhneSpeicher: autarkyFor(ctx, best.kwp, 0),
      paybackYears: best.paybackYears,
      budgetConstrained,
      investition: best.investition,
      npv25: best.npv25,
    },
    alternatives,
  };
}
