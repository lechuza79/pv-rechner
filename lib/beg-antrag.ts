// Reihenfolge und Fristen der BEG-Antragstellung (KfW-Zuschuss 458).
//
// **Warum als eigenes Modul und nicht als Absatz im Ratgeber:** Dieselbe Auskunft
// wird an mehreren Oberflächen gebraucht — im Ratgeber ausführlich, im
// Wärmepumpen-Rechner und im Förder-Check als Kurzhinweis, und die
// Geräteempfehlung will darauf verweisen. Handgetippt stünde derselbe Satz dann
// vier Mal da, und eine Korrektur erreichte still nur eine davon (dieselbe
// Systematik wie `BIO_TREPPE_STUFEN` und `EEG_REFORM_STAND`: Stufen, Fristen und
// Verfahrensstände kommen aus EINER Quelle im Code).
//
// **Der teuerste Satz der ganzen Förderseite steht hier**, deshalb ist die
// Formulierung präziser, als sie sich anfühlt:
//
//   Ausgeschlossen ist die Förderung durch einen Vorhabenbeginn **vor
//   ANTRAGSTELLUNG** — nicht vor der Zusage.
//
// Die verbreitete Kurzfassung „nichts kaufen, bevor die KfW bewilligt hat" ist
// als Warnung gut gemeint und als Regel falsch: Nummer 9.2.1 der BEG-EM-
// Richtlinie sagt ausdrücklich, dass der Vorhabenbeginn vor der Förderzusage
// **zulässig** ist — er erfolgt nur auf eigenes Risiko und begründet keinen
// Rechtsanspruch. Wer die schärfere Fassung schreibt, behauptet einen
// Förderausschluss, den es nicht gibt.
//
// **Warum die Richtlinie hier und nicht das Merkblatt zählt:** Das Merkblatt
// nennt in Schritt 4 nur den Start NACH der Zusage und schweigt zum früheren.
// Nummer 9.1 der Richtlinie löst das selbst auf: „Widersprechen sich die
// Programminformationen und die vorliegende Förderrichtlinie, hat letztere
// Vorrang." Das Merkblatt ist eine solche Programminformation. Gefunden vom
// zweiten Legal-Judge am 25.08.2026, nachdem der erste die fehlende Zuschreibung
// beanstandet hatte — die Quelle beantwortet die Frage, statt sie offen zu lassen.
//
// Die Gegenrichtung ist genauso teuer:
// Planungs- und Beratungsleistungen dürfen ausdrücklich VOR der Antragstellung
// erbracht werden und sind für sich genommen kein Vorhabenbeginn — sonst traute
// sich niemand, vor dem Antrag mit einem Fachbetrieb zu sprechen, obwohl genau
// das der erste Schritt ist.
//
// Quellen, beide am 25.08.2026 im Volltext im Repo gelesen:
//   docs/quellen/KfW-Merkblatt-458_BEG-Heizungsfoerderung_2026-07.pdf
//     — S. 3 „In 6 Schritten zum Zuschuss", S. 5 „Eigenleistungen",
//       S. 6 „Antragstellung" / „Vorhabenbeginn", S. 7 „Bewilligungszeitraum",
//       S. 11 „Rechtsanspruch"
//   docs/quellen/BEG-EM-Richtlinie_2026-07-17.pdf
//     — Nr. 9.2.1 (Antragstellung Investitionszuschüsse), Nr. 9.4.1
//       (Bewilligungszeitraum), Nr. 9.5.1 (Verwendungsnachweis)

/** Stand der hier abgebildeten Verfahrensregeln. */
export const BEG_ANTRAG_STAND = {
  /** Fassung der Leitquelle (KfW-Merkblatt 458). */
  validFrom: "2026-07-21",
  /** Tag, an dem beide Quellen zuletzt im Volltext gegengelesen wurden. */
  geprueftIso: "2026-08-25",
  quelle:
    "KfW-Merkblatt 458 „BEG Heizungsförderung für Privatpersonen – Wohngebäude“ (gültig ab 21.07.2026) und Richtlinie für die Bundesförderung für effiziente Gebäude – Einzelmaßnahmen (BEG EM) vom 17.07.2026",
} as const;

