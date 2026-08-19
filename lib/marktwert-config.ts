// ─── Marktwert Solar: was eine eingespeiste Kilowattstunde an der Börse bringt ──
//
// WOFÜR: Der Entwurf zum EEG 2027 ersetzt die feste Einspeisevergütung für
// Neuanlagen durch die Direktvermarktung (lib/eeg-reform-config.ts). Wer diesen
// Fall rechnen will, braucht eine Antwort auf "was bekomme ich dann pro
// eingespeister Kilowattstunde?" — und die ist NICHT der durchschnittliche
// Börsenpreis. Solarstrom fällt an, wenn viel Solarstrom anfällt, also wenn der
// Preis am niedrigsten ist. Wer den Überschuss mit dem Jahresmittel der Börse
// bewertet, rechnet die Erlöse deutlich zu hoch.
//
// Die richtige Größe heißt Marktwert Solar: der erzeugungsgewichtete
// Börsenpreis, den die Übertragungsnetzbetreiber monatlich und jährlich
// veröffentlichen (§ 23b i. V. m. Anlage 1 EEG).
//
// ── Die amtlichen Jahreswerte ───────────────────────────────────────────────
// 2024: 4,624 ct/kWh · 2025: 4,508 ct/kWh (Übertragungsnetzbetreiber, publiziert
// über netztransparenz.de; die Werte-Übersicht dort steht hinter einem Login,
// referiert am 01.08.2026 über die Deutsche Gesellschaft für Sonnenenergie,
// "Der Jahresmarktwert Solar 2025", die netztransparenz.de als Quelle nennt).
//
// ── REALITÄTS-ANKER (Wächter-Gate: jede gepflegte Zahl braucht einen) ───────
// Weil die amtliche Übersicht nicht frei abrufbar ist, wurde der Wert am
// 01.08.2026 unabhängig nachgerechnet — aus den beiden öffentlichen Zeitreihen,
// die ihn definieren (Energy-Charts / Fraunhofer ISE: deutsche Solarerzeugung in
// 15-Minuten-Auflösung und Day-Ahead-Preis der Gebotszone DE-LU):
//
//     Marktwert Solar = Σ(Erzeugung × Preis) / Σ(Erzeugung)
//
//   2024: selbst gerechnet 4,603 ct/kWh  vs. amtlich 4,624 ct/kWh  (−0,5 %)
//   2025: selbst gerechnet 4,610 ct/kWh  vs. amtlich 4,508 ct/kWh  (+2,3 %)
//
// Die Restabweichung ist erwartbar: die Netzbetreiber rechnen auf dem
// EEG-relevanten Anlagenbestand ab, unsere Rechnung auf der gesamten deutschen
// Solarerzeugung. Die Methode ist damit belegt — und sie ist der Weg, den Wert
// künftig ohne Login fortzuschreiben (scripts/marktwert-verify.md).
//
// Nebenbefund aus derselben Rechnung, der in die Modellierung eingeht:
// 2025 fielen 24,2 % der deutschen Solarerzeugung in Stunden mit NEGATIVEM
// Börsenpreis (2024: 18,6 %). Im April/Mai/Juni 2025 war es rund jede zweite
// Kilowattstunde. Das ist kein Ausreißer, sondern die heutige Marktstruktur —
// und die Struktur, in die eine Neuanlage hineinverkaufen müsste, falls der
// Entwurf zum EEG 2027 Gesetz wird.

/** Ein amtlich veröffentlichter Jahresmarktwert Solar. */
export interface MarktwertJahr {
  jahr: number;
  /** ct/kWh, erzeugungsgewichtet, wie veröffentlicht (negative Stunden zählen negativ). */
  ctKwh: number;
  /** Unabhängig nachgerechneter Vergleichswert, siehe Kopfkommentar. */
  nachgerechnetCtKwh: number;
}

export const MARKTWERT_SOLAR_HISTORIE: ReadonlyArray<MarktwertJahr> = [
  { jahr: 2024, ctKwh: 4.624, nachgerechnetCtKwh: 4.603 },
  { jahr: 2025, ctKwh: 4.508, nachgerechnetCtKwh: 4.610 },
];

