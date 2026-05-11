import { PERSONEN, HAUSTYPEN, DACHARTEN, SPEICHER } from "./constants";
import { calcEigenverbrauch, estimateCost, calc } from "./calc";
import { WP_ANNUAL_KWH, calcEaAnnual } from "./consumption";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";
import { DEFAULT_FEED_IN, type FeedInRates } from "./feedin-config";

// ─── Tunables ───────────────────────────────────────────────────────────────
const KWP_STEP = 0.5;
const KWP_MIN = 3;
const SPEICHER_OPTIONS_KWH = [0, 5, 7.5, 10, 12.5, 15];
const DAYS_PER_YEAR = 365;
const MAX_SPEICHER_DAYS = 2;          // Speicher max. ~2× Tagesverbrauch
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
  haustyp: number;         // Index in HAUSTYPEN
  dachart: number;         // Index in DACHARTEN
  budgetLimit: number | null;
  ertragKwp?: number;
  customRoofM2?: number;   // Override für nutzbare Dachfläche in m² (sonst aus haustyp × dachart)
}

export interface RecommendReasoning {
  totalConsumption: number;
  baseConsumption: number;
  wpConsumption: number;
  eaConsumption: number;
  maxRoofKwp: number;
  nutzbarM2: number;
  eigenverbrauch: number;
  eigenverbrauchOhneSpeicher: number;
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

// Gewichteter Einspeise-Mischsatz für Anlagen über der 10-kWp-Schwelle
function effectiveFeedInCtPerKwh(kwp: number, feedIn: FeedInRates): number {
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

export function recommend(input: RecommendInput, prices?: PriceConfig, feedIn?: FeedInRates): Recommendation {
  const p = prices ?? DEFAULT_PRICES;
  const f = feedIn ?? DEFAULT_FEED_IN;
  const ertragKwp = input.ertragKwp ?? DEFAULT_ERTRAG;
  // Defensive: fallback to defaults if upstream caller passed an incomplete PriceConfig
  // (e.g. stale browser cache). Otherwise NaN propagates through calc() and ranks first.
  const strompreis = Number.isFinite(p.electricityPrice) && p.electricityPrice > 0
    ? p.electricityPrice
    : DEFAULT_PRICES.electricityPrice;
  const stromSteigerung = Number.isFinite(p.electricityIncrease)
    ? p.electricityIncrease
    : DEFAULT_PRICES.electricityIncrease;

  // 1. Verbrauchsgrößen
  const baseConsumption = PERSONEN[input.personen].verbrauch;
  const wpConsumption = input.wp !== "nein" ? WP_ANNUAL_KWH : 0;
  const eaConsumption = input.ea !== "nein" ? calcEaAnnual(input.eaKm) : 0;
  const totalConsumption = baseConsumption + wpConsumption + eaConsumption;
  const dailyConsumption = totalConsumption / DAYS_PER_YEAR;

  // 2. Dachfläche → max. kWp (customRoofM2 hat Vorrang vor haustyp × dachart)
  const footprint = HAUSTYPEN[input.haustyp].footprint;
  const dachFactor = DACHARTEN[input.dachart].factor;
  const nutzbarM2 = input.customRoofM2 != null && input.customRoofM2 > 0
    ? Math.round(input.customRoofM2)
    : Math.round(footprint * dachFactor);
  const maxRoofKwp = Math.round(nutzbarM2 * 0.2 * 2) / 2; // 200 Wp/m², gerundet auf 0,5

  // 3. Grid-Search: alle (kWp × Speicher)-Kombinationen NPV-bewertet
  const maxSpeicherSinnvoll = Math.min(15, MAX_SPEICHER_DAYS * dailyConsumption);
  const speicherTestOptions = SPEICHER_OPTIONS_KWH.filter(kwh => kwh <= maxSpeicherSinnvoll);
  const candidates: Candidate[] = [];

  const maxKwp = Math.max(KWP_MIN, maxRoofKwp);
  for (let kwp = KWP_MIN; kwp <= maxKwp + 1e-6; kwp += KWP_STEP) {
    const kwpRounded = Math.round(kwp * 2) / 2;
    const feedInCt = effectiveFeedInCtPerKwh(kwpRounded, f);
    for (const speicherKwh of speicherTestOptions) {
      const ev = calcEigenverbrauch({
        personenIdx: input.personen, nutzungIdx: input.nutzung,
        speicherKwh, wp: input.wp, ea: input.ea, eaKm: input.eaKm,
        kwp: kwpRounded, ertragKwp,
      });
      const investition = estimateCost(kwpRounded, speicherKwh, p);
      const result = calc({
        kwp: kwpRounded, kosten: investition, strompreis,
        eigenverbrauch: ev, einspeisung: feedInCt,
        stromSteigerung, ertragKwp, monthly: null,
      });
      candidates.push({
        kwp: kwpRounded, speicherKwh, ev,
        investition,
        npv25: result.total,
        paybackYears: result.be?.i ?? null,
      });
    }
  }

  // 4. Beste Empfehlung = höchster NPV nach 25 J. NaN-Kandidaten werden ausgeschlossen
  // (würden in Brower-Sort sonst zufällig erscheinen je nach Engine).
  const valid = candidates.filter(c => Number.isFinite(c.npv25));
  valid.sort((a, b) => b.npv25 - a.npv25);
  let best = valid[0] ?? candidates[0];

  // 5. Budget-Constraint: filtere alle die ins Budget passen, nimm bestes davon (aus der sortierten Liste)
  let budgetConstrained = false;
  if (input.budgetLimit !== null) {
    const affordable = valid.filter(c => c.investition <= input.budgetLimit!);
    if (affordable.length > 0) {
      if (affordable[0].kwp !== best.kwp || affordable[0].speicherKwh !== best.speicherKwh) {
        budgetConstrained = true;
        best = affordable[0];
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
    speicherKwh: 0, wp: input.wp, ea: input.ea, eaKm: input.eaKm,
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
      maxRoofKwp,
      nutzbarM2,
      eigenverbrauch: best.ev,
      eigenverbrauchOhneSpeicher: evOhneSpeicher,
      paybackYears: best.paybackYears,
      budgetConstrained,
      investition: best.investition,
      npv25: best.npv25,
    },
    alternatives,
  };
}
