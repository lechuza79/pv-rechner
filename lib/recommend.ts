import { PERSONEN, NUTZUNG, SPEICHER, HAUSTYPEN, DACHARTEN } from "./constants";
import { calcEigenverbrauch, estimateCost, calc } from "./calc";
import { WP_ANNUAL_KWH, calcEaAnnual } from "./consumption";

// ─── Schwellwerte (tunable) ─────────────────────────────────────────────────
const MIN_EV_TARGET = 0.40;         // Empfohlene Mindest-EV-Quote
const BATTERY_EV_BOOST_MIN = 8;     // Min. EV-Verbesserung in pp für Speicher-Empfehlung
const BATTERY_PAYBACK_MAX = 14;     // Max. Amortisation in Jahren mit Speicher
const ALT_SIZE_DIFF_KWP = 3;        // Min. kWp-Differenz für "Maximale Dachnutzung"-Alternative
const DEFAULT_ERTRAG = 950;         // kWh/kWp Fallback
const DEFAULT_STROM = 0.34;         // €/kWh

export interface RecommendInput {
  personen: number;      // Index in PERSONEN
  nutzung: number;       // Index in NUTZUNG
  wp: string;            // "nein" | "geplant" | "ja"
  ea: string;            // "nein" | "geplant" | "ja"
  eaKm: number;
  haustyp: number;       // Index in HAUSTYPEN
  dachart: number;       // Index in DACHARTEN
  budgetLimit: number | null;
  ertragKwp?: number;    // Default 950
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
}

export interface Alternative {
  label: string;
  kwp: number;
  speicherKwh: number;
  eigenverbrauch: number;
  paybackYears: number | null;
  investition: number;
  reason: string;
}

export interface Recommendation {
  kwp: number;
  speicherKwh: number;
  speicherIdx: number;    // Index in SPEICHER
  reasoning: RecommendReasoning;
  alternatives: Alternative[];
}