/**
 * Das Niveau, mit dem wir rechnen — und warum es NICHT der amtliche Wert ist.
 *
 * Der veröffentlichte Marktwert Solar zählt negative Stunden negativ mit. Ein
 * Haushalt in der Direktvermarktung bekommt in diesen Stunden aber schlicht
 * nichts; der Vermarkter stellt ihm keine Rechnung. Für den Erlös eines
 * Haushalts ist deshalb der bei null gekappte Wert die richtige Größe:
 *
 *     Σ(Erzeugung × max(Preis, 0)) / Σ(Erzeugung)
 *
 * Über 2024–2025 gerechnet: 4,93 ct/kWh (gekappt) gegenüber 4,61 ct/kWh (roh).
 * Die Kappung wirkt zu unseren Ungunsten in der Darstellung — sie macht die
 * Marktvariante etwas besser — deshalb steht sie hier ausdrücklich und ist im
 * Ergebnis editierbar.
 *
 * Der Entwurf würde das noch verschärfen: § 51 EEG 2027 setzt den
 * Zahlungsanspruch bei negativen Preisen auf null, und § 50c Abs. 6 erklärt das
 * auch für den Direktvermarktungsbonus für anwendbar. Die Kappung wäre damit
 * nicht mehr nur Vertragspraxis — vorausgesetzt, der Entwurf wird Gesetz. Heute
 * ist sie ausschließlich Vertragspraxis.
 */
export const MARKTWERT_NIVEAU_CT = 4.93;

/** Datenstand dieser Werte (ISO) — sichtbar auf /datenstand. */
export const MARKTWERT_VALID_FROM = "2026-08-01";

/** Nächste fällige Prüfung: der Jahreswert erscheint im Januar. */
export const MARKTWERT_REVIEW_BY = "2027-02-01";

export const MARKTWERT_QUELLE =
  "Übertragungsnetzbetreiber (netztransparenz.de); nachgerechnet aus Energy-Charts (Fraunhofer ISE)";

