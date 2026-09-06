// ─── Heat Pump Calculation Engine ──────────────────────────────────────────
// Pure functions — no React, no I/O. Reusable in server/client.
//
// Methodik (Quellen in heatpump-config.ts):
//   Q_ges    = Wohnfläche × spez. Bedarf × Haustyp + Personen × 650  (dena, DIN V 18599)
//   Heizlast = Wohnfläche × spez.Heizlast(W/m²) × Haustyp          (Norm, DIN EN 12831)
//   Auslegung = Heizlast × Auslegungsfaktor                        (Anlagengröße, bestimmt den Preis)
//   JAZ      = a − b × T_Vorlauf                            (Fraunhofer ISE WPsmart)
//   E_WP     = Q_ges / JAZ                                  (Energiebilanz)
//   Invest   = base + perKw × Auslegung                     (VZ-Angebotsauswertung)
//   BEG      = Grund 30% + Klima 16% (+Einkommen 40/30/10%, einkommensgestaffelt)  — Bestand only
//              Grund, Klima und Höchstbetrag folgen dem Fahrplan der Richtlinie
//              (BEG_FAHRPLAN); der Fördersatz halbiert sich zum 01.01.2027.
//   Gas-Ref  = fuelKwh × (price × 1.02^t + CO2_t)  + Grundgebühr + Wartung
//   TCO_WP   = Invest_netto + Σ Strom + Σ Wartung
//   Einsparung = TCO_Gas − TCO_WP
//
// PV-Synergie wird separat über calcEigenverbrauch (lib/calc.ts) integriert,
// indem E_WP als Teil des Gesamtverbrauchs übergeben wird.

import {
  DEFAULT_HEATPUMP_CONFIG,
  begStufeAm,
  BEG_WERTSCHOEPFUNGS_BONUS,
  STROM_PFAD,
  GAS_PFAD,
  type HeatPumpConfig,
  type BegStufe,
} from "./heatpump-config";
import { calcWeightedFeedIn, calcPvBenefitPerYear } from "./calc";
import { calcFossilReference, wpStandingCostPerYear } from "./fossil-reference";
import { DEFAULT_PRICES } from "./prices-config";
import { DEFAULT_FEED_IN } from "./feedin-config";
import { calcHeatDemand, calcHeatLoad, auslegungsleistung, flowTempForSystem, calcJAZ } from "./heatpump-core";
import { type FuelKind } from "./constants";
import type { GasScenario } from "./greengas-config";
import { v } from "./theme";

// Reine Bedarfs-/JAZ-Funktionen + WP-Jahresstrom + Standard-Gebäude leben in
// heatpump-core.ts (calc-frei, zyklusfrei). Hier re-exportiert, damit bestehende
// Importe `from "./heatpump"` unverändert funktionieren.
export {
  calcHeatDemand,
  calcHeatLoad,
  auslegungsleistung,
  flowTempForSystem,
  calcJAZ,
  calcWpAnnualElectricity,
  DEFAULT_WP_BUILDING,
  defaultWpAnnualKwh,
  DEFAULT_WP_ANNUAL_KWH,
  wpGebaeudeUebersprungenFolge,
  type WpElectricityInputs,
} from "./heatpump-core";

export interface HeatPumpInputs {
  situation: "bestand" | "neubau";
  wohnflaeche: number;          // m²
  insulationIdx: number;         // Index in INSULATION_BESTAND (0–3) / INSULATION_NEUBAU (0–2)
  // Energieträger der Referenzheizung. Preis/Wirkungsgrad/CO₂ kommen weiterhin
  // über `override` aus WP_FUEL_OPTIONS; `fuelKind` entscheidet zusätzlich über
  // das, was NICHT am Brennstoffpreis hängt: die Grundgebühr (Gasanschluss ja,
  // Öltank nein) und ob die Grüngas-Pflicht überhaupt anwendbar ist.
  fuelKind?: FuelKind;           // default "gas"
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
  // Grüngas-Modus (GModG Bio-Treppe): ersetzt den Gas-Referenzpreis-Pfad durch den
  // zeitvariablen GModG-Gas-Mix (Biomethan-Beimischung + steigende Netzentgelte +
  // CO₂), Modell lib/greengas.ts (IW-Report 36/2026). Default aus — bewusst als
  // klar gekennzeichnetes, zuschaltbares Szenario, nie als Standard.
  greenGas?: boolean;
  /**
   * Kommunaler Zuschuss (€), den der Nutzer im Ergebnis anrechnen lässt — kommt
   * aus dem Förderkatalog (stackFunding), NICHT aus diesem Modul. Er wird hier
   * hereingereicht statt errechnet, weil er am Wohnort hängt und nicht am
   * Gebäude; gekappt wird er trotzdem hier, weil nur dieses Modul die BEG kennt,
   * gegen die gekappt werden muss ({@link begKumulierungsSpielraum}).
   */
  kommunalFoerderung?: number;
  /**
   * Welche Stufe des BEG-Fahrplans gerechnet wird (BEG_FAHRPLAN in
   * lib/heatpump-config.ts). Ohne Angabe: die heute geltende.
   *
   * Bewusst KEIN Datum, sondern die Stufe selbst: Ein Datum müsste hier ein
   * zweites Mal in den Fahrplan aufgelöst werden, und die Oberfläche zeigt dem
   * Nutzer ohnehin die Stufe (samt dem, was sich an ihrem Stichtag ändert).
   * Zwei Auflösungen desselben Datums sind eine Gelegenheit, auseinanderzulaufen.
   */
  begStufe?: BegStufe;
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
    fossilErsatzInvest?: number;    // € neue fossile Heizung (0 = Altanlage läuft noch lange)
    klimaBonus?: boolean;           // BEG Klima-Geschwindigkeits-Bonus (Eigennutzer) — default true
    haushaltseinkommen?: number;    // zu versteuerndes Haushaltsjahreseinkommen (€) für den gestaffelten Einkommens-Bonus; undefined = kein Bonus
    kindImHaushalt?: boolean;       // Familienzuschlag: hebt die Einkommensgrenze (begFamilienzuschlag)
    euUrsprung?: boolean;           // Wertschöpfungs-Bonus: Wärmepumpe mit Ursprung in der Union (wirkt erst ab dessen Stichtag)
  };
}

