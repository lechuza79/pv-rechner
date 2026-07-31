// ─── Heat Pump Core (pure, calc-free) ──────────────────────────────────────
// Die reinen Bedarfs-/Heizlast-/Arbeitszahl-Funktionen + der gemeinsame
// WP-Jahresstrom. Bewusst OHNE Abhängigkeit auf lib/calc.ts, damit auch
// lib/consumption.ts (das von calc.ts importiert wird) diese Funktionen nutzen
// kann, ohne einen Import-Zyklus zu bauen. lib/heatpump.ts re-exportiert alles
// hier Definierte — bestehende Importe `from "./heatpump"` bleiben gültig.

import { DEFAULT_HEATPUMP_CONFIG, type HeatPumpConfig } from "./heatpump-config";
import { verbrauchAusBedarf } from "./heat-consumption";
import type { KennwertArt } from "./constants";

// ─── Bedarf, Heizlast, Arbeitszahl ─────────────────────────────────────────

/** Tabellen-Kennwert der gewählten Dämmstufe (kWh/m²·a) samt der Angabe, WAS er
 *  ist — Norm-Bedarf oder gemessener Verbrauch (siehe INSULATION_BESTAND). */
export function bedarfSpecKwh(situation: "bestand" | "neubau", insulationIdx: number, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): { spec: number; art: KennwertArt } {
  const specArr = situation === "bestand" ? cfg.specDemandBestand : cfg.specDemandNeubau;
  const artArr = situation === "bestand" ? cfg.specDemandArtBestand : cfg.specDemandArtNeubau;
  const i = Math.max(0, Math.min(insulationIdx, specArr.length - 1));
  return { spec: specArr[i], art: artArr[i] ?? "bedarf" };
}

/** Erwarteter realer Verbrauchskennwert der Dämmstufe (kWh/m²·a) — die Zahl, die
 *  ein Bewohner auf seiner Jahresabrechnung wiederfindet. Für alles, was Geld
 *  kostet, ist DAS die richtige Größe (Herleitung: lib/heat-consumption.ts). */
export function verbrauchSpecKwh(situation: "bestand" | "neubau", insulationIdx: number, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): number {
  const { spec, art } = bedarfSpecKwh(situation, insulationIdx, cfg);
  return Math.round(verbrauchAusBedarf(spec, art, situation));
}

export function calcHeatDemand(
  situation: "bestand" | "neubau",
  wohnflaeche: number,
  insulationIdx: number,
  personen: number,
  cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG,
  haustypFaktor = 1,
): { qHeiz: number; qWw: number; qGes: number } {
  // Gerechnet wird mit dem erwarteten VERBRAUCH, nicht mit dem Norm-Bedarf: Diese
  // Zahl trägt die Betriebskosten beider Seiten (Brennstoff wie Wärmepumpen-Strom),
  // und dafür zählt, was ein Haushalt real heizt — nicht, was ein vollständig auf
  // Solltemperatur gehaltenes Gebäude bräuchte. Bis 31.07.2026 stand hier der
  // Norm-Bedarf; das unterstellte einem unsanierten Altbau rund 250 statt 160
  // kWh/m²·a Gasverbrauch und ließ die Wärmepumpe systematisch besser aussehen.
  const tab = bedarfSpecKwh(situation, insulationIdx, cfg);
  const spec = verbrauchAusBedarf(tab.spec, tab.art, situation);
  // Haustyp-Faktor auch auf den Jahresbedarf: geteilte Wände senken den Verlust
  // übers Jahr, nicht nur die Spitzenlast. Warmwasser bleibt personenabhängig —
  // es hängt an den Bewohnern, nicht am Gebäude, und wird deshalb auch nicht
  // prebound-korrigiert.
  const qHeiz = Math.round(wohnflaeche * spec * haustypFaktor);
  const qWw = Math.round(personen * cfg.wwPerPerson);
  return { qHeiz, qWw, qGes: qHeiz + qWw };
}

// ZWEI GRÖSSEN, die man nicht verwechseln darf (BLOCKER-Lehre vom 28.07.2026):
//
//   Heizlast (kW)          = was das Gebäude am kältesten Tag braucht. Das ist die
//                            Größe, die eine Berechnung nach DIN EN 12831 liefert
//                            und die ein Fachplaner nennt.
//   Auslegungsleistung (kW) = worauf die Wärmepumpe ausgelegt wird. Monoenergetisch
//                            sind das rund 85 % der Heizlast; die wenigen kältesten
//                            Stunden deckt der Heizstab. Sie bestimmt den Preis.
//
// Bis heute lieferte calcHeatLoad die AUSLEGUNG, hieß aber „Heizlast", und der
// Eingabewert (override.heizlast) wurde ungefiltert als Auslegung übernommen. Wer
// also seine echte DIN-Heizlast eintrug — genau dazu forderte der Hinweistext auf —
// bekam eine um 18 % größere und entsprechend teurere Anlage gerechnet. Dasselbe
// Feld bedeutete je nach Weg zwei verschiedene Dinge.
//
// Deshalb: calcHeatLoad liefert jetzt die NORM-Heizlast, und auslegungsleistung()
// leitet daraus die Anlagengröße ab — für beide Wege dieselbe Funktion.

