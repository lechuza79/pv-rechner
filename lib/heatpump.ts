// ─── Heat Pump Calculation Engine ──────────────────────────────────────────
// Pure functions — no React, no I/O. Reusable in server/client.
//
// Methodik (Quellen in heatpump-config.ts):
//   Q_ges    = Wohnfläche × spez. Bedarf × Haustyp + Personen × 650  (dena, DIN V 18599)
//   Heizlast = Wohnfläche × spez.Heizlast(W/m²) × Haustyp × Auslegungsfaktor
//   JAZ      = a − b × T_Vorlauf                            (Fraunhofer ISE WPsmart)
//   E_WP     = Q_ges / JAZ                                  (Energiebilanz)
//   Invest   = base + perKw × Heizlast                      (BWP Preisübersicht)
//   BEG      = Grund 30% + Klima 16% (+Einkommen 40/30/10%, einkommensgestaffelt)  — Bestand only
//   Gas-Ref  = fuelKwh × (price × 1.02^t + CO2_t)  + Grundgebühr + Wartung
//   TCO_WP   = Invest_netto + Σ Strom + Σ Wartung
//   Einsparung = TCO_Gas − TCO_WP
//
// PV-Synergie wird separat über calcEigenverbrauch (lib/calc.ts) integriert,
// indem E_WP als Teil des Gesamtverbrauchs übergeben wird.

import { DEFAULT_HEATPUMP_CONFIG, type HeatPumpConfig } from "./heatpump-config";
import { co2SurchargeOverToday, calcWeightedFeedIn, calcPvBenefitPerYear } from "./calc";
import { DEFAULT_PRICES } from "./prices-config";
import { DEFAULT_FEED_IN } from "./feedin-config";
import { calcHeatDemand, calcHeatLoad, flowTempForSystem, calcJAZ } from "./heatpump-core";
import { v } from "./theme";

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
  // PV-Synergie: nur Anlagengröße + Speicher nötig — die WP-zurechenbare
  // Deckung wird konservativ heuristisch geschätzt (estimatePvCoverageOfWp).
  pv?: {
    status: "nein" | "geplant" | "vorhanden";
    kwp: number;
    speicherKwh: number;
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
    klimaBonus?: boolean;           // BEG Klima-Geschwindigkeits-Bonus (Eigennutzer) — default true
    haushaltseinkommen?: number;    // zu versteuerndes Haushaltsjahreseinkommen (€) für den gestaffelten Einkommens-Bonus; undefined = kein Bonus
    kindImHaushalt?: boolean;       // Familienzuschlag: hebt die Einkommensgrenze (begFamilienzuschlag)
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
  // PV synergy (nur der WP-zurechenbare Teil — NICHT der volle PV-Nutzen)
  pvCoverage: number;            // Anteil WP-Strom, den die PV zusätzlich deckt
  pvStromSavings: number;        // = pvBenefit (Synergie); Alias für Abwärtskompatibilität
  pvBenefit: number;             // Σ 20J WP-Synergie: wpSelfKwh × (WP-Tarif − Einspeisung)
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
  klimaBonus?: boolean;           // Klima-Geschwindigkeits-Bonus (Eigennutzer, alte fossile Heizung) — default true
  haushaltseinkommen?: number;    // zu versteuerndes Haushaltsjahreseinkommen (€); undefined/über der obersten Stufe = kein Einkommens-Bonus
  kindImHaushalt?: boolean;       // Familienzuschlag: hebt die maßgebliche Einkommensgrenze um begFamilienzuschlag
}

