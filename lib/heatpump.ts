// ─── Heat Pump Calculation Engine ──────────────────────────────────────────
// Pure functions — no React, no I/O. Reusable in server/client.
//
// Methodik (Quellen in heatpump-config.ts):
//   Q_ges    = Wohnfläche × spez. Bedarf + Personen × 650  (dena, DIN V 18599)
//   JAZ      = a − b × T_Vorlauf                            (Fraunhofer ISE WPsmart)
//   E_WP     = Q_ges / JAZ                                  (Energiebilanz)
//   Invest   = base + perKw × Heizlast(= Q_ges / 2000h)    (BWP Preisübersicht)
//   BEG      = Grund 30% + Klima 20% + Effizienz 5% (+Einkommen 30%)  — Bestand only
//   Gas-Ref  = fuelKwh × (price × 1.02^t + CO2_t)  + Grundgebühr + Wartung
//   TCO_WP   = Invest_netto + Σ Strom + Σ Wartung
//   Einsparung = TCO_Gas − TCO_WP
//
// PV-Synergie wird separat über calcEigenverbrauch (lib/calc.ts) integriert,
// indem E_WP als Teil des Gesamtverbrauchs übergeben wird.

import { DEFAULT_HEATPUMP_CONFIG, type HeatPumpConfig } from "./heatpump-config";