/**
 * Der Anker des ausführlichen Abschnitts im Ratgeber.
 *
 * Steht hier und nicht in der Seite, damit verweisende Stellen (Rechner,
 * Förder-Check, Geräteempfehlung) ihn importieren statt ihn abzutippen — ein
 * abgetippter Anker bricht stumm, wenn die Überschrift umbenannt wird.
 */
export const BEG_ANTRAG_ANKER = "antrag-reihenfolge";
export const BEG_ANTRAG_HREF = `/ratgeber/waermepumpe-foerderung#${BEG_ANTRAG_ANKER}`;

export interface BegAntragSchritt {
  /** Kurzform für die Überschrift der Stufe. */
  titel: string;
  /** Was in diesem Schritt zu tun ist — beschreibend, keine Handlungsempfehlung. */
  text: string;
}

/**
 * Die sechs Schritte. Der SCHNITT ist der des Merkblatts (S. 3, „In 6 Schritten
 * zum Zuschuss"), die Formulierung unsere — Schritt 6 heißt dort „Zuschuss
 * erhalten", was sich liest, als käme das Geld von selbst; im Text darunter
 * steht, dass die Auszahlung eigens zu beantragen ist. Wir schreiben, was zu tun
 * ist, nicht was am Ende passiert.
 *
 * Bewusst SECHS und nicht fünf: Nach dem Einbau ist der Zuschuss noch nicht da.
 * Er muss mit der „Bestätigung nach Durchführung" eigens zur Auszahlung
 * angemeldet werden, und diese Nachweise haben eine Frist (siehe
 * `BEG_ANTRAG_FRISTEN`). Eine Anleitung, die beim Einbau endet, lässt den Leser
 * genau vor dem zweiten Weg stehen, auf dem das Geld verloren geht.
 */
