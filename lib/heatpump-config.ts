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
  // Investment: Bruttopreis (inkl. MwSt.) = base + perKw × Heizlast.
  // Quelle LWWP: Verbraucherzentrale Rheinland-Pfalz, „Luft-Wasser-Wärmepumpen:
  // Eine Auswertung von 160 Angeboten aus Rheinland-Pfalz" (Juni 2025) — echte
  // Angebote an Ein-/Zweifamilienhäuser im Bestand, siehe Kalibrierung unten.
  investLwwpBase: number;
  investLwwpPerKw: number;
  investSwwpBase: number;
  investSwwpPerKw: number;
  // Radiator replacement cost (triggered when old radiators selected)
  heizkoerperTauschKosten: number;
  // BEG funding rates — KfW Merkblatt Nr. 458 (BEG EM), gültig ab 21.07.2026 (GmodG)
  begGrundfoerderung: number;    // 30% — jeder Heizungstausch im Bestand
  begKlimaBonus: number;         // 16% — Bestand, Austausch funktionsfähige fossile Heizung (Eigennutzer); sinkt ab 01.02.2027
  // Einkommens-Bonus: gestaffelt nach zu versteuerndem Haushaltsjahreseinkommen.
  // Aufsteigend nach maxIncome sortiert; der erste Treffer (income ≤ maxIncome) gilt.
  begEinkommensStaffel: { maxIncome: number; rate: number }[];
  begFamilienzuschlag: number;   // € — hebt die maßgebliche Einkommensgrenze bei ≥1 Kind im Haushalt
  begMaxCap: number;             // Förderhöchstbetrag förderfähige Kosten (1. Wohneinheit); sinkt ab 01.02.2027
  begMaxRate: number;            // Gesamt-Obergrenze Fördersatz (Regelfall) — 70%
  begMaxRateLowIncome: number;   // Gesamt-Obergrenze niedrigstes Einkommen (≤30.000 € bzw. ≤40.000 € mit Kind) — 80%
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
  // LWWP-Investition, kalibriert an echten Angeboten statt an Portal-Kostenseiten.
  // Quelle: Verbraucherzentrale RLP, Auswertung von 160 Luft-Wasser-Angeboten
  // (Angebote 01.10.2024–09.05.2025, Bruttopreise inkl. MwSt.; Volltext in
  // docs/quellen/VZ-RLP_Auswertung-160-Waermepumpen-Angebote_2025-06.pdf):
  //   Gesamtkosten  Median 34.979 € · Mittelwert 36.279 € (Min 20.228, Max 63.061), S. 4
  //   Leistung      4–18 kW, Median 10 kW, S. 4
  //   Kostenkategorien (Mittelwerte, S. 9): Montage/Lohn 6.997 + Elektro 3.032 +
  //   Fundament 1.507 + hydraulischer Abgleich 1.159 + Warmwasser 2.589 +
  //   Puffer 1.368 = 16.652 € — allesamt NICHT leistungsabhängig.
  // Daraus: Basis 16.500 € (der größenunabhängige Block) und Steigung 1.850 €/kW,
  // so dass der Median-Fall (10 kW) auf den Median-Preis 35.000 € trifft. Der Rest
  // (Aggregat, Material, Marge) skaliert mit der Leistung.
  // Die Nachfolge-Auswertung (VZ RLP, PM vom 02.07.2026, 160 Angebote) bestätigt das
  // Niveau: 21.099–54.168 €, Ø ~36.400 €.
  // WARUM nicht mehr gescrapt: Die frühere Basis (9.500 €) kam aus der
  // taptaphome-Kostenübersicht und ergab für ein kleines Haus ~15.000 € — unter dem
  // GÜNSTIGSTEN von 160 realen Angeboten. Die Quelle beziffert den Einbau mit
  // 3.000–7.500 €, während allein Montage/Elektro/Fundament/Abgleich real ~12.700 €
  // kosten. Ein Korrekturfaktor darauf wäre geraten — deshalb Config + Wächter
  // (scripts/waermepumpe-verify.md), analog zu Sole/Wasser.
  investLwwpBase: 16500,
  investLwwpPerKw: 1850,
  // Sole/Wasser = LWWP-Niveau + Erschließung (Bohrung), abzüglich Außeneinheit/Fundament.
  // Ergibt bei 10 kW 46.000 € (LWWP 35.000 + ~11.000 € Bohrung) — im Marktband für
  // Erdwärme-EFH. Nicht scrapebar (Bohrkosten hängen an Bohrmetern, nicht an kW).
  investSwwpBase: 28000,
  investSwwpPerKw: 1800,
  // Heizkörpertausch: VZ RLP S. 6 — Ø 679 €, Median 642 € je Heizkörper (18 Angebote).
  // Angesetzt sind ~6 kritische Heizkörper (Ziel: Vorlauf 55 → 45 °C), nicht die
  // komplette Heizkörper-Sanierung.
  heizkoerperTauschKosten: 4000,
  begGrundfoerderung: 0.30,
  begKlimaBonus: 0.16,
  begEinkommensStaffel: [
    { maxIncome: 30000, rate: 0.40 },
    { maxIncome: 40000, rate: 0.30 },
    { maxIncome: 50000, rate: 0.10 },
  ],
  begFamilienzuschlag: 10000,
  begMaxCap: 28000,
  begMaxRate: 0.70,
  begMaxRateLowIncome: 0.80,
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
  stromInflation: 0.02, // p.a. — konsistent mit PV-Rechner (SCENARIOS realistic + electricityIncrease)
  source: "Fraunhofer ISE WPsmart, Verbraucherzentrale RLP (Auswertung 160 Wärmepumpen-Angebote, 2025/2026), KfW Merkblatt 458 (BEG EM, gültig ab 21.07.2026), BDEW",
  validFrom: "2026-07-27",
  reviewBy: "2026-10-20",   // quartalsweiser Wächter (Jan/Apr/Jul/Okt); der Januar-Lauf 2027 fällt zusätzlich vor die Degression der Boni/Förderhöchstbeträge zum 01.02.2027
};