// ─── Preisform über Monat × Stunde ──────────────────────────────────────────
//
// WARUM EINE FORM UND NICHT EIN PAUSCHALWERT: Der Marktwert Solar beschreibt den
// deutschen Anlagenbestand. Ein einzelner Haushalt speist ein ANDERES Profil ein
// als das Land: Sein Eigenverbrauch frisst den Morgen und den Abend weg, übrig
// bleibt die Mittagsspitze — also genau die Stunden mit den niedrigsten Preisen.
// Ein Haushalt bekommt für seinen Überschuss deshalb WENIGER als den Marktwert
// Solar. Umgekehrt hebt ein Speicher den Erlös, weil er Einspeisung aus dem
// Mittagstal in den Abend schiebt. Beides fällt nur an, wenn man das eigene
// Einspeiseprofil mit der Preisform gewichtet — mit einem Pauschalwert ist der
// Speicher an dieser Stelle wirkungslos.
//
// ABLEITUNG: mittlerer Day-Ahead-Preis je Monat und Stunde (deutsche Ortszeit),
// negative Stunden als null gezählt, über 2024–2025 gemittelt und so normiert,
// dass eine Gewichtung mit dem deutschen Solarprofil genau 1,0 ergibt. Ein Wert
// von 0,40 heißt also: In dieser Stunde bringt eine Kilowattstunde 40 % dessen,
// was eine durchschnittliche deutsche Solar-Kilowattstunde bringt.
//
// Zwei Jahre, weil ein einzelnes Jahr wetterabhängig verzerrt; mehr Jahre wären
// schlechter, nicht besser — die Preisform kippt gerade schnell (der Mittagstrog
// vertieft sich mit jedem Zubaujahr), ältere Jahre beschreiben eine Struktur,
// die es nicht mehr gibt.
//
// DIE NORMIERUNG IST DER HEIKLE TEIL — hier lag der erste Versuch daneben.
// Zunächst wurde die geglättete Preisform durch den ECHTEN, viertelstündlich
// erzeugungsgewichteten Marktwert Solar geteilt. Das sind zwei verschiedene
// Basen: Die Mittelung über den Monat löscht den Zusammenhang "besonders
// sonniger Tag ⇒ besonders tiefer Preis", der echte Marktwert enthält ihn. Der
// Nenner war dadurch um 5,4 % zu niedrig, und ein normaler Haushalt bekam einen
// Profilfaktor von 1,09 — also die Aussage, ein Einfamilienhaus verkaufe seinen
// Überschuss besser als der gesamte deutsche Anlagenbestand. Das ist die falsche
// Richtung, und es wäre niemandem aufgefallen: Die Zahl sieht plausibel aus.
// Gefunden hat es der Test, der genau diese Richtung prüft.
//
// Richtig ist deshalb die Arbeitsteilung: Die FORM trägt ausschließlich den
// relativen Profilunterschied, das NIVEAU kommt aus dem amtlichen Jahreswert
// (MARKTWERT_NIVEAU_CT). Der Nenner wird darum mit derselben Glättung gebildet
// wie der Zähler — nationales Solarprofil auf Monat × Stunde gemittelt, mit
// derselben gemittelten Preisform bewertet. Gegenprobe beim Erzeugen: Wer
// einspeist wie Deutschland erzeugt, bekommt exakt 1,0000.
//
// Grenze der Methode, bewusst in Kauf genommen: Die Mittelung über den Monat
// glättet die Extreme. Ein einzelner sonniger Maitag mit sechs negativen Stunden
// ist im Mittelwert nur noch eine Delle. Die Form bildet die SYSTEMATIK ab
// (wann ist es teuer, wann billig), nicht die Streuung. Für den Vergleich zweier
// Einspeiseprofile reicht das; als absolute Preisaussage taugt sie nicht,
// deshalb steht das Niveau daneben.
export const PREISFORM_MONAT_STUNDE: ReadonlyArray<ReadonlyArray<number>> = [
  // Jan
  [1.42, 1.33, 1.26, 1.21, 1.22, 1.30, 1.52, 1.85, 2.15, 1.99, 1.82, 1.71, 1.62, 1.60, 1.67, 1.87, 2.08, 2.35, 2.28, 2.08, 1.84, 1.68, 1.61, 1.44],
  // Feb
  [1.57, 1.49, 1.45, 1.42, 1.45, 1.52, 1.77, 2.13, 2.31, 2.04, 1.81, 1.67, 1.56, 1.53, 1.62, 1.80, 2.02, 2.34, 2.46, 2.28, 2.04, 1.86, 1.79, 1.64],
  // Mär
  [1.53, 1.44, 1.42, 1.39, 1.41, 1.52, 1.80, 1.94, 1.77, 1.43, 1.12, 0.91, 0.80, 0.73, 0.85, 1.17, 1.56, 2.06, 2.55, 2.46, 2.08, 1.81, 1.70, 1.56],
  // Apr
  [1.46, 1.36, 1.31, 1.30, 1.34, 1.47, 1.79, 2.08, 1.81, 1.37, 1.00, 0.76, 0.58, 0.47, 0.46, 0.57, 0.76, 1.21, 1.81, 2.38, 2.46, 1.97, 1.72, 1.52],
  // Mai
  [1.61, 1.49, 1.44, 1.42, 1.45, 1.56, 1.80, 1.83, 1.53, 1.03, 0.62, 0.46, 0.38, 0.34, 0.36, 0.41, 0.57, 1.06, 1.68, 2.21, 2.60, 2.27, 1.92, 1.66],
  // Jun
  [1.68, 1.54, 1.46, 1.42, 1.42, 1.50, 1.75, 1.76, 1.46, 1.01, 0.66, 0.48, 0.37, 0.30, 0.28, 0.35, 0.52, 0.97, 1.54, 2.14, 2.73, 2.61, 2.19, 1.82],
  // Jul
  [1.77, 1.61, 1.53, 1.50, 1.51, 1.59, 1.87, 1.92, 1.76, 1.41, 1.11, 0.90, 0.72, 0.59, 0.54, 0.66, 0.94, 1.33, 1.70, 2.19, 2.81, 2.60, 2.18, 1.86],
  // Aug
  [1.80, 1.69, 1.61, 1.58, 1.61, 1.76, 2.02, 2.06, 1.80, 1.39, 1.00, 0.71, 0.53, 0.41, 0.43, 0.60, 0.86, 1.35, 1.93, 2.68, 2.98, 2.40, 2.07, 1.86],
  // Sep
  [1.45, 1.37, 1.32, 1.32, 1.36, 1.51, 1.86, 2.27, 2.08, 1.61, 1.16, 0.82, 0.63, 0.55, 0.59, 0.73, 1.09, 1.72, 2.53, 3.47, 2.70, 1.98, 1.75, 1.53],
  // Okt
  [1.33, 1.24, 1.17, 1.17, 1.18, 1.29, 1.64, 2.14, 2.22, 1.84, 1.54, 1.34, 1.18, 1.12, 1.22, 1.45, 1.70, 2.18, 2.81, 2.84, 2.05, 1.70, 1.59, 1.39],
  // Nov
  [1.58, 1.49, 1.43, 1.41, 1.43, 1.52, 1.75, 2.19, 2.30, 2.10, 1.92, 1.84, 1.81, 1.88, 2.04, 2.36, 2.69, 2.96, 2.72, 2.40, 2.07, 1.89, 1.82, 1.64],
  // Dez
  [1.48, 1.40, 1.35, 1.32, 1.33, 1.42, 1.61, 1.95, 2.19, 2.15, 1.99, 1.91, 1.87, 1.92, 2.07, 2.28, 2.40, 2.43, 2.26, 2.10, 1.91, 1.75, 1.71, 1.52],
];

