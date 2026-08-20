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

export type Ruecklaufart = "widerspruch" | "unzustellbar" | "unklar-maschinell" | "abwesenheit" | "antwort";

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
  // „widerspruch" als Einzelwort ist verboten — siehe ZITAT_TRENNER. Unser
  // eigener Brief endet mit „…und Ihr Widerspruchsrecht:", und Outlook zitiert
  // ihn in jede Antwort. Ein freundliches „Gerne, schicken Sie den Code" wäre
  // damit als Widerspruch eingestuft und die Gemeinde dauerhaft gesperrt
  // worden — bei ALLEN 100 Briefen des Schubs. Erkannt wird deshalb nur, was
  // einen Handlungsbezug trägt.
  "ich widerspreche",
  "wir widersprechen",
  "hiermit widerspreche",
  "hiermit widersprechen",
  "lege ich widerspruch ein",
  "legen wir widerspruch ein",
  "abmahnung",
  "unterlassungserklärung",
  "unterlassungserklaerung",
  "bitte austragen",
  "bitte abbestellen",
  "aus dem verteiler",
];

/**
 * Ab hier ist der Text nicht mehr die Antwort, sondern unser eigener Brief.
 *
 * Jede Antwort aus Outlook, Exchange und den meisten Behörden-Systemen trägt
 * den Originaltext unten mit. Wer darin nach Wörtern sucht, findet die eigenen.
 */
const ZITAT_TRENNER = [
  "-----ursprüngliche nachricht-----",
  "-----urspruengliche nachricht-----",
  "-----original message-----",
  "datenschutz-hinweis (art. 14 dsgvo)",
  "von: ",
  "am .* schrieb",
];

/** Den zitierten Teil abschneiden. Übrig bleibt, was der Mensch geschrieben hat. */
export function ohneZitat(text: string): string {
  let ende = text.length;
  const klein = text.toLowerCase();
  for (const t of ZITAT_TRENNER) {
    const i = t.includes(".*") ? klein.search(new RegExp(t)) : klein.indexOf(t);
    if (i >= 0 && i < ende) ende = i;
  }
  // Zeilenweise Zitate (">") ebenfalls weg — sie stehen oft ohne Trennzeile.
  const zeilen = text.slice(0, ende).split(/\r?\n/);
  const ersteZitatzeile = zeilen.findIndex((z) => z.trimStart().startsWith(">"));
  return (ersteZitatzeile >= 0 ? zeilen.slice(0, ersteZitatzeile) : zeilen).join("\n");
}

const UNZUSTELLBAR_BETREFF = [
  "undelivered mail",
  // Exchange schreibt „Undeliverable:" — das stand nicht in der Liste, und
  // damit fiel eine Microsoft-Unzustellbarkeit durch alle Zweige und wäre am
  // Ende über den mitzitierten Brieftext als „Widerspruch" gelandet.
  "undeliverable",
  "delivery status notification",
  "mail delivery failed",
  "returned mail",
  "unzustellbar",
  "nicht zugestellt",
  "delivery has failed",
  "failure notice",
  "nicht zustellbar",
];

const UNZUSTELLBAR_TEXT = [
  "user unknown",
  "unknown user",
  "no such user",
  "recipient address rejected",
  "recipnotfound",
  "mailbox unavailable",
  "mailbox full",
  "quota",
  "does not exist",
  "550 5.1.1",
  "550 5.7",
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
  const text = mail.text.toLowerCase().slice(0, 8000);
  // Nur das, was der Mensch geschrieben hat — für alles, was aus Wortsuche
  // entsteht. Die maschinellen Kennzeichen unten lesen weiter den vollen Text,
  // denn dort steht der Fehlercode oft erst im zitierten Teil.
  const eigen = ohneZitat(mail.text).toLowerCase();
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
    // WER DIESEN ZWEIG BETRETEN HAT, KOMMT NIE ALS WIDERSPRUCH HERAUS.
    // Eine Maschine hat geschrieben, nicht ein Mensch — was hier steht, ist
    // ein Format, das wir nicht kennen, und kein Einwand. Es wird gemeldet,
    // nicht verbucht.
    return "unklar-maschinell";
  }

  // Abwesenheitsnotiz — erkennbar am Kopf, der genau dafür gedacht ist.
  if (autoSubmitted.includes("auto-replied") || enthaelt(betreff, ABWESENHEIT_BETREFF)) return "abwesenheit";

  // Widerspruch: nur aus dem selbst geschriebenen Teil.
  if (enthaelt(betreff, WIDERSPRUCH) || enthaelt(eigen, WIDERSPRUCH)) return "widerspruch";

  return "antwort";
}

