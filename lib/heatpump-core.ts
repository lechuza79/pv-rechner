// ─── Heat Pump Core (pure, calc-free) ──────────────────────────────────────
// Die reinen Bedarfs-/Heizlast-/Arbeitszahl-Funktionen + der gemeinsame
// WP-Jahresstrom. Bewusst OHNE Abhängigkeit auf lib/calc.ts, damit auch
// lib/consumption.ts (das von calc.ts importiert wird) diese Funktionen nutzen
// kann, ohne einen Import-Zyklus zu bauen. lib/heatpump.ts re-exportiert alles
// hier Definierte — bestehende Importe `from "./heatpump"` bleiben gültig.

import { DEFAULT_HEATPUMP_CONFIG, type HeatPumpConfig } from "./heatpump-config";

// ─── Bedarf, Heizlast, Arbeitszahl ─────────────────────────────────────────

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

// ─── Shared: WP-Jahresstromverbrauch aus Gebäudedaten ──────────────────────
// Schlanke gemeinsame Quelle für PV- und WP-Rechner: dieselbe Physik wie die
// große TCO-Rechnung (Heizwärmebedarf ÷ Jahresarbeitszahl), aber ohne
// Investitions-/Förder-/Gas-Overhead. So liefert dasselbe Haus überall denselben
// WP-Stromverbrauch, statt einmal pauschal 3500 kWh und einmal ~11.000 kWh.
// Modelliert den Ist-Zustand (kein Heizkörpertausch).
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
// Personenzahl unbekannt ist. ~7.300 kWh — die ehrliche Größenordnung einer
// realen Wärmepumpe (die alte 3.500-Pauschale unterschätzte massiv).
export const DEFAULT_WP_ANNUAL_KWH = defaultWpAnnualKwh(2);