// KfW Merkblatt Nr. 458 (BEG EM), gültig ab 21.07.2026:
//   Grundförderung 30 % (immer, Bestand)
//   + Klima-Geschwindigkeits-Bonus 16 % (Eigennutzer, alte fossile Heizung)
//   + Einkommens-Bonus gestaffelt 40/30/10 % nach Haushaltseinkommen
//   Deckel 70 % (Regelfall) bzw. 80 % (niedrigstes Einkommen), max. 28.000 € Kosten.
// Der frühere Effizienz-Bonus (5 % für natürliches Kältemittel) ist mit der Reform entfallen.
export function calcBegSubsidy(situation: "bestand" | "neubau", wpType: "lwwp" | "swwp", investBrutto: number, opts: BegOptions = {}, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG) {
  void wpType; // Kältemittel-/Quellentyp spielt für die Fördersätze keine Rolle mehr (Effizienz-Bonus entfallen)
  if (situation === "neubau") {
    return { rate: 0, amount: 0, breakdown: [{ label: "Neubau ohne BEG-Förderung", rate: 0 }] };
  }
  const klimaBonus = opts.klimaBonus ?? true;

  const breakdown: { label: string; rate: number }[] = [];
  let rate = cfg.begGrundfoerderung;
  breakdown.push({ label: "Grundförderung", rate: cfg.begGrundfoerderung });

  // Klima-Geschwindigkeits-Bonus: Tausch einer funktionierenden (alten) fossilen Heizung
  if (klimaBonus) {
    rate += cfg.begKlimaBonus;
    breakdown.push({ label: "Klima-Geschwindigkeits-Bonus", rate: cfg.begKlimaBonus });
  }

  // Einkommens-Bonus: gestaffelt. Ein Kind im Haushalt hebt die maßgebliche
  // Einkommensgrenze (Familienzuschlag) → wir rechnen es als Abzug vom Einkommen.
  // Die 80 %-Obergrenze gilt nur für die unterste Einkommensstufe.
  let lowIncome = false;
  if (opts.haushaltseinkommen != null && opts.haushaltseinkommen > 0) {
    const adjusted = opts.haushaltseinkommen - (opts.kindImHaushalt ? cfg.begFamilienzuschlag : 0);
    const tier = cfg.begEinkommensStaffel.find(t => adjusted <= t.maxIncome);
    if (tier) {
      rate += tier.rate;
      breakdown.push({ label: "Einkommens-Bonus", rate: tier.rate });
      if (adjusted <= cfg.begEinkommensStaffel[0].maxIncome) lowIncome = true;
    }
  }

  rate = Math.min(rate, lowIncome ? cfg.begMaxRateLowIncome : cfg.begMaxRate);

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
    klimaBonus: inputs.override?.klimaBonus ?? true,
    haushaltseinkommen: inputs.override?.haushaltseinkommen,
    kindImHaushalt: inputs.override?.kindImHaushalt,
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

  // PV-SYNERGIE (nur der WP-zurechenbare Teil, NICHT der volle PV-Nutzen):
  // Der WP-Rechner vergleicht Wärmepumpe gegen Gas. Die Haushaltsstrom-Ersparnis
  // und die Einspeisung einer PV fallen aber AUCH bei Gas an — sie hängen nicht
  // an der WP-Entscheidung und dürfen ihr nicht gutgeschrieben werden (sonst
  // sähe jede WP für PV-Besitzer wie ein Selbstläufer aus; Council-Audit).
  // WP-zurechenbar ist allein der Solarstrom, den die WP ZUSÄTZLICH selbst
  // verbraucht: ohne WP würde er eingespeist (Einspeisevergütung), mit WP spart
  // er den WP-Tarif → Synergie = wpSelfKwh × (WP-Tarif − Einspeisung). Die PV
  // selbst (Kosten UND voller Nutzen) gehört in den PV-Rechner, nicht hierher.
  const pvActive = !!inputs.pv && inputs.pv.status !== "nein" && inputs.pv.kwp > 0;
  let pvCoverage = 0;
  let pvBenefit = 0;
  let pvStromSavings = 0;
  let pvBenefitPerYear: number[] = new Array(cfg.years).fill(0);
  if (pvActive) {
    const pv = inputs.pv!;
    // Anteil des WP-Stroms, den die PV deckt: konservative, MONOTONE HTW-Heuristik
    // (steigt sauber mit Anlagengröße und Speicher, gedeckelt bei 35 %). Bewusst
    // NICHT aus der Differenz zweier Eigenverbrauchs-Quoten gerechnet — die rundet
    // intern auf ganze Prozent, deckelt und hat einen Boden; ihre Differenz ist
    // nicht-monoton (Speicher würde die Deckung senken) und liefert unmögliche
    // Werte. Die WP läuft v. a. im Winter mit wenig Sonne → 35 %-Deckel ist real.
    const wpSelfKwh = estimatePvCoverageOfWp(pv.kwp, eWp, pv.speicherKwh) * eWp;
    pvCoverage = eWp > 0 ? wpSelfKwh / eWp : 0;
    const feedInEur = calcWeightedFeedIn(pv.kwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10, DEFAULT_FEED_IN.thresholdKwp) / 100;
    // Ersparnis: WP-Strom, den die Sonne deckt (WP-Tarif, steigt) …
    const wpSaving = calcPvBenefitPerYear({ wpSelfKwh, houseSelfKwh: 0, feedKwh: 0, wpPrice: stromPrice, housePrice: DEFAULT_PRICES.electricityPrice, feedInEur, years: cfg.years, priceIncrease: adj.stromInflation });
    // … minus die entgangene Einspeisung dieses Stroms (fest, nur EEG-Zeitraum).
    const foregoneFeed = calcPvBenefitPerYear({ wpSelfKwh: 0, houseSelfKwh: 0, feedKwh: wpSelfKwh, wpPrice: stromPrice, housePrice: DEFAULT_PRICES.electricityPrice, feedInEur, years: cfg.years, priceIncrease: adj.stromInflation });
    pvBenefitPerYear = wpSaving.map((s, i) => s - foregoneFeed[i]);
    pvBenefit = Math.round(pvBenefitPerYear.reduce((a, b) => a + b, 0));
    pvStromSavings = pvBenefit; // die Synergie IST die WP-Ersparnis durch PV
  }

  // Kein PV-Invest im WP-Vergleich: die PV-Anschaffung ist eine eigene
  // Entscheidung (PV-Rechner), nicht Teil der Wärmepumpe-vs-Gas-Rechnung.
  const wartungWp = cfg.wpMaintenance * cfg.years;
  const tcoWp = investNetto + stromKosten + wartungWp - pvBenefit;

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

  // 6. Vergleich (PV-Invest ist NICHT Teil der WP-Rechnung — eigene Entscheidung)
  const mehrInvest = investNetto - gasInvest;
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
    { id: "pessimistic", label: "Pessimistisch", color: v("--color-negative"), sub: "Strom +5 %/a",
      explain: "Ungünstig für die Wärmepumpe: Der Strompreis steigt schnell (+5 %/Jahr), Gas kaum — und die Arbeitszahl fällt etwas schlechter aus." },
    { id: "realistic",   label: "Realistisch",   color: v("--color-positive"), sub: `Strom +${gasPct(cfg.stromInflation)}/a`,
      explain: `Mittlere Annahme: Strompreis +${gasPct(cfg.stromInflation)}/Jahr, Gas +${gasPct(cfg.gasInflation)}/Jahr wie erwartet.` },
    { id: "optimistic",  label: "Optimistisch",  color: v("--color-accent"), sub: "Strom +1 %/a",
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
