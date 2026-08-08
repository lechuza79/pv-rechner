// Rechnerische Wirkungs-Werte des Solar-Atlas: vermiedenes CO₂ und der Wert
// des erzeugten Solarstroms je Region.
//
// Beides sind MODELLWERTE, keine Messwerte — die Oberflächen sagen das dazu.
// Alle Faktoren kommen aus der geteilten Rechen-Basis, nichts wird hier neu
// geraten:
//   Ertrag      → lib/bundesland-ertrag.ts (PVGIS-Bundesland-Durchschnitt)
//   CO₂-Faktor  → gridCo2PerKwh (identisch in WP-/Klima-/Balkon-Config)
//   Strompreis  → DEFAULT_PRICES.electricityPrice (BNetzA)
//   Vergütung   → DEFAULT_FEED_IN.teilUnder10 (EEG-Satz Teileinspeisung ≤10 kWp)
//
// Client-tauglich (keine DB-/Next-Imports): die Ranking-Tabelle rechnet im
// Browser, damit Besitzer-Filter und Preis-Annahme ohne Roundtrip umschalten.

import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";
import { DEFAULT_PRICES } from "./prices-config";
import { DEFAULT_FEED_IN } from "./feedin-config";
import { ertragForRegionId } from "./bundesland-ertrag";
import { simulateSolarYear } from "./balkon-sim";
import { referenceMonthKwh } from "./solar-year";
import { DEFAULT_BALKON_CONFIG } from "./balkon-config";
import { NUTZUNG, PERSONEN } from "./constants";
import { NATIONAL_AVG_YIELD } from "./constants";
import { DIREKTVERMARKTUNG, MARKTWERT_NIVEAU_CT } from "./marktwert-config";

export { ertragForRegionId };

/**
 * Praxis-Faktor des Anlagenbestands: reale Flotten-Erzeugung ÷ Optimal-Ertrag.
 *
 * Die Bundesland-Erträge (BL_ERTRAG) gelten für OPTIMALE Ausrichtung — der
 * echte Bestand (gemischte Ausrichtungen, Ost-West-Dächer, Verschattung,
 * Degradation) erzeugt deutlich weniger. Ohne diese Korrektur behauptete die
 * Tabelle für Deutschland fast das Doppelte der tatsächlichen Erzeugung.
 *
 * Anker (Fraunhofer ISE, Jahresbilanz Stromerzeugung 2025, geprüft am
 * 06.08.2026 im Original-Pressetext): Ende 2025 waren 116,8 GW installiert,
 * Zubau 2025 16,2 GW (→ Jahresmittel ~108,7 GW); erzeugt wurden ~87 TWh
 * (~71 TWh Netzeinspeisung + 16,9 TWh Eigenverbrauch). Das sind ~800 kWh je
 * kWp und Jahr — gegen 1.050 optimal ein Faktor von ~0,76. Kein Handfaktor:
 * er rechnet sich aus den drei Quellwerten, Realitäts-Anker im Test.
 */
const FLOTTE_2025 = { erzeugungTwh: 87, leistungEndeGw: 116.8, zubauGw: 16.2 };
const flottenMittelGw = FLOTTE_2025.leistungEndeGw - FLOTTE_2025.zubauGw / 2;
export const PRAXIS_FAKTOR =
  (FLOTTE_2025.erzeugungTwh * 1000) / flottenMittelGw / NATIONAL_AVG_YIELD;

/**
 * kg CO₂ je kWh — dieselbe Quelle wie WP-/Klima-/Balkon-Rechner (geteilte
 * Rechen-Basis). Als Faktor für VERMIEDENES CO₂ ist 0,38 bewusst konservativ:
 * der aktuelle Verbrauchsmix liegt etwas darunter (UBA 2025 geschätzt ~0,34),
 * der amtliche UBA-Vermeidungsfaktor für PV (Verdrängungsmix inkl. Vorketten,
 * Emissionsbilanz erneuerbarer Energieträger 2024, CLIMATE CHANGE 11/2026)
 * deutlich darüber (~0,68). Die Oberfläche nennt den Wert deshalb
 * „bewusst konservativ", nicht „Strommix-Faktor". Council-Prüfung 06.08.2026.
 */
