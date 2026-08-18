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

// ─── Zuschlagswerte der Ausschreibungen (Jahrgänge 2015–2024) ────────────────
//
// WOFÜR: Der Atlas bewertete bis 08/2026 JEDEN Freiflächen-Park der Baujahre
// 2015 bis 2024 mit dem HEUTIGEN Zuschlagsniveau (~4,55 ct netto). Für einen
// Park von 2015, hinter dem Zuschläge um 8,50 ct stehen, war das knapp die
// Hälfte. Diese Werte schließen die Lücke.
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
  { jahr: 2024, ct: 4.98 },
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

/** Letzter Jahrgang dieser Reihe — ab 2025 rechnet das heutige Niveau (FREIFLAECHE_AW_CT). */
export const FREIFLAECHE_ZUSCHLAG_BIS = 2024;

/**
 * Anzulegender Wert eines Freiflächen-Jahrgangs 2015–2024 in ct/kWh (brutto,
 * ohne Abzug der Vermarktungsgebühr) — sonst null.
 *
 * Die Randjahrgänge 2015 und 2016 greifen auf das erste Ausschreibungsjahr
 * zurück: Vor 2015 gab es keine Ausschreibung, und ein Park, der 2015 ans Netz
 * ging, lief noch überwiegend unter dem gesetzlichen Satz. Ein belegter
 * gesetzlicher Freiflächensatz für 2015 liegt im Projekt nicht vor; das
 * Zuschlagsmittel 2015 (8,50 ct) liegt unter dem letzten belegten gesetzlichen
 * Satz (8,92 ct zum 01.07.2014, FREIFLAECHE_HISTORIE), den die Degression
 * weiter fallend fortschreibt — der Rückgriff schließt also an die Historie an
 * und irrt nach unten, nicht nach oben.
 */
export function freiflaecheZuschlagCt(jahrgang: number): number | null {
  if (jahrgang < FREIFLAECHE_ZUSCHLAG_AB || jahrgang > FREIFLAECHE_ZUSCHLAG_BIS) return null;
  const erstesJahr = FREIFLAECHE_AUSSCHREIBUNG_JAHRE[0].jahr;
  const werte = [jahrgang - FREIFLAECHE_VERSATZ_JAHRE, jahrgang - 1]
    .map((j) => Math.max(j, erstesJahr))
    .map((j) => FREIFLAECHE_AUSSCHREIBUNG_JAHRE.find((r) => r.jahr === j)?.ct)
    .filter((ct): ct is number => ct != null);
  if (werte.length === 0) return null;
  return werte.reduce((s, c) => s + c, 0) / werte.length;
}
