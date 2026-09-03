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
  "newsroom",
  "medienportal",
  "medienbuero",
  "medienbüro",
  "medienteam",
  "medienstelle",
  "redaktion",
  "redaktionsteam",
  "oeffentlichkeitsarbeit",
  "öffentlichkeitsarbeit",
  "presse-und-oeffentlichkeitsarbeit",
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
/**
 * Wörter, die NUR alleinstehend zählen — nie mit einem Zusatz dahinter.
 *
 * `medien@brilon.de` ist die Abteilung „Medien / Öffentlichkeitsarbeit" im
 * Rathaus, mit eigener Durchwahl (nachgesehen am 03.09.2026). `medien-` mit
 * Zusatz ist dagegen oft etwas ganz anderes: ein Medienzentrum der
 * Schulverwaltung, eine medienpädagogische Stelle, ein Medienarchiv. Der
 * Zusatz macht aus der Pressestelle eine Fachstelle, und ein Brief dorthin
 * ginge an die falsche Adresse.
 */
const NUR_ALLEINSTEHEND = ["medien", "kommunikation"];

export function istPressePostfach(email: string | null | undefined): boolean {
  const lokal = (email ?? "").trim().toLowerCase().split("@")[0];
  if (!lokal) return false;
  if (NUR_ALLEINSTEHEND.includes(lokal)) return true;
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
 * Wie sehr sieht ein Link nach der Presseseite aus? Höher = zuerst verfolgen.
 *
 * DIE RANGFOLGE IST DER KERN, nicht die Wortliste. Eine erste Fassung
 * behandelte alle Treffer gleich und verfolgte sie in der Reihenfolge des
 * HTML; auf der Startseite einer Großstadt stehen Dutzende Links mit
 * „rathaus" oder „kontakt", und die Obergrenze war erreicht, bevor der
 * eigentliche Presse-Link an der Reihe war. Düsseldorf verlinkt sein
 * Medienportal auf der Startseite — der Crawl kam nie dort an.
 *
 * Die Presseseite steht typischerweise in der Fußzeile, oft neben den
 * Social-Media-Links; sie wird also gefunden, wenn man sie zuerst nimmt.
 *
 * Die schwachen Wörter bleiben drin, aber hinten: Kontakt- und
 * Impressumsseiten sind kein Ziel, sondern ein Zwischenschritt.
 */
export function presseLinkRang(url: string, linktext = ""): number {
  const h = `${url} ${linktext}`.toLowerCase();
  if (/^(mailto:|tel:|javascript:|#)/.test(url.trim().toLowerCase())) return 0;
  if (/presseportal|pressestelle|presse-und-oeffentlichkeitsarbeit|medienportal|newsroom/.test(h)) return 100;
  if (/presse|pressemitteilung|pressemeldung/.test(h)) return 90;
  if (/öffentlichkeitsarbeit|oeffentlichkeitsarbeit|medien|kommunikation/.test(h)) return 70;
  if (/ansprechpartner|mitarbeiterverzeichnis|fachbereich/.test(h)) return 40;
  if (/impressum|kontakt/.test(h)) return 30;
  if (/rathaus|verwaltung|aktuelles/.test(h)) return 20;
  return 0;
}

export function istPresseLink(url: string, linktext = ""): boolean {
  return presseLinkRang(url, linktext) > 0;
}

/**
 * Wie wurde die Adresse gefunden? Steht an der Adresse, damit später
 * unterscheidbar bleibt, wie belastbar sie ist.
 */
export type PresseQuelle =
  | "presseseite"
  | "kontaktseite"
  | "impressum"
  | "suche"
  /**
   * Von Hand nachgetragen, nachdem ein Mensch die Seite gelesen hat.
   *
   * Eigener Wert, weil er etwas anderes bedeutet als die vier darüber: Der
   * Crawl hat die Adresse NICHT gefunden, und das bleibt eine Aussage über den
   * Crawl. Sie unter „presseseite" abzulegen hieße zu behaupten, er habe
   * funktioniert — dieselbe Fehlerklasse wie ein Prüfdatum ohne Prüfung.
   */
  | "hand";
