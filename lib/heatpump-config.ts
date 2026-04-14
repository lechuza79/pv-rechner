// ─── Heat Pump Configuration ───────────────────────────────────────────────
// All constants for the heat pump calculator, centralized for future admin UI.
// Sources documented in-line so every number is defensible.

export interface HeatPumpConfig {
  // Specific heating demand (kWh/m²·a) by insulation standard
  // Source: dena Gebäudereport, DIN V 18599, Verbraucherzentrale
  specDemandBestand: [number, number, number];  // unsaniert / teilsaniert / saniert
  specDemandNeubau: [number, number, number];   // EnEV 2014 / KfW 55 / KfW 40+
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
  // Full load hours for heat load sizing
  fullLoadHours: number;    // Q_ges / 2000h → heat load kW
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
  validFrom: string;
}

export const DEFAULT_HEATPUMP_CONFIG: HeatPumpConfig = {
  specDemandBestand: [220, 160, 100],
  specDemandNeubau: [75, 50, 30],
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
  fullLoadHours: 2000,
  begGrundfoerderung: 0.30,
  begKlimaBonus: 0.20,
  begEffizienzBonus: 0.05,
  begEinkommensBonus: 0.30,
  begMaxCap: 30000,
  begMaxRate: 0.70,
  wpTarif: 0.26,
  wpMaintenance: 200,
  gasPriceCtPerKwh: 11,
  gasEfficiency: 0.95,
  gasCo2PerKwh: 0.20,
  gasFixCostPerYear: 180,
  gasMaintenance: 180,
  gasInvestNeubau: 12000,
  years: 20,
  gasInflation: 0.02,
  stromInflation: 0.03,
  source: "Fraunhofer ISE WPsmart, BWP Preisübersicht 2024, BAFA BEG 2026, BDEW",
  validFrom: "2026-04-01",
};
