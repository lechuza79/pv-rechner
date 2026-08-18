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

import { DATA_SOURCES } from "./data-sources";

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
  /**
   * Wortfolgen aus `text`, die auf ihre Quelle verlinken. Die URLs kommen aus
   * lib/data-sources.ts — dem Register, das ohnehin jede Quelle mit Lizenz
   * führt. Sie hier zu tippen wäre eine zweite Fassung derselben Angabe, und
   * die driftet (dieselbe Systematik wie bei den Einheiten).
   */
  links?: { begriff: string; url: string }[];
  /**
   * Zeigt "Mehr erfahren". Bewusst NICHT bei
   * jedem: Ein Punkt, dessen Satz schon alles sagt, führt sonst in ein Fenster,
   * das ihn nur wiederholt — vier gleich laute Einladungen entwerten sich
   * gegenseitig (Betreiber-Vorgabe 18.08.2026). Anklickbar ist dann NUR dieser
   * Hinweis, nicht die ganze Kachel: Im Text stehen eigene Links, und ein
   * Klickziel im Klickziel ist weder bedienbar noch zulässiges Markup.
   */
  mehr?: boolean;
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
/** Die Forschungsgruppe, an deren Daten die Autarkie-Rechnung geeicht ist.
 *  Keine Datenquelle im Sinne von lib/data-sources.ts (wir übernehmen keine
 *  Zahlen von dort in die Ausgabe), deshalb hier — aber genau einmal. */
const HTW_STUDIEN = "https://solar.htw-berlin.de/studien/";

