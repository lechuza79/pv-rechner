// ─── Heat Pump Calculation Engine ──────────────────────────────────────────
// Pure functions — no React, no I/O. Reusable in server/client.
//
// Methodik (Quellen in heatpump-config.ts):
//   Q_ges    = Wohnfläche × spez. Bedarf × Haustyp + Personen × 650  (dena, DIN V 18599)
//   Heizlast = Wohnfläche × spez.Heizlast(W/m²) × Haustyp × Auslegungsfaktor
//   JAZ      = a − b × T_Vorlauf                            (Fraunhofer ISE WPsmart)
//   E_WP     = Q_ges / JAZ                                  (Energiebilanz)
//   Invest   = base + perKw × Heizlast                      (BWP Preisübersicht)
//   BEG      = Grund 30% + Klima 20% + Effizienz 5% (+Einkommen 30%)  — Bestand only
//   Gas-Ref  = fuelKwh × (price × 1.02^t + CO2_t)  + Grundgebühr + Wartung
//   TCO_WP   = Invest_netto + Σ Strom + Σ Wartung
//   Einsparung = TCO_Gas − TCO_WP
//
// PV-Synergie wird separat über calcEigenverbrauch (lib/calc.ts) integriert,
// indem E_WP als Teil des Gesamtverbrauchs übergeben wird.

import { DEFAULT_HEATPUMP_CONFIG, type HeatPumpConfig } from "./heatpump-config";
import { estimateCost, co2SurchargeOverToday } from "./calc";

export interface HeatPumpInputs {
  situation: "bestand" | "neubau";
  wohnflaeche: number;          // m²
  insulationIdx: number;         // 0–2 (Index in INSULATION_BESTAND/NEUBAU)
  personen: number;              // actual head count (1, 2, 3.5, 5)
  heizsystem: "fbh" | "hk_neu" | "hk_alt";
  wpType: "lwwp" | "swwp";
  haustypFaktor?: number;        // Heizlast-Faktor je Haustyp (geteilte Wände) — default 1.0
  // Maßnahme: alte Heizkörper auf Niedertemperatur tauschen.
  // Nur bei heizsystem="hk_alt" relevant. Aktiv → +Tauschkosten UND Vorlauf
  // sinkt auf hk_neu-Niveau (55→45°C), was die JAZ hebt. Ist-Zustand (false):
  // WP läuft mit alten Heizkörpern bei 55°C, keine Extrakosten, schlechtere JAZ.
  heizkoerperTausch?: boolean;
  // PV synergy (computed from /rechner conventions)
  pv?: {
    status: "nein" | "geplant" | "vorhanden";
    kwp: number;
    speicherKwh: number;
    pvInvest?: number;           // optional override for PV cost
  };
  // Optional overrides (editable in result view)
  override?: {
    qGes?: number;               // thermal demand override (kWh/a)
    heizlast?: number;           // manual heat load override (kW) — z.B. aus DIN-Heizlastberechnung
    jaz?: number;                // manual JAZ override
    investNetto?: number;        // total cost after subsidy
    stromPrice?: number;         // €/kWh
    gasPrice?: number;           // €/kWh
    gasEfficiency?: number;      // heating efficiency
    gasCo2?: number;             // kg CO2/kWh
    incomeBonus?: boolean;       // opt-in BEG Einkommens-Bonus
    klimaBonus?: boolean;        // BEG Klima-Bonus (Eigennutzer) — default true
    effizienzBonus?: boolean;    // BEG Effizienz-Bonus (nat. Kältemittel) — default true
  };
}

