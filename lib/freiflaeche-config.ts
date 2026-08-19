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
// Quelle (zuletzt am 18.08.2026 direkt bei der Behörde abgelesen):
// Bundesnetzagentur, "Solaranlagen des ersten Segments — Beendete
// Ausschreibungen / Statistiken" (bundesnetzagentur.de → Fachthemen →
// Ausschreibungen → Solaranlagen1 → BeendeteAusschreibungen), Spalte
// "durchschnittlicher, mengengewichteter Zuschlagswert". Die jüngste Runde
// (Gebotstermin 1. Juli 2026) steht dort mit 2.134.567 kW ausgeschrieben,
// 2.134.657 kW bezuschlagt und 4,79 ct/kWh — also erneut praktisch vollständig
// bezuschlagt.
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
//  · Es ist ein Satz für NEUE Anlagen. Für ältere Jahrgänge gibt es weiter
//    unten FREIFLAECHE_HISTORIE (2012–2014, gesetzliche Sätze),
//    FREIFLAECHE_AUSSCHREIBUNG_JAHRE (Zuschlagswerte ab 2015) und, noch davor,
//    die Alt-Tabelle lib/feedin-archiv-alt.ts (2006–03/2012).
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
  { gebotstermin: "2025-07-01", mengeKw: 2_266_466, zuschlagCt: 4.84 },
  { gebotstermin: "2025-12-01", mengeKw: 2_327_515, zuschlagCt: 5.0 },
  { gebotstermin: "2026-03-01", mengeKw: 2_294_768, zuschlagCt: 4.94 },
  // Am 18.08.2026 aus derselben Tabelle nachgeführt; die Runde 03/2025
  // (4,66 ct) fällt dafür aus dem Fenster — es bleibt bei den letzten vier.
  { gebotstermin: "2026-07-01", mengeKw: 2_134_567, zuschlagCt: 4.79 },
];

/**
 * Anzulegender Wert einer neuen Freiflächenanlage in ct/kWh — mengengewichtetes
 * Mittel der Runden oben, aus der Tabelle GERECHNET statt getippt (kein
 * Handfaktor, Wächter-Gate).
 *
 * Gewichtet wird mit der ausgeschriebenen Menge: Alle vier Runden waren
 * überzeichnet und damit praktisch vollständig bezuschlagt — bezuschlagte und
 * ausgeschriebene Menge liegen unter einem halben Prozent auseinander
 * (03/2026: 2.299 gegen 2.295 MW; 07/2026: 2.134,7 gegen 2.134,6 MW).
 *
 * WOFÜR DIESER WERT NICHT GILT: Er beschreibt die Zuschläge, die HEUTE erteilt
 * werden — also den Erlös eines Parks, der in bis zu zwei Jahren ans Netz geht
 * (§ 37e EEG). Ein HEUTE in Betrieb genommener Park hängt dagegen an den
 * Zuschlägen der Vorjahre; dafür ist FREIFLAECHE_AUSSCHREIBUNG_JAHRE zuständig.
 * Beides zu verwechseln war genau der Bruch, den die Reihe bis 08/2026 hatte.
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

/**
 * Stand der WERTE (ISO) — wandert nur, wenn sich eine Zahl bewegt hat.
 *
 * Hier stand einmal „sichtbar auf /datenstand"; das war falsch, die Seite führt
 * keinen Freiflächen-Eintrag. Seit dem 19.08.2026 stimmt der zweite Teil des
 * damaligen Befunds nicht mehr: Diese Datei hat einen Wächter
 * (`scripts/freiflaeche-verify.md`) und steht in `lib/pruefstand.ts`, ihr
 * Prüfdatum wird also überwacht. Auf einer Seite steht es weiterhin nicht —
 * die Atlas-Bewertung, die diese Werte benutzt, trägt keine Stand-Zeile.
 */
export const FREIFLAECHE_VALID_FROM = "2026-08-18";

/**
 * Tag des letzten Laufs, der die Leitquelle ERREICHT hat — auch wenn er nichts
 * geändert hat (Wächter-Gate, Regel 9: „geprüft und unverändert" ist das
 * Normalergebnis und genau die Auskunft, die dieses Datum gibt).
 *
 * Ein Lauf, der an einer Bot-Prüfung, einem 404 oder einer Umstrukturierung der
 * Amtsseite gescheitert ist, lässt das Datum stehen und meldet den Fehlschlag.
 */
export const FREIFLAECHE_GEPRUEFT_ISO = "2026-08-18";

