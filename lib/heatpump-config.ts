// ─── Heat Pump Configuration ───────────────────────────────────────────────
// All constants for the heat pump calculator, centralized for future admin UI.
// Sources documented in-line so every number is defensible.

import { FUEL_PRICE } from "./constants";

export interface HeatPumpConfig {
  // Specific heating demand (kWh/m²·a) by insulation standard
  // Source: dena Gebäudereport, DIN V 18599, Verbraucherzentrale
  specDemandBestand: [number, number, number];  // unsaniert / teilsaniert / saniert
  specDemandNeubau: [number, number, number];   // EnEV 2014 / KfW 55 / KfW 40+
  // Specific HEAT LOAD (W/m²) by insulation standard — for sizing the heat pump.
  // Getrennt vom Jahresbedarf (kWh/m²·a): die Heizlast (kW) bestimmt die
  // Anlagengröße, der Bedarf die Betriebskosten. Quelle: Verbraucherzentrale,
  // 42watt, deutsche-sanierungsberatung (Faustwerte unsaniert 100–140,
  // teilsaniert 70–100, saniert 30–50 W/m²).
  specHeatLoadBestand: [number, number, number];  // unsaniert / teilsaniert / saniert
  specHeatLoadNeubau: [number, number, number];   // EnEV / KfW 55 / KfW 40+
  // Reale Auslegung: Wärmepumpen werden monoenergetisch meist auf ~85 % der
  // Norm-Heizlast ausgelegt (E-Heizstab deckt die wenigen kältesten Tage).
  auslegungsfaktor: number;
  // Warm water demand per person (kWh/a)
  // Source: Verbraucherzentrale, DIN V 18599
  wwPerPerson: number;
  // JAZ linear model coefficients: JAZ = a − b × T_flow(°C)
  // Source: Fraunhofer ISE "WPsmart im Bestand" (2018–2021)
  jazLwwp: { a: number; b: number };   // air/water
  jazSwwp: { a: number; b: number };   // brine/water (ground source)
  // Flow temperature by heating system (°C)
  flowTempFbh: number;     // underfloor heating
  flowTempHkNeu: number;   // modern radiators
  flowTempHkAlt: number;   // old radiators
  // Investment (BWP Preisübersicht 2024, scaled by heat load)
  investLwwpBase: number;
  investLwwpPerKw: number;
  investSwwpBase: number;
  investSwwpPerKw: number;
  // Radiator replacement cost (triggered when old radiators selected)
  heizkoerperTauschKosten: number;
  // BEG funding rates (BAFA/KfW 2026)
  begGrundfoerderung: number;    // 30%
  begKlimaBonus: number;         // 20% — Bestand only, heizungstausch
  begEffizienzBonus: number;     // 5% — SWWP or natural refrigerant
  begEinkommensBonus: number;    // 30% — opt-in (low income)
  begMaxCap: number;             // Max förderfähige Kosten
  begMaxRate: number;            // Cap overall at 70%
  // Electricity price (§14a EnWG WP tariff, BDEW 2026)
  wpTarif: number;               // €/kWh
  wpMaintenance: number;         // €/a
  // Grid electricity CO₂ intensity (kg/kWh) for the heat pump's emissions.
  // Konservativ statisch über die Laufzeit — der reale Strommix wird sauberer,
  // d.h. die WP-Einsparung ist eher unterschätzt (kein Schönrechnen).
  gridCo2PerKwh: number;
  // Gas reference costs
  gasPriceCtPerKwh: number;      // ct/kWh
  gasEfficiency: number;          // Brennwert default
  gasCo2PerKwh: number;          // kg CO₂/kWh
  gasFixCostPerYear: number;     // €/a (Grundgebühr, entfällt bei WP)
  gasMaintenance: number;        // €/a
  gasInvestNeubau: number;       // € neue Gas-Brennwerttherme bei Neubau
  // Horizon for TCO comparison
  years: number;
  // Annual inflation rates
  gasInflation: number;
  stromInflation: number;
  // Source attribution
  source: string;
  validFrom: string;   // ISO date — when these values were last verified
  reviewBy: string;    // ISO date — re-check against official sources by then (see scripts/waermepumpe-verify.md)
}

export const DEFAULT_HEATPUMP_CONFIG: HeatPumpConfig = {
  specDemandBestand: [220, 160, 100],
  specDemandNeubau: [75, 50, 30],
  specHeatLoadBestand: [115, 95, 60],   // W/m² — unsaniert/teil/saniert (Feldwerte, nicht unterdimensionieren)
  specHeatLoadNeubau: [40, 30, 20],     // W/m²
  auslegungsfaktor: 0.85,
  wwPerPerson: 650,
  jazLwwp: { a: 5.5, b: 0.05 },
  jazSwwp: { a: 6.5, b: 0.05 },
  flowTempFbh: 35,
  flowTempHkNeu: 45,
  flowTempHkAlt: 55,
  investLwwpBase: 18000,
  investLwwpPerKw: 1200,
  investSwwpBase: 28000,
  investSwwpPerKw: 1800,
  heizkoerperTauschKosten: 6000,
  begGrundfoerderung: 0.30,
  begKlimaBonus: 0.20,
  begEffizienzBonus: 0.05,
  begEinkommensBonus: 0.30,
  begMaxCap: 30000,
  begMaxRate: 0.70,
  wpTarif: 0.24,
  wpMaintenance: 200,
  gridCo2PerKwh: 0.38,   // DE-Netzmix 2024, konservativ statisch
  gasPriceCtPerKwh: Math.round(FUEL_PRICE.gas.price * 100), // = 11, aus FUEL_PRICE (Single Source)
  gasEfficiency: 0.95,
  gasCo2PerKwh: FUEL_PRICE.gas.co2PerKwh, // = 0.20, aus FUEL_PRICE

  gasFixCostPerYear: 180,
  gasMaintenance: 180,
  gasInvestNeubau: 12000,
  years: 20,
  gasInflation: 0.02,
  stromInflation: 0.03,
  source: "Fraunhofer ISE WPsmart, BWP Preisübersicht 2024, BAFA BEG 2026, BDEW",
  validFrom: "2026-04-01",
  reviewBy: "2027-01-31",
};