export interface HeatPumpResult {
  // Demand
  qHeiz: number;
  qWw: number;
  qGes: number;
  heizlastKw: number;
  // Heat pump performance
  flowTemp: number;
  jaz: number;
  eWp: number;                   // kWh electric/year
  // Investment
  investBrutto: number;
  beg: { rate: number; amount: number; breakdown: { label: string; rate: number }[] };
  investNetto: number;
  // 20-year cost totals
  stromKosten: number;           // Σ WP electricity (bereits um PV-Deckung bereinigt)
  wartungWp: number;             // Σ WP maintenance
  tcoWp: number;                 // Invest + Strom + Wartung
  // PV synergy
  pvCoverage: number;            // Anteil WP-Strom aus PV (0–0.35)
  pvStromSavings: number;        // Σ 20J eingesparte WP-Stromkosten durch PV
  pvInvest: number;              // PV-Investitionskosten (nur bei status="geplant" angerechnet)
  // Gas reference
  gasKosten: number;             // Σ Gas fuel cost
  gasFix: number;                // Σ Grundgebühr
  gasWartung: number;            // Σ Wartung
  gasInvest: number;             // Neubau only
  tcoGas: number;
  // Comparison
  tcoEinsparung: number;         // tcoGas − tcoWp
  einsparungProJahr: number;     // Ø pro Jahr
  amortisationsJahre: number | null;  // first year cumulative savings >= mehrinvest
  co2Einsparung: number;          // kg CO₂ / 20a (vermieden ggü. Gas)
  co2WpProM2Jahr: number;         // kg CO₂/m²·a Ausstoß der WP (Energieausweis-Kennzahl)
  // Chart data: cumulative savings per year (starts negative at −mehrinvest)
  years: { i: number; kum: number; annual: number }[];
}

export interface HeatPumpScenarioResult extends HeatPumpResult {
  id: "pessimistic" | "realistic" | "optimistic";
  label: string;
  color: string;
}

// ─── Core functions ────────────────────────────────────────────────────────

export function calcHeatDemand(
  situation: "bestand" | "neubau",
  wohnflaeche: number,
  insulationIdx: number,
  personen: number,
  cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG,
  haustypFaktor = 1,
): { qHeiz: number; qWw: number; qGes: number } {
  const specArr = situation === "bestand" ? cfg.specDemandBestand : cfg.specDemandNeubau;
  const spec = specArr[Math.max(0, Math.min(insulationIdx, specArr.length - 1))];
  // Haustyp-Faktor auch auf den Jahresbedarf: geteilte Wände senken den Verlust
  // übers Jahr, nicht nur die Spitzenlast. Warmwasser bleibt personenabhängig.
  const qHeiz = Math.round(wohnflaeche * spec * haustypFaktor);
  const qWw = Math.round(personen * cfg.wwPerPerson);
  return { qHeiz, qWw, qGes: qHeiz + qWw };
}

// Heizlast (kW) für die Anlagengröße — spezifische W/m² × Fläche × Haustyp-Faktor.
// Getrennt vom Jahresbedarf: die Heizlast dimensioniert die Wärmepumpe, der Bedarf
// die Betriebskosten. Ergebnis ist die real ausgelegte Leistung (Norm × Auslegungs-
// faktor). Die individuelle DIN-EN-12831-Berechnung ist genauer → override.heizlast.
export function calcHeatLoad(
  situation: "bestand" | "neubau",
  wohnflaeche: number,
  insulationIdx: number,
  haustypFaktor: number,
  cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG,
): number {
  const arr = situation === "bestand" ? cfg.specHeatLoadBestand : cfg.specHeatLoadNeubau;
  const spec = arr[Math.max(0, Math.min(insulationIdx, arr.length - 1))];
  const normHeizlast = (wohnflaeche * spec * haustypFaktor) / 1000;  // kW (Norm)
  // Untergrenze 4 kW: kleinere Luft-Wärmepumpen gibt es real kaum am Markt.
  return Math.max(4, Math.round(normHeizlast * cfg.auslegungsfaktor * 10) / 10);  // reale Auslegung, 0,1 kW
}

export function flowTempForSystem(system: "fbh" | "hk_neu" | "hk_alt", cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): number {
  if (system === "fbh") return cfg.flowTempFbh;
  if (system === "hk_neu") return cfg.flowTempHkNeu;
  return cfg.flowTempHkAlt;
}