export function recommend(input: RecommendInput): Recommendation {
  const ertragKwp = input.ertragKwp ?? DEFAULT_ERTRAG;

  // 1. Gesamtverbrauch berechnen
  const baseConsumption = PERSONEN[input.personen].verbrauch;
  const wpConsumption = input.wp !== "nein" ? WP_ANNUAL_KWH : 0;
  const eaConsumption = input.ea !== "nein" ? calcEaAnnual(input.eaKm) : 0;
  const totalConsumption = baseConsumption + wpConsumption + eaConsumption;

  // 2. Max Dach-kWp
  const footprint = HAUSTYPEN[input.haustyp].footprint;
  const factor = DACHARTEN[input.dachart].factor;
  const nutzbarM2 = Math.round(footprint * factor);
  const maxRoofKwp = Math.round(nutzbarM2 * 0.2 * 10) / 10; // 200 Wp/m²

  // 3. Optimales kWp finden (ohne Speicher zuerst)
  // Iteriere in 0.5er-Schritten, finde höchstes kWp wo EV > MIN_EV_TARGET
  let optimalKwp = Math.min(3, maxRoofKwp); // Start bei 3 kWp
  for (let testKwp = 3; testKwp <= maxRoofKwp; testKwp += 0.5) {
    const ev = calcEigenverbrauch({
      personenIdx: input.personen, nutzungIdx: input.nutzung,
      speicherKwh: 0, wp: input.wp, ea: input.ea, eaKm: input.eaKm,
      kwp: testKwp, ertragKwp,
    });
    if (ev / 100 >= MIN_EV_TARGET) {
      optimalKwp = testKwp;
    } else {
      break; // EV sinkt unter Schwelle
    }
  }
  // Auf ganze oder halbe kWp runden
  optimalKwp = Math.round(optimalKwp * 2) / 2;
  // Mindestens so viel wie der Verbrauch sinnvoll macht
  optimalKwp = Math.max(optimalKwp, Math.min(3, maxRoofKwp));

  // 4. Speicher testen
  const speicherOptions = [0, 5, 10, 15]; // kWh
  let bestSpeicher = 0;
  let bestSpeicherIdx = 0;
  const evOhne = calcEigenverbrauch({
    personenIdx: input.personen, nutzungIdx: input.nutzung,
    speicherKwh: 0, wp: input.wp, ea: input.ea, eaKm: input.eaKm,
    kwp: optimalKwp, ertragKwp,
  });

  for (let si = 1; si < speicherOptions.length; si++) {
    const spKwh = speicherOptions[si];
    const evMit = calcEigenverbrauch({
      personenIdx: input.personen, nutzungIdx: input.nutzung,
      speicherKwh: spKwh, wp: input.wp, ea: input.ea, eaKm: input.eaKm,
      kwp: optimalKwp, ertragKwp,
    });
    const boost = evMit - evOhne;
    if (boost >= BATTERY_EV_BOOST_MIN) {
      // Amortisation prüfen
      const kosten = estimateCost(optimalKwp, spKwh);
      const result = calc({
        kwp: optimalKwp, kosten, strompreis: DEFAULT_STROM,
        eigenverbrauch: evMit, einspeisung: 8.03,
        stromSteigerung: 0.03, ertragKwp, monthly: null,
      });
      if (result.be && result.be.i <= BATTERY_PAYBACK_MAX) {
        bestSpeicher = spKwh;
        bestSpeicherIdx = si;
      }
    }
  }

  // 5. Budget-Constraint
  let finalKwp = optimalKwp;
  let finalSpeicher = bestSpeicher;
  let finalSpeicherIdx = bestSpeicherIdx;
  let budgetConstrained = false;

  if (input.budgetLimit !== null) {
    let kosten = estimateCost(finalKwp, finalSpeicher);
    if (kosten > input.budgetLimit) {
      budgetConstrained = true;
      // Erst Speicher reduzieren
      while (finalSpeicherIdx > 0 && kosten > input.budgetLimit) {
        finalSpeicherIdx--;
        finalSpeicher = speicherOptions[finalSpeicherIdx];
        kosten = estimateCost(finalKwp, finalSpeicher);
      }
      // Dann kWp reduzieren
      while (finalKwp > 3 && kosten > input.budgetLimit) {
        finalKwp -= 0.5;
        kosten = estimateCost(finalKwp, finalSpeicher);
      }
      finalKwp = Math.round(finalKwp * 2) / 2;
    }
  }

  // Finale Werte berechnen
  const finalEv = calcEigenverbrauch({
    personenIdx: input.personen, nutzungIdx: input.nutzung,
    speicherKwh: finalSpeicher, wp: input.wp, ea: input.ea, eaKm: input.eaKm,
    kwp: finalKwp, ertragKwp,
  });
  const finalKosten = estimateCost(finalKwp, finalSpeicher);
  const finalResult = calc({
    kwp: finalKwp, kosten: finalKosten, strompreis: DEFAULT_STROM,
    eigenverbrauch: finalEv, einspeisung: 8.03,
    stromSteigerung: 0.03, ertragKwp, monthly: null,
  });

  // 6. Alternativen generieren
  const alternatives: Alternative[] = [];

  // Budget-Variante (ohne Speicher) wenn Hauptempfehlung Speicher enthält
  if (finalSpeicher > 0) {
    const altKosten = estimateCost(finalKwp, 0);
    const altEv = calcEigenverbrauch({
      personenIdx: input.personen, nutzungIdx: input.nutzung,
      speicherKwh: 0, wp: input.wp, ea: input.ea, eaKm: input.eaKm,
      kwp: finalKwp, ertragKwp,
    });
    const altResult = calc({
      kwp: finalKwp, kosten: altKosten, strompreis: DEFAULT_STROM,
      eigenverbrauch: altEv, einspeisung: 8.03,
      stromSteigerung: 0.03, ertragKwp, monthly: null,
    });
    alternatives.push({
      label: "Ohne Speicher",
      kwp: finalKwp,
      speicherKwh: 0,
      eigenverbrauch: altEv,
      paybackYears: altResult.be?.i ?? null,
      investition: altKosten,
      reason: `${(finalKosten - altKosten).toLocaleString("de-DE")} € günstiger, kürzere Amortisation`,
    });
  }

  // Maximale Dachnutzung wenn empfohlenes kWp < maxKwp
  if (maxRoofKwp - finalKwp >= ALT_SIZE_DIFF_KWP) {
    const maxKwp = Math.round(maxRoofKwp * 2) / 2;
    const altKosten = estimateCost(maxKwp, finalSpeicher);
    const altEv = calcEigenverbrauch({
      personenIdx: input.personen, nutzungIdx: input.nutzung,
      speicherKwh: finalSpeicher, wp: input.wp, ea: input.ea, eaKm: input.eaKm,
      kwp: maxKwp, ertragKwp,
    });
    const altResult = calc({
      kwp: maxKwp, kosten: altKosten, strompreis: DEFAULT_STROM,
      eigenverbrauch: altEv, einspeisung: 8.03,
      stromSteigerung: 0.03, ertragKwp, monthly: null,
    });
    alternatives.push({
      label: "Maximale Dachnutzung",
      kwp: maxKwp,
      speicherKwh: finalSpeicher,
      eigenverbrauch: altEv,
      paybackYears: altResult.be?.i ?? null,
      investition: altKosten,
      reason: `Nutzt die volle Dachfläche — mehr Einspeisung, weniger Eigenverbrauch (${altEv}%)`,
    });
  }

  return {
    kwp: finalKwp,
    speicherKwh: finalSpeicher,
    speicherIdx: finalSpeicherIdx,
    reasoning: {
      totalConsumption,
      baseConsumption,
      wpConsumption,
      eaConsumption,
      maxRoofKwp,
      nutzbarM2,
      eigenverbrauch: finalEv,
      eigenverbrauchOhneSpeicher: evOhne,
      paybackYears: finalResult.be?.i ?? null,
      budgetConstrained,
      investition: finalKosten,
    },
    alternatives,
  };
}
