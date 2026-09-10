/**
 * Gehört diese eingegangene Mail zur Sachfrage an eine Förderstelle statt zum
 * Kommunen-Anschreiben?
 *
 * WOZU: Dasselbe Postfach trägt zwei Gespräche, und beide gehen an dieselben
 * Amtsadressen. Gemessen am 10.09.2026 tragen 64 der 289 angeschriebenen
 * Gemeinden ein Förderprogramm im Katalog (im offenen Versandtopf 19 von 175) —
 * bei ihnen ist der Absender einer Antwort für sich kein Unterscheidungsmerkmal.
 * Ohne diese Weiche verbucht der Rücklauf-Lauf die Antwort einer Förderstelle
 * als Reaktion auf unser Anschreiben und meldet eine Entscheidung, die es nicht
 * gibt.
 *
 * DAS MERKMAL IST DER BETREFF, und zwar die Konstante aus dem Entwurf, nie eine
 * hier getippte Zeichenkette: Sonst gibt es zwei Fassungen desselben Wortlauts,
 * und beim ersten Umformulieren fällt genau diese Weiche stumm aus.
 *
 * KEIN PRÄFIX IN ECKIGEN KLAMMERN: Das wäre die Maschinen-Signatur, gegen die
 * die Mail ausdrücklich gebaut ist — sie soll aussehen, als hätte ein Mensch
 * sie geschrieben, weil sie das hat.
 *
 * Geprüft wird Betreff ODER Rohtext: Ein Mailprogramm stellt der Antwort ein
 * „AW:" voran (deshalb enthält, nicht beginnt mit) und zitiert den
 * ursprünglichen Betreff im Text — manche Programme kürzen ihn in der
 * Betreffzeile, kaum eines im Zitat.
 */
import { INQUIRY_BETREFF_ANFANG } from "./funding-inquiry-draft";

export type EingegangeneMail = {
  betreff: string;
  /** Die vollständige Rohfassung samt zitiertem Verlauf. */
  roh: string;
};

/**
 * Der Vergleich ist unempfindlich gegen Groß-/Kleinschreibung, gegen Leerraum
 * und gegen die Zitatzeichen am Zeilenanfang.
 *
 * Der letzte Punkt ist beim Bauen gemessen worden und war keine Vorsicht: Bricht
 * ein Mailprogramm den zitierten Betreff um, steht mitten in ihm eine neue Zeile
 * mit „> " davor — der Betreff liest sich dann als „Aktueller Stand > des
 * Förderprogramms" und blieb unerkannt. Die Antwort wäre beim Brief gelandet,
 * also genau dort, wo sie nicht hingehört.
 *
 * Entfernt wird das Zeichen NUR am Zeilenanfang: Ein „>" mitten im Text ist
 * Inhalt, und eine Marke, die über beliebige Zeichen hinwegliest, erkennt
 * irgendwann etwas, das keine Sachfrage ist.
 */
/*
 * GETEILT, SEIT 10.09.2026: Die Zuordnung der Anfrage-Antworten
 * (`lib/funding-anfragen.ts`) ruft dieselbe Funktion auf. Beide Seiten
 * beantworten dieselbe Frage über denselben Text — ordnete die eine zu und die
 * andere nicht, wäre das ein Widerspruch, den niemand bemerkt: Eine Antwort
 * gälte gleichzeitig als Reaktion auf den Brief und als unbeantwortete
 * Sachfrage. Wer hier etwas ändert, ändert die Zuordnung dort mit.
 */
export function normalisiert(s: string): string {
  return s
    .toLowerCase()
    .replace(/^[>\s]+/gm, " ")
    .replace(/\s+/g, " ");
}

export function istAntwortAufSachfrage(mail: EingegangeneMail): boolean {
  const marke = normalisiert(INQUIRY_BETREFF_ANFANG);
  return normalisiert(mail.betreff).includes(marke) || normalisiert(mail.roh).includes(marke);
}