/**
 * Nächste fällige Prüfung: Der letzte Gebotstermin des Jahres 2026 ist der
 * 1. Dezember (§ 28a Abs. 1 EEG 2023); sein Ergebnis erscheint erfahrungsgemäß
 * binnen weniger Wochen. Dann ist zweierlei fällig — das gleitende Fenster oben
 * nachführen UND das dann vollständige Ausschreibungsjahr 2026 unten in
 * FREIFLAECHE_AUSSCHREIBUNG_JAHRE eintragen.
 *
 * Das Datum liegt bewusst NACH dem Januar-Lauf des Wächters (25.01.), nicht
 * davor: Eine Frist, die verstreicht, bevor der zuständige Lauf überhaupt
 * stattfindet, meldet jedes Jahr denselben Fehlalarm und bringt niemandem etwas.
 */
export const FREIFLAECHE_REVIEW_BY = "2027-01-31";

export const FREIFLAECHE_QUELLE =
  "Bundesnetzagentur, Ausschreibungen für Solaranlagen des ersten Segments (beendete Ausschreibungen / Statistiken)";

// ─── Was ältere Freiflächen-Jahrgänge bekommen ──────────────────────────────
//
// WOFÜR: Der Solar-Atlas bewertet jeden Jahrgang mit dem Satz, den er wirklich
// bekommt. Für Dachanlagen gibt es dafür zwei Jahrgangs-Tabellen im Projekt
// (feedin-archiv-alt, feedin-archiv); für Freiflächen fehlte die Mitte, und
// jeder Park von 2012 bis heute wurde deshalb mit dem HEUTIGEN Zuschlagsniveau
// bewertet — ein Park von 2012 bekam damit rund ein Drittel dessen zugerechnet,
// was er tatsächlich erlöst.
//
// DATENHERKUNFT: Bundesnetzagentur, "PV-Vergütungssätze mit Degression April
// 2012 bis Juli 2014" (Originaldatei im Repo unter docs/quellen/bnetza-archiv/,
// am 17.08.2026 ausgelesen), Spalte "Anlagen nach § 32 Abs. 1 EEG" — das ist
// die Freiflächen-/Sonstige-Anlagen-Klasse des EEG 2012. Abgelesen ist der zum
// 1. Juli des Jahres geltende Wert, kaufmännisch auf zwei Stellen gerundet
// (die Amtsdatei führt die Kette ungerundet, wie bei den Dachsätzen auch).
// Quer-validiert: die Dach-Spalten derselben Datei stimmen für dieselben drei
// Monate zellgleich mit lib/feedin-archiv.ts überein (18,92 · 15,07 · 12,88).
//
// WARUM DER 1. JULI: Der Atlas kennt je Anlage nur das Baujahr, die Sätze fielen
// aber monatlich. Die Jahresmitte ist dieselbe Wahl wie in lib/atlas-impact.ts
// (jahrgangStichtag) — begründet ist sie dort.
//
// AB 2015 GILT NICHT MEHR DAS GESETZ, SONDERN DIE AUSSCHREIBUNG: Ab dem
// Gebotstermin 15.04.2015 wurden Freiflächen ausgeschrieben (Freiflächen-
// ausschreibungsverordnung, später § 22 EEG); ihr anzulegender Wert ist seither
// der individuelle Zuschlagswert, nicht mehr ein Satz aus dem Gesetz. Die
// Jahresmittel dieser Zuschlagswerte stehen unten in
// FREIFLAECHE_AUSSCHREIBUNG_JAHRE.

/** Freiflächensatz eines Jahrgangs (ct/kWh, Stand 1. Juli des Jahres). */
export interface FreiflaecheJahrgang {
  jahr: number;
  /** Vergütungssatz nach § 32 Abs. 1 EEG 2012 — was der Park je kWh bekommt. */
  ct: number;
}

/**
 * Freiflächen-Jahrgänge, für die ein GESETZLICHER Satz galt und belegt ist.
 *
 * Bewusst ohne Abzug einer Vermarktungsgebühr: Das ist der Vergütungssatz, den
 * der Netzbetreiber zahlte. Wer stattdessen in die Marktprämie ging, bekam
 * denselben Wert als anzulegenden Wert plus Managementprämie — die Gebühr
 * abzuziehen würde diesen Jahrgängen etwas wegnehmen, das sie hatten.
 */
export const FREIFLAECHE_HISTORIE: ReadonlyArray<FreiflaecheJahrgang> = [
  { jahr: 2012, ct: 13.1 },
  { jahr: 2013, ct: 10.44 },
  { jahr: 2014, ct: 8.92 },
];