/** Norm-Heizlast des Gebäudes (kW) — die Größe, die auch eine DIN-EN-12831-Berechnung liefert. */
export function calcHeatLoad(
  situation: "bestand" | "neubau",
  wohnflaeche: number,
  insulationIdx: number,
  haustypFaktor: number,
  cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG,
): number {
  const arr = situation === "bestand" ? cfg.specHeatLoadBestand : cfg.specHeatLoadNeubau;
  const spec = arr[Math.max(0, Math.min(insulationIdx, arr.length - 1))];
  return Math.round((wohnflaeche * spec * haustypFaktor) / 1000 * 10) / 10;  // kW, 0,1 genau
}

/**
 * Auslegungsleistung der Wärmepumpe (kW) aus der Norm-Heizlast. EINZIGER Ort, an dem
 * der Auslegungsfaktor angewandt wird — egal ob die Heizlast geschätzt oder vom
 * Nutzer eingetragen wurde. Untergrenze 4 kW: kleinere Luft-Wärmepumpen gibt es real
 * kaum am Markt.
 */
export function auslegungsleistung(normHeizlastKw: number, cfg: HeatPumpConfig = DEFAULT_HEATPUMP_CONFIG): number {
  return Math.max(4, Math.round(Math.max(0, normHeizlastKw) * cfg.auslegungsfaktor * 10) / 10);
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

// ─── Shared: WP-Jahresstromverbrauch aus Gebäudedaten ──────────────────────
// Schlanke gemeinsame Quelle für PV- und WP-Rechner: dieselbe Physik wie die
// große TCO-Rechnung (Heizwärmebedarf ÷ Jahresarbeitszahl), aber ohne
// Investitions-/Förder-/Gas-Overhead. So liefert dasselbe Haus überall denselben
// WP-Stromverbrauch, statt einmal pauschal 3500 kWh und einmal ~9.000 kWh.
// Modelliert den Ist-Zustand (kein Heizkörpertausch).
export interface WpElectricityInputs {
  situation: "bestand" | "neubau";
  wohnflaeche: number;          // m²
  insulationIdx: number;         // Index in INSULATION_BESTAND (0–3) / INSULATION_NEUBAU (0–2)
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

// ─── Standard-Gebäude (eine Quelle für alle Rechner ohne Gebäude-Abfrage) ───
// Wo der Nutzer keine Gebäudedaten eingibt (Empfehlungs-Flow, Live-Simulation,
// Datenstand, Fallbacks), rechnen alle mit DIESEM typischen Gebäude — statt mit
// einer stehengebliebenen Pauschale. Der PV- und WP-Rechner überschreiben es mit
// den echten Eingaben. Referenzieren, nie inline kopieren — sonst driftet es.
export const DEFAULT_WP_BUILDING: Omit<WpElectricityInputs, "personen"> = {
  situation: "bestand",
  wohnflaeche: 140,     // typisches EFH
  insulationIdx: 1,     // teilsaniert
  heizsystem: "hk_neu", // moderne Heizkörper (45 °C)
  wpType: "lwwp",       // Luft/Wasser (Marktstandard)
};

/** WP-Jahresstrom fürs Standard-Gebäude mit gegebener Personenzahl (Warmwasser). */
export function defaultWpAnnualKwh(personenCount = 2): number {
  return calcWpAnnualElectricity({ ...DEFAULT_WP_BUILDING, personen: personenCount });
}

// Person-agnostischer Default (2 Personen) für Anzeige/Fallbacks, wo die
// Personenzahl unbekannt ist. Rund 6.000 kWh — die ehrliche Größenordnung einer
// realen Wärmepumpe (die alte 3.500-Pauschale unterschätzte massiv). Der Wert sank
// am 31.07.2026 von ~7.300, weil die Heizwärme seither aus dem erwarteten Verbrauch
// statt aus dem Norm-Bedarf kommt (lib/heat-consumption.ts).
export const DEFAULT_WP_ANNUAL_KWH = defaultWpAnnualKwh(2);
