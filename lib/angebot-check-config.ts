// ─── Referenzwerte für die Angebotsprüfung ────────────────────────────────────
//
// EINZIGE Quelle für alles, woran ein hochgeladenes Wärmepumpen-Angebot gemessen
// wird. Die Zahlen stammen aus den beiden Auswertungen der Verbraucherzentrale
// Rheinland-Pfalz (Volltexte in docs/quellen/), am 27.08.2026 Tabelle für Tabelle
// im PDF gelesen — nicht aus Presseberichten.
//
// WARUM HIER UND NICHT IM PRÜFMODUL: Die Auswertung erscheint jährlich. Wer sie
// fortschreibt, fasst diese Datei an und sonst nichts; das Prüfmodul kennt keine
// einzige Zahl.
//
// WAS DIESE ZAHLEN NICHT SIND: eine Grundgesamtheit des deutschen Marktes. Es
// sind 160 Angebote für Ein- und Zweifamilienhäuser aus EINEM Bundesland, bei der
// Verbraucherzentrale eingereicht — also von Leuten, die schon Zweifel hatten.
// Die Verbraucherzentrale schreibt selbst, die Ergebnisse ließen sich "nicht ohne
// Weiteres auf den Gesamtmarkt übertragen". Jede Aussage, die daraus entsteht,
// nennt deshalb die Vergleichsgruppe sichtbar mit.

/** Stand der Referenz — Wertstand und Prüftag getrennt (Projektregel). */
export const ANGEBOT_REFERENZ_STAND = {
  /** Erscheinungsdatum der jüngsten Auswertung. */
  validFrom: "2026-07-02",
  /** Tag, an dem wir den Volltext zuletzt gegen diese Datei gehalten haben. */
  geprueftIso: "2026-08-27",
  quelle: "Verbraucherzentrale Rheinland-Pfalz, „Luft-Wasser-Wärmepumpen: Zweiter Check von 160 Angeboten aus Rheinland-Pfalz“ (02.07.2026)",
  quelleKurz: "Verbraucherzentrale Rheinland-Pfalz, 160 Angebote",
} as const;

// ─── Gesamtkosten (Tabelle 1, S. 5) ──────────────────────────────────────────

export const GESAMTKOSTEN = {
  anzahl: 160,
  min: 21099,
  max: 54168,
  mittel: 36397,
  median: 34898,
} as const;

// ─── Spezifische Kosten je Kilowatt (Tabelle 2, S. 6) ────────────────────────
//
// 156 statt 160: In vier Angeboten fehlt eine Angabe, aus der sich die Leistung
// ableiten ließe.

export const SPEZ_KOSTEN = {
  anzahl: 156,
  min: 2248,
  max: 8498,
  mittel: 4283,
  median: 4098,
} as const;

/**
 * Leistungsabhängige Bänder der spezifischen Kosten (Text zu Abbildung 3, S. 6).
 *
 * DAS IST DER WICHTIGSTE TEIL DIESER DATEI. Der Median über alle Angebote ist als
 * Maßstab für eine EINZELNE Anlage unbrauchbar: Kleine Anlagen liegen fast immer
 * über ihm, große fast immer darunter, weil ein großer Teil der Kosten gar nicht
 * an der Leistung hängt und sich bei großen Anlagen auf mehr Kilowatt verteilt.
 * Wer den Gesamtmedian anlegt, sagt jedem Bauherrn mit kleiner Anlage, er werde
 * übervorteilt — und jedem mit großer, er habe ein Schnäppchen gemacht.
 *
 * VORBEHALT, der mitgetragen werden muss: Diese Bänder sind aus dem Fließtext der
 * Auswertung übernommen ("häufig zwischen … und …", "die meisten Werte"), also
 * am Streudiagramm abgelesen. Es sind KEINE Quartile. Sie taugen für "im üblichen
 * Bereich / darüber / darunter", nicht für eine Prozentangabe.
 */
export const SPEZ_KOSTEN_BAENDER = [
  { bisKw: 7, von: 5000, bis: 8500, beschriftung: "4 bis 7 kW" },
  { bisKw: 12, von: 3000, bis: 5000, beschriftung: "8 bis 12 kW" },
  { bisKw: Infinity, von: 2300, bis: 3500, beschriftung: "ab 12 kW" },
] as const;

// ─── Positionen, die ein vollständiges Angebot nennen sollte ─────────────────
//
// Die Liste ist NICHT von uns. Sie steht wörtlich in der Auswertung 2025 (S. 15)
// als Forderung an die Innungen der Handwerksbetriebe: "Es sollten mindestens
// folgende Kategorien mit ihren jeweiligen Kosten aufgeführt sein". Das ist der
// Grund, warum wir sie überhaupt als Maßstab anlegen dürfen — wir erfinden keinen
// eigenen Standard, wir halten das Angebot an den, den die Verbraucherschützer
// öffentlich fordern.
//
// `anteilEnthalten` = in wie viel Prozent der 160 Angebote die LEISTUNG enthalten
// war (Tabelle 3 der Auswertung 2026; beim Zählerschrank Abbildung 4). Diese Zahl
// steht in der Anzeige neben jeder fehlenden Position: "fehlt bei 32 % der
// Angebote" ist eine Einordnung, "fehlt" allein wäre ein Vorwurf.
//
// `medianKosten` = Median des Einzelpreises, WO er ausgewiesen war (Tabelle 5
// bzw. 7). Das ist eine andere, kleinere Grundgesamtheit als `anteilEnthalten` —
// eine Leistung kann enthalten sein, ohne einen eigenen Preis zu tragen. Beim
// Fundament etwa: in 109 Angeboten enthalten, aber nur in 64 mit Preis.