/** Welcher Status gehört zu welcher Einordnung? */
export const STATUS_ZU_ART: Record<Ruecklaufart, string | null> = {
  widerspruch: "gesperrt",
  unzustellbar: "bounce",
  // Eine maschinelle Meldung in einem Format, das wir nicht einordnen können.
  // Sie ändert nichts und landet in der Liste „bitte selbst ansehen" — raten
  // wäre hier in beide Richtungen teuer.
  "unklar-maschinell": null,
  // Eine Abwesenheitsnotiz ändert NICHTS. Sie ist kein Fortschritt und kein
  // Rückschritt — sie sagt nur, dass gerade Ferien sind.
  abwesenheit: null,
  antwort: "geantwortet",
};

// ─── Verlauf: eine Zeile, ein Format ─────────────────────────────────────────
//
// Der Rücklauf-Lauf hängt jeden Befund als Zeile an die Notiz der Gemeinde; das
// Cockpit zeigt daraus den Verlauf. Beide müssen dasselbe Format meinen — wer
// die Zeile an einer Stelle baut und an der anderen liest, hat zwei Fassungen
// derselben Vereinbarung, und die zweite merkt es nicht, wenn die erste sich
// ändert. Sie steht deshalb hier, mit einem Test, der schreibt und wieder liest.
//
// DIE NOTIZ BLEIBT DER SPEICHER, nicht eine eigene Tabelle: Es sind wenige
// Zeilen je Gemeinde, sie werden nur gelesen, und der Betreiber schreibt in
// dasselbe Feld von Hand. Eine Tabelle daneben hieße, dass seine Notiz und
// unsere an verschiedenen Orten liegen.

export type VerlaufsZeile = {
  datum: string; // ISO-Tag
  art: Ruecklaufart;
  betreff: string;
  von: string;
};

const ZEILE = /^\[(\d{4}-\d{2}-\d{2})\] ([a-zä-]+) aus Postfach: „(.*)" \((.+)\)$/;

/** Eine Verlaufszeile schreiben. */
export function notizZeile(z: VerlaufsZeile): string {
  return `[${z.datum}] ${z.art} aus Postfach: „${z.betreff}" (${z.von})`;
}

/**
 * Eine Notiz in Verlauf und Freitext zerlegen.
 *
 * Was nicht als Verlaufszeile lesbar ist, gilt als Freitext und geht NICHT
 * verloren — es ist im Zweifel von Hand geschrieben und damit das Wertvollere.
 */
export function liesNotiz(notes: string | null): { verlauf: VerlaufsZeile[]; freitext: string[] } {
  const verlauf: VerlaufsZeile[] = [];
  const freitext: string[] = [];
  for (const zeile of (notes ?? "").split("\n")) {
    if (!zeile.trim()) continue;
    const m = zeile.match(ZEILE);
    if (m) verlauf.push({ datum: m[1], art: m[2] as Ruecklaufart, betreff: m[3], von: m[4] });
    else freitext.push(zeile);
  }
  return { verlauf, freitext };
}

/** Wie eine Einordnung im Cockpit heißt. */
export const ART_LABEL: Record<Ruecklaufart, string> = {
  widerspruch: "Widerspruch",
  unzustellbar: "Unzustellbar",
  "unklar-maschinell": "Maschinelle Meldung",
  abwesenheit: "Abwesenheitsnotiz",
  antwort: "Antwort",
};