export interface HeatPumpInputs {
  situation: "bestand" | "neubau";
  wohnflaeche: number;          // m²
  insulationIdx: number;         // 0–2 (Index in INSULATION_BESTAND/NEUBAU)
  personen: number;              // actual head count (1, 2, 3.5, 5)
  heizsystem: "fbh" | "hk_neu" | "hk_alt";
  wpType: "lwwp" | "swwp";
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
    jaz?: number;                // manual JAZ override
    investNetto?: number;        // total cost after subsidy
    stromPrice?: number;         // €/kWh
    gasPrice?: number;           // €/kWh
    gasEfficiency?: number;      // heating efficiency
    gasCo2?: number;             // kg CO2/kWh
    incomeBonus?: boolean;       // opt-in BEG Einkommens-Bonus
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
  co2Einsparung: number;          // kg CO₂ / 20a
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
): { qHeiz: number; qWw: number; qGes: number } {
  const specArr = situation === "bestand" ? cfg.specDemandBestand : cfg.specDemandNeubau;
  const spec = specArr[Math.max(0, Math.min(insulationIdx, specArr.length - 1))];
  const qHeiz = Math.round(wohnflaeche * spec);
  const qWw = Math.round(personen * cfg.wwPerPerson);
  return { qHeiz, qWw, qGes: qHeiz + qWw };
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

export function calcInvestBrutto(wpType: "lwwp" | "swwp", heizlastKw: number, heizsystem: "fbh" | "hk_neu" | "hk_alt", cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): number {
  const base = wpType === "swwp" ? cfg.investSwwpBase : cfg.investLwwpBase;
  const perKw = wpType === "swwp" ? cfg.investSwwpPerKw : cfg.investLwwpPerKw;
  const heatpumpCost = base + perKw * heizlastKw;
  const hkTausch = heizsystem === "hk_alt" ? cfg.heizkoerperTauschKosten : 0;
  return Math.round(heatpumpCost + hkTausch);
}

export function calcBegSubsidy(situation: "bestand" | "neubau", wpType: "lwwp" | "swwp", investBrutto: number, incomeBonus = false, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG) {
  if (situation === "neubau") {
    return { rate: 0, amount: 0, breakdown: [{ label: "Neubau ohne BEG-Förderung", rate: 0 }] };
  }
  const breakdown: { label: string; rate: number }[] = [];
  let rate = cfg.begGrundfoerderung;
  breakdown.push({ label: "Grundförderung", rate: cfg.begGrundfoerderung });

  // Klima-Geschwindigkeits-Bonus: Tausch einer funktionierenden fossilen Heizung
  rate += cfg.begKlimaBonus;
  breakdown.push({ label: "Klima-Geschwindigkeits-Bonus", rate: cfg.begKlimaBonus });

  // Effizienz-Bonus: SWWP oder natürliches Kältemittel (bei LWWP R290 angenommen)
  rate += cfg.begEffizienzBonus;
  breakdown.push({ label: wpType === "swwp" ? "Effizienz-Bonus (Sole/Wasser)" : "Effizienz-Bonus (R290)", rate: cfg.begEffizienzBonus });

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
  const demand = calcHeatDemand(inputs.situation, inputs.wohnflaeche, inputs.insulationIdx, inputs.personen, cfg);
  const qGes = inputs.override?.qGes ?? demand.qGes;

  // 2. Heizlast & JAZ
  const heizlastKw = Math.max(4, Math.round(qGes / cfg.fullLoadHours));
  const flowTemp = flowTempForSystem(inputs.heizsystem, cfg);
  const jazBase = inputs.override?.jaz ?? calcJAZ(inputs.wpType, flowTemp, cfg);
  const jaz = Math.max(2.0, jazBase * adj.jazFactor);
  const eWp = Math.round(qGes / jaz);

  // 3. Investition & Förderung
  const investBrutto = calcInvestBrutto(inputs.wpType, heizlastKw, inputs.heizsystem, cfg);
  const beg = calcBegSubsidy(inputs.situation, inputs.wpType, investBrutto, inputs.override?.incomeBonus ?? false, cfg);
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
    ? (inputs.pv.pvInvest ?? estimatePvCost(inputs.pv.kwp, inputs.pv.speicherKwh))
    : 0;
  const wartungWp = cfg.wpMaintenance * cfg.years;
  const tcoWp = investNetto + pvInvest + stromKosten + wartungWp;

  // 5. 20-Jahre Gas-Referenz
  const gasPrice = inputs.override?.gasPrice ?? cfg.gasPriceCtPerKwh / 100;
  const gasEff = inputs.override?.gasEfficiency ?? cfg.gasEfficiency;
  const gasCo2 = inputs.override?.gasCo2 ?? cfg.gasCo2PerKwh;
  const fuelKwh = qGes / gasEff;
  // Inline per-year gas cost (need array for chart)
  const gasPerYear: number[] = [];
  let gasKosten = 0;
  for (let i = 0; i < cfg.years; i++) {
    const co2Surcharge = gasCo2 * (i === 0 ? 55 : i === 1 ? 65 : 65 + (i - 1) * 8) / 1000;
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
  const gridCo2 = 0.38; // kg CO2/kWh German grid mix (UBA 2023, sinkend)
  const co2Wp = eWp * gridCo2 * cfg.years;
  const co2Einsparung = Math.round(co2Gas - co2Wp);

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
    co2Einsparung, years,
  };
}

// ─── PV cost estimator (re-exported from prices config for self-contained use) ─
// Mirrors lib/calc.ts:estimateCost but standalone so heatpump.ts has no UI deps.
function estimatePvCost(kwp: number, speicherKwh: number): number {
  // Uses Q1/2026 market prices (shared fallback with prices-config)
  const pvSmall = 1400, pvLarge = 1250, threshold = 10;
  const batteryPerKwh = 700;
  const pv = kwp <= threshold
    ? kwp * pvSmall
    : threshold * pvSmall + (kwp - threshold) * pvLarge;
  const sp = speicherKwh > 0 ? speicherKwh * batteryPerKwh : 0;
  return Math.round((pv + sp) / 500) * 500;
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

// ─── PV synergy: how much of WP electricity can a PV system cover? ─────────
// Simplified HTW-based heuristic. Returns self-consumption rate of WP electricity.
export function estimatePvCoverageOfWp(kwp: number, eWp: number, speicherKwh: number): number {
  if (kwp <= 0 || eWp <= 0) return 0;
  const eWpMwh = eWp / 1000;
  const base = 0.15 * Math.pow(kwp / eWpMwh, 0.3);
  const speicherBoost = speicherKwh > 0 ? 0.05 + 0.02 * Math.min(speicherKwh / eWpMwh, 4) : 0;
  return Math.max(0.05, Math.min(base + speicherBoost, 0.35));
}
