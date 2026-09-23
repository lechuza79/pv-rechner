// ─── Wie viel schneller ein Team heute wäre ──────────────────────────────────
//
// Die Gewerke-Schätzung beschreibt ein Team, das klassisch entwickelt. Ein Team,
// das dasselbe HEUTE bauen würde, arbeitet mit KI-Unterstützung — und wäre
// schneller. Ohne diesen Abzug vergleicht die Aufstellung die eigene Arbeit mit
// einem Angebot von gestern.
//
// DIE BELEGLAGE IST WIDERSPRÜCHLICH, UND ZWAR FUNDAMENTAL. Die vier großen
// Messungen reichen von deutlich langsamer bis doppelt so schnell; sie messen
// nicht dasselbe, und keine davon misst unser Vorhaben. Wer sich eine davon
// aussucht, sucht sich das Ergebnis aus. Deshalb steht die ganze Spanne unten
// im Code, nicht nur die Zahl, auf die es hinausläuft.
//
// DER BEFUND, DER AM MEISTEN ÜBER DIESE SCHÄTZUNG SAGT: Im kontrollierten
// Versuch von METR waren erfahrene Entwickler mit KI **19 % langsamer** und
// schätzten sich hinterher auf **20 % schneller** — 39 Punkte Abstand zwischen
// Gefühl und Messung, nach der eigenen Erfahrung. Jede aus dem Bauch gegriffene
// Zahl in diesem Feld ist deshalb mit hoher Wahrscheinlichkeit zu optimistisch,
// und das gilt ausdrücklich auch für die Zahlen hier.

/** Wie stark KI-Unterstützung ein Gewerk beschleunigt. */
export type KiWirkung = "stark" | "mittel" | "gering";

export interface Messung {
  quelle: string;
  /** Wirkung auf die Bearbeitungszeit: negativ = schneller, positiv = langsamer. */
  zeitaenderung: number;
  aufbau: string;
}

/**
 * Was gemessen wurde — vollständig, auch das Unbequeme.
 *
 * Alle vier am 23.09.2026 recherchiert. Die Reihenfolge ist die der
 * Aussagekraft für unseren Fall: echte Aufgaben in echtem Code oben, Labor
 * unten.
 */
export const MESSUNGEN: Messung[] = [
  {
    quelle: "METR 2025, kontrollierter Versuch",
    zeitaenderung: +0.19,
    aufbau:
      "16 erfahrene Entwickler, 246 echte Aufgaben in Projekten, die sie im " +
      "Schnitt seit fünf Jahren kennen — die Entwickler waren LANGSAMER und " +
      "hielten sich für schneller",
  },
  {
    quelle: "Google, kontrollierter Versuch im Unternehmen",
    zeitaenderung: -0.21,
    aufbau: "echte Unternehmensaufgaben; die belastbarste Einzelzahl für unseren Fall",
  },
  {
    quelle: "GitHub Copilot, kontrollierter Versuch",
    zeitaenderung: -0.55,
    aufbau: "eine isolierte, klar umrissene Aufgabe im Labor",
  },
  {
    quelle: "McKinsey, Laborexperiment",
    zeitaenderung: -0.5,
    aufbau: "Laborbedingungen, abgegrenzte Aufgaben — das obere Ende der Spanne",
  },
];

/**
 * Die angesetzten Abschläge.
 *
 * NICHT PAUSCHAL, SONDERN JE GEWERK — dieselbe Systematik wie beim Rollenmix.
 * Ein einheitlicher Faktor behauptet, eine Rechtsrecherche im Volltext profitiere
 * so stark wie eine Reihe gleichförmiger Schnittstellen; daran zerfällt die
 * Vergleichbarkeit der ganzen Aufstellung.
 *
 * Die Zahlen sind URTEIL, eingeklemmt zwischen den Messungen oben: Der stärkste
 * Abschlag bleibt unter dem Laborwert, der schwächste liegt über null, obwohl
 * eine der vier Messungen sogar eine Verlangsamung fand.
 */
export const ABSCHLAG: Record<KiWirkung, number> = {
  // Gleichförmige Arbeit mit klarem Muster und sofort prüfbarem Ergebnis:
  // Inhaltsseiten, Schnittstellen, Tests, Bausteine. Hier liegt das Copilot-
  // Terrain, und hier ist der Abschlag am ehesten belegbar.
  stark: 0.4,
  // Umsetzung mit eigener Fachlichkeit: Die Struktur kommt schnell, die
  // Richtigkeit nicht.
  mittel: 0.25,
  // Modellentscheidungen, Recht, Architektur, Betrieb. Genau die Arbeit, bei
  // der der METR-Versuch eine Verlangsamung gemessen hat — ein hoher Abschlag
  // wäre hier gegen die beste verfügbare Evidenz.
  gering: 0.1,
};

/** Der Anteil der Zeit, der nach dem Abschlag übrig bleibt. */
export function faktor(wirkung: KiWirkung): number {
  return 1 - ABSCHLAG[wirkung];
}

export const KI_ANNAHME_STAND = "2026-09-23";

/**
 * Die Spanne der Messungen, für die Ausgabe.
 *
 * Sie gehört an jede Zahl, die aus diesen Abschlägen entsteht: Eine Schätzung,
 * deren Grundlage von −19 % bis +55 % reicht, darf nicht als Punktwert
 * dastehen.
 */
export function spanneDerMessungen(): { schnellste: number; langsamste: number } {
  const w = MESSUNGEN.map((m) => m.zeitaenderung);
  return { schnellste: Math.min(...w), langsamste: Math.max(...w) };
}
