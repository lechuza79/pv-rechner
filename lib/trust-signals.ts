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

/**
 * Datum als TT.MM.JJJJ — bewusst aus den ISO-Bestandteilen gebaut statt über
 * toLocaleDateString: Server und Browser stehen in verschiedenen Zeitzonen, und
 * ein um einen Tag verschobenes Prüfdatum wäre genau die Sorte stiller Fehler,
 * gegen die dieser Punkt existiert.
 */
export function formatPruefdatum(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null;
}

/**
 * Der Prüf-Punkt. Er wird IMMER gezeigt, sobald ein Prüfdatum vorliegt — auch
 * ein altes (Vorgabe des Betreibers, 17.08.2026).
 *
 * WARUM DAS TRAGFÄHIG IST: Die frühere Fassung ließ den Punkt nach 14 Tagen
 * verfallen, weil der Titel "Laufend nachgeprüft" eine Regelmäßigkeit behauptete,
 * die niemand garantieren kann — die Wächter laufen nur, wenn der Rechner des
 * Betreibers an ist (09.–13.08.2026 lief fünf Tage keiner). Die Behauptung steckte
 * aber im Wort "laufend", nicht im Datum: Ein Stand-Datum ist bei JEDEM Alter
 * wahr, und ein sichtbar altes sagt mehr über den Zustand als ein verschwundener
 * Punkt. Deshalb heißt der Punkt jetzt "Zuletzt geprüft" und nennt nur noch den
 * Stand. Wer will, sieht sofort, wenn er alt ist.
 *
 * `null` bleibt nur für den Fall ohne jedes Prüfdatum (Datenbank nicht erreichbar).
 * Dort ein Datum zu erfinden wäre die eine Sache, die nicht passieren darf.
 */
export function pruefSignal(letzteIso: string | null): TrustSignal | null {
  if (!letzteIso) return null;
  const datum = formatPruefdatum(letzteIso);
  if (!datum) return null;

  return {
    titel: "Zuletzt geprüft",
    text: `Preise, Fördersätze und Rechtsstände werden gegen die Originalquellen geprüft — zuletzt am ${datum}.`,
    href: "/datenstand",
    icon: "refresh",
    // Das Datum ist der Zeitpunkt des jüngsten abgelegten Wächter-Laufs
    // (waechter_reports.created_at, gelesen in lib/trust-pruefstand.ts). Ein
    // solcher Lauf IST eine Prüfung gegen die Primärquelle — anders als ein
    // updated_at, das nur die letzte Schreibung markiert (siehe die
    // Förderdaten-Lehre in CLAUDE.md).
    beleg: "waechter_reports.created_at via lib/trust-pruefstand.ts",
  };
}

/** Die vollständige Leiste: dauerhafte Punkte plus der Prüf-Punkt, wenn ein Stand vorliegt. */
export function trustSignals(letzteIso: string | null): TrustSignal[] {
  const pruef = pruefSignal(letzteIso);
  return pruef ? [...TRUST_SIGNALS, pruef] : [...TRUST_SIGNALS];
}