export interface HeatPumpResult {
  // Demand
  qHeiz: number;
  qWw: number;
  qGes: number;
  heizlastKw: number;              // Norm-Heizlast des Gebäudes (DIN EN 12831)
  auslegungKw: number;             // Auslegungsleistung der Wärmepumpe (Norm × Auslegungsfaktor)
  // Heat pump performance
  flowTemp: number;
  jaz: number;
  eWp: number;                   // kWh electric/year
  // Investment
  investBrutto: number;
  beg: { rate: number; amount: number; breakdown: { label: string; rate: number }[] };
  /**
   * Kommunaler Zuschuss nach der Kumulierungsgrenze. `roh` ist, was die
   * Programme ergeben, `angerechnet` was davon abgezogen wird — beide Zahlen,
   * damit die Oberfläche eine Kürzung benennen kann, statt sie stumm
   * vorzunehmen. Eine angezeigte Förderzeile, die nicht in der Investition
   * steckt, wäre genau der Widerspruch zwischen Text und Zahl, den dieses
   * Projekt als schwersten Fehler führt.
   */
  kommunal: { roh: number; angerechnet: number; spielraum: number };
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
  gasInvest: number;             // Anschaffung der fossilen Alternative (Neubau + Bestandsersatz)
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

export function calcInvestBrutto(wpType: "lwwp" | "swwp", auslegungKw: number, doHeizkoerperTausch: boolean, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): number {
  const base = wpType === "swwp" ? cfg.investSwwpBase : cfg.investLwwpBase;
  const perKw = wpType === "swwp" ? cfg.investSwwpPerKw : cfg.investLwwpPerKw;
  const heatpumpCost = base + perKw * auslegungKw;
  // Tauschkosten nur wenn die Maßnahme aktiv gewählt ist — nicht mehr automatisch
  // an "alte Heizkörper" gekoppelt (sonst zahlt man den Tausch ohne JAZ-Nutzen).
  const hkTausch = doHeizkoerperTausch ? cfg.heizkoerperTauschKosten : 0;
  return Math.round(heatpumpCost + hkTausch);
}

export interface BegOptions {
  klimaBonus?: boolean;           // Klima-Geschwindigkeits-Bonus (Eigennutzer, alte fossile Heizung) — default true
  haushaltseinkommen?: number;    // zu versteuerndes Haushaltsjahreseinkommen (€); undefined/über der obersten Stufe = kein Einkommens-Bonus
  kindImHaushalt?: boolean;       // Familienzuschlag: hebt die maßgebliche Einkommensgrenze um begFamilienzuschlag
  /**
   * Welche Stufe des Fahrplans gilt (BEG_FAHRPLAN in lib/heatpump-config.ts).
   * Ohne Angabe: die heute geltende — der Fall, der für jeden zutrifft, der
   * jetzt beantragt.
   */
  stufe?: BegStufe;
  /**
   * Hat die Wärmepumpe ihren Ursprung in der Union (Nr. 8.4.6)? Wirkt erst ab
   * dem Stichtag des Bonus und nur, wenn die Stufe ihn schon trägt.
   *
   * OHNE ANGABE: nein — nicht weil das wahrscheinlicher wäre, sondern weil es
   * die Richtung ist, in der eine Enttäuschung ausbleibt. Die Oberfläche fragt
   * ausdrücklich nach und nennt beide Beträge, statt die Annahme stillschweigend
   * zu treffen.
   *
   * ER IST NICHT AN DIE SELBSTNUTZUNG GEBUNDEN, anders als Klima- und
   * Einkommens-Bonus: Nr. 8.4.6 nennt keine solche Voraussetzung. Ein Vermieter
   * bekommt ihn also, obwohl er sonst nur die Grundförderung hat.
   */
  euUrsprung?: boolean;
}

// Förderrichtlinie BEG EM vom 17.07.2026 (Volltext in docs/quellen/):
//   Grundförderung 30 % für Wärmepumpen (Nr. 8.4.1 Buchst. c) — ab dem
//     01.01.2027 nur noch 15 %, siehe BEG_FAHRPLAN
//   + Klima-Geschwindigkeits-Bonus 16 % (Eigennutzer, alte fossile Heizung, Nr. 8.4.4)
//   + Einkommens-Bonus gestaffelt 40/30/10 % nach Haushaltseinkommen (Nr. 8.4.5)
//   Deckel 70 % bzw. 80 % beim niedrigsten Einkommen (Nr. 8.4.1 Satz 1),
//   höchstens 28.000 € förderfähige Kosten für die erste Wohneinheit (Nr. 8.3.1 Buchst. a).
// Der frühere Effizienz-Bonus (5 % für natürliches Kältemittel) ist mit der Reform entfallen.
//
// DIE SÄTZE KOMMEN AUS DER STUFE, nicht direkt aus der Config: Grundförderung,
// Klimabonus und Höchstbetrag ändern sich zu festen Stichtagen, und zwar zu
// VERSCHIEDENEN. Wer hier wieder cfg.begGrundfoerderung liest, friert den Stand
// von heute ein — das ist genau der Fehler, den der Fahrplan behebt.
// Unberührt vom Fahrplan bleiben Einkommens-Staffel, Familienzuschlag und die
// Obergrenzen: Für sie sieht die Richtlinie keine Absenkung vor.
export function calcBegSubsidy(situation: "bestand" | "neubau", wpType: "lwwp" | "swwp", investBrutto: number, opts: BegOptions = {}, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG) {
  void wpType; // Kältemittel-/Quellentyp spielt für die Fördersätze keine Rolle mehr (Effizienz-Bonus entfallen)
  if (situation === "neubau") {
    return { rate: 0, amount: 0, breakdown: [{ label: "Neubau ohne BEG-Förderung", rate: 0 }] };
  }
  const klimaBonus = opts.klimaBonus ?? true;
  const stufe = opts.stufe ?? begStufeAm(new Date());

  const breakdown: { label: string; rate: number }[] = [];
  let rate = stufe.grundfoerderung;
  breakdown.push({ label: "Grundförderung", rate: stufe.grundfoerderung });

  // Klima-Geschwindigkeits-Bonus: Tausch einer funktionierenden (alten) fossilen Heizung.
  // Ab dem 01.08.2028 gibt es ihn nicht mehr (Stufe trägt dann 0) — dann darf auch
  // keine Zeile dafür im Ergebnis stehen, sonst zeigt die Aufschlüsselung einen
  // Posten über null Euro.
  if (klimaBonus && stufe.klimaBonus > 0) {
    rate += stufe.klimaBonus;
    breakdown.push({ label: "Klima-Geschwindigkeits-Bonus", rate: stufe.klimaBonus });
  }

  // Wertschöpfungs-Bonus (Nr. 8.4.6): 15 Prozentpunkte ab dem ersten Quartal
  // 2027 für Wärmepumpen mit Ursprung in der Union.
  //
  // ER IST BETRAGSGLEICH MIT DER HALBIERUNG — und das ist die eigentliche
  // Aussage der Reform: −15 Punkte auf den Grundsatz, +15 Punkte für ein Gerät
  // aus der EU. Wo keine Obergrenze greift, ändert sich der Fördersatz für ein
  // solches Gerät ab 2027 GAR NICHT. Wer den Bonus wegließe und nur die
  // Halbierung zeigte, behauptete eine Kürzung, die es für einen Teil der Geräte
  // nicht gibt — nicht „etwas zu ungünstig gerechnet", sondern die falsche
  // Frage beantwortet.
  if (opts.euUrsprung && stufe.abIso >= BEG_WERTSCHOEPFUNGS_BONUS.abIso) {
    rate += BEG_WERTSCHOEPFUNGS_BONUS.satz;
    breakdown.push({ label: "Wertschöpfungs-Bonus", rate: BEG_WERTSCHOEPFUNGS_BONUS.satz });
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

  const cappedInvest = Math.min(investBrutto, stufe.maxCap);
  const amount = Math.round(cappedInvest * rate);
  return { rate, amount, breakdown };
}

/**
 * Wieviel Geld neben der BEG überhaupt noch Platz hat (€).
 *
 * Die BEG lässt andere öffentliche Mittel zu, aber nicht unbegrenzt: Gedeckelt
 * ist die Summe auf `begKumulierungsGrenze` der TATSÄCHLICH GEFÖRDERTEN Kosten
 * — also auf den bei `begMaxCap` gekappten Investitionsbetrag, nicht auf die
 * volle Rechnung. Wer eine 45.000-€-Anlage baut, bezieht die Grenze trotzdem auf
 * die 28.000 €, die überhaupt gefördert werden.
 *
 * Herleitung und die bewusst strenge Lesart stehen bei `begKumulierungsGrenze`
 * in lib/heatpump-config.ts; Beleg: KfW-Merkblatt 458 (Stand 07/2026), Volltext
 * in docs/quellen/.
 *
 * Der Höchstbetrag kommt aus DERSELBEN Stufe wie die Förderung selbst. Zwei
 * verschiedene Höchstbeträge in einer Rechnung — der Zuschuss nach dem einen,
 * der Spielraum daneben nach dem anderen — ergäben einen Spielraum, der zu
 * keinem der beiden Stände gehört.
 */
export function begKumulierungsSpielraum(
  begAmount: number,
  investBrutto: number,
  cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG,
  stufe: BegStufe = begStufeAm(new Date()),
): number {
  const gefoerderteKosten = Math.min(investBrutto, stufe.maxCap);
  return Math.max(0, Math.round(gefoerderteKosten * cfg.begKumulierungsGrenze - begAmount));
}

// ─── Main TCO calculation ──────────────────────────────────────────────────

export function calcHeatPump(inputs: HeatPumpInputs, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG, scenarioAdj?: { jazFactor: number; stromInflation: number; gasInflation: number; gasScenario?: GasScenario }): HeatPumpResult {
  const adj = scenarioAdj ?? { jazFactor: 1, stromInflation: cfg.stromInflation, gasInflation: cfg.gasInflation, gasScenario: "base" as GasScenario };

  // 1. Heizwärmebedarf
  const demand = calcHeatDemand(inputs.situation, inputs.wohnflaeche, inputs.insulationIdx, inputs.personen, cfg, inputs.haustypFaktor ?? 1);
  const qGes = inputs.override?.qGes ?? demand.qGes;

  // 2. Heizlast & JAZ
  // Heizlast aus spez. W/m² × Fläche × Haustyp (nicht mehr aus Jahresbedarf ÷ 2000 h —
  // das hatte das Warmwasser mitgezählt und die Anlage zu groß gemacht). Individuelle
  // DIN-Heizlastberechnung schlägt die Schätzung: override.heizlast.
  // Norm-Heizlast (Gebäude) und Auslegungsleistung (Anlage) sind zwei Größen — der
  // Auslegungsfaktor wird an genau einer Stelle angewandt (auslegungsleistung), damit
  // eine eingetragene DIN-Heizlast denselben Weg nimmt wie die Schätzung.
  const heizlastKw = inputs.override?.heizlast
    ?? calcHeatLoad(inputs.situation, inputs.wohnflaeche, inputs.insulationIdx, inputs.haustypFaktor ?? 1, cfg);
  const auslegungKw = auslegungsleistung(heizlastKw, cfg);
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
  const investBrutto = calcInvestBrutto(inputs.wpType, auslegungKw, doHkTausch, cfg);
  const begStufe = inputs.begStufe ?? begStufeAm(new Date());
  const beg = calcBegSubsidy(inputs.situation, inputs.wpType, investBrutto, {
    klimaBonus: inputs.override?.klimaBonus ?? true,
    haushaltseinkommen: inputs.override?.haushaltseinkommen,
    kindImHaushalt: inputs.override?.kindImHaushalt,
    euUrsprung: inputs.override?.euUrsprung,
    stufe: begStufe,
  }, cfg);
  // Kommunaler Zuschuss NEBEN der BEG — gekappt an der Kumulierungsgrenze, damit
  // die Summe der öffentlichen Mittel nicht über das hinausgeht, was die BEG
  // neben sich duldet.
  const kommunalRoh = Math.max(0, Math.round(inputs.kommunalFoerderung ?? 0));
  const kommunalSpielraum = begKumulierungsSpielraum(beg.amount, investBrutto, cfg, begStufe);
  const kommunalAngerechnet = Math.min(kommunalRoh, kommunalSpielraum);
  const kommunal = { roh: kommunalRoh, angerechnet: kommunalAngerechnet, spielraum: kommunalSpielraum };
  // Ein von Hand gesetzter Investitionsbetrag ist der Preis, den jemand
  // TATSÄCHLICH zahlt — da ist jede Förderung schon drin. Sie ein zweites Mal
  // abzuziehen wäre der doppelte Abzug, vor dem der Hinweis daneben warnt.
  const investNetto = inputs.override?.investNetto ?? (investBrutto - beg.amount - kommunalAngerechnet);

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
  // Wartung + Grundpreis des WP-Stromzählers. Der Grundpreis fehlte bis 28.07.2026
  // ganz, während die Gas-Seite einen trug — eine Schieflage zugunsten der WP.
  const wartungWp = (cfg.wpMaintenance + cfg.wpFixCostPerYear) * cfg.years;
  const tcoWp = investNetto + stromKosten + wartungWp - pvBenefit;

  // 5. 20-Jahre Brennstoff-Referenz (Gas oder Heizöl)
  // Die Annahmen der fossilen Seite — Anschaffung, Grundpreis, Wartung und die Frage,
  // ob die Bio-Treppe überhaupt greift — liegen in lib/fossil-reference.ts, damit der
  // PV-Rechner exakt dieselbe Grundlage benutzt (er hatte vorher eine eigene, die
  // auseinandergelaufen war). Zahlen weiterhin aus heatpump-config.ts.
  const fuelKind: FuelKind = inputs.fuelKind ?? "gas";
  const gasPrice = inputs.override?.gasPrice ?? cfg.gasPriceCtPerKwh / 100;
  const gasEff = Math.max(0.5, inputs.override?.gasEfficiency ?? cfg.gasEfficiency);  // gegen /0
  const gasCo2 = inputs.override?.gasCo2 ?? cfg.gasCo2PerKwh;
  const fuelKwh = qGes / gasEff;
  // Anschaffung der fossilen Alternative — auch im BESTAND. Wer sich gegen die
  // Wärmepumpe entscheidet, betreibt nicht 20 Jahre lang eine alte Heizung weiter,
  // sondern kauft in diesem Zeitraum einen neuen Kessel. Genau dieser Neueinbau
  // löst auch die Bio-Treppe aus (§ 43 GModG gilt nur für Anlagen, die neu in ein
  // bestehendes Gebäude eingebaut werden) — vorher rechneten wir die Pflicht, ohne
  // die zugehörige Investition anzusetzen, also zwei Hälften verschiedener Fälle.
  // Wer eine junge Heizung hat, setzt den Betrag im Ergebnis auf 0 — dann fällt über
  // greenGasApplies() auch die Beimischungspflicht weg (die Regel steht nur dort).
  const gasInvest = inputs.override?.fossilErsatzInvest ?? cfg.fossilErsatzInvest;
  // Grüngas-Modus (GModG Bio-Treppe): der Gaspreis wird Jahr für Jahr neu gemischt
  // (teures Biomethan verdrängt Erdgas, Netzentgelt + CO₂ steigen eigenständig) —
  // das kann das simple „Preis × Teuerung"-Modell nicht abbilden. Modell +
  // Szenario-Korridor (low/base/high, gemappt auf Pessimistisch/Realistisch/
  // Optimistisch aus WP-Sicht): lib/greengas.ts.
  const ref = calcFossilReference({
    fuelKind,
    fuelKwh,
    years: cfg.years,
    pricePerKwh: gasPrice,
    co2PerKwh: gasCo2,
    inflation: adj.gasInflation,
    fossilInvest: gasInvest,
    greenGas: !!inputs.greenGas,
    gasScenario: adj.gasScenario ?? "base",
  }, cfg);
  const fixPerYear = ref.fixPerYear;
  const gasPerYear = ref.fuelPerYear;
  const gasKosten = ref.fuel;
  const gasFix = ref.fix;
  const gasWartung = ref.wartung;
  const tcoGas = ref.total;

  // 6. Vergleich (PV-Invest ist NICHT Teil der WP-Rechnung — eigene Entscheidung)
  const mehrInvest = investNetto - gasInvest;
  const tcoEinsparung = Math.round(tcoGas - tcoWp);
  const einsparungProJahr = Math.round(tcoEinsparung / cfg.years);

  // 7. Chart-Daten: kumulierte Einsparung (Jahr 0 = −Mehrinvest)
  const years: { i: number; kum: number; annual: number }[] = [];
  let kum = -mehrInvest;
  years.push({ i: 0, kum: Math.round(kum), annual: 0 });
  // Wenn die fossile Anschaffung teurer ist als die geförderte Wärmepumpe, steht die
  // Kurve schon im ersten Jahr im Plus — das ist dann Amortisation 0, nicht 1. Die
  // Schleife allein hätte hier „1 Jahr" gemeldet.
  for (let i = 0; i < cfg.years; i++) {
    // WP-Seite: voller Netzstrom minus PV-Vollnutzen des Jahres (WP-Deckung +
    // Haushaltsstrom-Ersparnis + Einspeisung) — so folgt die Kurve exakt dem TCO.
    const annualSaving = (gasPerYear[i] + fixPerYear + ref.wartungPerYear) - (stromPerYear[i] + wpStandingCostPerYear(cfg) - pvBenefitPerYear[i]);
    kum += annualSaving;
    years.push({ i: i + 1, kum: Math.round(kum), annual: Math.round(annualSaving) });
  }
  // Amortisation = das erste Jahr, ab dem die Kurve DAUERHAFT im Plus bleibt —
  // dieselbe Regel wie in lib/calc.ts. Das erste Kreuzen allein genügt nicht: Die
  // Jahresersparnis kann später drehen (steigender Strompreis gegen gedeckelten
  // Brennstoffpfad), und dann meldete der Rechner „amortisiert nach 3 Jahren",
  // während die Bilanz nach 20 Jahren mit 2.067 € im Minus endete (Council
  // 18.08.2026, 140 m² teilsaniert, alte Heizkörper, pessimistisches Szenario).
  // Eine Amortisation, die wieder verschwindet, ist keine.
  const amortisationsJahre: number | null =
    years.find((y, idx) => y.kum >= 0 && years.slice(idx).every(z => z.kum >= 0))?.i ?? null;

  // 8. CO₂-Einsparung — bewusst gegen FOSSILES Gas gerechnet, auch im Grüngas-Modus.
  // Grüngas ist ein KOSTEN-Szenario (teure Biomethan-Pflicht); die Emissions-Kachel
  // beantwortet die andere Frage „wie viel CO₂ spart die WP gegenüber fossilem Gas".
  // Beide Effekte getrennt zu halten ist ehrlicher, als sie zu vermischen.
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
    heizlastKw, auslegungKw, flowTemp, jaz: Math.round(jaz * 100) / 100, eWp,
    investBrutto, beg, kommunal, investNetto,
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
/**
 * Die Preispfade — jede der sechs Zahlen ist eine Studienzahl.
 *
 * WAS HIER STAND, in drei Fassungen binnen zweier Tage: erst Strom +5/+2/+1 %
 * und Gas +1/+2/+4 % ganz ohne Beleg, dann +4/+2/+1 gegen +2/+2,5/+5 mit einer
 * Leitquelle für die Mitte und gegriffenen Rändern. Der Betreiber hat am
 * 06.09.2026 das Naheliegende verlangt: die Werte aus den Studien nehmen,
 * darauf verweisen, und nicht runden — „das macht wohl auch einen unterschied
 * über so einen langen zeitraum". Nachgemessen am Referenzfall (unsanierter
 * Altbau, 140 m², alte Heizkörper): Zwischen 4,0 und 4,38 % Strompfad liegen
 * über zwanzig Jahre rund 2.800 €. Die Rundung war teurer als die Recherche.
 *
 * WIRKUNG DER GANZEN UMSTELLUNG, am selben Fall: Die mittlere Zahl fällt von
 * 18.323 auf 14.008 € — die Wärmepumpe spart nach den Studienwerten also
 * WENIGER, als die gegriffenen Pfade behauptet hatten. Beide Bewegungen gehen
 * zu ihren Lasten: Strom von 2,0 auf 2,30 %, Gas von 2,5 auf 2,11 %.
 *
 * ── DIE BEIDEN QUELLEN ──────────────────────────────────────────────────────
 *
 * UBA = Kemmler u. a. (2026): „Rahmendaten und Endverbrauchspreise für die
 *   Treibhausgas-Projektionen 2026", 3. Auflage, Prognos AG im Auftrag des
 *   Umweltbundesamtes, FKZ 37K2 44 201 0, DOI 10.60810/openumwelt-8481.
 *   Tabelle 3 (Preisindex BIP, S. 21), Tabelle 12 (Erdgas Haushalte, S. 58),
 *   Tabelle 13 (Strom Wärmepumpentarif, S. 59).
 *   Volltext: `docs/quellen/UBA-Rahmendaten-THG-Projektionen-2026.pdf`.
 *
 * ISE = Fraunhofer ISE (23.06.2026): Kurzstudie „Vergleich Wärmeversorgung /
 *   Auswirkungen der Bio-Treppe in § 43", im Auftrag der MVV Energie AG.
 *   Folie 17 (Endkundenpreise in Preisen 2026), Folie 21/22 (Zusammensetzung
 *   und Netzentgelt-Annahmen). Volltext:
 *   `docs/quellen/Fraunhofer-ISE-Biotreppe-GModG-2026-06.pdf`.
 *
 * Beide am 06.09.2026 im Original gelesen. Die ISE-Kurven stehen dort nur als
 * Grafik; sie wurden aus der 800-dpi-Fassung der Folie pixelgenau ausgelesen
 * (Raster 376,3 Pixel je 5 ct, Nulllinie bei Zeile 4847,5).
 *
 * EINE PIXELMESSUNG KANN TROTZDEM DANEBENLIEGEN, und genau das ist passiert:
 * Am linken Rand liegen die beiden Stromkurven fast übereinander, und die
 * hellere ist ÜBER der dunklen gezeichnet — von der dunklen sind vier von
 * vierundzwanzig Pixelzeilen sichtbar. Die erste Messung nahm deren Unterkante
 * für den Wert und startete den oberen Pfad bei 27,31 statt 27,48 ct; die Rate
 * kam dadurch 0,04 Punkte zu hoch heraus (rund 180 € im Referenzfall, zulasten
 * der Wärmepumpe). Gefunden von einem adversarialen Prüfer, der zusätzlich die
 * Gegenprobe geliefert hat: Auf Folie 22 sind die 2026er Säulen beider
 * Stromszenarien gleich hoch — die beiden Pfade starten also auf demselben
 * Wert, und das ist der einzige unverdeckt messbare, 27,48 ct.
 *
 * REGEL DARAUS: Wo zwei Kurven einander berühren, misst man die Kurve, die
 * OBEN liegt, und nimmt den Wert für beide — die untere ist an dieser Stelle
 * gar nicht messbar, nur ihre Kante.
 *
 * WARUM DIESE ZWEI UND NICHT DIE GROSSEN HÄUSER: Weder Projektionsbericht noch
 * Ariadne, Langfristszenarien, dena oder Agora variieren die Endkundenpreise
 * über ihre Szenarien — der Projektionsbericht sagt ausdrücklich, dabei
 * „würden sich die Wirkungen überlagern und wären nicht mehr klar zuordenbar".
 * Eine Bandbreite gibt es nur dort, wo jemand genau diese Frage gerechnet hat:
 * in der Wärmepumpe-gegen-Gas-Debatte 2026. Die ISE-Kurzstudie ist davon die
 * mit der vollständigsten Komponenten-Dokumentation — und wir benutzen sie
 * ohnehin schon für die Anschaffungskosten der fossilen Referenz.
 *
 * ── STROM: WÄRMEPUMPENTARIF, ENDKUNDENPREIS ─────────────────────────────────
 *
 *   optimistisch  UBA T13   27,4  → 20,5  ct(2024)/kWh  real −1,44 %/a
 *   realistisch   ISE nied. 27,48 → 28,69 ct(2026)/kWh  real +0,23 %/a
 *   pessimistisch ISE hoch  27,48 → 42,07 ct(2026)/kWh  real +2,27 %/a
 *
 * Die amtliche Projektion ist damit unser GÜNSTIGSTER Pfad, nicht die Mitte:
 * Sie ist der einzige Beleg dafür, dass der Wärmepumpentarif real fällt, und
 * sie liegt unter beiden ISE-Szenarien. Die Mitte ist das untere ISE-Szenario;
 * die Bandbreite spannt sich also über beide Quellen, statt eine davon zu
 * spiegeln.
 *
 * DER GLEICHLAUF MIT DEM PV-RECHNER IST DAMIT AUFGEGEBEN, und zwar bewusst:
 * Dort steht der Haushaltstarif, hier der Wärmepumpentarif — nach UBA T13 zwei
 * verschiedene Reihen mit verschiedenen Pfaden (Haushalt 38,3 → 33,4, WP-Tarif
 * 27,4 → 20,5). Denselben Anstieg für beide anzusetzen wäre Konsistenz-Optik
 * gegen die Quelle.
 *
 * ── GAS: ERDGAS HAUSHALTE, OHNE CO₂ UND OHNE BEIMISCHUNG ────────────────────
 *
 * DIE ISE-GASKURVEN SIND HIER NICHT EINSETZBAR, und das ist der wichtigste
 * Befund dieser Runde. Sie enthalten laut Folie 19 als eigene Komponenten den
 * CO₂-Preis UND die Grüngas-Beschaffung — beides rechnet dieser Rechner
 * getrennt (`co2SurchargeOverToday` bzw. die Bio-Treppe). Wer die ISE-Rate von
 * +5,74 %/a übernimmt, zählt beides ein zweites Mal. Ein Vorschlag, genau das
 * zu tun, lag am 06.09.2026 auf dem Tisch und ist daran gescheitert.
 *
 * Bleibt die UBA-Zerlegung. Netto (die MwSt. steht dort in einer eigenen
 * Zeile), EUR(2024)/MWh, Beschaffung + Steuern/Abgaben + Netzentgelte:
 *
 *   2025   61 + 10 + 27 = 98        2045   31 + 5 + 62 = 98
 *
 * Ohne CO₂ ist der reale Gaspreis über zwanzig Jahre also EXAKT konstant: Was
 * die Beschaffung verliert (−3,3 %/a), holen die Netzentgelte des
 * schrumpfenden Gasnetzes zurück (+4,2 %/a). Der frühere Kommentar nannte hier
 * +0,29 %/a — das war der Bruttopreis minus dem NETTO-CO₂-Betrag, also ein
 * Abzug ohne die darauf entfallende Mehrwertsteuer.
 *
 * Die Bandbreite trägt damit allein das Netzentgelt, und dafür nennt ISE zwei
 * Ränder (Folie 21): unten „konstantes Niveau von 2026 bis 2045" (2,2 ct/kWh),
 * oben ein Hochlauf auf 8,0 ct/kWh nach der Studie des Öko-Instituts zum
 * Netzentgeltanstieg bei sinkender Gasnachfrage.
 *
 * ÜBERNOMMEN WIRD DAS VERHÄLTNIS, NICHT DER ABSOLUTWERT — und zwar an BEIDEN
 * Rändern. ISEs 2,2 ct gehören zu einer anderen Abgrenzung als die 2,7 ct der
 * UBA-Tabelle; einen davon einzusetzen hieße, zwei Zerlegungen zu mischen. Die
 * erste Fassung tat unten das eine („konstant") und oben das andere (die 8,0
 * ct direkt eingesetzt) und schrieb die Regel dagegen zwei Zeilen darüber
 * selbst hin — aufgefallen dem adversarialen Prüfer, nicht dem Autor.
 *
 *   pessimistisch  Netz konstant (×1,00)  →  63,0 EUR/MWh  real −2,18 %/a
 *   realistisch    Netz 27 → 62 (UBA)     →  98,0 EUR/MWh  real  0,00 %/a
 *   optimistisch   Netz ×3,64 (8,0/2,2)   → 134,2 EUR/MWh  real +1,58 %/a
 *
 * ── REAL IST NICHT NOMINAL ──────────────────────────────────────────────────
 *
 * Beide Quellen rechnen real, dieser Rechner zinst nominal auf. Umgerechnet
 * mit dem BIP-Deflator aus UBA T3 (Index 2024 = 100 → 2045 = 156,0), auf den
 * jeweiligen Zeitraum geometrisch interpoliert: 2,106 %/a für 2025–2045,
 * 2,069 %/a für 2026–2045. Daraus die Werte unten. Wer die realen Raten direkt
 * einsetzt, unterschätzt jeden Pfad um gut zwei Punkte.
 *
 * DER ANGEZEIGTE PROZENTWERT IST NICHT DER GERECHNETE. Der CO₂-Aufschlag kommt
 * in `calcFossilReference` additiv und szenariounabhängig obendrauf. Gemessen
 * am Referenzfall (20.000 kWh Gas, 11 ct/kWh): aus den Pfaden −0,13 / +2,11 /
 * +3,72 % werden effektiv rund +1,2 / +3,0 / +4,4 % im Jahr. Die Beschriftung
 * nennt deshalb den Preispfad, nicht die Endrate.
 *
 * ── ZWEI VORBEHALTE, DIE MITGEHÖREN ─────────────────────────────────────────
 *
 * 1. ZWEI ALTE UNGENAUIGKEITEN IM CO₂-ZWEIG HEBEN SICH ZUFÄLLIG AUF. Der
 *    heutige Brennstoffpreis enthält die heutige CO₂-Abgabe (bei 55 €/t rund
 *    1,3 ct/kWh brutto) und wächst mit `gasInflation` mit — obwohl die Rate ex
 *    CO₂ hergeleitet ist; das sind 2045 gut 0,6 ct zu viel. Gegenläufig wird
 *    der CO₂-Aufschlag NETTO auf einen Bruttopreis addiert, rund 0,6 ct zu
 *    wenig. Beides ist älter als diese Änderung und keines steht für sich; wer
 *    einen der beiden repariert, muss den anderen mitreparieren, sonst
 *    verschiebt sich das Ergebnis. Gefunden bei der Gegenprüfung 06.09.2026.
 *
 * 2. DER PESSIMISTISCHE GASPFAD LIEGT UNTER JEDEM STUDIENSZENARIO. Nicht wegen
 *    des Preispfads — der ist die amtliche Zerlegung mit eingefrorenem
 *    Netzentgelt —, sondern weil unser CO₂-Pfad flacher verläuft als der der
 *    Quelle (209 €/t in 2045 gegen 225 €/t bei UBA, in Preisen von 2024).
 *    Der Reiter sagt „der CO₂-Preis kommt auch hier zusätzlich obendrauf"; das
 *    stimmt, schließt diese Lücke aber nicht. Wer den CO₂-Pfad anfasst, prüft
 *    diesen Rand mit.
 *
 * `gasScenario` mappt auf den IW-Preiskorridor (nur im Grüngas-Modus wirksam):
 * „ungünstig für die WP" = Gas bleibt billig → low; „günstig" = Gas wird teuer
 * → high. Spiegelbildlich zur `gasInflation`-Logik.
 *
 * Der JAZ-Faktor bleibt: Reale Anlagen streuen, und die Streuung nach unten ist
 * belegt (Fraunhofer ISE WPsmart). Er ist an seinem Szenario ausgeschrieben
 * („die Arbeitszahl fällt etwas schlechter aus"), und wer es genauer will,
 * ändert die Jahresarbeitszahl im Ergebnis direkt — sie ist dort editierbar.
 *
 * Herleitung nachrechenbar in `lib/__tests__/wp-preispfade.test.ts`: Der Test
 * rechnet aus den Tabellenwerten beider Quellen die sechs Raten neu und hält
 * sie gegen die Konstanten hier. Wer eine Zahl ändert, ändert sie dort mit —
 * oder der Lauf wird rot.
 */
export function heatPumpScenarioAdj(id: string, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): { jazFactor: number; stromInflation: number; gasInflation: number; gasScenario: GasScenario } {
  if (id === "pessimistic") return { jazFactor: 0.90, stromInflation: STROM_PFAD.hoch, gasInflation: GAS_PFAD.niedrig, gasScenario: "low" };
  if (id === "optimistic") return { jazFactor: 1.05, stromInflation: STROM_PFAD.niedrig, gasInflation: GAS_PFAD.hoch, gasScenario: "high" };
  return { jazFactor: 1.00, stromInflation: cfg.stromInflation, gasInflation: cfg.gasInflation, gasScenario: "base" };
}

export function calcHeatPumpScenarios(inputs: HeatPumpInputs, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): HeatPumpScenarioResult[] {
  // WP-Sicht: teurer Strom + billiges Gas ist ungünstig (Strom treibt die
  // WP-Kosten, Gas die Referenz). Daher ist „Pessimistisch" = Strom steigt
  // schnell / Gas kaum — spiegelbildlich zum PV-Rechner.
  // Eine Nachkommastelle, und nur wenn sie etwas trägt: Die Pfade sind auf
  // Hundertstel gesetzt (4,42 %), aber „Strom +4,42 %/a" auf einem Reiter
  // behauptet eine Genauigkeit, die aus einem abgelesenen Diagramm stammt.
  // Gerechnet wird mit dem vollen Wert, angezeigt der gerundete.
  const pct = (r: number) =>
    `${r < 0 ? "−" : "+"}${Math.abs(r * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
  const meta: Array<Pick<HeatPumpScenarioResult, "id" | "label" | "color" | "sub" | "explain">> = [
    { id: "pessimistic", label: "Pessimistisch", color: v("--color-negative"), sub: `Strom ${pct(STROM_PFAD.hoch)}/a`,
      explain: `Ungünstig für die Wärmepumpe: Der Strompreis steigt kräftig (${pct(STROM_PFAD.hoch)}/Jahr), Gas bleibt fast stehen (${pct(GAS_PFAD.niedrig)}/Jahr) — und die Arbeitszahl fällt etwas schlechter aus. Beide Zahlen sind Studienwerte: der Strompfad das obere Szenario der Fraunhofer-ISE-Kurzstudie vom Juni 2026, der Gaspfad die amtliche Projektion mit Netzentgelten auf heutigem Niveau. Der CO₂-Preis kommt auch hier zusätzlich obendrauf.` },
    { id: "realistic",   label: "Realistisch",   color: v("--color-positive"), sub: `Strom ${pct(cfg.stromInflation)}/a`,
      explain: `Mittlere Annahme: Strompreis ${pct(cfg.stromInflation)}/Jahr, Gas ${pct(cfg.gasInflation)}/Jahr. Der Strompfad ist das untere Szenario der Fraunhofer-ISE-Kurzstudie, der Gaspfad die Preisprojektion, die Prognos für das Umweltbundesamt rechnet — dort bleibt der Gaspreis ohne CO₂ real konstant, weil die günstigere Beschaffung von den Netzentgelten des schrumpfenden Gasnetzes aufgezehrt wird. Der CO₂-Preis kommt in allen Pfaden zusätzlich obendrauf.` },
    { id: "optimistic",  label: "Optimistisch",  color: v("--color-accent"), sub: `Strom ${pct(STROM_PFAD.niedrig)}/a`,
      explain: `Günstig für die Wärmepumpe: Der Strompreis bleibt fast stabil (${pct(STROM_PFAD.niedrig)}/Jahr), Gas verteuert sich stärker (${pct(GAS_PFAD.hoch)}/Jahr) — die Wärmepumpe spart mehr. Der Strompfad ist die amtliche Projektion, nach der der Wärmepumpentarif bis 2045 real sogar fällt; beim Gas steigen die Netzentgelte nach der Studie des Öko-Instituts auf 8 Cent je Kilowattstunde. Dazu kommt der CO₂-Preis.` },
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