/** Belegter Satz eines Freiflächen-Jahrgangs, sonst null (kein geratener Wert). */
export function freiflaecheHistorieCt(jahrgang: number): number | null {
  return FREIFLAECHE_HISTORIE.find((r) => r.jahr === jahrgang)?.ct ?? null;
}

// ─── Zuschlagswerte der Ausschreibungen (Jahresmittel ab 2015) ───────────────
//
// WOFÜR: Der Atlas bewertete bis 08/2026 JEDEN Freiflächen-Park ab Baujahr 2015
// mit dem HEUTIGEN Zuschlagsniveau (~4,55 ct netto). Für einen Park von 2015,
// hinter dem Zuschläge um 8,50 ct stehen, war das knapp die Hälfte. Diese Werte
// schließen die Lücke.
//
// DATENHERKUNFT: Bundesnetzagentur, "Solaranlagen des ersten Segments —
// Beendete Ausschreibungen / Statistiken", Spalte "durchschnittlicher,
// mengengewichteter Zuschlagswert" (am 17.08.2026 unter
// bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/
// Solaranlagen1/BeendeteAusschreibungen/start.html abgerufen). Jede Zeile ist
// das mit der bezuschlagten Menge gewichtete Mittel ALLER Gebotstermine des
// Jahres; die Jahresmittel wurden aus den Einzelrunden derselben Tabelle
// nachgerechnet (Beispiel 2015: 157 MW × 9,17 + 159 MW × 8,49 + 204 MW × 8,00
// ÷ 520 MW = 8,50 ct; 2018: 201 MW × 4,33 + 183 MW × 4,59 + 192 MW × 4,69
// ÷ 577 MW = 4,53 ct).
//
// ── VORBEHALTE — jeder benannt, keiner weggerechnet ─────────────────────────
//  · AUSSCHREIBUNGSPFLICHT ERST AB EINER GEWISSEN GRÖSSE: 2015/2016 ab 1 MW
//    (Freiflächenausschreibungsverordnung), ab EEG 2017 ab 750 kW. Kleinere
//    Freiflächen behalten den gesetzlichen anzulegenden Wert, der über den
//    Zuschlagswerten liegt. Diese Reihe beschreibt also den oberen — und
//    leistungsmäßig weit überwiegenden — Teil des Bestands, und sie rechnet
//    den kleinen Rest eher zu schlecht.
//  · 2015 LIEFEN ZWEI TERMINE IM EINHEITSPREISVERFAHREN (uniform pricing: alle
//    Zuschläge bekommen den höchsten noch bezuschlagten Gebotswert). Das hebt
//    das Jahresmittel 2015 strukturell an. Alle übrigen Termine sind
//    pay-as-bid.
//  · 2022 WAREN ZWEI TERMINE UNTERZEICHNET. Wo weniger geboten als
//    ausgeschrieben wird, gibt es keinen Preiswettbewerb — das Jahresmittel
//    spiegelt dort eher den Höchstwert als einen Marktpreis.
//  · ES IST DER ANZULEGENDE WERT im Marktprämienmodell, keine feste
//    Einspeisevergütung. Für die Frage "was erlöst dieser Park je kWh" ist er
//    die richtige Größe; wie beim heutigen Jahrgang zieht der Aufrufer die
//    Direktvermarktungsgebühr ab (DIREKTVERMARKTUNG.gebuehrCtKwh).
//  · REALISIERUNGSRATEN SCHWANKTEN STARK (2017/18 teils unter 50 %). Die Reihe
//    beschreibt die Zuschläge, nicht exakt die gebaute Flotte.

/** Mengengewichtetes Jahresmittel der Zuschlagswerte eines AUSSCHREIBUNGSjahres. */
export interface AusschreibungsJahr {
  /** Jahr der Gebotstermine — NICHT das Inbetriebnahmejahr (siehe Versatz). */
  jahr: number;
  /** Mengengewichtetes Mittel aller Runden des Jahres, ct/kWh. */
  ct: number;
}

