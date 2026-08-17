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
    text: "Unsere Autarkie-Rechnung wird gegen das Referenzkennfeld der HTW Berlin nachgerechnet.",
    href: "/methodik",
    icon: "check",
    // NUR die Autarkie — der Satz nannte bis zum Audit am 17.08.2026 auch den
    // Eigenverbrauch, und das war zu breit: AUTARKY_GRID (lib/constants.ts) ist
    // ein Autarkie-Kennfeld, und der einzige externe Abgleich ist
    // lib/__tests__/pv-sim.test.ts → "trifft das HTW-Referenzkennfeld bei
    // gleichem Tagverbrauch (±3 pp)". Der Eigenverbrauch fürs Geld kommt aus
    // calcEigenverbrauch (Power-Law) und hat KEINEN externen Anker; seine Tests
    // prüfen Monotonie und Plausibilität, also die Rechnung gegen sich selbst.
    // "Kalibriert an" ist eben nicht "rechnen wir nach".
    beleg: "lib/__tests__/pv-sim.test.ts + /methodik",
  },
  {
    titel: "Offengelegte Datenquellen",
    text: "Woher jede Zahl stammt, steht dabei — von der Bundesnetzagentur bis zur Forschung.",
    href: "/datenstand",
    icon: "quote",
    // NICHT "amtlich" und NICHT als abschließende Aufzählung — beides fiel im
    // Audit: Fraunhofer ISE ist ein privates Forschungsinstitut, keine Behörde,
    // und die Leiste steht auch unter dem Wärmepumpen- und Klimarechner, deren
    // Zahlen von Verbraucherzentrale, KfW, dena, test.de und ADAC kommen. Eine
    // Aufzählung, die dort falsch ist, wäre eine Werbeaussage auf der falschen
    // Seite. Die Zusage ist deshalb die überprüfbare: dass die Herkunft dabeisteht.
    beleg: "lib/data-sources.ts + Quellenzeile je Block auf /datenstand",
  },
  {
    titel: "Jede Größe mit Quelle",
    text: "Für jede Größe steht dabei, worauf wir rechnen, woher sie stammt und wie alt sie ist.",
    href: "/datenstand",
    icon: "refresh",
    // KEIN "alle Werte stehen offen" mehr: Seit dem Umbau vom 17.08.2026 hält
    // /datenstand die durchkalibrierten Modell-Datensätze zurück. Der alte Satz
    // war damit ausgerechnet auf der Seite falsch, auf die er verlinkt — und
    // stand trotzdem auf jeder Seite der Site. Was jetzt zugesagt wird, ist das,
    // was die Seite hält: Herkunft und Stand je Größe.
    //
    // KEIN gemeinsames Prüfdatum: Die Werte werden in verschiedenen Takten
    // geprüft — Rechtsstände täglich, Marktpreise monatlich, der CO₂-Preis
    // jährlich. Ein Datum über allen behauptete den schnellsten Takt für den
    // langsamsten Wert.
    beleg: "/datenstand nennt je Block Stand und Quelle; Werte teils auf Anfrage",
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
