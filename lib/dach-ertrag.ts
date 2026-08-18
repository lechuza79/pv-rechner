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

/** Grenzen des Standort-OPTIMUMS (kWh je kWp) — der Wert, der als `er` geteilt
 *  wird. Deutschland liegt zwischen etwa 850 (Nordküste, trübes Jahr) und 1.150
 *  (Alpenvorland); der Rahmen ist absichtlich etwas weiter.
 *
 *  Wichtig: Diese Grenzen gelten dem OPTIMUM, nicht dem angezeigten Ertrag. Wer
 *  ein Eingabefeld für den angezeigten Ertrag baut, muss sie mit dem Dachfaktor
 *  skalieren (× `dachNeigungsFaktor`) — sonst erzeugt die Rückrechnung Optima
 *  außerhalb dieses Bereichs, und der Teilen-Link liefert dem Empfänger einen
 *  anderen Ertrag als dem Absender. */
export const ERTRAG_OPTIMUM_MIN = 700;
export const ERTRAG_OPTIMUM_MAX = 1200;

/** Dachformen, deren Ausrichtung der Monteur wählt (Aufständerung). Dort gibt
 *  es kein Nord — niemand ständert Module nach Norden auf. */
export function dachErlaubtNord(dachartIdx: number | null): boolean {
  if (dachartIdx === null) return true;
  return !DACHARTEN[dachartIdx]?.aufgestaendert;
}

/** Neigungsstufen, die zu einer Dachform gehören — mit Klartext statt nackter
 *  Grad, weil kaum jemand seine Dachneigung in Zahlen kennt. Die Grade selbst
 *  sind Zeilen der Matrix (tilt-config), nicht interpoliert.
 *
 *  Beim Flachdach ist die Frage eine ANDERE: nicht „wie steil", sondern ob die
 *  Module aufgeständert sind. Das ist eine Entscheidung, die man kennt (und
 *  bezahlt hat) — und sie ist nach Süden 9 Punkte wert, mehr als die Neigung
 *  eines Satteldachs in jeder Richtung außer Nord. */
export function neigungsStufen(dachartIdx: number | null): { grad: number; label: string; sub: string }[] {
  const dach = dachartIdx !== null ? DACHARTEN[dachartIdx] : null;
  if (!dach) return [];
  if (dach.aufgestaendert) {
    return [
      { grad: 0, label: "Flach aufgelegt", sub: "Module liegen auf dem Dach" },
      // Dieselbe Gradzahl wie die Annahme der Dachform (DACHARTEN.typNeigung).
      // Vorher stand hier 15° gegen 10° in der Annahme: Die Kopfzeile sagte
      // „üblich: aufgeständert", und wer genau das anklickte — also die geltende
      // Annahme bestätigte — sah den Ertrag um zwei Punkte steigen.
      { grad: dach.typNeigung, label: "Aufgeständert", sub: "Auf Gestellen angeschrägt" },
    ];
  }
  switch (dach.id) {
    case "pult":
      return [
        { grad: 5, label: "5°", sub: "Fast flach" },
        { grad: 15, label: "15°", sub: "Übliche Neigung" },
        { grad: 25, label: "25°", sub: "Deutlich geneigt" },
      ];
    case "walm":
      return [
        { grad: 20, label: "20°", sub: "Flach" },
        { grad: 30, label: "30°", sub: "Übliche Neigung" },
        { grad: 35, label: "35°", sub: "Steil" },
      ];
    default: // Satteldach
      return [
        { grad: 25, label: "25°", sub: "Flach" },
        { grad: 35, label: "35°", sub: "Übliche Neigung" },
        { grad: 45, label: "45°", sub: "Steil" },
      ];
  }
}

/** Lohnt sich die Neigungs-Frage bei dieser Ausrichtung überhaupt?
 *
 *  Gemessen an der Matrix, über den realen Neigungsbereich je Dachform: nach
 *  Süden liegen zwischen 30° und 50° ganze 1 Prozentpunkt, nach Norden bis zu
 *  27 (Pultdach, 5° gegen 30°). Die Neigung ist also keine allgemein wichtige
 *  Angabe, sondern fast ausschließlich bei Nordlage eine — dort wird die Frage
 *  von selbst aufgeklappt, sonst bleibt sie eine Verfeinerung für die, die es
 *  genau wissen wollen. */
export function neigungLohntNachfrage(ausrichtung: TiltOrientation | null): boolean {
  return ausrichtung === "nord";
}

/** Anteil vom optimalen Ertrag (0–1) für Dachform + Ausrichtung + Neigung.
 *  Ohne Neigungsangabe gilt die typische Neigung der Dachform (DACHARTEN) —
 *  in drei von vier Ausrichtungen auf wenige Punkte genau.
 *  Ohne vollständige Angabe: 1,0 — dann rechnet der Aufrufer weiter mit dem
 *  Standort-Optimum, und das muss er dem Nutzer auch so hinschreiben
 *  (siehe dachErtragHinweis). */
export function dachNeigungsFaktor(
  dachartIdx: number | null,
  ausrichtung: TiltOrientation | null,
  neigungGrad?: number | null,
): number {
  if (dachartIdx === null || ausrichtung === null) return 1;
  const dach = DACHARTEN[dachartIdx];
  if (!dach) return 1;
  return tiltPct(ausrichtung, neigungGrad ?? dach.typNeigung) / 100;
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
  neigungGrad?: number | null,
): number {
  return Math.round(standortErtrag * dachNeigungsFaktor(dachartIdx, ausrichtung, neigungGrad));
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
  neigungGrad?: number | null,
): string {
  const wo = hatStandort ? "für deinen Standort" : "im Bundesmittel";
  if (dachartIdx === null || ausrichtung === null) {
    return `Gerechnet wird mit ${ertragKwp.toLocaleString("de-DE")} kWh je kWp ${wo} — bei optimaler Neigung nach Süden. Gib dein Dach an, dann rechnen wir mit deiner Ausrichtung.`;
  }
  const dach = DACHARTEN[dachartIdx];
  const pct = Math.round(dachNeigungsFaktor(dachartIdx, ausrichtung, neigungGrad) * 100);
  const zusatz = pct >= 100 ? "" : ` — das sind ${pct} % des Optimums`;
  // „typisch" nur schreiben, solange es wirklich die Annahme ist. Wer die
  // Neigung angegeben hat, darf sie nicht als Schätzung dargestellt bekommen.
  const wieSteil = neigungGrad != null
    ? (dach.aufgestaendert
        ? (neigungGrad > 0 ? "aufgeständert" : "flach aufgelegt")
        : `${neigungGrad}° Neigung`)
    : `typisch ${dach.typNeigung}° Neigung`;
  return `Gerechnet wird mit ${ertragKwp.toLocaleString("de-DE")} kWh je kWp ${wo} (${dach.label}, ${wieSteil})${zusatz}.`;
}