export const BEG_ANTRAG_SCHRITTE: readonly BegAntragSchritt[] = [
  {
    titel: "Bestätigung zum Antrag holen",
    text:
      "Ein Fachunternehmen oder eine Energieeffizienz-Expertin stellt die „Bestätigung zum Antrag“ (BzA) aus. Darin stehen die geplante Heizung und die geplanten förderfähigen Gesamtkosten, dazu die Bestätigung, dass die technischen Mindestanforderungen eingehalten werden. Ohne diese Bestätigung lässt sich der Antrag nicht stellen.",
  },
  {
    titel: "Vertrag mit Bedingung abschließen",
    text:
      // Variantenneutral formuliert: Zugelassen sind eine aufschiebende UND eine
      // auflösende Bedingung, und die wirken gegenläufig — beim aufschiebend
      // bedingten Vertrag löst die Zusage ihn aus, beim auflösend bedingten die
      // Ablehnung. „Er gilt nur, wenn die KfW zusagt" stand hier bis 25.08.2026
      // und beschrieb nur die erste Variante; für die zweite stand es auf dem
      // Kopf. Der Unterschied ändert für den Leser nichts — die Handlung ist
      // dieselbe —, deshalb kürzer statt ausführlicher (Legal-Judge, 25.08.2026).
      "Der Liefer- oder Leistungsvertrag mit dem Fachunternehmen wird schon vor dem Antrag geschlossen — er muss bei Antragstellung vorliegen. Aber unter dem Vorbehalt der KfW-Zusage, als aufschiebende oder auflösende Bedingung: Lehnt die KfW ab, ist der Vertrag hinfällig. Außerdem muss ein voraussichtliches Umsetzungsdatum darin stehen, und das darf nicht nach dem Ende des Bewilligungszeitraums liegen. Dieser Vorbehalt ist der eigentliche Kniff des Verfahrens — er hält den Preis fest, ohne dass das Vorhaben damit schon begonnen hätte.",
  },
  {
    titel: "Zuschuss beantragen",
    text:
      "Der Antrag läuft über das Kundenportal „Meine KfW“, Produkt 458. Dort werden die Bestätigung zum Antrag und der abgeschlossene Vertrag hochgeladen. Wer den Antrag stellt, muss dieselbe Person sein, die sich registriert hat — die Registrierung lässt sich später nicht auf jemand anderen umschreiben.",
  },
  {
    titel: "Zusage abwarten, dann einbauen",
    // „einen Anspruch auf die Förderung gibt es zu keinem Zeitpunkt" stand hier
    // bis 25.08.2026 und war in der Zeit zu weit gefasst: Auf die BEWILLIGUNG
    // besteht kein Anspruch (Merkblatt S. 11), auf die AUSZAHLUNG nach erteilter
    // Zusage sehr wohl — Richtlinie Nr. 9.5.1 setzt ihn voraus, sonst könnte man
    // ihn nicht durch Fristversäumnis „verlieren". Der Satz widersprach damit dem
    // Fristen-Absatz zwei Bildschirmzeilen weiter.
    //
    // Und es heißt ZUSAGE, nicht Bewilligung: Die Richtlinie führt beide Wörter
    // als Paar („Bewilligung beziehungsweise Förderzusage", Nr. 9.2.1), und das
    // Paar trennt die zwei Durchführer — nach Nr. 9.1 macht das BAFA die
    // Maßnahmen 5.1, 5.2, 5.3 g, 5.4 und 5.5 per Bescheid, die KfW die Nummern
    // 5.3 a–f und h–j auf privatrechtlicher Grundlage. Die Wärmepumpe ist 5.3 c,
    // also KfW, also Zusage. „Bewilligung" wäre das Wort der anderen Schiene.
    text:
      "Mit der Zusage steht der Vertrag endgültig, und das Vorhaben darf starten. Nach der Förderrichtlinie ist es zwar zulässig, schon vorher loszulegen — das geschieht aber auf eigenes Risiko, denn auf die Zusage selbst besteht kein Anspruch: Die KfW entscheidet nach pflichtgemäßem Ermessen im Rahmen der verfügbaren Mittel.",
  },
  {
    titel: "Durchführung bestätigen lassen",
    text:
      "Nach dem Einbau bestätigt das Fachunternehmen oder die Expertin die ordnungsgemäße Durchführung mit der „Bestätigung nach Durchführung“ (BnD).",
  },
  {
    titel: "Auszahlung beantragen",
    text:
      "Der Zuschuss kommt nicht von selbst: Er wird im Kundenportal mit der Bestätigung nach Durchführung eigens zur Auszahlung angemeldet, zusammen mit den Rechnungen und — bei den Boni — den Nachweisen zu Selbstnutzung, Eigentum und Einkommen. Erst danach wird überwiesen.",
  },
] as const;

/**
 * Was als Vorhabenbeginn gilt und was nicht.
 *
 * Die drei Felder sind bewusst getrennt: Die Regel allein („nicht vor
 * Antragstellung beginnen“) hilft niemandem, solange nicht dasteht, was
 * „beginnen“ überhaupt heißt — und die Entwarnung fehlt sonst ganz.
 */
