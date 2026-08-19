// Rückläufer einordnen: Was ist eine Unzustellbarkeit, was eine Abwesenheit,
// was ein Widerspruch, was eine echte Antwort?
//
// Reine Funktionen ohne Postfach-Zugriff — die Einordnung ist die Stelle, an
// der Fehler teuer werden, und sie muss ohne laufenden IMAP-Server prüfbar
// sein.
//
// DIE VIER FÄLLE, und warum die Reihenfolge zählt:
//
// 1. WIDERSPRUCH schlägt alles. Sagt jemand „bitte keine weiteren Nachrichten",
//    ist das eine Ansage nach Art. 21 DSGVO und § 7 UWG — sie wirkt sofort und
//    dauerhaft, auch wenn dieselbe Mail nebenbei nach dem Widget fragt.
// 2. UNZUSTELLBAR: Die Adresse existiert nicht oder nimmt nichts an. Ein
//    zweiter Versuch schadet der Zustellbarkeit aller weiteren Mails.
// 3. ABWESENHEIT: Eine Urlaubsantwort ist KEINE Antwort. Sie als solche zu
//    zählen, würde die einzige Kennzahl verderben, an der wir ablesen, ob die
//    Aussendung wirkt — und die automatische Antwort kommt ausgerechnet aus den
//    Häusern, die gerade niemanden am Platz haben.
// 4. ANTWORT: Ein Mensch hat geschrieben.

export type Ruecklaufart = "widerspruch" | "unzustellbar" | "abwesenheit" | "antwort";

export type RohMail = {
  von: string;
  betreff: string;
  /** Erste ~2 kB des Textkörpers reichen für die Einordnung. */
  text: string;
  /** Kopfzeilen in Kleinschreibung, soweit vorhanden. */
  kopf?: Record<string, string>;
};

const enthaelt = (t: string, worte: string[]) => worte.some((w) => t.includes(w));

/**
 * Ein Widerspruch ist eine ANSAGE, keine Stimmung. Erkannt werden nur klare
 * Formulierungen — im Zweifel bleibt es eine Antwort, die ein Mensch liest.
 * Eine zu großzügige Erkennung sperrt Gemeinden, die nur nachgefragt haben.
 */
const WIDERSPRUCH = [
  "keine weiteren nachrichten",
  "keine weiteren mails",
  "keine weiteren e-mails",
  "nicht mehr kontaktieren",
  "nicht mehr anschreiben",
  "bitte löschen sie meine",
  "bitte loeschen sie meine",
  "widerspruch",
  "widerspreche",
  "abmahnung",
  "unterlassung",
  "austragen",
  "abbestellen",
];

const UNZUSTELLBAR_BETREFF = [
  "undelivered mail",
  "delivery status notification",
  "mail delivery failed",
  "returned mail",
  "unzustellbar",
  "delivery has failed",
  "failure notice",
  "nicht zustellbar",
];

const UNZUSTELLBAR_TEXT = [
  "user unknown",
  "unknown user",
  "no such user",
  "recipient address rejected",
  "mailbox unavailable",
  "does not exist",
  "550 5.1.1",
  "5.1.1",
  "adresse existiert nicht",
];

const ABWESENHEIT_BETREFF = [
  "abwesenheit",
  "abwesend",
  "out of office",
  "automatische antwort",
  "automatic reply",
  "urlaub",
  "autoreply",
];

/**
 * Einordnung einer eingegangenen Mail.
 *
 * Zuerst die maschinellen Kopfzeilen: `auto-submitted` und der
 * `report-type=delivery-status` sind eindeutig und stehen an Stellen, die
 * niemand aus Versehen so formuliert. Erst danach der Text — dort steht in
 * einer Unzustellbarkeit oft der ursprüngliche Brief mit drin, weshalb eine
 * reine Textsuche „Widerspruch" darin finden könnte, wo keiner ist.
 */
export function ordneEin(mail: RohMail): Ruecklaufart {
  const betreff = mail.betreff.toLowerCase();
  const text = mail.text.toLowerCase().slice(0, 4000);
  const kopf = mail.kopf ?? {};
  const contentType = (kopf["content-type"] ?? "").toLowerCase();
  const autoSubmitted = (kopf["auto-submitted"] ?? "").toLowerCase();
  const von = mail.von.toLowerCase();

  // Maschinelle Zustellmeldung — die sicherste Kennzeichnung, die es gibt.
  const istBericht =
    contentType.includes("report-type=delivery-status") ||
    autoSubmitted.includes("auto-generated") ||
    von.startsWith("mailer-daemon") ||
    von.startsWith("postmaster@");
  if (istBericht || enthaelt(betreff, UNZUSTELLBAR_BETREFF)) {
    // Eine Zustellmeldung, die keinen dauerhaften Fehler nennt (z. B. „delayed"),
    // ist KEINE Unzustellbarkeit — sie kommt später vielleicht doch an.
    if (betreff.includes("delay") || text.includes("will retry") || text.includes("temporarily")) return "abwesenheit";
    if (enthaelt(text, UNZUSTELLBAR_TEXT) || enthaelt(betreff, UNZUSTELLBAR_BETREFF)) return "unzustellbar";
  }

  // Abwesenheitsnotiz — erkennbar am Kopf, der genau dafür gedacht ist.
  if (autoSubmitted.includes("auto-replied") || enthaelt(betreff, ABWESENHEIT_BETREFF)) return "abwesenheit";

  // Widerspruch: erst jetzt, damit ein zitierter Brieftext in einer
  // Fehlermeldung ihn nicht auslöst.
  if (enthaelt(betreff, WIDERSPRUCH) || enthaelt(text, WIDERSPRUCH)) return "widerspruch";

  return "antwort";
}

/** Welcher Status gehört zu welcher Einordnung? */
export const STATUS_ZU_ART: Record<Ruecklaufart, string | null> = {
  widerspruch: "gesperrt",
  unzustellbar: "bounce",
  // Eine Abwesenheitsnotiz ändert NICHTS. Sie ist kein Fortschritt und kein
  // Rückschritt — sie sagt nur, dass gerade Ferien sind.
  abwesenheit: null,
  antwort: "geantwortet",
};
