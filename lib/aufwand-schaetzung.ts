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
import {
  MIX, ROLLENSAETZE, kostenFuerTage, stundenJeRolle,
  type MixName, type Rolle, type Rollenmix,
} from "./rollensaetze";
import { faktor, type KiWirkung } from "./ki-wirkung";

/** Eine Position des Angebots. */
export interface Gewerk {
  name: string;
  /** Woraus sich die Menge ergibt — null bei pauschalen Posten. */
  menge: ((b: Bestandstag, z: Zaehlstand) => number) | null;
  /** Personentage je Einheit (bei Menge) oder pauschal (ohne Menge). */
  tage: number;
  /** Wie die Menge zu lesen ist, für die Anzeige. */
  einheit?: string;
  /**
   * Wer diese Tage leistet.
   *
   * Ohne Angabe gilt der Normalfall. Die Mischung entscheidet über die Summe
   * stärker als jeder einzelne Satz — zwischen reiner Fleißarbeit und reiner
   * Konzeptarbeit liegt beim Mischsatz das Anderthalbfache.
   */
  mix?: MixName;
  /**
   * Wie stark KI-Unterstützung dieses Gewerk beschleunigt.
   *
   * Ohne Angabe gilt „mittel". Der Abschlag steht je Gewerk und nicht pauschal,
   * weil Routinearbeit und Modellentscheidung nachweislich verschieden stark
   * profitieren — bei letzterer hat der beste kontrollierte Versuch sogar eine
   * Verlangsamung gemessen.
   */
  ki?: KiWirkung;
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
  { name: "Rechner samt Modell, Quellen und Validierung", menge: (_, z) => z.rechner, tage: 20, einheit: "Rechner", mix: "konzeptlastig", ki: "gering" },
  { name: "Inhaltsseiten mit Redaktion und Suchmaschinen-Arbeit", menge: (_, z) => z.seiten, tage: 1, einheit: "Seiten", mix: "fleissarbeit", ki: "stark" },
  { name: "Einbettbare Widgets mit Theming, Bildexport, Lizenz", menge: (_, z) => z.widgets, tage: 2.5, einheit: "Widgets", mix: "umsetzung", ki: "mittel" },
  { name: "Schnittstellen, Zwischenspeicher, Datenbank", menge: (_, z) => z.routen, tage: 0.7, einheit: "Routen", mix: "handwerk", ki: "stark" },
  { name: "Energie-Atlas: Registerimport, Aggregation, Tempo", menge: null, tage: 40, mix: "konzeptlastig", ki: "gering" },
  { name: "Förderkatalog samt Such- und Prüfautomatik", menge: null, tage: 50, mix: "umsetzung", ki: "mittel" },
  { name: "Erhebung Kommunen, Fachbetriebe, Versorger und Versand", menge: null, tage: 40, mix: "fleissarbeit", ki: "mittel" },
  { name: "Redaktions- und Veröffentlichungssystem", menge: null, tage: 30, mix: "umsetzung", ki: "mittel" },
  { name: "Anmeldung, Abo, Datenschutz, Lizenzabgrenzung", menge: null, tage: 25, mix: "konzeptlastig", ki: "gering" },
  { name: "Testabdeckung", menge: (b) => b.testdateien, tage: 0.3, einheit: "Testdateien", mix: "handwerk", ki: "stark" },
  { name: "Design-System und Bausteine", menge: (_, z) => z.komponenten, tage: 0.2, einheit: "Komponenten", mix: "handwerk", ki: "stark" },
  { name: "Betrieb, Überwachung, Kostenwache", menge: null, tage: 25, mix: "konzeptlastig", ki: "gering" },
  { name: "Rechtsrecherche im Volltext (sonst Anwaltsleistung)", menge: null, tage: 20, mix: "recht", ki: "gering" },
];

export interface Position {
  name: string;
  menge: number | null;
  einheit?: string;
  /** Personentage ohne KI-Unterstützung — die klassische Schätzung. */
  tageKlassisch: number;
  /** Personentage mit KI-Unterstützung; das ist die Zahl, mit der gerechnet wird. */
  tage: number;
  mix: Rollenmix;
  ki: KiWirkung;
  /** Was diese Position zu Agentursätzen kostet, in Euro. */
  eur: number;
}