/**
 * Das nationale Solarprofil über Monat × Stunde, als Anteil der Jahreserzeugung
 * (Summe = 1). Aus derselben Energy-Charts-Reihe wie die Preisform, 2024–2025.
 *
 * Wozu: Damit lässt sich die Normierung der Preisform jederzeit nachprüfen —
 * dieses Profil mit PREISFORM_MONAT_STUNDE gewichtet muss 1,0 ergeben. Genau
 * diese Gegenprobe hätte den ersten, falsch normierten Stand sofort auffliegen
 * lassen; sie steht deshalb als Test im Repo und nicht nur im Skript, das die
 * Zahlen erzeugt hat.
 */
export const SOLARPROFIL_MONAT_STUNDE: ReadonlyArray<ReadonlyArray<number>> = [
  // Jan
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00027, 0.00147, 0.00302, 0.00419, 0.00460, 0.00422, 0.00309, 0.00147, 0.00023, 0.00001, 0.00001, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000],
  // Feb
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00012, 0.00116, 0.00308, 0.00501, 0.00638, 0.00687, 0.00648, 0.00528, 0.00337, 0.00129, 0.00013, 0.00001, 0.00001, 0.00000, 0.00000, 0.00000, 0.00000],
  // Mär
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00015, 0.00163, 0.00465, 0.00789, 0.01036, 0.01179, 0.01218, 0.01164, 0.01022, 0.00777, 0.00450, 0.00146, 0.00017, 0.00002, 0.00001, 0.00000, 0.00000, 0.00000],
  // Apr
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00018, 0.00161, 0.00467, 0.00825, 0.01130, 0.01325, 0.01405, 0.01399, 0.01329, 0.01185, 0.00961, 0.00656, 0.00317, 0.00078, 0.00004, 0.00001, 0.00000, 0.00000],
  // Mai
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00009, 0.00103, 0.00358, 0.00734, 0.01111, 0.01386, 0.01528, 0.01578, 0.01556, 0.01470, 0.01331, 0.01123, 0.00834, 0.00486, 0.00192, 0.00038, 0.00002, 0.00000, 0.00000],
  // Jun
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00001, 0.00024, 0.00144, 0.00395, 0.00736, 0.01070, 0.01320, 0.01468, 0.01532, 0.01530, 0.01471, 0.01345, 0.01151, 0.00889, 0.00567, 0.00271, 0.00086, 0.00008, 0.00000, 0.00000],
  // Jul
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00010, 0.00099, 0.00318, 0.00637, 0.00966, 0.01229, 0.01390, 0.01470, 0.01483, 0.01433, 0.01314, 0.01119, 0.00853, 0.00537, 0.00250, 0.00070, 0.00005, 0.00000, 0.00000],
  // Aug
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00001, 0.00035, 0.00220, 0.00561, 0.00953, 0.01283, 0.01508, 0.01621, 0.01635, 0.01575, 0.01428, 0.01182, 0.00842, 0.00453, 0.00147, 0.00018, 0.00001, 0.00000, 0.00000],
  // Sep
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00003, 0.00075, 0.00323, 0.00659, 0.00967, 0.01179, 0.01276, 0.01274, 0.01190, 0.01025, 0.00773, 0.00451, 0.00154, 0.00018, 0.00002, 0.00001, 0.00000, 0.00000],
  // Okt
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00001, 0.00001, 0.00013, 0.00134, 0.00369, 0.00619, 0.00801, 0.00878, 0.00850, 0.00741, 0.00558, 0.00325, 0.00115, 0.00012, 0.00002, 0.00001, 0.00001, 0.00000, 0.00000],
  // Nov
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00001, 0.00011, 0.00106, 0.00280, 0.00446, 0.00544, 0.00549, 0.00464, 0.00303, 0.00120, 0.00013, 0.00002, 0.00001, 0.00001, 0.00001, 0.00001, 0.00000, 0.00000],
  // Dez
  [0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00000, 0.00001, 0.00026, 0.00149, 0.00304, 0.00413, 0.00433, 0.00361, 0.00221, 0.00069, 0.00003, 0.00001, 0.00001, 0.00001, 0.00000, 0.00000, 0.00000, 0.00000],
];

