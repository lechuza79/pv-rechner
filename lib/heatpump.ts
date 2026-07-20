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
import { estimateCost, co2SurchargeOverToday, calcEigenverbrauch, calcWeightedFeedIn, calcPvBenefitOverHorizon, calcPvBenefitPerYear } from "./calc";
import { DEFAULT_PRICES } from "./prices-config";
import { DEFAULT_FEED_IN } from "./feedin-config";
import { PERSONEN } from "./constants";
import { calcHeatDemand, calcHeatLoad, flowTempForSystem, calcJAZ } from "./heatpump-core";

// Standard-Ertrag ohne PLZ (Bundesschnitt) — der WP-Flow fragt keinen Standort
// ab; der PV-Rechner nutzt denselben Default, wenn keine PLZ gesetzt ist.
const PV_DEFAULT_YIELD_KWP = 950;

// Haushalts-Grundverbrauch (ohne WP) aus der Personenzahl schätzen — dieselbe
// PERSONEN-Tabelle wie im PV-Rechner. Head-count kann 3,5 sein (3–4-Bucket).
function householdKwhFromPersonen(count: number): number {
  const idx = count <= 1 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : 3;
  return PERSONEN[idx].verbrauch;
}
function personenIdxFromCount(count: number): number {
  return count <= 1 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : 3;
}

// Reine Bedarfs-/JAZ-Funktionen + WP-Jahresstrom + Standard-Gebäude leben in
// heatpump-core.ts (calc-frei, zyklusfrei). Hier re-exportiert, damit bestehende
// Importe `from "./heatpump"` unverändert funktionieren.
export {
  calcHeatDemand,
  calcHeatLoad,
  flowTempForSystem,
  calcJAZ,
  calcWpAnnualElectricity,
  DEFAULT_WP_BUILDING,
  defaultWpAnnualKwh,
  DEFAULT_WP_ANNUAL_KWH,
  type WpElectricityInputs,
} from "./heatpump-core";

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
    // Haushaltsdaten für den VOLLEN PV-Nutzen (Haushaltsstrom-Ersparnis +
    // Einspeisung, nicht nur WP-Deckung). Fehlen sie, wird aus der Personenzahl
    // ein Standard-Haushalt abgeleitet.
    haushaltKwh?: number;        // Haushalts-Grundverbrauch ohne WP (kWh/a)
    nutzungIdx?: number;         // Nutzungsprofil (Tag/Nacht) 0–3
    ertragKwp?: number;          // Standortertrag kWh/kWp (default Bundesschnitt)
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
  stromKosten: number;           // Σ WP electricity zum vollen Netzpreis (PV separat als pvBenefit)
  wartungWp: number;             // Σ WP maintenance
  tcoWp: number;                 // Invest + Strom + Wartung − pvBenefit
  // PV synergy
  pvCoverage: number;            // Anteil WP-Strom aus PV (0–0.35)
  pvStromSavings: number;        // Σ 20J eingesparte WP-Stromkosten durch PV (Teilmenge von pvBenefit)
  pvBenefit: number;             // Σ 20J VOLLER PV-Nutzen: WP-Deckung + Haushaltsstrom-Ersparnis + Einspeisung
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
  /** Kurzangabe für den Szenario-Tab, z. B. „Strom +5 %/a". */
  sub: string;
  /** Erklärsatz des Szenarios (WP-Sicht: teurer Strom = ungünstig). */
  explain: string;
}