export const BEG_VORHABENBEGINN = {
  /**
   * Die Ausschluss-Regel, WÖRTLICH aus dem Merkblatt (S. 6) — und deshalb allein
   * in diesem Feld, damit sie in Anführungszeichen gesetzt werden darf.
   *
   * Der Stichtags-Satz stand hier bis zum 25.08.2026 mit im selben Feld und wurde
   * auf der Seite als Merkblatt-Zitat mit ausgezeichnet. Er steht dort aber nicht;
   * er übersetzt Richtlinie Nr. 9.2.1 („Für den Zeitpunkt der Antragstellung ist
   * das Datum des Eingangs des Antrags beim Durchführer maßgeblich."). Ein
   * erfundenes Zitat in einem namentlich genannten Dokument ist dieselbe
   * Fehlerklasse wie eine erfundene Fundstelle — gefunden vom Legal-Judge.
   *
   * Die Richtlinie sagt diesen Satz übrigens NICHT wörtlich; sie formuliert die
   * Regel als Obliegenheit („Förderanträge … sind vor Vorhabenbeginn … zu
   * stellen"). „Gleichlautend" wäre also schon zu viel behauptet.
   */
  regelZitat: "Der Vorhabenbeginn vor Antragstellung schließt eine Förderung aus.",
  /** Unsere Übersetzung von Richtlinie Nr. 9.2.1 — kein Zitat, deshalb eigenes Feld. */
  stichtag:
    "Maßgeblich ist nach der Förderrichtlinie der Tag, an dem der Antrag eingeht.",
  /** Was den Vorhabenbeginn auslöst. */
  zaehltAlsBeginn: [
    "ein Liefer- oder Leistungsvertrag ohne die aufschiebende oder auflösende Bedingung der KfW-Zusage",
    "der tatsächliche Start der Bauarbeiten vor Ort",
  ],
  /** Was ihn ausdrücklich NICHT auslöst — die Entwarnung gehört zur Regel. */
  zaehltNicht: [
    "Planungs- und Beratungsleistungen, also auch das Gespräch mit dem Fachbetrieb und die Bestätigung zum Antrag",
    "ein Vertrag, der unter der Bedingung der KfW-Zusage steht",
  ],
  /**
   * Der Fall zwischen Antrag und Zusage — ausdrücklich zulässig.
   * Richtlinie Nr. 9.2.1: „Der Vorhabenbeginn vor Bewilligung beziehungsweise
   * Förderzusage des Antrags ist zulässig, erfolgt aber auf eigenes Risiko und
   * begründet keinen Rechtsanspruch auf Förderung.“
   */
  // Die Zuschreibung „nach der Förderrichtlinie" ist Pflicht, nicht Zierde: Das
  // Merkblatt der KfW nennt nur den Start NACH der Zusage. Wer sich auf die
  // Erlaubnis verlässt, soll wissen, auf wessen Wort — und dass die Richtlinie
  // dem Merkblatt nach ihrer eigenen Nummer 9.1 vorgeht.
  nachAntragVorZusage:
    "Nach der Förderrichtlinie darf das Vorhaben zwischen Antragstellung und Zusage beginnen. Das ist dort ausdrücklich zulässig, geschieht aber auf eigenes Risiko: Einen Rechtsanspruch auf die Förderung begründet es nicht, und lehnt die KfW ab, trägt man die Rechnung allein.",
  /**
   * Der Ausweg, den jeder zuerst sucht — und den es nicht gibt.
   *
   * Am 25.08.2026 auf der KfW-Produktseite zum Zuschuss 458 gelesen: „Die
   * Änderung von Lieferungs- oder Leistungsverträgen durch die nachträgliche
   * Aufnahme einer aufschiebenden bzw. auflösenden Bedingung ist nicht
   * zulässig." Ohne diesen Satz liest sich der Abschnitt so, als ließe sich ein
   * bereits unterschriebener Vertrag nachbessern — er lässt sich nicht.
   */
  keineNachtraeglicheBedingung:
    "Ein Vertrag, der schon ohne diesen Vorbehalt unterschrieben ist, lässt sich nicht retten: Die Bedingung nachträglich aufzunehmen, ist nach Angabe der KfW nicht zulässig. Sie muss von Anfang an drinstehen — für die Formulierung stellt die KfW ein unverbindliches Muster bereit, das Fachbetriebe kennen.",
} as const;

/**
 * Der dritte Weg, auf dem Geld verlorengeht — und der leiseste: Wer zu knapp
 * beantragt, kann nicht nachlegen.
 *
 * Merkblatt S. 6: „Es kann nur ein Antrag für dieselbe Maßnahme gestellt werden.
 * Eine Aufstockung des Zuschussbetrages über den bei Antragstellung beantragten
 * Umfang hinaus ist nicht möglich."
 */
export const BEG_KEINE_AUFSTOCKUNG =
  "Die Höhe steht mit dem Antrag fest: Für dieselbe Maßnahme gibt es nur einen Antrag, und aufstocken lässt er sich später nicht. Wird die Anlage teurer als geplant, bleibt es beim beantragten Umfang — die geplanten Kosten in der Bestätigung sollten also nicht zu knapp angesetzt sein.";