export function calcJAZ(wpType: "lwwp" | "swwp", flowTemp: number, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): number {
  const coeff = wpType === "swwp" ? cfg.jazSwwp : cfg.jazLwwp;
  const jaz = coeff.a - coeff.b * flowTemp;
  // Clamp to plausible real-world range (Fraunhofer ISE observed 2.2–4.8)
  return Math.max(2.2, Math.min(jaz, 4.8));
}

export function calcInvestBrutto(wpType: "lwwp" | "swwp", heizlastKw: number, doHeizkoerperTausch: boolean, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): number {
  const base = wpType === "swwp" ? cfg.investSwwpBase : cfg.investLwwpBase;
  const perKw = wpType === "swwp" ? cfg.investSwwpPerKw : cfg.investLwwpPerKw;
  const heatpumpCost = base + perKw * heizlastKw;
  // Tauschkosten nur wenn die Maßnahme aktiv gewählt ist — nicht mehr automatisch
  // an "alte Heizkörper" gekoppelt (sonst zahlt man den Tausch ohne JAZ-Nutzen).
  const hkTausch = doHeizkoerperTausch ? cfg.heizkoerperTauschKosten : 0;
  return Math.round(heatpumpCost + hkTausch);
}

export interface BegOptions {
  incomeBonus?: boolean;      // Einkommens-Bonus (bis 40.000 € Haushaltseinkommen)
  klimaBonus?: boolean;       // Klima-Geschwindigkeits-Bonus (Eigennutzer, alte fossile Heizung) — default true
  effizienzBonus?: boolean;   // Effizienz-Bonus (natürliches Kältemittel / Erdsonde) — default true
}

export function calcBegSubsidy(situation: "bestand" | "neubau", wpType: "lwwp" | "swwp", investBrutto: number, opts: BegOptions = {}, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG) {
  if (situation === "neubau") {
    return { rate: 0, amount: 0, breakdown: [{ label: "Neubau ohne BEG-Förderung", rate: 0 }] };
  }
  // Boni sind an individuelle Voraussetzungen gebunden → abwählbar. Default an,
  // weil die Kern-Zielgruppe (selbstnutzende Eigentümer, alte fossile Heizung,
  // moderne WP mit R290) sie in der Regel bekommt. Grundförderung immer.
  const klimaBonus = opts.klimaBonus ?? true;
  const effizienzBonus = opts.effizienzBonus ?? true;
  const incomeBonus = opts.incomeBonus ?? false;

  const breakdown: { label: string; rate: number }[] = [];
  let rate = cfg.begGrundfoerderung;
  breakdown.push({ label: "Grundförderung", rate: cfg.begGrundfoerderung });

  // Klima-Geschwindigkeits-Bonus: Tausch einer funktionierenden fossilen Heizung
  if (klimaBonus) {
    rate += cfg.begKlimaBonus;
    breakdown.push({ label: "Klima-Geschwindigkeits-Bonus", rate: cfg.begKlimaBonus });
  }

  // Effizienz-Bonus: SWWP oder natürliches Kältemittel (bei LWWP R290 angenommen)
  if (effizienzBonus) {
    rate += cfg.begEffizienzBonus;
    breakdown.push({ label: wpType === "swwp" ? "Effizienz-Bonus (Sole/Wasser)" : "Effizienz-Bonus (R290)", rate: cfg.begEffizienzBonus });
  }

  if (incomeBonus) {
    rate += cfg.begEinkommensBonus;
    breakdown.push({ label: "Einkommens-Bonus", rate: cfg.begEinkommensBonus });
  }
  rate = Math.min(rate, cfg.begMaxRate);

  const cappedInvest = Math.min(investBrutto, cfg.begMaxCap);
  const amount = Math.round(cappedInvest * rate);
  return { rate, amount, breakdown };
}

// ─── Main TCO calculation ──────────────────────────────────────────────────