export const TRUST_SIGNALS: readonly TrustSignal[] = [
  {
    titel: "Auf Basis von Forschungsdaten",
    text: "In den Rechnern nutzen wir die Simulationsdaten der HTW Berlin.",
    betont: "HTW Berlin",
    links: [{ begriff: "HTW Berlin", url: HTW_STUDIEN }],
    mehr: true,
    detail:
      "Die Forschungsgruppe um Volker Quaschning hat 25.000 Anlagen-Konfigurationen minutengenau durchsimuliert. Aus dieser Auswertung stammt die Formel, mit der wir den Eigenverbrauch bestimmen. Für die Autarkie kommt eine Prüfung dazu: Unsere eigene Stundensimulation muss das Kennfeld der HTW bei gleichem Tagverbrauch auf drei Prozentpunkte genau treffen, und ein Test kontrolliert das bei jeder Änderung am Rechenkern.",
    belegUrl: HTW_STUDIEN,
    belegLabel: "Studien der HTW Berlin",
    href: "/methodik",
    icon: "check",
    // BEIDE Größen, aber auf verschiedenen Wegen — der Satz sagt deshalb
    // "auf Grundlage von", nicht "geprüft gegen":
    //   • Eigenverbrauch: calcEigenverbrauch (lib/calc.ts) IST das
    //     Power-Law von Quaschning/Weniger, kalibriert an 25.000
    //     Konfigurationen. Die Formel stammt von dort — eine laufende Prüfung
    //     gegen ein externes Kennfeld gibt es dafür nicht.
    //   • Autarkie: eigene Stundensimulation, zusätzlich gegen AUTARKY_GRID
    //     geprüft (lib/constants.ts, Test in lib/__tests__/pv-sim.test.ts,
    //     ±3 pp).
    //
    // Am 17.08.2026 stand hier zwischenzeitlich nur die Autarkie: Ein Audit
    // hatte "rechnen wir nach" für den Eigenverbrauch zu Recht beanstandet, und
    // die Korrektur ging zu weit — sie strich die Größe statt das Verb. Wer
    // beides gleich benennt, muss das schwächere Verb für beide nehmen.
    //
    // NICHT "nach der Methodik der HTW berechnet": Die Autarkie-Simulation ist
    // unsere eigene, HTW liefert dort den Prüfmaßstab.
    beleg: "lib/calc.ts (Power-Law) + lib/__tests__/pv-sim.test.ts + /methodik",
  },
  {
    titel: "Offizielle Datenquellen",
    text: "Bundesnetzagentur, Fraunhofer ISE, EU-Kommission und weitere.",
    // KEINE Hervorhebung: Die drei Namen sind bereits verlinkt und damit
    // ausgezeichnet. Ein viertes betontes Element in einem Satz aus fünf
    // Wörtern macht die Zeile unruhig, statt etwas zu betonen.
    links: [
      { begriff: "Bundesnetzagentur", url: DATA_SOURCES.mastr.url },
      { begriff: "Fraunhofer ISE", url: DATA_SOURCES.energyCharts.url },
      { begriff: "EU-Kommission", url: DATA_SOURCES.pvgis.url },
    ],
    mehr: true,
    detail:
      "Welche Quelle hinter einer Zahl steht, hängt vom Rechner ab: Der Wärmepumpen-Rechner stützt sich auf Verbraucherzentrale und KfW, der Klimarechner auf Wetterdienste und Gerätetests. Deshalb steht die Herkunft an jeder Größe einzeln statt als Liste vorneweg.",
    href: "/datenstand",
    icon: "quote",
    // Die Namen sind das, was den Punkt überprüfbar macht — aber "und weitere"
    // muss stehen bleiben: Die Leiste sitzt auch unter dem Wärmepumpen- und
    // Klimarechner, wo keine der drei genannten Stellen eine Zahl trägt. Ohne
    // den Zusatz wäre der Satz dort schlicht falsch. Deshalb ist er betont.
    beleg: "lib/data-sources.ts + Quellenzeile je Block auf /datenstand",
  },
  {
    titel: "Immer aktuell",
    text: "Preise, Fördersätze und Rechtsstände prüfen wir regelmäßig gegen die Originalquellen.",
    betont: "regelmäßig",
    mehr: true,
    detail:
      "Jede Größe hat einen eigenen Prüfrhythmus — Rechtsstände täglich, Marktpreise monatlich, der CO₂-Preis jährlich. Ein gemeinsames Datum nennen wir bewusst nicht: Es würde den schnellsten Takt für den langsamsten Wert behaupten. Die Termine je Größe stehen unten.",
    href: "/datenstand",
    icon: "refresh",
    // "Immer aktuell" ist die Überschrift, der Satz darunter sagt, was wir
    // dafür TUN (Betreiber-Vorgabe 18.08.2026). Diese Paarung trägt: Der Titel
    // benennt das Ziel, der Satz die Handlung und ihre Grenze — "regelmäßig",
    // nicht "täglich". Belegt ist beides durch PRUEFSTAND (lib/pruefstand.ts):
    // Rhythmus und Frist je Größe, dazu `npm run stand:faellig`, das meldet,
    // wenn ein Wächter stillsteht. Das Modal zeigt dieselbe Liste.
    //
    // Der Titel darf NIE allein stehen: Ohne den Satz wäre er eine
    // Zustandsbehauptung über jeden Wert zu jedem Zeitpunkt, und die Wächter
    // laufen nur, wenn der Rechner des Betreibers an ist (09.–13.08.2026 lief
    // fünf Tage keiner). Ein Test nagelt die Paarung fest.
    beleg: "lib/pruefstand.ts (Rhythmus + Frist je Größe), npm run stand:faellig",
  },
  {
    titel: "Ohne Anmeldung",
    text: "Das Ergebnis der Rechner erscheint sofort, die Berechnung läuft in deinem Browser.",
    betont: "in deinem Browser",
    detail:
      "Die Rechenkerne laufen als JavaScript auf deinem Gerät. An unseren Server geht nur, was von außen kommen muss: die Postleitzahl für Standort-Ertrag und Wetter. Anlagengröße, Verbrauch und Ergebnis bleiben bei dir.",
    href: "/datenschutz",
    icon: "lock",
    // KEIN "Mehr erfahren": Der Satz sagt bereits alles, was der Punkt zusagt.
    // Wer es genauer wissen will, findet den Datenschutz im Fußzeilen-Menü
    // direkt darunter.
    //
    // Deckungsgleich mit der Datenschutzerklärung, Abschnitt "Nutzung ohne
    // Registrierung". Bewusst NICHT "keine Daten verlassen dein Gerät" — die
    // Postleitzahl geht für Wetter- und Ertragsdaten an unsere eigene
    // Schnittstelle.
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