export interface AngebotsPosition {
  /** Schlüssel, den der Auslese-Schritt setzt. */
  id: string;
  /** Wie es in der Anzeige heißt. */
  name: string;
  /** Anteil der 160 Angebote, in denen die Leistung enthalten war (0–1). */
  anteilEnthalten: number | null;
  /** Median des Einzelpreises in Euro, wo er ausgewiesen war. */
  medianKosten: number | null;
  /** Auf wie vielen Angeboten der Median beruht. */
  medianBasis: number | null;
  /** Warum das Fehlen teuer wird — nur wo es eine belegte Folge gibt. */
  folge?: string;
  /**
   * Ob das Fehlen ein echter Mangel ist oder nur je nach Lage. Ein Heizkörper-
   * tausch fehlt in 77 % der Angebote und ist trotzdem meistens richtig so.
   */
  pflicht: "immer" | "meistens" | "je-nach-fall";
}

export const ANGEBOTS_POSITIONEN: AngebotsPosition[] = [
  {
    id: "geraet",
    name: "Wärmepumpe (reine Gerätekosten)",
    anteilEnthalten: null,
    medianKosten: null,
    medianBasis: null,
    pflicht: "immer",
    // Bewusst ohne Zahlen: Die Verbraucherzentrale führt diese Position in ihrer
    // Kostentabelle NICHT auf, "da hier eine Separation besonders schwierig ist.
    // Häufig sind andere Komponenten in den angegebenen Kosten enthalten und es
    // ist leider bei dieser Position nicht möglich, eine vergleichbare Basis
    // herzustellen." (Auswertung 2025, S. 9). Wer hier je einen Median einträgt,
    // muss vorher gelöst haben, was ausgebildete Energieberater an 320 Angeboten
    // nicht lösen konnten.
  },
  {
    id: "warmwasser",
    name: "Warmwasserbereitung",
    anteilEnthalten: 0.85,
    medianKosten: 2106,
    medianBasis: 43,
    pflicht: "meistens",
  },
  {
    id: "pufferspeicher",
    name: "Pufferspeicher",
    anteilEnthalten: null,
    medianKosten: 1237,
    medianBasis: 44,
    pflicht: "je-nach-fall",
  },
  {
    id: "hydraulischer-abgleich",
    name: "Hydraulischer Abgleich",
    anteilEnthalten: 0.86,
    medianKosten: 1071,
    medianBasis: 89,
    pflicht: "immer",
    folge: "Ohne ihn gibt es keine Förderung — die Bundesförderung setzt ihn voraus.",
  },
  {
    id: "fundament",
    name: "Fundament für das Außengerät",
    anteilEnthalten: 0.68,
    medianKosten: 1399,
    medianBasis: 64,
    pflicht: "meistens",
  },
  {
    id: "elektroinstallation",
    name: "Elektroinstallation",
    anteilEnthalten: 0.8,
    medianKosten: 2687,
    medianBasis: 78,
    pflicht: "immer",
  },
  {
    id: "zaehlerschrank",
    name: "Umbau des Zählerschranks",
    anteilEnthalten: 0.31,
    medianKosten: 2966,
    medianBasis: 34,
    pflicht: "je-nach-fall",
    folge: "Die häufigste Nachforderung überhaupt: In 73 der 160 Angebote ist der Umbau ausdrücklich nicht enthalten, in 37 weiteren bleibt offen, ob er nötig ist.",
  },
  {
    id: "montage",
    name: "Montage und Lohn",
    anteilEnthalten: 0.49,
    medianKosten: 6650,
    medianBasis: 78,
    pflicht: "immer",
    folge: "Der größte und am stärksten streuende Posten überhaupt — die ausgewiesenen Beträge reichen von 2.975 bis 13.836 €.",
  },
  {
    id: "demontage",
    name: "Demontage und Entsorgung der alten Heizung",
    anteilEnthalten: null,
    medianKosten: null,
    medianBasis: null,
    pflicht: "immer",
  },
  {
    id: "heizkoerpertausch",
    name: "Tausch einzelner Heizkörper",
    anteilEnthalten: 0.23,
    medianKosten: null,
    medianBasis: null,
    pflicht: "je-nach-fall",
  },
];

// ─── Toleranz bei der Anlagengröße ───────────────────────────────────────────
//
// KEIN gemessener Wert, sondern eine Darstellungs-Entscheidung — und deshalb hier
// mit ihrer Begründung, statt als nackte Zahl im Prüfmodul.
//
// Bezugsgröße ist NICHT die Norm-Heizlast, sondern unsere Auslegungsleistung
// (Heizlast × Auslegungsfaktor) — dieselbe Zahl, mit der der Rechner die Anlage
// dimensioniert. Wer gegen die Heizlast prüft, meldet jedem Angebot pauschal eine
// Unterdimensionierung.
//
// Die Bänder sind bewusst weit. Der Installateur weiß Dinge, die wir nicht wissen:
// Sperrzeiten des Netzbetreibers, Warmwasserkomfort, eine geplante Erweiterung,
// die tatsächliche Gebäudehülle statt unserer Dämmstufen-Schätzung. Eine enge
// Toleranz würde aus jeder dieser Abweichungen einen Fehler machen.
export const GROESSEN_TOLERANZ = {
  /** Darunter melden wir "knapp bemessen". */
  knappAb: -0.15,
  /** Bis hierhin gilt die Größe als passend. */
  passendBis: 0.25,
  /** Darüber: "deutlich größer als gerechnet". */
  reichlichBis: 0.5,
} as const;