// ─── Kosten der Direktvermarktung ───────────────────────────────────────────
//
// Wer nicht mehr die feste Vergütung bekommt, braucht einen Dienstleister, der
// den Strom an der Börse verkauft. Für Kleinanlagen entsteht dieser Markt gerade
// erst; die Angebote liegen (Stand 08/2026) bei rund 3–10 € im Monat Grundgebühr
// plus 0,2–0,4 ct/kWh, teils mit einmaliger Einrichtungsgebühr. Wir rechnen mit
// der Mitte dieser Spanne und machen beides im Ergebnis editierbar.
//
// OFFEN (bis 03/2027): Sobald es Angebote gibt, die auf die neue Rechtslage
// zugeschnitten sind, gehören echte Tarife hierher statt einer Marktspanne.
// Der Preis-Wächter beobachtet das (scripts/marktwert-verify.md).
export const DIREKTVERMARKTUNG = {
  /** Grundgebühr in Euro pro Jahr (Mitte der Marktspanne 3–10 €/Monat). */
  grundgebuehrProJahr: 78,
  /** Mengenabhängige Gebühr in ct je eingespeister kWh. */
  gebuehrCtKwh: 0.3,
  spanneGrundgebuehrProJahr: [36, 120] as const,
  spanneGebuehrCtKwh: [0.2, 0.4] as const,
  quelle: "Marktübersicht Direktvermarktungsangebote für Kleinanlagen, Stand 08/2026",
} as const;

/**
 * Erlöspfad über die Laufzeit — eine ANNAHME, keine Prognose.
 *
 * Der Marktwert Solar ist von 8,0 ct (2023) über 4,62 ct (2024) auf 4,51 ct
 * (2025) gefallen. Wohin er über 25 Jahre läuft, weiß niemand: Mehr Photovoltaik
 * drückt ihn weiter (der Mittagstrog vertieft sich), mehr Speicher, Wärmepumpen
 * und flexible Verbraucher heben ihn wieder. Beide Kräfte sind real und beide
 * sind groß.
 *
 * Deshalb: Grundannahme ist ein NOMINAL konstanter Marktwert. Das ist bewusst
 * die zurückhaltende Wahl — der Strompreis, gegen den der Eigenverbrauch
 * gerechnet wird, steigt im Modell mit 2 % pro Jahr (SCENARIOS, realistisch),
 * der Markterlös nicht. Real
 * verliert die Markteinspeisung also über die Laufzeit an Wert.
 *
 * Der Markterlös hängt ausdrücklich NICHT am Strompreispfad: Für Solarstrom sind
 * Börsen- und Endkundenpreis entkoppelt, genau deshalb fällt der Marktwert,
 * während der Strompreis steigt. Ihn mitwachsen zu lassen, wäre der bequeme
 * Fehler.
 *
 * Die drei Werte korrespondieren mit den drei Szenarien der Amortisationskurve
 * (SCENARIOS in lib/constants.ts) und spannen die sichtbare Bandbreite auf.
 */
export const MARKTWERT_PFAD = {
  /** Weiterer Zubau ohne Flexibilität: der Mittagstrog vertieft sich. */
  pessimistisch: -0.01,
  /** Nominal konstant — die Grundannahme. */
  mittel: 0,
  /** Speicher, Wärmepumpen und flexible Lasten heben den Mittagspreis. */
  optimistisch: 0.01,
} as const;

/** Marktwert-Niveau im Jahr i (0 = heute), ct/kWh. */
export function marktwertImJahr(i: number, niveauCt = MARKTWERT_NIVEAU_CT, pfad: number = MARKTWERT_PFAD.mittel): number {
  return niveauCt * Math.pow(1 + pfad, i);
}
