/**
 * Presse- und Redaktionspostfächer der Kommunen.
 *
 * DER ANLASS IST GEMESSEN (03.09.2026): Von den 20 größten Städten des offenen
 * NRW-Schubs führen mindestens 7 ein Pressepostfach, und wir schrieben bei 6
 * davon an `info@` oder `stadt@`. Bei den 227 bereits verschickten Briefen ist
 * genau EINE Presseadresse dabei. Der Brief bietet eine fertige Meldung an —
 * er geht also an die Stelle, die Meldungen veröffentlicht, oder er wird
 * einmal mehr weitergereicht.
 *
 * DIE PRESSEADRESSE ERSETZT DAS ALLGEMEINE POSTFACH NICHT, sie steht daneben.
 * Zwei Gründe: Ein Pressepostfach kann falsch erhoben sein, und dann darf nicht
 * die einzige bekannte Adresse verloren gehen; und die Herkunft der beiden
 * Angaben ist verschieden, sie gehören deshalb nicht in dieselbe Spalte
 * (dieselbe Trennung wie bei den Postfächern aus Impressum, Kontaktseite und
 * verwaltender Gemeinde).
 */

/**
 * Lokalteile, die ein Presse- oder Redaktionspostfach ausweisen.
 *
 * BEWUSST BREIT, aber nur bei Wörtern, die in einer Verwaltung nichts anderes
 * bedeuten können. `marketing@` steht bewusst NICHT drin: Stadtmarketing ist
 * vielerorts eine eigene Gesellschaft für Tourismus und Veranstaltungen, nicht
 * die Pressestelle — ein Brief dorthin ginge an die falsche Stelle und sähe
 * für den Empfänger wie ein Werbeanschreiben aus.
 *
 * Ebenso NICHT drin: `info@`, `kontakt@`, `stadt@` — das sind die allgemeinen
 * Postfächer, die wir ohnehin schon haben.
 */
const PRESSE_WORT = [
  "presse",
  "pressestelle",
  "presseamt",
  "pressereferat",
  "pressedienst",
  "pressebuero",
  "pressebüro",
  "pressesprecher",
  "pressesprecherin",
  "presseteam",
  "pressearbeit",
  "presseinfo",
  "pressemitteilung",
  "pressemitteilungen",
  "medien",
  "medienportal",
  "medienbuero",
  "medienbüro",
  "redaktion",
  "redaktionsteam",
  "oeffentlichkeitsarbeit",
  "öffentlichkeitsarbeit",
  "presse-und-oeffentlichkeitsarbeit",
  "kommunikation",
  "unternehmenskommunikation",
  "stabsstelle-kommunikation",
];

/**
 * Ist das ein Presse-/Redaktionspostfach?
 *
 * Geprüft wird der Lokalteil als GANZES WORT, nicht als Wortstamm — sonst
 * fängt „presse" auch „pressemeldung-abo" oder einen Nachnamen wie
 * „Pressel". Erlaubt sind nur die üblichen Trennzeichen dahinter
 * (`presse.info@`, `presse-team@`, `presse_stelle@`).
 */
export function istPressePostfach(email: string | null | undefined): boolean {
  const lokal = (email ?? "").trim().toLowerCase().split("@")[0];
  if (!lokal) return false;
  return PRESSE_WORT.some((w) => lokal === w || new RegExp(`^${w}[._-]`).test(lokal));
}

/**
 * Wohin geht der Brief?
 *
 * Die Presseadresse hat Vorrang — sie ist die Stelle, die eine fertige Meldung
 * verwendet. Fehlt sie, bleibt es beim allgemeinen Postfach.
 *
 * NUR EINE ADRESSE, nie beide: Zwei Empfänger derselben Verwaltung in einer
 * unverlangten Mail sind kein doppelter Versuch, sondern ein doppelter
 * Widerspruchsgrund.
 */
export function empfaengerFuerBrief(o: {
  rollenEmail: string | null;
  presseEmail?: string | null;
}): { email: string | null; anPresse: boolean } {
  const presse = (o.presseEmail ?? "").trim();
  if (presse && istPressePostfach(presse)) return { email: presse, anPresse: true };
  return { email: o.rollenEmail?.trim() || null, anPresse: false };
}

/**
 * Links, die auf eine Presseseite zeigen könnten — für den Crawl.
 *
 * Die Startseite verlinkt die Pressestelle oft NICHT (bei Düsseldorf gar
 * nicht, nachgesehen am 03.09.2026), deshalb zählen auch Kontakt- und
 * Impressumsseiten als Zwischenschritt: Von dort führt der Weg weiter.
 */
const LINK_WORT =
  /presse|medien|pressestelle|newsroom|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|kommunikation|aktuelles|rathaus|kontakt|impressum|ansprechpartner/i;

export function istPresseLink(url: string, linktext = ""): boolean {
  return LINK_WORT.test(`${url} ${linktext}`);
}

/**
 * Wie wurde die Adresse gefunden? Steht an der Adresse, damit später
 * unterscheidbar bleibt, wie belastbar sie ist.
 */
export type PresseQuelle = "presseseite" | "kontaktseite" | "impressum" | "suche";