export function calcHeatPump(inputs: HeatPumpInputs, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG, scenarioAdj?: { jazFactor: number; stromInflation: number; gasInflation: number }): HeatPumpResult {
  const adj = scenarioAdj ?? { jazFactor: 1, stromInflation: cfg.stromInflation, gasInflation: cfg.gasInflation };

  // 1. Heizwärmebedarf
  const demand = calcHeatDemand(inputs.situation, inputs.wohnflaeche, inputs.insulationIdx, inputs.personen, cfg, inputs.haustypFaktor ?? 1);
  const qGes = inputs.override?.qGes ?? demand.qGes;

  // 2. Heizlast & JAZ
  // Heizlast aus spez. W/m² × Fläche × Haustyp (nicht mehr aus Jahresbedarf ÷ 2000 h —
  // das hatte das Warmwasser mitgezählt und die Anlage zu groß gemacht). Individuelle
  // DIN-Heizlastberechnung schlägt die Schätzung: override.heizlast.
  const heizlastKw = inputs.override?.heizlast
    ?? calcHeatLoad(inputs.situation, inputs.wohnflaeche, inputs.insulationIdx, inputs.haustypFaktor ?? 1, cfg);
  // Heizkörpertausch senkt den Vorlauf von alten Heizkörpern (55°C) auf
  // Niedertemperatur-Niveau (45°C, wie moderne Heizkörper) → bessere JAZ.
  const doHkTausch = inputs.heizsystem === "hk_alt" && !!inputs.heizkoerperTausch;
  const effHeizsystem = doHkTausch ? "hk_neu" : inputs.heizsystem;
  const flowTemp = flowTempForSystem(effHeizsystem, cfg);
  const jazBase = inputs.override?.jaz ?? calcJAZ(inputs.wpType, flowTemp, cfg);
  // Auch nach Szenario-Faktor/Override im physikalisch plausiblen Fenster halten.
  const jaz = Math.min(4.8, Math.max(2.0, jazBase * adj.jazFactor));
  const eWp = Math.round(qGes / jaz);

  // 3. Investition & Förderung
  const investBrutto = calcInvestBrutto(inputs.wpType, heizlastKw, doHkTausch, cfg);
  const beg = calcBegSubsidy(inputs.situation, inputs.wpType, investBrutto, {
    incomeBonus: inputs.override?.incomeBonus ?? false,
    klimaBonus: inputs.override?.klimaBonus ?? true,
    effizienzBonus: inputs.override?.effizienzBonus ?? true,
  }, cfg);
  const investNetto = inputs.override?.investNetto ?? (investBrutto - beg.amount);

  // 4. 20-Jahre Betriebskosten WP (mit PV-Synergie)
  const stromPrice = inputs.override?.stromPrice ?? cfg.wpTarif;
  // PV-Deckung: 0 wenn nein, sonst HTW-kalibrierte Heuristik
  const pvActive = inputs.pv && inputs.pv.status !== "nein" && inputs.pv.kwp > 0;
  const pvCoverage = pvActive ? estimatePvCoverageOfWp(inputs.pv!.kwp, eWp, inputs.pv!.speicherKwh) : 0;
  const gridFrac = 1 - pvCoverage;
  let stromKosten = 0;
  let pvStromSavings = 0;
  const stromPerYear: number[] = [];
  for (let i = 0; i < cfg.years; i++) {
    const p = stromPrice * Math.pow(1 + adj.stromInflation, i);
    const costNoPv = eWp * p;
    const cost = costNoPv * gridFrac;
    pvStromSavings += costNoPv - cost;
    stromKosten += cost;
    stromPerYear.push(cost);
  }
  stromKosten = Math.round(stromKosten);
  pvStromSavings = Math.round(pvStromSavings);
  // PV-Invest nur anrechnen wenn "geplant" — "vorhanden" ist Sunk Cost
  const pvInvest = (inputs.pv?.status === "geplant" && inputs.pv.kwp > 0)
    ? (inputs.pv.pvInvest ?? estimateCost(inputs.pv.kwp, inputs.pv.speicherKwh))
    : 0;
  const wartungWp = cfg.wpMaintenance * cfg.years;
  const tcoWp = investNetto + pvInvest + stromKosten + wartungWp;

  // 5. 20-Jahre Gas-Referenz
  const gasPrice = inputs.override?.gasPrice ?? cfg.gasPriceCtPerKwh / 100;
  const gasEff = Math.max(0.5, inputs.override?.gasEfficiency ?? cfg.gasEfficiency);  // gegen /0
  const gasCo2 = inputs.override?.gasCo2 ?? cfg.gasCo2PerKwh;
  const fuelKwh = qGes / gasEff;
  // Inline per-year gas cost (need array for chart)
  const gasPerYear: number[] = [];
  let gasKosten = 0;
  for (let i = 0; i < cfg.years; i++) {
    // Gaspreis (11 ct) ist ein heutiger All-in-Preis und enthält die CO2-Abgabe
    // 2026 bereits. Daher nur den ANSTIEG des CO2-Preises über das heutige Niveau
    // aufschlagen (co2SurchargeOverToday), sonst wird die 2026-Komponente doppelt
    // gezählt. Kalenderjahr-verankert (rollover-sicher) via lib/co2-config.ts.
    const co2Surcharge = gasCo2 * co2SurchargeOverToday(i) / 1000;
    const basePrice = gasPrice * Math.pow(1 + adj.gasInflation, i);
    const y = fuelKwh * (basePrice + co2Surcharge);
    gasKosten += y;
    gasPerYear.push(y);
  }
  gasKosten = Math.round(gasKosten);
  const gasFix = cfg.gasFixCostPerYear * cfg.years;
  const gasWartung = cfg.gasMaintenance * cfg.years;
  const gasInvest = inputs.situation === "neubau" ? cfg.gasInvestNeubau : 0;
  const tcoGas = gasKosten + gasFix + gasWartung + gasInvest;

  // 6. Vergleich (pvInvest bereits in tcoWp enthalten bei status="geplant")
  const mehrInvest = (investNetto + pvInvest) - gasInvest;
  const tcoEinsparung = Math.round(tcoGas - tcoWp);
  const einsparungProJahr = Math.round(tcoEinsparung / cfg.years);

  // 7. Chart-Daten: kumulierte Einsparung (Jahr 0 = −Mehrinvest)
  const years: { i: number; kum: number; annual: number }[] = [];
  let kum = -mehrInvest;
  years.push({ i: 0, kum: Math.round(kum), annual: 0 });
  let amortisationsJahre: number | null = null;
  for (let i = 0; i < cfg.years; i++) {
    // stromPerYear[i] ist bereits um PV-Deckung bereinigt
    const annualSaving = (gasPerYear[i] + cfg.gasFixCostPerYear + cfg.gasMaintenance) - (stromPerYear[i] + cfg.wpMaintenance);
    kum += annualSaving;
    years.push({ i: i + 1, kum: Math.round(kum), annual: Math.round(annualSaving) });
    if (amortisationsJahre === null && kum >= 0) amortisationsJahre = i + 1;
  }

  // 8. CO₂-Einsparung
  const co2Gas = fuelKwh * gasCo2 * cfg.years;
  const gridCo2 = cfg.gridCo2PerKwh; // kg CO2/kWh German grid mix (konservativ statisch)
  const co2Wp = eWp * gridCo2 * cfg.years;
  const co2Einsparung = Math.round(co2Gas - co2Wp);
  // Spezifischer CO₂-Ausstoß des Heizens (kg/m²·a) — Energieausweis-Kennzahl.
  // Sinkt monoton mit Dämmung/Effizienz (intuitiv), anders als die absolute
  // Einsparung ggü. Gas (die bei Sanierung sinkt, weil weniger Gas ersetzt wird).
  const co2WpProM2Jahr = inputs.wohnflaeche > 0 ? Math.round(eWp * gridCo2 / inputs.wohnflaeche) : 0;

  return {
    qHeiz: demand.qHeiz, qWw: demand.qWw, qGes,
    heizlastKw, flowTemp, jaz: Math.round(jaz * 100) / 100, eWp,
    investBrutto, beg, investNetto,
    stromKosten, wartungWp, tcoWp,
    pvCoverage: Math.round(pvCoverage * 1000) / 1000,
    pvStromSavings,
    pvInvest,
    gasKosten, gasFix, gasWartung, gasInvest, tcoGas,
    tcoEinsparung, einsparungProJahr, amortisationsJahre,
    co2Einsparung, co2WpProM2Jahr, years,
  };
}

