import { HEATING_INVESTMENT, gasInvestmentGross } from "./heating-investment";
// ─── Fossile Referenzheizung — geteilte Annahmen (PV- UND Wärmepumpen-Rechner) ─
//
// EINE Stelle für die Frage: „Was kostet es, NICHT auf die Wärmepumpe zu wechseln?"
// Beide Rechner stellen diese Frage — der Wärmepumpen-Rechner als Kernvergleich über
// 20 Jahre, der PV-Rechner als Zusatz-Block im Ergebnis. Bis zum 28.07.2026 hatten
// sie dafür zwei getrennte Rechenwege, und die liefen genau so auseinander, wie es
// zu erwarten war: Der PV-Block schlug den Grüngas-Aufschlag der Bio-Treppe auf die
// fossile Seite, obwohl er nirgends einen Neueinbau ansetzte — dieselbe „zwei Hälften
// verschiedener Fälle"-Inkonsistenz, die im Wärmepumpen-Rechner am selben Tag
// beseitigt wurde. Ein Kommentar dort behauptete sogar „konsistent zum
// Wärmepumpen-Rechner"; das stimmte nicht mehr.
//
// WARUM ein eigenes Modul und nicht einfach mehr Felder in heatpump-config.ts:
// Die ZAHLEN bleiben in heatpump-config.ts — dort sind sie belegt (Verbraucherzentrale
// RLP, Fraunhofer ISE) und dort holt sie der quartalsweise WP-Wächter ab. Was hier
// liegt, ist die REGEL-Schicht darüber: welche dieser Posten in welchem Fall gelten
// und wann die gesetzliche Beimischungspflicht überhaupt anwendbar ist. Genau diese
// Regel existierte vorher dreimal (Bedingung im WP-Rechner-UI, Guard in der
// WP-Rechnung, eine dritte — falsche — Fassung im PV-Rechner). Ein Modul mit einer
// Funktion je Regel ist die kleinste Form, die das zusammenhält; ein weiteres
// Config-Feld hätte die Regel selbst wieder in die Aufrufer verteilt.
//
// Rechner-übergreifend festgenagelt von lib/__tests__/fossil-reference.test.ts.

import { YEAR, FUEL, WP_FUEL_OPTIONS, type FuelKind } from "./constants";
import { DEFAULT_HEATPUMP_CONFIG, type HeatPumpConfig } from "./heatpump-config";
import { co2SurchargeOverToday } from "./calc";
import { gasMixPriceEurForYear } from "./greengas";
import type { GasScenario } from "./greengas-config";
import { OIL_REFERENCE, oilPricePerKwh } from "./oil-reference";

/** Vergleichshorizont jeder Heizungs-Rechnung, in Jahren.
 *  Kommt aus der WP-Config (20 J) und gilt bewusst AUCH im PV-Rechner: Der Block dort
 *  ist eine Aussage über die Heizung, nicht über die PV-Anlage. Die 25 Jahre des
 *  PV-Rechners sind die Modul-Lebensdauer; sie auf einen Heizungsvergleich zu legen
 *  hätte stillschweigend unterstellt, dass eines der beiden Heizsysteme ein
 *  Vierteljahrhundert ohne Ersatz durchhält — und hätte für dieselbe Eingabe eine
 *  andere Zahl geliefert als der Wärmepumpen-Rechner. */
export const HEATING_YEARS = DEFAULT_HEATPUMP_CONFIG.years;

/** Greift die Bio-Treppe (§ 43 Abs. 1 GModG) auf diese Referenzheizung?
 *
 *  Zwei Bedingungen, beide aus dem Gesetzeswortlaut bzw. der Reichweite unseres
 *  Preismodells:
 *   1. NEUEINBAU. § 43 Abs. 1 erfasst Heizungen, die nach dem 29.07.2026 neu in ein
 *      bestehendes Gebäude eingebaut werden. Wer seine vorhandene Heizung weiter
 *      betreibt, fällt nicht darunter — dann darf auch kein Beimischungs-Aufschlag
 *      gerechnet werden. Wir lesen das an der angesetzten Anschaffung ab: > 0 € heißt,
 *      in der Rechnung wird eine neue fossile Heizung gekauft.
 *   2. NETZGAS. § 43 nennt Heizöl gleichrangig, aber unser Preispfad (lib/greengas.ts)
 *      ist an Biomethan und Gas-Netzentgelten kalibriert und bildet Öl nicht ab. Ihn
 *      trotzdem auf eine Ölheizung anzuwenden wäre eine Zahl ohne Grundlage; die
 *      Lücke wird dem Nutzer stattdessen offen ausgewiesen. */