export const ATLAS_GRID_CO2 = DEFAULT_HEATPUMP_CONFIG.gridCo2PerKwh;

/**
 * Annahme: Anteil des Solarstroms, der selbst verbraucht wird (Rest wird
 * eingespeist). ~30 % ist der typische Wert einer Dachanlage ohne Speicher
 * (HTW Berlin, Unabhängigkeitsrechner — dieselbe Datenbasis wie das
 * Eigenverbrauchs-Power-Law in lib/calc.ts). Für den Anlagen-MIX einer Region
 * (inkl. Speicher-Haushalte und Freiflächen) ist das eine bewusst grobe, offen
 * kommunizierte Annahme — sie steckt nur im DEFAULT des Strompreis-Werts, den
 * die Oberfläche editierbar macht.
 */
export const EIGENVERBRAUCH_ANTEIL_ANNAHME = 0.3;

/**
 * Eigenverbrauchsanteil eines typischen Balkonkraftwerks — NICHT der vom Dach
 * geliehene Wert.
 *
 * Ein Steckersolargerät verhält sich anders als eine Dachanlage: 800 W gegen
 * die Grundlast eines Haushalts werden zum großen Teil direkt verbraucht,
 * während eine 10-kWp-Anlage ihre Mittagsspitze gar nicht unterbringen kann.
 * Den Dach-Anteil hier einzusetzen wäre kein konservativer Ansatz, sondern
 * schlicht der falsche Fall.
 *
 * Gerechnet mit der Stundensimulation, die Balkon- und Dach-Rechner ohnehin
 * teilen (geteilte Rechen-Basis), an der Standard-Konfiguration des
 * Balkon-Rechners: gängigstes Set am Geländer, Zwei-Personen-Haushalt mit dem
 * mittleren Nutzungsprofil, ohne Speicher. Einmal beim Laden berechnet und
 * gemerkt; der Test in atlas-impact.test.ts hält den Wert im plausiblen Band.
 */
let balkonAnteilCache: number | null = null;
export function balkonEigenverbrauchAnteil(): number {
  if (balkonAnteilCache !== null) return balkonAnteilCache;
  const set = DEFAULT_BALKON_CONFIG.sets.find((s) => s.id === "duo") ?? DEFAULT_BALKON_CONFIG.sets[0];
  const sim = simulateSolarYear({
    moduleKwp: set.moduleWp / 1000,
    inverterKw: set.inverterW / 1000,
    monthlyYieldPerKwp: Array.from({ length: 12 }, (_, m) => referenceMonthKwh("sued_flach", m)),
    orientation: "sued_gelaender",
    household: {
      baseKwh: PERSONEN[1].verbrauch,
      tagQuote: NUTZUNG[1].tagQuote,
      wpActive: false,
      eaActive: false,
    },
    batteryKwh: 0,
    roundtrip: 1,
  });
  balkonAnteilCache = sim.annualYield > 0 ? sim.selfUsedKwh / sim.annualYield : EIGENVERBRAUCH_ANTEIL_ANNAHME;
  return balkonAnteilCache;
}

/**
 * Was eine erzeugte Kilowattstunde wert ist — JE ANLAGENART, nicht als ein
 * Mischsatz über alles.
 *
 * Ein einziger Satz über den ganzen Bestand ist falsch, und zwar nicht ein
 * bisschen: Ein privates Dach spart Netzbezug zum Haushaltspreis (gut 31 ct),
 * ein Freiflächen-Park verkauft alles an der Börse (knapp 5 ct). Das ist der
 * Faktor sechs. Da die Anlagenart je Region bekannt ist, gibt es keinen Grund,
 * darüber zu mitteln — jede Art bekommt ihren eigenen Satz, und die Summe der
 * Region ergibt sich daraus.
 *
 * Jeder Satz kommt aus einer im Projekt gepflegten Quelle. Wo eine Größe nicht
 * belegt ist (der Eigenverbrauchsanteil von Gewerbedächern), wird sie NICHT
 * geschätzt, sondern weggelassen — der Satz ist dann eine Untergrenze, und die
 * Abweichung geht zu unseren Ungunsten statt zu unseren Gunsten.
 */
