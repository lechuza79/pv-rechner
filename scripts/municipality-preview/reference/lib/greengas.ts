// ─── Grüngas-Preispfad (GModG Bio-Treppe) — Berechnung ──────────────────────
// Reine Funktionen. Liefern den künftigen Gas-Endkundenpreis (ct/kWh, brutto) als
// zeitvariablen Mix aus Erdgas, verpflichtend beigemischtem Biomethan, Netzentgelt,
// Steuer/Konzession und dem CO₂-Preis auf den fossilen Anteil. Modell + Werte:
// lib/greengas-config.ts (IW-Report 36/2026, Anhang Kap. 6, S. 31–32).
//
// Anders als der bestehende WP-Gaspfad (fester Preis × jährliche Teuerung) wird der
// Preis hier Jahr für Jahr NEU gemischt: mit steigender Bio-Treppe verdrängt teures
// Biomethan billiges Erdgas, während Netzentgelt und CO₂-Preis eigenständig steigen.
// Genau dieser Effekt ist im simplen Inflationsmodell nicht abbildbar.

import { YEAR } from "./constants";
import { GREEN_GAS_CONFIG, type GreenGasConfig, type GasScenario } from "./greengas-config";

/** Lineare Interpolation über beliebige (Jahr → Wert)-Stützstellen; außerhalb geklemmt. */
function lerpStops(stops: Record<number, number>, year: number): number {
  const years = Object.keys(stops)
    .map(Number)
    .sort((a, b) => a - b);
  const first = years[0];
  const last = years[years.length - 1];
  if (year <= first) return stops[first];
  if (year >= last) return stops[last];
  if (stops[year] !== undefined) return stops[year];
  let lo = first;
  let hi = last;
  for (const y of years) {
    if (y <= year) lo = y;
    if (y >= year) {
      hi = y;
      break;
    }
  }
  const t = (year - lo) / (hi - lo);
  return stops[lo] + t * (stops[hi] - stops[lo]);
}

/** Lineare Interpolation eines Preisbestandteils 2026 → 2045 (Report-Modellierung). */
function lerp2045(v2026: number, v2045: number, year: number): number {
  const t = Math.max(0, Math.min(1, (year - 2026) / (2045 - 2026)));
  return v2026 + t * (v2045 - v2026);
}

/** Verpflichtender Grüngas-Anteil (0..1) im Kalenderjahr (Bio-Treppe § 43 GModG). */
export function gasQuoteForYear(year: number, cfg: GreenGasConfig = GREEN_GAS_CONFIG): number {
  return lerpStops(cfg.quoteStops, year);
}

/** Preisbestandteile eines Jahres, jeweils ct/kWh BRUTTO (inkl. MwSt) — für den
 *  gestapelten Zusammensetzungs-Chart. Summe = totalCt. */
export interface GasMixComponents {
  erdgas: number;
  biomethan: number;
  netz: number;
  steuer: number;
  co2: number;
}

export interface GasMixYear {
  year: number;
  /** Grüngas-Anteil 0..1 in diesem Jahr. */
  quote: number;
  /** Preisbestandteile, ct/kWh brutto. */
  components: GasMixComponents;
  /** Gas-Mix-Endkundenpreis, ct/kWh brutto. */
  totalCt: number;
}

/** Gas-Mix-Endkundenpreis eines Kalenderjahres nach dem GModG-Modell. */
export function gasMixForYear(
  year: number,
  scenario: GasScenario = "base",
  cfg: GreenGasConfig = GREEN_GAS_CONFIG
): GasMixYear {
  const quote = gasQuoteForYear(year, cfg);
  const erdgasCt = lerp2045(cfg.erdgasCt2026, cfg.erdgasCt2026 * cfg.erdgasEndFactor[scenario], year);
  const biomethanCt = lerp2045(cfg.biomethanCt2026, cfg.biomethanCt2045[scenario], year);
  const netzCt = lerp2045(cfg.netzCt2026, cfg.netzCt2045[scenario], year);
  const steuerCt = cfg.steuerKonzessionCt;
  const co2EurT = lerp2045(cfg.co2EurT2026[scenario], cfg.co2EurT2045[scenario], year);
  // CO₂ nur auf den fossilen Erdgas-Anteil; biogene Anteile werden mit 0 bilanziert.
  // ct/kWh = Anteil × (kg/kWh) × (€/t) / 1000 × 100 = … × (€/t) / 10.
  const co2Ct = (1 - quote) * cfg.emissionFactorKgPerKwh * co2EurT / 10;
  const vat = 1 + cfg.vat;
  const components: GasMixComponents = {
    erdgas: (1 - quote) * erdgasCt * vat,
    biomethan: quote * biomethanCt * vat,
    netz: netzCt * vat,
    steuer: steuerCt * vat,
    co2: co2Ct * vat,
  };
  const totalCt =
    components.erdgas + components.biomethan + components.netz + components.steuer + components.co2;
  return { year, quote, components, totalCt };
}

/** Gas-Mix-Endkundenpreis in €/kWh brutto — für die WP-Rechner-Integration. */
export function gasMixPriceEurForYear(
  year: number,
  scenario: GasScenario = "base",
  cfg: GreenGasConfig = GREEN_GAS_CONFIG
): number {
  return gasMixForYear(year, scenario, cfg).totalCt / 100;
}

/** Zeitreihe über `years` Jahre ab `startYear` (default: aktuelles Jahr). */
export function gasMixSeries(
  years: number,
  scenario: GasScenario = "base",
  startYear: number = YEAR,
  cfg: GreenGasConfig = GREEN_GAS_CONFIG
): GasMixYear[] {
  return Array.from({ length: years }, (_, i) => gasMixForYear(startYear + i, scenario, cfg));
}