export function greenGasApplies({ fuelKind, fossilInvest }: { fuelKind: FuelKind; fossilInvest: number }): boolean {
  return fuelKind === "gas" && fossilInvest > 0;
}

/** Laufende Nebenkosten der fossilen Heizung, €/a (Grundpreis + Wartung).
 *  Der Grundpreis ist brennstoffabhängig: Gas kommt über einen Netzanschluss mit
 *  Zähler- und Netzgrundpreis, Heizöl aus einem Tank ohne laufende Anschlussgebühr. */
export function fossilStandingCostPerYear(fuelKind: FuelKind, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG) {
  return { fix: cfg.fixCostPerYear[fuelKind], wartung: fuelKind === "oil" ? OIL_REFERENCE.upkeepPerYear : cfg.gasMaintenance };
}

/** Fuel-specific replacement estimate; a quote or zero still takes precedence. */
export function fossilReplacementInvestment(fuelKind: FuelKind, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG, heatLoadKw: number = HEATING_INVESTMENT.gas.minKw): number {
  if (fuelKind === "oil") return OIL_REFERENCE.investment;
  const ratio = gasInvestmentGross(heatLoadKw) / gasInvestmentGross(HEATING_INVESTMENT.gas.minKw);
  return Math.round(cfg.fossilErsatzInvest * ratio);
}

/** Laufende Nebenkosten der Wärmepumpe, €/a (Wartung + Grundpreis des Stromzählers).
 *  Gegenstück zu fossilStandingCostPerYear — beide Seiten aus derselben Quelle, damit
 *  kein Rechner versehentlich nur eine Seite belastet. */
export function wpStandingCostPerYear(cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): number {
  return cfg.wpMaintenance + cfg.wpFixCostPerYear;
}

export interface FossilReferenceInputs {
  fuelKind: FuelKind;
  /** Brennstoff-Endenergie pro Jahr = Wärmebedarf / Kesselwirkungsgrad. */
  fuelKwh: number;
  years?: number;
  /** €/kWh Brennstoff, heutiger All-in-Preis (CO₂-Abgabe des laufenden Jahres inklusive). */
  pricePerKwh: number;
  co2PerKwh: number;
  /** Gas-only annual escalation. Oil uses its own all-in UBA trajectory. */
  inflation?: number;
  /** Anschaffung einer neuen fossilen Heizung, € (0 = die vorhandene läuft weiter).
   *  Steuert zugleich, ob die Bio-Treppe greift — siehe greenGasApplies(). */
  fossilInvest: number;
  /** Grüngas-Szenario gewünscht. Ob es tatsächlich gerechnet wird, entscheidet
   *  greenGasApplies() — der Aufrufer formuliert die Regel nie selbst nach. */
  greenGas?: boolean;
  gasScenario?: GasScenario;
}

export interface FossilReferenceResult {
  /** Reine Brennstoffkosten je Jahr, ungerundet (für Kurven). */
  fuelPerYear: number[];
  fuel: number;
  fixPerYear: number;
  fix: number;
  wartungPerYear: number;
  wartung: number;
  invest: number;
  /** Brennstoff + Grundpreis + Wartung + Anschaffung. */
  total: number;
  /** Wurde die Bio-Treppe tatsächlich gerechnet? Beschriftungen im UI hängen an
   *  diesem Flag, damit Text und Zahl nicht auseinanderlaufen können. */
  greenGasApplied: boolean;
}

