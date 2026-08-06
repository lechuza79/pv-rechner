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
import { NATIONAL_AVG_YIELD } from "./constants";

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
 * Default-Wert einer erzeugten Kilowattstunde Solarstrom in ct: gewichteter
 * Mischwert aus vermiedenem Netzbezug (Eigenverbrauch × Haushaltsstrompreis)
 * und Einspeisevergütung für den Rest. Abgeleitet, nicht handgetippt — ändert
 * sich der Strompreis oder der EEG-Satz, wandert der Default mit.
 */
export function defaultStromwertCt(): number {
  const ev = EIGENVERBRAUCH_ANTEIL_ANNAHME;
  const ct = ev * DEFAULT_PRICES.electricityPrice * 100 + (1 - ev) * DEFAULT_FEED_IN.teilUnder10;
  return Math.round(ct);
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
