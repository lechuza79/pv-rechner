// ─── Vertrauens-Aussagen: EINE Quelle ────────────────────────────────────────
//
// Die Leiste über dem Footer steht auf JEDER Seite. Damit ist jede Aussage darin
// eine Werbeaussage im Sinne des § 5 UWG — und zwar auf der gesamten Site
// gleichzeitig. Genau die Fehlerklasse, die dieses Projekt am teuersten bezahlt:
// ein Satz, den niemand nachprüft, weil er überall steht und deshalb "bekannt"
// aussieht.
//
// Deshalb gilt hier dieselbe Systematik wie bei den Einheiten und der Bio-Treppe:
// Die Sätze stehen genau einmal im Code, jeder trägt seinen Beleg als Kommentar,
// und der einzige zeitabhängige Punkt verfällt von selbst (siehe unten).
//
// REGEL FÜR NEUE PUNKTE: Ein Punkt darf nur rein, wenn er (a) an einer Stelle im
// Projekt nachprüfbar ist — Test, Datenschutzerklärung, Datenquellen-Register —
// und (b) diese Stelle als `beleg` benannt ist. "Klingt gut" ist kein Beleg.
// Absolute Aussagen ("nie", "keine", "immer", "100 %") brauchen zusätzlich einen
// Abgleich mit der Datenschutzerklärung, bevor sie hier landen.

/** Welches Icon die Leiste vor dem Punkt zeigt. Auflösung in components/TrustBar. */
export type TrustIcon = "check" | "quote" | "refresh" | "lock";

export interface TrustSignal {
  /** Kurze Überschrift, 2–4 Wörter. Kein Satzzeichen. */
  titel: string;
  /** Ganzer Satz — der eigentliche Inhalt. */
  text: string;
  /** Wohin der Punkt führt: die Seite, die ihn ausführt und belegt. */
  href: string;
  icon: TrustIcon;
  /**
   * Wo die Aussage im Projekt nachprüfbar ist. Reine Dokumentation für die
   * nächste Sitzung — steht bewusst nicht in der Oberfläche.
   */
  beleg: string;
}

/**
 * Die dauerhaft gültigen Punkte. Der zeitabhängige Prüf-Punkt kommt aus
 * {@link pruefSignal} dazu — er ist der einzige, der verfallen kann.
 */
export const TRUST_SIGNALS: readonly TrustSignal[] = [
  {
    titel: "An Forschungsdaten geprüft",
    text: "Eigenverbrauch und Autarkie rechnen wir gegen das Referenzkennfeld der HTW Berlin nach.",
    href: "/methodik",
    icon: "check",
    // Kennfeld: AUTARKY_GRID in lib/constants.ts, Vergleich in calcAutarkie
    // (lib/calc.ts). Der Abgleich ist als Test festgenagelt:
    // lib/__tests__/pv-sim.test.ts → "trifft das HTW-Referenzkennfeld bei
    // gleichem Tagverbrauch (±3 pp)". Ausgeführt auf /methodik.
    beleg: "lib/__tests__/pv-sim.test.ts + /methodik",
  },
  {
    titel: "Amtliche Datenquellen",
    text: "Die Zahlen stammen von Bundesnetzagentur, Fraunhofer ISE und der Europäischen Kommission.",
    href: "/datenstand",
    icon: "quote",
    // Die drei Genannten sind wörtlich Einträge in lib/data-sources.ts (mastr,
    // energyCharts, pvgis) und werden auf /datenstand einzeln mit Lizenz
    // ausgewiesen. Bewusst NUR diese drei genannt: sie tragen die Kernrechnung
    // (Anlagenbestand, Erzeugung, Standort-Ertrag). Ein Test hält die Namen
    // gegen das Register.
    beleg: "lib/data-sources.ts (mastr, energyCharts, pvgis) + /datenstand",
  },
  {
    titel: "Jeder Wert mit Quelle",
    text: "Alle Annahmen, mit denen wir rechnen, stehen offen — jede mit ihrem eigenen Stand und ihrer Quelle.",
    href: "/datenstand",
    icon: "refresh",
    // KEIN gemeinsames Prüfdatum an dieser Stelle (Entscheidung des Betreibers,
    // 17.08.2026): Die Werte werden in ganz verschiedenen Takten geprüft — Preise
    // monatlich, Rechtsstände täglich, der CO₂-Preis jährlich. Ein einzelnes
    // Datum über allen hätte den jüngsten Takt für alle behauptet; das ist
    // dieselbe Fehlerklasse wie eine Kennzahl, die als Zustand gelesen wird.
    // Die Stände stehen je Größe auf /datenstand, und dorthin führt der Punkt.
    beleg: "/datenstand listet jede Größe mit validFrom/Stand und Quelle",
  },
  {
    titel: "Ohne Anmeldung",
    text: "Das Ergebnis erscheint sofort, die Berechnung läuft in deinem Browser — kein Konto, kein Verkaufskontakt.",
    href: "/datenschutz",
    icon: "lock",
    // Deckungsgleich mit der Datenschutzerklärung, Abschnitt "Nutzung ohne
    // Registrierung": "Die eigentliche Berechnung läuft in deinem Browser."
    // Bewusst NICHT "keine Daten verlassen dein Gerät" — die Postleitzahl geht
    // für Wetter- und Ertragsdaten an unsere eigene Schnittstelle, das wäre eine
    // absolute Aussage, die der eigenen Erklärung widerspricht.
    beleg: "/datenschutz, Abschnitt Nutzung ohne Registrierung",
  },
] as const;

// KEIN gemeinsames Prüfdatum in der Leiste — bewusst entfernt am 17.08.2026.
//
// Die erste Fassung zog den jüngsten Wächter-Lauf aus `waechter_reports` und
// schrieb ihn als "zuletzt geprüft am TT.MM." unter alle vier Punkte. Das war
// falsch, und zwar unabhängig davon, ob das Datum stimmte: Wir prüfen in ganz
// verschiedenen Takten — Rechtsstände täglich, Marktpreise monatlich, den
// CO₂-Preis jährlich. Ein einzelnes Datum über allen behauptet den schnellsten
// Takt für den langsamsten Wert. Dieselbe Fehlerklasse wie eine Kennzahl, die
// als Zustand gelesen wird (siehe Gate-Regel "Kennzahl ≠ Zustand").
//
// Die Stände gehören dorthin, wo sie einzeln stehen: auf /datenstand, je Größe
// mit eigenem validFrom und eigener Quelle. Der vierte Punkt führt dorthin,
// statt eine Zahl vorwegzunehmen. Damit braucht die Leiste auch keinen
// Datenbank-Read mehr und bleibt vollständig statisch.
