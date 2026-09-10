// ─── Was ein Team dafür gebraucht hätte ──────────────────────────────────────
//
// WARUM NICHT AUS CODEZEILEN: Das übliche Verfahren (COCOMO, Boehm 1981) rechnet
// Personenmonate aus Zeilenzahlen und liefert hier 62 Personenjahre — gegen
// tatsächlich rund ein Drittel Personenjahr also Faktor 200. Kein Verfahren ist
// so genau, dass so ein Ergebnis etwas belegt; es zeigt nur, dass das Modell
// nicht passt. Es unterstellt handgeschriebenen Code ohne fertige Bausteine,
// und unsere 237.000 Zeilen enthalten Datentabellen, erzeugte Reihen und
// 50.000 Zeilen Tests. Ein moderneres Werkzeug, das aus einem fertigen Projekt
// rechnet, gibt es nicht: Die gängigen Code-Zähler geben eine Schätzung aus und
// rechnen darunter alle dasselbe Modell von 1981; der anerkannte Nachfolger
// (COSMIC-Funktionspunkte, ISO/IEC 19761) misst Funktionen statt Zeilen und
// verlangt dafür einen zertifizierten Menschen, der das Produkt durchzählt.
//
// STATTDESSEN NACH GEWERKEN, wie eine Agentur ein Angebot rechnet: die
// Lieferbestandteile zählen und jedem Erfahrungswerte in Personentagen geben.
//
// DIE TRENNLINIE IST DER PUNKT: Die MENGE links ist gezählt, die TAGE rechts
// sind Urteil. Beides steht getrennt, damit niemand die Schätzung für eine
// Messung hält — und damit die Summe mitwächst, wenn das Projekt wächst.

import type { Bestandstag } from "./projekt-statistik";

/** Eine Position des Angebots. */
export interface Gewerk {
  name: string;
  /** Woraus sich die Menge ergibt — null bei pauschalen Posten. */
  menge: ((b: Bestandstag, z: Zaehlstand) => number) | null;
  /** Personentage je Einheit (bei Menge) oder pauschal (ohne Menge). */
  tage: number;
  /** Wie die Menge zu lesen ist, für die Anzeige. */
  einheit?: string;
}

/** Gezählte Bestände, die nicht im Zeilen-Bestand stecken. */
export interface Zaehlstand {
  rechner: number;
  seiten: number;
  widgets: number;
  routen: number;
  komponenten: number;
  foerderprogramme: number;
}

// Die Tagessätze sind mein Urteil als Entwickler, keine Messung. Sie gehen von
// einem eingespielten Team aus, das die Fachlichkeit erst erarbeiten muss —
// also mit Recherche, Abstimmung und Nacharbeit, nicht mit reiner Tippzeit.
export const GEWERKE: Gewerk[] = [
  { name: "Rechner samt Modell, Quellen und Validierung", menge: (_, z) => z.rechner, tage: 20, einheit: "Rechner" },
  { name: "Inhaltsseiten mit Redaktion und Suchmaschinen-Arbeit", menge: (_, z) => z.seiten, tage: 1, einheit: "Seiten" },
  { name: "Einbettbare Widgets mit Theming, Bildexport, Lizenz", menge: (_, z) => z.widgets, tage: 2.5, einheit: "Widgets" },
  { name: "Schnittstellen, Zwischenspeicher, Datenbank", menge: (_, z) => z.routen, tage: 0.7, einheit: "Routen" },
  { name: "Solar-Atlas: Registerimport, Aggregation, Tempo", menge: null, tage: 40 },
  { name: "Förderkatalog samt Such- und Prüfautomatik", menge: null, tage: 50 },
  { name: "Erhebung Kommunen, Fachbetriebe, Versorger und Versand", menge: null, tage: 40 },
  { name: "Redaktions- und Veröffentlichungssystem", menge: null, tage: 30 },
  { name: "Anmeldung, Abo, Datenschutz, Lizenzabgrenzung", menge: null, tage: 25 },
  { name: "Testabdeckung", menge: (b) => b.testdateien, tage: 0.3, einheit: "Testdateien" },
  { name: "Design-System und Bausteine", menge: (_, z) => z.komponenten, tage: 0.2, einheit: "Komponenten" },
  { name: "Betrieb, Überwachung, Kostenwache", menge: null, tage: 25 },
  { name: "Rechtsrecherche im Volltext (sonst Anwaltsleistung)", menge: null, tage: 20 },
];

export interface Position {
  name: string;
  menge: number | null;
  einheit?: string;
  tage: number;
}

export interface Aufwand {
  positionen: Position[];
  /** Punktwert in Personentagen. */
  tage: number;
  /** Spanne, die genannt wird — ein Punktwert täuscht Genauigkeit vor. */
  von: number;
  bis: number;
}

/** Arbeitstage im Jahr nach Abzug von Urlaub, Feiertagen und Krankheit. */
export const ARBEITSTAGE_JE_JAHR = 215;

// Die Spanne ist bewusst weit: ±25 % ist für eine Angebotsschätzung dieser Art
// eher eng. Ein Punktwert wäre eine Genauigkeit, die es nicht gibt.
const SPANNE = 0.25;

export function schaetzeAufwand(b: Bestandstag, z: Zaehlstand): Aufwand {
  const positionen: Position[] = GEWERKE.map((g) => {
    const menge = g.menge ? g.menge(b, z) : null;
    return {
      name: g.name,
      menge,
      einheit: g.einheit,
      tage: menge === null ? g.tage : Math.round(menge * g.tage),
    };
  });
  const tage = positionen.reduce((s, p) => s + p.tage, 0);
  return {
    positionen,
    tage,
    von: Math.round((tage * (1 - SPANNE)) / 10) * 10,
    bis: Math.round((tage * (1 + SPANNE)) / 10) * 10,
  };
}

/** Personentage in Personenjahre, eine Nachkommastelle. */
export function inPersonenjahren(tage: number): number {
  return Math.round((tage / ARBEITSTAGE_JE_JAHR) * 10) / 10;
}

/**
 * Der Vergleich zur tatsächlichen Arbeitszeit — als Faktor.
 *
 * ER WIRD AUF EINE GANZE ZAHL GERUNDET, und zwar aus einem Grund: Zähler und
 * Nenner sind beide unscharf (eine Angebotsschätzung gegen eine Messung mit
 * hochgerechneter erster Projekthälfte). „Faktor 9" trägt, „Faktor 9,4" behauptet
 * eine Genauigkeit, die keine der beiden Zahlen hat.
 */
export function faktorGegen(tageGeschaetzt: number, stundenGemessen: number): number | null {
  if (stundenGemessen <= 0) return null;
  const tatsaechlich = stundenGemessen / 8;
  return Math.round(tageGeschaetzt / tatsaechlich);
}