export interface Aufwand {
  positionen: Position[];
  /** Punktwert in Personentagen, mit KI-Unterstützung. */
  tage: number;
  /**
   * Dieselbe Schätzung ohne KI-Unterstützung.
   *
   * SIE BLEIBT SICHTBAR, statt ersetzt zu werden: Der Abschlag ist die
   * unsicherste Annahme der ganzen Aufstellung (die Messungen dazu reichen von
   * deutlich langsamer bis doppelt so schnell), und wer die Grundlage nicht
   * sieht, kann die Annahme nicht prüfen.
   */
  tageKlassisch: number;
  /** Spanne, die genannt wird — ein Punktwert täuscht Genauigkeit vor. */
  von: number;
  bis: number;
  /**
   * Was das Ganze zu Agentursätzen kostet, in Euro — mit der Rollenmischung
   * gerechnet, nicht mit einem Einheitssatz.
   */
  eur: number;
  /** Dieselbe Spanne wie oben, in Geld. */
  eurVon: number;
  eurBis: number;
  /** Stunden je Rolle über alle Positionen. */
  stundenJeRolle: Record<Rolle, number>;
  /**
   * Der Mischsatz, der sich daraus ergibt — die eine Zahl, mit der sich das
   * Ergebnis nachrechnen lässt.
   */
  mischsatzEurProStunde: number;
}

/** Arbeitstage im Jahr nach Abzug von Urlaub, Feiertagen und Krankheit. */
export const ARBEITSTAGE_JE_JAHR = 215;

// Die Spanne ist bewusst weit: ±25 % ist für eine Angebotsschätzung dieser Art
// eher eng. Ein Punktwert wäre eine Genauigkeit, die es nicht gibt.
const SPANNE = 0.25;

export function schaetzeAufwand(b: Bestandstag, z: Zaehlstand): Aufwand {
  const positionen: Position[] = GEWERKE.map((g) => {
    const menge = g.menge ? g.menge(b, z) : null;
    const tageKlassisch = menge === null ? g.tage : Math.round(menge * g.tage);
    const ki = g.ki ?? "mittel";
    // Gerundet wird ERST NACH dem Abschlag: Ein vorher gerundeter Wert zieht
    // seinen Rundungsfehler in die Multiplikation, und über dreizehn Posten
    // summiert sich das sichtbar.
    const tage = Math.round(tageKlassisch * faktor(ki));
    const mix = MIX[g.mix ?? "umsetzung"];
    return {
      name: g.name, menge, einheit: g.einheit,
      tageKlassisch, tage, mix, ki, eur: kostenFuerTage(tage, mix),
    };
  });
  const tage = positionen.reduce((s, p) => s + p.tage, 0);
  const tageKlassisch = positionen.reduce((s, p) => s + p.tageKlassisch, 0);
  const eur = positionen.reduce((s, p) => s + p.eur, 0);

  // Die Stunden je Rolle kommen aus den Positionen, nicht aus einer zweiten
  // Rechnung über die Gesamttage: Jedes Gewerk hat seine eigene Mischung, und
  // ein Durchschnittsmix über alle wäre eine andere Zahl.
  const stunden: Record<Rolle, number> = { cto: 0, senior: 0, junior: 0 };
  for (const p of positionen) {
    const s = stundenJeRolle(p.tage, p.mix);
    for (const r of ROLLENSAETZE) stunden[r.rolle] += s[r.rolle];
  }
  const stundenGesamt = stunden.cto + stunden.senior + stunden.junior;

  return {
    positionen,
    tage,
    tageKlassisch,
    von: Math.round((tage * (1 - SPANNE)) / 10) * 10,
    bis: Math.round((tage * (1 + SPANNE)) / 10) * 10,
    eur,
    eurVon: eur * (1 - SPANNE),
    eurBis: eur * (1 + SPANNE),
    stundenJeRolle: stunden,
    mischsatzEurProStunde: stundenGesamt > 0 ? eur / stundenGesamt : 0,
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