// ─── Scenario wrappers (pessimistic/realistic/optimistic) ──────────────────

export function calcHeatPumpScenarios(inputs: HeatPumpInputs, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): HeatPumpScenarioResult[] {
  const scenarios: Array<Pick<HeatPumpScenarioResult, "id" | "label" | "color"> & { adj: { jazFactor: number; stromInflation: number; gasInflation: number } }> = [
    { id: "pessimistic", label: "Pessimistisch", color: "#EF4444", adj: { jazFactor: 0.90, stromInflation: 0.05, gasInflation: 0.01 } },
    { id: "realistic",   label: "Realistisch",   color: "#00D950", adj: { jazFactor: 1.00, stromInflation: cfg.stromInflation, gasInflation: cfg.gasInflation } },
    { id: "optimistic",  label: "Optimistisch",  color: "#1365EA", adj: { jazFactor: 1.05, stromInflation: 0.01, gasInflation: 0.04 } },
  ];
  return scenarios.map(s => ({ id: s.id, label: s.label, color: s.color, ...calcHeatPump(inputs, cfg, s.adj) }));
}

// ─── Shared: WP-Jahresstromverbrauch aus Gebäudedaten ──────────────────────
// Schlanke gemeinsame Quelle für PV- und WP-Rechner: dieselbe Physik wie die
// große TCO-Rechnung (Heizwärmebedarf ÷ Jahresarbeitszahl), aber ohne
// Investitions-/Förder-/Gas-Overhead. So liefert dasselbe Haus in beiden
// Rechnern denselben WP-Stromverbrauch, statt einmal pauschal 3500 kWh und
// einmal ~11.000 kWh. Modelliert den Ist-Zustand (kein Heizkörpertausch).
export interface WpElectricityInputs {
  situation: "bestand" | "neubau";
  wohnflaeche: number;          // m²
  insulationIdx: number;         // 0–2 (Index in INSULATION_BESTAND/NEUBAU)
  personen: number;              // actual head count (1, 2, 3.5, 5)
  heizsystem: "fbh" | "hk_neu" | "hk_alt";
  wpType: "lwwp" | "swwp";
  haustypFaktor?: number;        // geteilte Wände senken den Bedarf — default 1.0
}

/** WP-Jahresstrom (kWh/a) = Heizwärmebedarf ÷ Jahresarbeitszahl. */
export function calcWpAnnualElectricity(inp: WpElectricityInputs, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): number {
  const { qGes } = calcHeatDemand(inp.situation, inp.wohnflaeche, inp.insulationIdx, inp.personen, cfg, inp.haustypFaktor ?? 1);
  const jaz = calcJAZ(inp.wpType, flowTempForSystem(inp.heizsystem, cfg), cfg);
  return Math.round(qGes / jaz);
}

// ─── PV synergy: how much of WP electricity can a PV system cover? ─────────
// Simplified HTW-based heuristic. Returns self-consumption rate of WP electricity.
export function estimatePvCoverageOfWp(kwp: number, eWp: number, speicherKwh: number): number {
  if (kwp <= 0 || eWp <= 0) return 0;
  const eWpMwh = eWp / 1000;
  const base = 0.15 * Math.pow(kwp / eWpMwh, 0.3);
  const speicherBoost = speicherKwh > 0 ? 0.05 + 0.02 * Math.min(speicherKwh / eWpMwh, 4) : 0;
  return Math.max(0.05, Math.min(base + speicherBoost, 0.35));
}