export type SegmentSatz = { ct: number; herkunft: string };

export function stromwertSaetze(): Record<string, SegmentSatz> {
  const haushaltCt = DEFAULT_PRICES.electricityPrice * 100;
  const ev = EIGENVERBRAUCH_ANTEIL_ANNAHME;
  return {
    // Privates Dach: der selbst genutzte Teil ersetzt teuren Netzbezug, der
    // Rest bringt die EEG-Vergütung für Teileinspeisung ≤ 10 kWp.
    privat_dach: {
      ct: ev * haushaltCt + (1 - ev) * DEFAULT_FEED_IN.teilUnder10,
      herkunft: `${Math.round(ev * 100)} % Eigenverbrauch zum Haushaltsstrompreis, Rest zur Einspeisevergütung`,
    },
    // Steckersolar wird per Voreinstellung NICHT vergütet (Projektkonvention,
    // siehe Balkon-Rechner): Nur der selbst genutzte Teil ist Geld wert, der
    // Überschuss geht unentgeltlich ins Netz. Dafür liegt der Eigenverbrauchs-
    // anteil weit über dem einer Dachanlage — er kommt aus der Stundensimulation,
    // nicht vom Dach geliehen.
    steckersolar: {
      ct: balkonEigenverbrauchAnteil() * haushaltCt,
      herkunft: `${Math.round(balkonEigenverbrauchAnteil() * 100)} % Eigenverbrauch zum Haushaltsstrompreis; der Überschuss wird nicht vergütet`,
    },
    // Gewerbedach: Der Eigenverbrauchsanteil von Gewerbebetrieben ist im
    // Projekt nirgends belegt, deshalb steht hier nur die gesicherte
    // Untergrenze — die EEG-Vergütung für Teileinspeisung > 10 kWp. Wer
    // tagsüber selbst verbraucht, liegt darüber.
    gewerbe_dach: {
      ct: DEFAULT_FEED_IN.teilOver10,
      herkunft: "Einspeisevergütung über 10 kWp — selbst verbrauchter Strom ist mehr wert, sein Anteil ist uns nicht belegt",
    },
    // Freifläche verkauft praktisch alles. Maßstab ist der amtliche Marktwert
    // Solar abzüglich der mengenabhängigen Direktvermarktungsgebühr.
    freiflaeche: {
      ct: Math.max(0, MARKTWERT_NIVEAU_CT - DIREKTVERMARKTUNG.gebuehrCtKwh),
      herkunft: "Marktwert Solar abzüglich Direktvermarktungsgebühr",
    },
  };
}

/** Satz für ein Segment; unbekannte Segmente tragen keinen Erlös. */
export function stromwertCtFuerSegment(segment: string): number {
  return stromwertSaetze()[segment]?.ct ?? 0;
}

/**
 * Rechnerische Jahres-Erzeugung des Anlagenbestands einer Region:
 * kWp × Bundesland-Ertrag (Nord-Süd-Gradient) × Praxis-Faktor der Flotte.
 */
export function erzeugungKwh(kwp: number, regionId: string): number {
  return kwp * ertragForRegionId(regionId) * PRAXIS_FAKTOR;
}

/** Rechnerisch vermiedenes CO₂ in Tonnen pro Jahr. */
export function co2Tonnen(kwhProJahr: number): number {
  return (kwhProJahr * ATLAS_GRID_CO2) / 1000;
}

/** Rechnerischer Wert des erzeugten Stroms in € pro Jahr, zum gegebenen ct-Satz. */
export function stromwertEuro(kwhProJahr: number, ctProKwh: number): number {
  return (kwhProJahr * ctProKwh) / 100;
}

/**
 * Wert der Jahreserzeugung EINES Segments in € — Erzeugung × Satz dieser
 * Anlagenart. Die Region summiert über ihre Segmente; ein Mischsatz kommt
 * nirgends mehr vor.
 */
export function segmentWertEuro(kwp: number, regionId: string, segment: string): number {
  return stromwertEuro(erzeugungKwh(kwp, regionId), stromwertCtFuerSegment(segment));
}
