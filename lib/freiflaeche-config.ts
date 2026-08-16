// ─── Was ein Freiflächen-Park je eingespeister Kilowattstunde erlöst ─────────
//
// WOFÜR: Der Solar-Atlas bewertet den Anlagenbestand einer Region je Anlagenart
// (lib/atlas-impact.ts). Für Freiflächen stand dort der Marktwert Solar — also
// das, was der Strom an der Börse bringt. Das ist der falsche Maßstab: Ein
// Freiflächen-Park verkauft zwar an der Börse, bekommt aber zusätzlich die
// MARKTPRÄMIE, die auf den anzulegenden Wert auffüllt (§ 19 Abs. 1 Nr. 1
// i. V. m. § 20 EEG 2023, Anlage 1). Sein Erlös liegt deshalb beim ANZULEGENDEN
// WERT, nicht beim Marktwert — und der ist von der Börse weitgehend entkoppelt.
//
// Dass beide Größen heute (08/2026) fast gleich groß sind, ist Zufall der
// Marktlage und kein Grund, die Größen zu verwechseln: Fällt der Marktwert
// weiter, fällt der Erlös des Parks NICHT mit.
//
// ── WOHER DER WERT KOMMT ────────────────────────────────────────────────────
// Der Löwenanteil der deutschen Freiflächen-LEISTUNG wird ausgeschrieben:
// Anlagen über 1 MW müssen in die Ausschreibung (§ 22 Abs. 3 EEG 2023), und
// genau diese Anlagen tragen die Leistung, die im Atlas summiert wird. Ihr
// anzulegender Wert ist der Zuschlagswert der Ausschreibung.
//
// Quelle (am 15.08.2026 direkt bei der Behörde abgelesen): Bundesnetzagentur,
// "Solaranlagen des ersten Segments — Beendete Ausschreibungen / Statistiken"
// (bundesnetzagentur.de → Fachthemen → Ausschreibungen → Solaranlagen1 →
// BeendeteAusschreibungen), Spalte "durchschnittlicher, mengengewichteter
// Zuschlagswert". Die jüngste Runde zusätzlich in der Pressemitteilung vom
// 12.05.2026 ("Deutliche Überzeichnung der Ausschreibung für
// PV-Freiflächenanlagen zum Gebotstermin 1. März 2026": 268 Zuschläge über
// 2.299 MW, Zuschlagswerte 3,99 – 5,10 ct/kWh, mengengewichtetes Mittel
// 4,94 ct/kWh).
//
// ── BEWUSSTE GRENZEN ────────────────────────────────────────────────────────
//  · NICHT abgebildet ist der gesetzliche anzulegende Wert für die kleinen,
//    nicht ausgeschriebenen Freiflächenanlagen: § 48 Abs. 1 EEG 2023 nennt für
//    Solaranlagen des ersten Segments einen Basiswert von 7,00 ct/kWh (Wortlaut
//    am 15.08.2026 auf gesetze-im-internet.de/eeg_2014/__48.html geprüft), auf
//    den die Degression nach § 49 wirkt. Wie viel LEISTUNG im Bestand auf diese
//    Klasse entfällt, ist uns nicht belegt — deshalb wird nichts gemischt. Die
//    Auslassung geht zu unseren Ungunsten: Der gesetzliche Wert liegt über dem
//    Ausschreibungsmittel, der hier gepflegte Satz ist also eine Untergrenze.
//  · Es ist ein Satz für NEUE Anlagen. Eine historische Reihe der
//    Ausschreibungs-/Freiflächensätze 2012–2024 pflegt das Projekt nicht; wie
//    lib/atlas-impact.ts damit umgeht, steht dort.
//  · Keine Abzüge für negative Preise (§ 51 EEG setzt den Zahlungsanspruch dort
//    auf null). Das hebt den Satz gegenüber der Wirklichkeit leicht an; die
//    Gegenrichtung (fehlende Kleinanlagen) ist größer.
//  · Die Vermarktungsgebühr, die der Aufrufer abzieht, ist die für KLEINANLAGEN
//    belegte (DIREKTVERMARKTUNG.gebuehrCtKwh, lib/marktwert-config.ts). Ein Park
//    dieser Größe zahlt weniger; eine belegte Zahl für Großanlagen haben wir
//    nicht, und die zu hohe Gebühr rechnet den Park eher zu schlecht.

