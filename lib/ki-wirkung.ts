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
  /** Kurzname für Tabellen und Fußzeilen. */
  quelle: string;
  /** Der vollständige Titel, wie man ihn zitiert. */
  titel: string;
  /** Wer sie veröffentlicht hat. */
  urheber: string;
  jahr: number;
  /** Wo sie zu finden ist. */
  fundstelle: string;
  /** Wirkung auf die Bearbeitungszeit: negativ = schneller, positiv = langsamer. */
  zeitaenderung: number;
  /** Woran gemessen wurde — der Grund, warum die Ergebnisse auseinandergehen. */
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
    quelle: "METR",
    titel:
      "Measuring the Impact of Early-2025 AI on Experienced Open-Source " +
      "Developer Productivity",
    urheber: "METR",
    jahr: 2025,
    fundstelle: "arXiv:2507.09089",
    zeitaenderung: +0.19,
    aufbau:
      "16 erfahrene Entwickler, 246 echte Aufgaben in Projekten, die sie im " +
      "Schnitt seit fünf Jahren kennen — sie waren LANGSAMER und schätzten " +
      "sich hinterher auf 20 % schneller",
  },
  {
    quelle: "Google",
    titel:
      "How much does AI impact development speed? An enterprise-based " +
      "randomized controlled trial",
    urheber: "Google",
    jahr: 2024,
    fundstelle: "arXiv:2410.12944",
    zeitaenderung: -0.21,
    aufbau:
      "echte Unternehmensaufgaben im Konzernalltag — von allen vieren die " +
      "Lage, die unserer am nächsten kommt",
  },
  {
    quelle: "GitHub Copilot",
    titel: "The Impact of AI on Developer Productivity: Evidence from GitHub Copilot",
    urheber: "Peng, Kalliamvakou, Cihon, Demirer (Microsoft / GitHub / MIT)",
    jahr: 2023,
    fundstelle: "arXiv:2302.06590",
    zeitaenderung: -0.558,
    aufbau:
      "eine einzige, klar umrissene Laboraufgabe (einen HTTP-Server in " +
      "JavaScript schreiben) — nicht übertragbar auf ein gewachsenes System",
  },
  {
    quelle: "McKinsey",
    titel: "Unleashing developer productivity with generative AI",
    urheber: "McKinsey & Company",
    jahr: 2023,
    fundstelle: "mckinsey.com, 27.06.2023",
    zeitaenderung: -0.5,
    aufbau:
      "40 eigene Entwickler an abgegrenzten Aufgaben; die Urheberin verkauft " +
      "Beratung zu diesem Thema — das obere Ende der Spanne",
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
export const MESSUNGEN_GEPRUEFT_AM = "2026-09-23";

/**
 * Die Richtung des Fehlers — sie gehört an jede Zahl, die hier herauskommt.
 *
 * DER ABSCHLAG RECHNET GEGEN UNS, und das ist Absicht. Der einzige
 * kontrollierte Versuch mit echten Aufgaben in vertrautem Code (METR) fand eine
 * VERLANGSAMUNG; wer ihm folgte, dürfte gar nichts abziehen und käme auf einen
 * höheren Vergleichswert. Wir ziehen trotzdem ab — lieber eine Zahl, die
 * angreifbar zu niedrig ist, als eine, die angreifbar zu hoch ist.
 *
 * Dieselbe Bauweise wie beim Nutzungsgrad der Ölheizung im Wärmepumpen-Modell:
 * bewusst zu vorsichtig, mit benannter Fehlerrichtung, statt genauer
 * auszusehen, als die Quellenlage hergibt.
 */
export const FEHLERRICHTUNG =
  "bewusst zu unseren Ungunsten: Der einzige Versuch mit echten Aufgaben in " +
  "vertrautem Code fand eine Verlangsamung — ohne Abschlag läge der " +
  "Vergleichswert höher";

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
