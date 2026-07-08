// ─── Wärmepumpen-Grundpreis (live aus Marktdaten) ──────────────────────────
// Server-sicher (keine React-/DOM-Abhängigkeit) — wird sowohl vom Scrape-Cron
// (Server) als auch vom Client-Hook (lib/prices.ts) importiert.
//
// WARUM: Der WP-Rechner rechnet die Investition als `Basis + €/kW × Heizlast`.
// Die Basis war als fixe Config (18.000 €) gesetzt — zu hoch für kleine Anlagen.
// Hier leiten wir die Basis monatlich aus der taptaphome-Marktübersicht ab
// (Gerät + Einbau je WP-Typ), analog zur PV-/Speicher-Preis-Pipeline. Die
// €/kW-Steigung bleibt fix (stabiler Ingenieur-Wert aus der BWP-Preisübersicht) —
// nur das Marktniveau (die Basis) trackt automatisch mit. Das spiegelt exakt das
// Speicher-Muster (fixe Installations-Basis, mitlaufender €/kWh-Zellpreis), nur
// invertiert (fixe Steigung, mitlaufende Basis).
//
// NUR Luft/Wasser: Sole/Wasser wird bewusst NICHT gescrapt. Bei Erdwärme
// dominiert die Bohrung — ein FIXER Kostenblock, der sich nicht in ein
// `Basis + €/kW`-Schema pressen lässt (die Marktspanne 8.000–23.000 € Erschließung
// hängt an Bohrmetern, nicht an der Heizlast). Sole/Wasser bleibt daher
// config-basiert und wird vom jährlichen WP-Wächter (scripts/waermepumpe-verify.md)
// gepflegt.

import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";
import { calcHeatLoad } from "./heatpump-core";

export interface HeatpumpPriceConfig {
  investLwwpBase: number;    // € fixe Basis (Gerät-Grundausstattung + Standard-Einbau)
  investLwwpPerKw: number;   // €/kW Heizlast (fixe Steigung, aus Config)
  validFrom: string;         // ISO-Datum des Stands
  source: string | null;     // Quellenbeschreibung
}

// Referenz-Heizlast, auf die der gescrapte „typische Gesamtpreis" verankert wird.
// taptaphome bezieht seine WP-Kostenübersicht auf ein 120-m²-Einfamilienhaus.
// Wir rechnen dessen Heizlast mit DEMSELBEN Modell wie der Rechner (teilsaniert =
// Default-Gebäude), damit die Ableitung nicht gegen die App driftet. ~9,7 kW.
export const REFERENCE_HEIZLAST_KW = calcHeatLoad("bestand", 120, 1, 1);

// Plausibilitätsfenster für die abgeleitete LWWP-Basis (€). Absolute Grenzen +
// max. Abweichung zum letzten guten Wert — verhindert, dass ein kaputter Scrape
// (geänderte Seitenstruktur, Ausreißer) einen Unsinnswert in Produktion schreibt.
export const WP_PRICE_BOUNDS = {
  lwwpBaseMin: 5000,
  lwwpBaseMax: 20000,
  maxDeviation: 0.30, // 30 % max. Änderung ggü. letztem Wert
};

// Fallback = die (ebenfalls markt-aktualisierte) Config. Greift nur, wenn die DB
// keinen gescrapten Wert hat. investLwwpPerKw bleibt IMMER aus der Config — nur
// die Basis wird gescrapt.
export const DEFAULT_HEATPUMP_PRICES: HeatpumpPriceConfig = {
  investLwwpBase: DEFAULT_HEATPUMP_CONFIG.investLwwpBase,
  investLwwpPerKw: DEFAULT_HEATPUMP_CONFIG.investLwwpPerKw,
  validFrom: DEFAULT_HEATPUMP_CONFIG.validFrom,
  source: DEFAULT_HEATPUMP_CONFIG.source,
};

/** Ableitung der LWWP-Basis aus den Marktspannen (Gerät + Einbau).
 *
 *  typischer Gesamtpreis = Mitte(Gerät) + Mitte(Einbau)   (bei Referenz-Heizlast)
 *  Basis                 = typischer Gesamtpreis − €/kW × Referenz-Heizlast
 *
 *  So bleibt `Basis + €/kW × Heizlast` bei der Referenz-Heizlast exakt auf dem
 *  Marktniveau, skaliert aber über die (fixe) Steigung sauber nach oben/unten.
 *  Rundung auf 500 € (keine Scheingenauigkeit), Clamp auf das Plausi-Fenster.
 *  Gibt null zurück, wenn die Eingabespannen unbrauchbar sind. */
export function deriveLwwpBaseFromRanges(
  geraetLow: number,
  geraetHigh: number,
  installLow: number,
  installHigh: number,
  perKw: number = DEFAULT_HEATPUMP_CONFIG.investLwwpPerKw,
): number | null {
  const vals = [geraetLow, geraetHigh, installLow, installHigh];
  if (vals.some((v) => !Number.isFinite(v) || v <= 0)) return null;
  if (geraetHigh < geraetLow || installHigh < installLow) return null;

  const geraetMid = (geraetLow + geraetHigh) / 2;
  const installMid = (installLow + installHigh) / 2;
  const typicalAllIn = geraetMid + installMid;
  const base = typicalAllIn - perKw * REFERENCE_HEIZLAST_KW;

  const rounded = Math.round(base / 500) * 500;
  if (rounded < WP_PRICE_BOUNDS.lwwpBaseMin || rounded > WP_PRICE_BOUNDS.lwwpBaseMax) return null;
  return rounded;
}