// ─── Heizkosten-Vergleich Gas vs. Wärmepumpe (je kWh WÄRME) ─────────────────
// EHRLICHE Vergleichsbasis: nicht Endenergie-Preis (ct/kWh Gas vs. ct/kWh Strom —
// das ignoriert, dass die WP aus 1 kWh Strom ~3 kWh Wärme macht, der Kessel aus
// 1 kWh Gas nur 0,95 kWh), sondern die Kosten pro gelieferter kWh Wärme:
//   Gas-Wärme = Gas-Mix-Preis / Kesselwirkungsgrad
//   WP-Wärme  = Strompreis / JAZ
//   WP+PV     = (Strompreis × (1 − PV-Deckung)) / JAZ  (Solarstrom verdrängt Netzstrom)
// Reiner Arbeitspreis-Vergleich (ohne Grund-/Wartungskosten) — die gehören nicht
// in einen ct/kWh-Vergleich und sind für beide Systeme separat.

export interface HeatCostPoint {
  year: number;
  /** Gas-Wärmekosten, ct/kWh Wärme (GModG-Gas-Mix ÷ Kesselwirkungsgrad). */
  gas: number;
  /** WP-Wärmekosten ohne PV, ct/kWh Wärme (Netzstrom ÷ JAZ). */
  wp: number;
  /** WP-Wärmekosten mit PV, ct/kWh Wärme — null, wenn keine PV-Linie gewünscht. */
  wpPv: number | null;
}

// ─── Jährliche Heizkosten in € (Muster-Haus) — für die Ratgeber-Grafik ───────
// Anders als heatCostComparisonSeries (ct/kWh Wärme, systemneutral) liefert dies
// die konkreten Jahreskosten in € für ein bestimmtes Haus (Gas-Menge + WP-Strom),
// plus die 20-Jahre-Summen. Basis: derselbe Gas-Mix-Pfad + Strompreis wie überall.
export interface AnnualHeatingCostResult {
  /** Jahresreihe: gas/wp/wpPv sind €/Jahr (wpPv immer gesetzt). */
  series: HeatCostPoint[];
  /** Summen über den ganzen Horizont, €. */
  totals: { gas: number; wp: number; wpPv: number };
}

export function annualHeatingCostSeries(opts: {
  years: number;
  startYear?: number;
  scenario?: GasScenario;
  /** Gas-Endenergiebedarf des Hauses, kWh/Jahr (= Wärmebedarf / Kesselwirkungsgrad). */
  fuelKwh: number;
  /** Strombedarf der Wärmepumpe, kWh/Jahr. */
  eWpKwh: number;
  /** WP-Strompreis heute, €/kWh. */
  wpTarifEurKwh: number;
  /** Jährliche Strompreis-Steigerung (z. B. 0,02). */
  stromInflation: number;
  /** Anteil des WP-Stroms, den eine PV deckt (0..1). */
  pvCoverage?: number;
  cfg?: GreenGasConfig;
}): AnnualHeatingCostResult {
  const {
    years, startYear = YEAR, scenario = "base",
    fuelKwh, eWpKwh, wpTarifEurKwh, stromInflation, pvCoverage = 0, cfg = GREEN_GAS_CONFIG,
  } = opts;
  const cov = Math.max(0, Math.min(1, pvCoverage));
  const series: HeatCostPoint[] = [];
  const totals = { gas: 0, wp: 0, wpPv: 0 };
  for (let i = 0; i < years; i++) {
    const year = startYear + i;
    const gas = fuelKwh * gasMixPriceEurForYear(year, scenario, cfg);
    const stromCost = eWpKwh * wpTarifEurKwh * Math.pow(1 + stromInflation, i);
    const wp = stromCost;
    const wpPv = stromCost * (1 - cov);
    series.push({ year, gas, wp, wpPv });
    totals.gas += gas;
    totals.wp += wp;
    totals.wpPv += wpPv;
  }
  return { series, totals };
}

export function heatCostComparisonSeries(opts: {
  years: number;
  startYear?: number;
  scenario?: GasScenario;
  /** Kesselwirkungsgrad (Brennwert), z. B. 0,95. */
  gasEfficiency: number;
  /** Jahresarbeitszahl der Wärmepumpe. */
  jaz: number;
  /** WP-Strompreis heute, €/kWh (§14a-Tarif). */
  wpTarifEurKwh: number;
  /** Jährliche Strompreis-Steigerung (z. B. 0,02). */
  stromInflation: number;
  /** Anteil des WP-Stroms, den eine PV deckt (0..1). >0 erzeugt die WP+PV-Linie. */
  pvCoverage?: number;
  cfg?: GreenGasConfig;
}): HeatCostPoint[] {
  const {
    years, startYear = YEAR, scenario = "base",
    gasEfficiency, jaz, wpTarifEurKwh, stromInflation, pvCoverage = 0, cfg = GREEN_GAS_CONFIG,
  } = opts;
  const gasEff = Math.max(0.5, gasEfficiency);
  const jazSafe = Math.max(1, jaz);
  const cov = Math.max(0, Math.min(1, pvCoverage));
  return Array.from({ length: years }, (_, i) => {
    const year = startYear + i;
    const gasCt = gasMixForYear(year, scenario, cfg).totalCt; // ct/kWh Gas
    const stromCt = wpTarifEurKwh * 100 * Math.pow(1 + stromInflation, i); // ct/kWh Strom
    return {
      year,
      gas: gasCt / gasEff,
      wp: stromCt / jazSafe,
      wpPv: cov > 0 ? (stromCt * (1 - cov)) / jazSafe : null,
    };
  });
}