// ─── Core functions ────────────────────────────────────────────────────────
// calcHeatDemand / calcHeatLoad / flowTempForSystem / calcJAZ leben jetzt in
// heatpump-core.ts (siehe Re-Export oben) und werden hier importiert genutzt.

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

  // 4. 20-Jahre Betriebskosten WP — WP-Strom zum VOLLEN Netzpreis (WP-Tarif).
  // Die PV wird separat mit ihrem GESAMTEN Nutzen gutgeschrieben (pvBenefit),
  // damit "PV geplant" die Wärmepumpe nicht künstlich verteuert: früher wurden
  // die vollen PV-Kosten angerechnet, aber nur die WP-Strom-Deckung als Nutzen.
  const stromPrice = inputs.override?.stromPrice ?? cfg.wpTarif;
  let stromKosten = 0;
  const stromPerYear: number[] = [];
  for (let i = 0; i < cfg.years; i++) {
    const cost = eWp * stromPrice * Math.pow(1 + adj.stromInflation, i);
    stromKosten += cost;
    stromPerYear.push(cost);
  }
  stromKosten = Math.round(stromKosten);

  // PV-Vollnutzen (WP-Deckung + Haushaltsstrom-Ersparnis + Einspeisung).
  const pvActive = !!inputs.pv && inputs.pv.status !== "nein" && inputs.pv.kwp > 0;
  const pvCoverage = pvActive ? estimatePvCoverageOfWp(inputs.pv!.kwp, eWp, inputs.pv!.speicherKwh) : 0;
  let pvBenefit = 0;
  let pvStromSavings = 0;
  let pvBenefitPerYear: number[] = new Array(cfg.years).fill(0);
  if (pvActive) {
    const pv = inputs.pv!;
    const ertragKwp = pv.ertragKwp ?? PV_DEFAULT_YIELD_KWP;
    const householdBase = pv.haushaltKwh ?? householdKwhFromPersonen(inputs.personen);
    const nutzungIdx = pv.nutzungIdx ?? 1; // teils zuhause (HTW-Standardprofil)
    const pvProd = pv.kwp * ertragKwp;
    // Eigenverbrauchsquote über Haushalt + WP-Strom — dieselbe geteilte Funktion
    // wie im PV-Rechner (HTW-Power-Law).
    const evPct = calcEigenverbrauch({
      personenIdx: personenIdxFromCount(inputs.personen), nutzungIdx,
      speicherKwh: pv.speicherKwh, wp: "ja", ea: "nein", eaKm: 0,
      wpKwh: eWp, kwp: pv.kwp, ertragKwp, baseKwh: householdBase,
    }) / 100;
    const totalCons = householdBase + eWp;
    const totalSelf = Math.min(evPct * pvProd, totalCons);
    // Selbst verbrauchter Solarstrom verdrängt zuerst den (günstigeren) WP-Strom,
    // der Rest den (teureren) Haushaltsstrom — zwei Preise.
    const wpSelfKwh = Math.min(pvCoverage * eWp, totalSelf);
    const houseSelfKwh = Math.max(0, totalSelf - wpSelfKwh);
    const feedKwh = Math.max(0, pvProd - totalSelf);
    const feedInEur = calcWeightedFeedIn(pv.kwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10, DEFAULT_FEED_IN.thresholdKwp) / 100;
    pvBenefitPerYear = calcPvBenefitPerYear({
      wpSelfKwh, houseSelfKwh, feedKwh,
      wpPrice: stromPrice, housePrice: DEFAULT_PRICES.electricityPrice, feedInEur,
      years: cfg.years, priceIncrease: adj.stromInflation,
    });
    pvBenefit = Math.round(pvBenefitPerYear.reduce((a, b) => a + b, 0));
    // Reine WP-Strom-Ersparnis als Teilmenge (fürs "PV deckt X %"-Label).
    pvStromSavings = calcPvBenefitOverHorizon({
      wpSelfKwh, houseSelfKwh: 0, feedKwh: 0,
      wpPrice: stromPrice, housePrice: DEFAULT_PRICES.electricityPrice, feedInEur,
      years: cfg.years, priceIncrease: adj.stromInflation,
    });
  }

  // PV-Invest nur anrechnen wenn "geplant" — "vorhanden" ist Sunk Cost
  const pvInvest = (inputs.pv?.status === "geplant" && inputs.pv.kwp > 0)
    ? (inputs.pv.pvInvest ?? estimateCost(inputs.pv.kwp, inputs.pv.speicherKwh))
    : 0;
  const wartungWp = cfg.wpMaintenance * cfg.years;
  const tcoWp = investNetto + pvInvest + stromKosten + wartungWp - pvBenefit;

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
    // WP-Seite: voller Netzstrom minus PV-Vollnutzen des Jahres (WP-Deckung +
    // Haushaltsstrom-Ersparnis + Einspeisung) — so folgt die Kurve exakt dem TCO.
    const annualSaving = (gasPerYear[i] + cfg.gasFixCostPerYear + cfg.gasMaintenance) - (stromPerYear[i] + cfg.wpMaintenance - pvBenefitPerYear[i]);
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
    pvBenefit,
    pvInvest,
    gasKosten, gasFix, gasWartung, gasInvest, tcoGas,
    tcoEinsparung, einsparungProJahr, amortisationsJahre,
    co2Einsparung, co2WpProM2Jahr, years,
  };
}

// ─── Scenario wrappers (pessimistic/realistic/optimistic) ──────────────────

// Die Szenario-Justierung (Arbeitszahl + Preispfade) — als eigener Helper, damit
// nicht nur die Kern-Prognose, sondern auch der Sanierungswege-Vergleich auf der
// Ergebnisseite mit demselben Szenario rechnet (sonst widerspräche der Wege-Block
// dem oben gewählten Szenario).
export function heatPumpScenarioAdj(id: string, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): { jazFactor: number; stromInflation: number; gasInflation: number } {
  if (id === "pessimistic") return { jazFactor: 0.90, stromInflation: 0.05, gasInflation: 0.01 };
  if (id === "optimistic") return { jazFactor: 1.05, stromInflation: 0.01, gasInflation: 0.04 };
  return { jazFactor: 1.00, stromInflation: cfg.stromInflation, gasInflation: cfg.gasInflation };
}

export function calcHeatPumpScenarios(inputs: HeatPumpInputs, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): HeatPumpScenarioResult[] {
  // WP-Sicht: teurer Strom + billiges Gas ist ungünstig (Strom treibt die
  // WP-Kosten, Gas die Referenz). Daher ist „Pessimistisch" = Strom steigt
  // schnell / Gas kaum — spiegelbildlich zum PV-Rechner.
  const gasPct = (r: number) => `${(r * 100).toLocaleString("de-DE")} %`;
  const meta: Array<Pick<HeatPumpScenarioResult, "id" | "label" | "color" | "sub" | "explain">> = [
    { id: "pessimistic", label: "Pessimistisch", color: "#EF4444", sub: "Strom +5 %/a",
      explain: "Ungünstig für die Wärmepumpe: Der Strompreis steigt schnell (+5 %/Jahr), Gas kaum — und die Arbeitszahl fällt etwas schlechter aus." },
    { id: "realistic",   label: "Realistisch",   color: "#00D950", sub: `Strom +${gasPct(cfg.stromInflation)}/a`,
      explain: `Mittlere Annahme: Strompreis +${gasPct(cfg.stromInflation)}/Jahr, Gas +${gasPct(cfg.gasInflation)}/Jahr wie erwartet.` },
    { id: "optimistic",  label: "Optimistisch",  color: "#1365EA", sub: "Strom +1 %/a",
      explain: "Günstig für die Wärmepumpe: Der Strompreis bleibt fast stabil (+1 %/Jahr), Gas verteuert sich kräftig (+4 %/Jahr) — die WP spart mehr." },
  ];
  return meta.map(s => ({ ...s, ...calcHeatPump(inputs, cfg, heatPumpScenarioAdj(s.id, cfg)) }));
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