export const FREIFLAECHE_AUSSCHREIBUNG_JAHRE: ReadonlyArray<AusschreibungsJahr> = [
  { jahr: 2015, ct: 8.5 },
  { jahr: 2016, ct: 7.16 },
  { jahr: 2017, ct: 5.69 },
  { jahr: 2018, ct: 4.53 },
  { jahr: 2019, ct: 5.77 },
  { jahr: 2020, ct: 5.17 },
  { jahr: 2021, ct: 5.01 },
  { jahr: 2022, ct: 5.44 },
  { jahr: 2023, ct: 6.28 },
  // 2024: 2.233,87 MW × 5,11 + 2.152,29 MW × 5,05 + 2.149,71 MW × 4,76
  //       ÷ 6.535,87 MW = 4,975 ct.
  { jahr: 2024, ct: 4.98 },
  // 2025 (am 18.08.2026 aus derselben BNetzA-Tabelle ergänzt): alle drei
  // Gebotstermine des Jahres sind beendet und veröffentlicht —
  //       2.638,39 MW × 4,66 + 2.271,48 MW × 4,84 + 2.340,77 MW × 5,00
  //       ÷ 7.250,64 MW = 4,826 ct.
  // Gewichtet ist mit der BEZUSCHLAGTEN Menge; mit der ausgeschriebenen kommt
  // derselbe Wert heraus (4,826), weil alle drei Runden überzeichnet waren.
  // Realitäts-Anker für Quelle UND Rechenweg: Dieselbe Rechnung reproduziert
  // die schon vorher belegte Zeile 2024 zellgleich (4,975 → 4,98).
  { jahr: 2025, ct: 4.83 },
];

/**
 * Der Versatz zwischen Zuschlag und Inbetriebnahme, in Jahren.
 *
 * § 37e EEG: Der Zuschlag erlischt, soweit die Anlage nicht binnen 24 Monaten
 * nach der Bekanntgabe in Betrieb genommen ist. Die Frist wird in der Praxis
 * überwiegend ausgereizt — Flächensicherung, Genehmigung, Netzanschluss und
 * Modulbeschaffung brauchen die Zeit. Der Atlas ordnet aber nach
 * INBETRIEBNAHMEJAHR, nicht nach Zuschlagsjahr.
 *
 * Deshalb bekommt der Inbetriebnahme-Jahrgang X das Mittel der
 * Ausschreibungsjahre X−2 und X−1: die beiden Jahrgänge an Zuschlägen, aus
 * denen ein in X ans Netz gegangener Park stammen kann.
 *
 * DIE REGEL GILT FÜR JEDEN JAHRGANG AB 2015 — auch für den laufenden und die
 * künftigen. Bis 08/2026 galt sie nur bis 2024, danach rechnete das heutige
 * Ausschreibungsniveau (die Runden der letzten zwölf Monate). Das waren zwei
 * Regeln nebeneinander, und die Reihe brach an der Nahtstelle um 18 % nach
 * unten, ohne dass sich in der Sache etwas geändert hätte: Ein Park, der 2025
 * ans Netz ging, hängt an Zuschlägen von 2023/2024 — genau wie einer von 2024
 * an 2022/2023 hängt. Was heute zugeschlagen wird, steht hinter einem Park, der
 * 2028 ans Netz geht, nicht hinter einem von 2025.
 *
 * Der Wortlaut ist am 18.08.2026 auf gesetze-im-internet.de/eeg_2014/__37e.html
 * nachgelesen: Die 24-Monats-Frist gilt unverändert, auch für die jüngsten
 * Jahrgänge (dazu 26 Monate für den Antrag auf Zahlungsberechtigung — eine
 * materielle Ausschlussfrist, die die Realisierung noch weiter nach hinten
 * schieben kann, nicht nach vorn).
 *
 * DAS IST EINE BELEGT BEGRÜNDETE NÄHERUNG, KEINE GEMESSENE ZUORDNUNG. Wie sich
 * die Inbetriebnahmezeitpunkte innerhalb der 24 Monate verteilen, veröffentlicht
 * die Bundesnetzagentur nicht — sie weist Zuschläge je Gebotstermin aus, nicht
 * Inbetriebnahmen je Zuschlagsjahrgang. Die verbleibende Unschärfe ist die
 * Differenz zweier benachbarter Ausschreibungsjahre; in den ruhigen Jahren sind
 * das Zehntelcent, im Absturz 2016→2018 rund 1,5 ct.
 */
export const FREIFLAECHE_VERSATZ_JAHRE = 2;

/** Erster Inbetriebnahme-Jahrgang, der aus einer Ausschreibung stammen kann. */
export const FREIFLAECHE_ZUSCHLAG_AB = 2015;

/** Jüngstes Ausschreibungsjahr, das vollständig belegt ist (alle Gebotstermine). */
export const FREIFLAECHE_AUSSCHREIBUNG_LETZTES_JAHR =
  FREIFLAECHE_AUSSCHREIBUNG_JAHRE[FREIFLAECHE_AUSSCHREIBUNG_JAHRE.length - 1].jahr;

