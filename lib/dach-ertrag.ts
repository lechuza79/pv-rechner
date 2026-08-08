// ─── Dach → Ertrag: die Regel-Schicht über der Neigungs-Matrix ───────────────
//
// WARUM ES DIESE DATEI GIBT. Der Standort-Ertrag aus /api/pvgis wird mit
// `optimalinclination=1` und `aspect=0` abgerufen — also für den BESTFALL:
// Süden, optimale Neigung. Die Neigungs-Matrix (lib/tilt-config.ts) ist auf
// genau denselben Bestfall normiert (Süd/40° = 100 %). Beide passen exakt
// zusammen — aber nur, wenn der Faktor auch angewendet wird.
//
// Wer den Standort-Ertrag OHNE diesen Faktor benutzt, rechnet stillschweigend
// mit einem perfekt nach Süden ausgerichteten Dach in optimaler Neigung und
// schreibt das nirgends dazu. Am 07.08.2026 tat das der PV-Hauptrechner: ein
// Ost/West-Satteldach (80 % vom Optimum) wurde 25 % zu gut gerechnet, ein
// Nord-Pultdach (72 %) um 39 %. Das geht ungebremst in die Amortisation.
//
// Die Zahlen stehen weiterhin dort, wo sie belegt sind: die Prozente in
// tilt-config.ts (PVGIS-Referenzabruf), die typische Neigung je Dachform in
// constants.ts → DACHARTEN. Dieses Modul ist NUR die Regel darüber — dieselbe
// Aufteilung wie bei lib/fossil-reference.ts.
//
// GRENZE DES MODELLS (bewusst): Die Matrix beschreibt die Jahressumme, nicht
// die Form über das Jahr. Ein Ost/West-Dach hat real ein flacheres Sommer-
// profil als ein steiles Süddach; wir skalieren die MENGE und lassen die FORM
// (das PVGIS-Monatsprofil des Standorts) unangetastet. Für Autarkie und
// Eigenverbrauch ist das die kleinere Ungenauigkeit — eine zweite, nach
// Ausrichtung aufgelöste Monatsmatrix gäbe es nur mit einem zweiten
// Referenzabruf je Ausrichtung, und der Fehler läge unter der Streuung des
// Wetterjahrs.

import { DACHARTEN } from "./constants";
import { tiltPct, type TiltOrientation } from "./tilt-config";

export type DachartId = (typeof DACHARTEN)[number]["id"];

/** Dachformen, deren Ausrichtung der Monteur wählt (Aufständerung). Dort gibt
 *  es kein Nord — niemand ständert Module nach Norden auf. */
export function dachErlaubtNord(dachartIdx: number | null): boolean {
  if (dachartIdx === null) return true;
  return !DACHARTEN[dachartIdx]?.aufgestaendert;
}

/** Anteil vom optimalen Ertrag (0–1) für eine Dachform + Ausrichtung.
 *  Ohne vollständige Angabe: 1,0 — dann rechnet der Aufrufer weiter mit dem
 *  Standort-Optimum, und das muss er dem Nutzer auch so hinschreiben
 *  (siehe dachErtragHinweis). */
export function dachNeigungsFaktor(
  dachartIdx: number | null,
  ausrichtung: TiltOrientation | null,
): number {
  if (dachartIdx === null || ausrichtung === null) return 1;
  const dach = DACHARTEN[dachartIdx];
  if (!dach) return 1;
  return tiltPct(ausrichtung, dach.typNeigung) / 100;
}

/** Der Ertrag, mit dem tatsächlich gerechnet wird: Standort-Optimum × Dach.
 *  DIESER Wert gehört in `ertragKwp` — dann greift er in einem Zug in der
 *  Geldrechnung (calc) UND in der Stundensimulation (simulatePvYear skaliert
 *  das Monatsprofil auf ihn). Zwei getrennte Anwendungsstellen wären die
 *  Gelegenheit, dass Autarkie und Ersparnis auseinanderlaufen. */
export function dachErtragKwp(
  standortErtrag: number,
  dachartIdx: number | null,
  ausrichtung: TiltOrientation | null,
): number {
  return Math.round(standortErtrag * dachNeigungsFaktor(dachartIdx, ausrichtung));
}

/** Was passiert, wenn jemand die Dach-Frage überspringt. Der Satz ist die
 *  Gegenleistung fürs Überspringen: die Annahme wird sichtbar, statt still zu
 *  gelten — und sie nennt die RICHTUNG des Fehlers, nicht nur seine Existenz. */
export function dachUebersprungenFolge(): string {
  return "Wir rechnen weiter mit optimaler Neigung nach Süden — dem Bestfall. Zeigt dein Dach woanders hin, fällt der Ertrag niedriger aus.";
}

/** Ein Satz, der sagt, WORAUF die Ertragszahl beruht — inklusive des Falls
 *  „noch nichts angegeben". Die Bestfall-Annahme darf nicht unsichtbar sein. */
export function dachErtragHinweis(
  ertragKwp: number,
  dachartIdx: number | null,
  ausrichtung: TiltOrientation | null,
  hatStandort: boolean,
): string {
  const wo = hatStandort ? "für deinen Standort" : "im Bundesmittel";
  if (dachartIdx === null || ausrichtung === null) {
    return `Gerechnet wird mit ${ertragKwp.toLocaleString("de-DE")} kWh je kWp ${wo} — bei optimaler Neigung nach Süden. Gib dein Dach an, dann rechnen wir mit deiner Ausrichtung.`;
  }
  const dach = DACHARTEN[dachartIdx];
  const pct = Math.round(dachNeigungsFaktor(dachartIdx, ausrichtung) * 100);
  const zusatz = pct >= 100 ? "" : ` — das sind ${pct} % des Optimums`;
  return `Gerechnet wird mit ${ertragKwp.toLocaleString("de-DE")} kWh je kWp ${wo} (${dach.label}, typisch ${dach.typNeigung}° Neigung)${zusatz}.`;
}
