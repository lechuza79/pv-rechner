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
  /**
   * Wortfolge aus `text`, die fett gesetzt wird. Genau EINE je Punkt: Zwei
   * Betonungen in vier Zeilen heben sich gegenseitig auf, und die Leiste steht
   * unter jeder Seite — sie soll ruhig bleiben. Muss wörtlich in `text`
   * vorkommen, sonst schlägt der Test an.
   */
  betont?: string;
  /** Ausführung im Modal: ein bis zwei Sätze, die den Punkt belegen. */
  detail: string;
  /** Externer Beleg, im Modal verlinkt. Nur wo es einen gibt. */
  belegUrl?: string;
  /** Beschriftung des externen Belegs. */
  belegLabel?: string;
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
    betont: "HTW Berlin",
    detail:
      "Die HTW Berlin hat 25.000 Anlagen-Konfigurationen minutengenau durchsimuliert. Unsere Stundensimulation muss dieses Kennfeld bei gleichem Tagverbrauch auf drei Prozentpunkte genau treffen — ein Test prüft das bei jeder Änderung am Rechenkern.",
    belegUrl: "https://solar.htw-berlin.de/studien/",
    belegLabel: "Studien der HTW Berlin",
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
    titel: "Offizielle Datenquellen",
    text: "Bundesnetzagentur, Fraunhofer ISE, EU-Kommission und weitere — jede einzeln ausgewiesen.",
    betont: "jede einzeln ausgewiesen",
    detail:
      "Welche Quelle hinter einer Zahl steht, hängt vom Rechner ab: Der Wärmepumpen-Rechner stützt sich auf Verbraucherzentrale und KfW, der Klimarechner auf Wetterdienste und Gerätetests. Deshalb steht die Herkunft an jeder Größe einzeln statt als Liste vorneweg.",
    href: "/datenstand",
    icon: "quote",
    // Die drei Namen sind zurück (Betreiber-Vorgabe 18.08.2026) — sie sind das,
    // was den Punkt überprüfbar macht. Aber NICHT als abschließende Aufzählung
    // und NICHT als "amtlich": Fraunhofer ISE ist ein privates
    // Forschungsinstitut, und die Leiste steht auch unter dem Wärmepumpen- und
    // Klimarechner, wo keine der drei eine Zahl trägt. "und weitere" plus der
    // Zusatz "jede einzeln ausgewiesen" tragen genau diese Einschränkung.
    beleg: "lib/data-sources.ts + Quellenzeile je Block auf /datenstand",
  },
  {
    titel: "Regelmäßig nachgeprüft",
    text: "Preise, Fördersätze und Rechtsstände prüfen wir regelmäßig gegen die Originalquellen nach.",
    betont: "regelmäßig",
    detail:
      "Jede Größe hat einen eigenen Prüfrhythmus — Rechtsstände täglich, Marktpreise monatlich, der CO₂-Preis jährlich. Ein gemeinsames Datum nennen wir bewusst nicht: Es würde den schnellsten Takt für den langsamsten Wert behaupten. Die Termine je Größe stehen unten.",
    href: "/datenstand",
    icon: "refresh",
    // "regelmäßig" ist belegt, nicht behauptet: PRUEFSTAND (lib/pruefstand.ts)
    // führt je Größe den zuständigen Wächter, seinen Rhythmus und die Frist —
    // und `npm run stand:faellig` meldet, wenn einer davon stillsteht.
    //
    // BEWUSST NICHT "immer aktuell" (Betreiber-Vorschlag 18.08.2026): Das wäre
    // eine Zustandsbehauptung über jeden einzelnen Wert zu jedem Zeitpunkt. Die
    // Wächter laufen nur, wenn der Rechner des Betreibers an ist — vom 09. bis
    // 13.08.2026 lief fünf Tage keiner. "Regelmäßig nachprüfen" beschreibt, was
    // wir tun; "immer aktuell" behauptet ein Ergebnis, für das wir nicht
    // einstehen können.
    beleg: "lib/pruefstand.ts (Rhythmus + Frist je Größe), npm run stand:faellig",
  },
  {
    titel: "Ohne Anmeldung",
    text: "Das Ergebnis erscheint sofort, die Berechnung läuft in deinem Browser — kein Konto, kein Verkaufskontakt.",
    betont: "in deinem Browser",
    detail:
      "Die Rechenkerne laufen als JavaScript auf deinem Gerät. An unseren Server geht nur, was von außen kommen muss: die Postleitzahl für Standort-Ertrag und Wetter. Anlagengröße, Verbrauch und Ergebnis bleiben bei dir.",
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