/**
 * Letzter Jahrgang, für den BEIDE Vorjahre der Regel belegt sind (X−1 und X−2).
 *
 * KEINE Abbruchkante mehr: Jüngere Jahrgänge bekommen weiterhin einen
 * Zuschlagswert, nur eben aus dem Randjahr (siehe freiflaecheZuschlagCt). Die
 * Zahl sagt bloß, ab wann die Reihe auf dem Rand steht statt auf zwei belegten
 * Jahren — abgeleitet, nicht getippt, damit sie beim Ergänzen eines
 * Ausschreibungsjahres von selbst nachrückt.
 */
export const FREIFLAECHE_ZUSCHLAG_BIS = FREIFLAECHE_AUSSCHREIBUNG_LETZTES_JAHR + 1;

/** Woraus der Zuschlagswert eines Jahrgangs gemittelt wurde. */
export interface ZuschlagHerkunft {
  /** Mittel der Ausschreibungsjahre in ct/kWh, brutto. */
  ct: number;
  /** Die Ausschreibungsjahre, aus denen gemittelt wurde (aufsteigend). */
  jahre: number[];
  /** true, wenn beide gesuchten Jahre (X−2, X−1) belegt sind — sonst Randjahr. */
  vollstaendig: boolean;
}

/**
 * Anzulegender Wert eines Freiflächen-Jahrgangs ab 2015 in ct/kWh (brutto, ohne
 * Abzug der Vermarktungsgebühr) samt Herkunft — vor 2015 null (dort galt das
 * Gesetz, siehe FREIFLAECHE_HISTORIE).
 *
 * EINE Regel, an beiden Rändern dieselbe: Gesucht sind die Ausschreibungsjahre
 * X−2 und X−1; liegt eines davon außerhalb der belegten Reihe, wird auf deren
 * Randjahr zurückgegriffen. Nichts wird fortgeschrieben, geschätzt oder aus
 * einem anderen Niveau geliehen.
 *
 * · UNTERER RAND (Jahrgänge 2015/2016): Vor 2015 gab es keine Ausschreibung, und
 *   ein Park, der 2015 ans Netz ging, lief noch überwiegend unter dem
 *   gesetzlichen Satz. Ein belegter gesetzlicher Freiflächensatz für 2015 liegt
 *   im Projekt nicht vor; das Zuschlagsmittel 2015 (8,50 ct) liegt unter dem
 *   letzten belegten gesetzlichen Satz (8,92 ct zum 01.07.2014), den die
 *   Degression weiter fallend fortschreibt — der Rückgriff schließt also an die
 *   Historie an und irrt nach unten, nicht nach oben.
 * · OBERER RAND (Jahrgänge ab FREIFLAECHE_ZUSCHLAG_BIS + 1): Ein Ausschreibungs-
 *   jahr kommt erst in die Reihe, wenn ALLE seine Gebotstermine beendet und
 *   veröffentlicht sind. Bis dahin bekommt ein noch jüngerer Jahrgang das
 *   jüngste vollständige Jahr — das ist die letzte belegte Tatsache, während
 *   ein Mittel aus einem halben Jahr eine erfundene Zahl wäre. Für die Spalte
 *   ist das folgenlos, solange keine Anlage mit diesem Baujahr im Register
 *   steht; sobald das Jahr komplett ist, rückt die Reihe von selbst nach.
 */
export function freiflaecheZuschlagHerkunft(jahrgang: number): ZuschlagHerkunft | null {
  if (jahrgang < FREIFLAECHE_ZUSCHLAG_AB) return null;
  const erstesJahr = FREIFLAECHE_AUSSCHREIBUNG_JAHRE[0].jahr;
  const letztesJahr = FREIFLAECHE_AUSSCHREIBUNG_LETZTES_JAHR;

  const gesucht = [jahrgang - FREIFLAECHE_VERSATZ_JAHRE, jahrgang - 1];
  const jahre = Array.from(
    new Set(gesucht.map((j) => Math.min(Math.max(j, erstesJahr), letztesJahr))),
  ).sort((a, b) => a - b);

  const werte = jahre
    .map((j) => FREIFLAECHE_AUSSCHREIBUNG_JAHRE.find((r) => r.jahr === j)?.ct)
    .filter((ct): ct is number => ct != null);
  if (werte.length === 0) return null;

  return {
    ct: werte.reduce((s, c) => s + c, 0) / werte.length,
    jahre,
    vollstaendig: gesucht.every((j) => j >= erstesJahr && j <= letztesJahr),
  };
}

/** Nur der Wert — für Aufrufer, die die Herkunft nicht brauchen. */
export function freiflaecheZuschlagCt(jahrgang: number): number | null {
  return freiflaecheZuschlagHerkunft(jahrgang)?.ct ?? null;
}