/**
 * Wo die Schritte und Fristen dieses Moduls NICHT vollständig sind.
 *
 * Der adversariale Prüfer des Councils vom 25.08.2026 hat beide Einschränkungen
 * gefunden, und sie betreffen dieselbe Gruppe: In Wohnungseigentümergemeinschaften
 * und Mehrfamilienhäusern kann neben dem gemeinschaftlichen Basisantrag ein
 * eigener Zusatzantrag für die persönlichen Boni stehen — er ist eine Möglichkeit
 * für selbstnutzende Eigentümer, keine Stufe des Verfahrens; damit sind es mehr als sechs
 * Schritte, und er hat zwei eigene Fristen: gestellt werden muss er spätestens
 * sechs Monate nach Zusage des Basisantrags und vor dessen Nachweiseinreichung
 * (Merkblatt S. 7), seine eigenen Nachweise spätestens sechs Monate nach dem
 * Datum der AUSZAHLUNGSBESTÄTIGUNG des Basisantrags (S. 8) — nicht ab dessen
 * Auszahlung, das ist ein anderer Tag.
 *
 * Das steht hier als eigener Satz, statt die Schritte vage zu machen: Eine
 * Anleitung, die für alle Fälle gleichzeitig stimmen soll, stimmt am Ende für
 * keinen. Der Regelfall bleibt scharf, die Ausnahme wird benannt.
 */
// „kommt ein Zusatzantrag dazu" stand hier bis zum 26.08.2026 und war eine Spur
// zu bestimmt: Der Zusatzantrag ist eine Möglichkeit, keine Stufe des Verfahrens
// („In diesem Fall KÖNNEN Sie … für sich selbst einen Zusatzantrag stellen",
// Merkblatt S. 7), und er hängt an den persönlichen Boni. Ein vermietetes
// Mehrfamilienhaus hat gar keinen.
export const BEG_ANTRAG_GELTUNGSBEREICH =
  "Diese Reihenfolge beschreibt den Regelfall: ein Haus, eine Eigentümerin oder ein Eigentümer, ein Antrag. In einer Wohnungseigentümergemeinschaft oder einem Mehrfamilienhaus können selbstnutzende Eigentümer die persönlichen Boni über einen zusätzlichen Antrag beanspruchen — der hat eigene Fristen.";

/** Fristen, die nach der Zusage laufen (Richtlinie Nr. 9.4.1 und 9.5.1). */
export const BEG_ANTRAG_FRISTEN = {
  /** Bewilligungszeitraum ab Zugang der Zusage. */
  bewilligungMonate: 36,
  /** Nachweise: innerhalb dieser Frist nach Abschluss des Vorhabens. */
  nachweisNachAbschlussMonate: 6,
  /** Spätestens: so viele Monate nach Ablauf des Bewilligungszeitraums. */
  nachweisSpaetestensNachBewilligungMonate: 6,
} as const;

/**
 * Eigenleistung — die zweite Stelle, an der Geld verloren geht, ohne dass
 * jemand einen Fehler bemerkt (Merkblatt S. 5).
 */
export const BEG_EIGENLEISTUNG =
  "Wer selbst einbaut statt ein Fachunternehmen zu beauftragen, bekommt nur die Materialkosten gefördert, die direkt mit der Maßnahme zusammenhängen — und auch die nur, wenn ein Fachunternehmen oder eine Energieeffizienz-Expertin die fachgerechte Durchführung und die Materialkosten bestätigt.";

/**
 * Der Kurzhinweis für Oberflächen, die den Betrag ausrechnen, aber keinen Platz
 * für das Verfahren haben (Rechner-Ergebnis, Förder-Check, Geräteliste).
 *
 * Eine Zahl ohne diesen Satz ist die gefährliche Hälfte der Auskunft: Sie sagt,
 * wie viel es gibt, und verschweigt die einzige Bedingung, unter der es das
 * überhaupt gibt.
 */
export const BEG_ANTRAG_KURZ =
  "Der Zuschuss muss beantragt sein, bevor das Vorhaben beginnt. Ein Liefer- oder Leistungsvertrag ohne den Vorbehalt der KfW-Zusage gilt bereits als Beginn und schließt die Förderung aus.";