/** Eine beendete Ausschreibungsrunde für Solaranlagen des ersten Segments. */
export interface AusschreibungsRunde {
  /** Gebotstermin (ISO). */
  gebotstermin: string;
  /** Ausgeschriebene Menge in kW. */
  mengeKw: number;
  /** Durchschnittlicher, mengengewichteter Zuschlagswert in ct/kWh. */
  zuschlagCt: number;
}

/**
 * Die vier zuletzt beendeten Runden — also die letzten zwölf Monate.
 *
 * Warum vier und nicht eine: Der Zuschlagswert schwankt von Runde zu Runde um
 * mehrere Zehntel Cent (4,66 → 5,00 innerhalb von 2025). Eine einzelne Runde
 * wäre ein Stichtagswert, kein Niveau. Warum nicht mehr: Die Höchstwerte und
 * die Wettbewerbslage ändern sich schnell; ältere Runden beschreiben eine
 * Marktlage, in die heute niemand mehr hineinbaut.
 */
export const FREIFLAECHE_AUSSCHREIBUNGEN: ReadonlyArray<AusschreibungsRunde> = [
  { gebotstermin: "2025-03-01", mengeKw: 2_625_069, zuschlagCt: 4.66 },
  { gebotstermin: "2025-07-01", mengeKw: 2_266_466, zuschlagCt: 4.84 },
  { gebotstermin: "2025-12-01", mengeKw: 2_327_515, zuschlagCt: 5.0 },
  { gebotstermin: "2026-03-01", mengeKw: 2_294_768, zuschlagCt: 4.94 },
];

/**
 * Anzulegender Wert einer neuen Freiflächenanlage in ct/kWh — mengengewichtetes
 * Mittel der Runden oben, aus der Tabelle GERECHNET statt getippt (kein
 * Handfaktor, Wächter-Gate).
 *
 * Gewichtet wird mit der ausgeschriebenen Menge: Alle vier Runden waren
 * deutlich überzeichnet (März 2026: 201 % Deckungsrate) und damit praktisch
 * vollständig bezuschlagt — bezuschlagte und ausgeschriebene Menge liegen unter
 * einem halben Prozent auseinander (2.299 gegen 2.295 MW).
 */
export const FREIFLAECHE_AW_CT =
  FREIFLAECHE_AUSSCHREIBUNGEN.reduce((s, r) => s + r.zuschlagCt * r.mengeKw, 0) /
  FREIFLAECHE_AUSSCHREIBUNGEN.reduce((s, r) => s + r.mengeKw, 0);

/**
 * Gesetzlicher Basiswert für Solaranlagen des ersten Segments außerhalb der
 * Ausschreibung, § 48 Abs. 1 EEG 2023. Bewusst NICHT in die Rechnung
 * eingemischt (siehe Kopfkommentar) — er steht hier, damit die Auslassung
 * belegt und nachvollziehbar ist statt bloß behauptet.
 */
export const FREIFLAECHE_GESETZLICHER_BASISWERT_CT = 7.0;

/** Datenstand dieser Werte (ISO) — sichtbar auf /datenstand. */
export const FREIFLAECHE_VALID_FROM = "2026-08-15";

/** Nächste fällige Prüfung: das Ergebnis der Juli-Runde 2026 steht aus. */
export const FREIFLAECHE_REVIEW_BY = "2026-10-01";

export const FREIFLAECHE_QUELLE =
  "Bundesnetzagentur, Ausschreibungen für Solaranlagen des ersten Segments (beendete Ausschreibungen / Statistiken)";