export function calcFossilReference(inp: FossilReferenceInputs, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): FossilReferenceResult {
  const years = inp.years ?? cfg.years;
  const inflation = inp.inflation ?? cfg.gasInflation;
  const greenGasApplied = !!inp.greenGas && greenGasApplies({ fuelKind: inp.fuelKind, fossilInvest: inp.fossilInvest });
  const gasScenario: GasScenario = inp.gasScenario ?? "base";

  const fuelPerYear: number[] = [];
  for (let i = 0; i < years; i++) {
    if (inp.fuelKind === "oil") {
      // The UBA end-user price already contains CO2 and VAT. A second surcharge
      // or a gas-network escalation here would count unrelated costs twice.
      fuelPerYear.push(inp.fuelKwh * oilPricePerKwh(YEAR + i, YEAR, inp.pricePerKwh));
    } else if (greenGasApplied) {
      // Zeitvariabler GModG-Gas-Mix-Endkundenpreis (€/kWh, brutto, CO₂ bereits
      // enthalten) — deshalb hier KEIN separater CO₂-Aufschlag (Doppelzählung).
      fuelPerYear.push(inp.fuelKwh * gasMixPriceEurForYear(YEAR + i, gasScenario));
    } else {
      // Der Brennstoffpreis ist ein heutiger All-in-Preis und enthält die CO₂-Abgabe
      // des laufenden Jahres bereits. Daher nur den ANSTIEG über das heutige Niveau
      // aufschlagen, sonst wird die aktuelle Komponente doppelt gezählt.
      const co2Surcharge = inp.co2PerKwh * co2SurchargeOverToday(i) / 1000;
      const basePrice = inp.pricePerKwh * Math.pow(1 + inflation, i);
      fuelPerYear.push(inp.fuelKwh * (basePrice + co2Surcharge));
    }
  }

  const standing = fossilStandingCostPerYear(inp.fuelKind, cfg);
  const fuel = Math.round(fuelPerYear.reduce((a, b) => a + b, 0));
  const fix = standing.fix * years;
  const wartung = standing.wartung * years;
  const invest = inp.fossilInvest;

  return {
    fuelPerYear,
    fuel,
    fixPerYear: standing.fix,
    fix,
    wartungPerYear: standing.wartung,
    wartung,
    invest,
    total: fuel + fix + wartung + invest,
    greenGasApplied,
  };
}

// ─── Abgelesener Verbrauch → Heizwärme ───────────────────────────────────────
//
// Wer seine Abrechnung einträgt, nennt die Endenergie SEINER VORHANDENEN Heizung.
// Die Heizwärme daraus hängt am Nutzungsgrad genau dieser Heizung — und die
// Referenzrechnung teilt dieselbe Heizwärme danach wieder durch den Nutzungsgrad
// der GEWÄHLTEN Referenz. Beides muss zusammenpassen, sonst verbrennt die
// Rechnung mehr, als auf der Abrechnung steht.
//
// Bis 12.09.2026 rechnete die Umrechnung fest mit der vorhandenen Therme (90 %),
// auch wenn im Ergebnis „Alter Gaskessel" (80 %) als vorhandene Heizung gewählt
// war: aus 24.000 abgelesenen kWh wurden 27.000 gerechnete, rund 4.000 € mehr
// Ersparnis für die Wärmepumpe (Rechenmodell-Council 12.09.2026). Und die
// Einheit „Liter Heizöl" setzte den Energieträger der Referenz nicht — ein
// Öl-Haushalt verglich gegen Gaspreis, Gas-CO₂ und Gas-Grundgebühr.

export type AblesungsEinheit = "gas" | "oel";

const kindDerEinheit = (einheit: AblesungsEinheit): FuelKind => (einheit === "oel" ? "oil" : "gas");

/**
 * Nutzungsgrad der Heizung, die den abgelesenen Verbrauch erzeugt hat.
 *
 * Ist die gewählte Referenz eine BESTANDSANLAGE desselben Energieträgers, IST sie
 * die vorhandene Heizung — dann gilt ihr Nutzungsgrad. Sonst (Ersatz durch ein
 * Neugerät, oder ein anderer Energieträger) wissen wir über die vorhandene Anlage
 * nichts und nehmen die typische vorhandene Heizung aus FUEL. Pauschal den
 * gewählten Nutzungsgrad zu nehmen wäre falsch: Beim Ersatz beschreibt er das
 * NEUE Gerät, und der gewollte Effizienzgewinn verschwände.
 */
export function kesselDerAblesung(
  einheit: AblesungsEinheit,
  referenz: { kind: FuelKind; efficiency: number; bestandsanlage?: boolean } | undefined,
): number {
  const kind = kindDerEinheit(einheit);
  if (referenz?.bestandsanlage && referenz.kind === kind) return referenz.efficiency;
  return FUEL[kind].efficiency;
}

/**
 * Referenzheizung, nachdem die Einheit der Ablesung gewechselt hat. Bleibt beim
 * aktuellen Eintrag, wenn der Energieträger schon passt; sonst der Eintrag des
 * neuen Energieträgers mit demselben Fall (Neueinbau bzw. Bestand).
 */
export function referenzFuerEinheit(aktuellId: string, einheit: AblesungsEinheit): string {
  const kind = kindDerEinheit(einheit);
  const aktuell = WP_FUEL_OPTIONS.find(f => f.id === aktuellId);
  if (aktuell?.kind === kind) return aktuellId;
  const gleicherFall = WP_FUEL_OPTIONS.find(f => f.kind === kind && !!f.bestandsanlage === !!aktuell?.bestandsanlage);
  return (gleicherFall ?? WP_FUEL_OPTIONS.find(f => f.kind === kind) ?? WP_FUEL_OPTIONS[0]).id;
}
