// ─── Ein volles Postfach ist keine falsche Adresse ───────────────────────────
//
// DER ANLASS (10.09.2026): Der Betreiber will, dass eine unzustellbare Mail
// künftig automatisch eine neue Adresse bekommt und der Brief erneut hinausgeht.
// Genau daran wäre der Automatismus sofort gescheitert: Die Einordnung des
// Rücklaufs kennt nur „unzustellbar" und wirft „mailbox full" und „quota" in
// denselben Topf wie „user unknown" und „550 5.1.1".
//
// Für die Einordnung ist das richtig — beides ist eine Unzustellbarkeit. Für
// einen Autofix ist es fatal: Selzens Postfach war schlicht VOLL, die Adresse
// stimmt. Eine automatische Neurecherche hätte dort eine korrekte Adresse durch
// eine schlechtere ersetzt, und niemand hätte es je bemerkt.
//
// DIE UNTERSCHEIDUNG STEHT IM ANTWORTCODE DES MAILSERVERS, nicht in unserer
// Deutung: Die 5er-Klasse ist ein dauerhafter Fehler, die 4er ein
// vorübergehender (RFC 5321, Abschnitt 4.2.1). Ein volles Postfach wird
// allerdings von manchen Servern als 5.2.2 gemeldet und von anderen als 4.2.2 —
// deshalb entscheidet hier zuerst der WORTLAUT und erst danach der Code.
//
// IM ZWEIFEL „UNKLAR". Eine falsch als dauerhaft eingestufte Meldung kostet eine
// gute Adresse; eine falsch als vorübergehend eingestufte kostet nur Zeit. Wo
// die Meldung nichts Eindeutiges sagt, wird deshalb nichts ersetzt, sondern
// berichtet.

export type BounceArt = "dauerhaft" | "voruebergehend" | "unklar";

/**
 * Formulierungen, die ein Server für ein VORÜBERGEHENDES Problem benutzt.
 *
 * Sie werden ZUERST geprüft: „mailbox full" enthält kein Wort, das auf eine
 * falsche Adresse hindeutet, wird aber von manchen Servern zusammen mit einem
 * 5er-Code gemeldet. Wer erst den Code liest, stuft es falsch ein.
 */
const VORUEBERGEHEND = [
  "mailbox full",
  "mailbox is full",
  "quota exceeded",
  "over quota",
  "insufficient system storage",
  "try again later",
  "temporarily unavailable",
  "temporary failure",
  "greylist",
  "postfach ist voll",
  "speicherplatz",
];

/** Formulierungen, die eine Adresse als DAUERHAFT tot ausweisen. */
const DAUERHAFT = [
  "user unknown",
  "unknown user",
  "no such user",
  "no such mailbox",
  "recipient address rejected",
  "does not exist",
  "adresse existiert nicht",
  "unrouteable address",
  "no mailbox here by that name",
  "recipient not found",
];

const enthaelt = (text: string, muster: string[]) => {
  const t = text.toLowerCase();
  return muster.some((m) => t.includes(m));
};

/**
 * Ist diese Zustellmeldung ein Grund, die Adresse zu ersetzen?
 *
 * Reihenfolge mit Absicht: Wortlaut vorübergehend → Wortlaut dauerhaft →
 * Statuscode. Der Code ist die schwächste der drei Auskünfte, weil ihn manche
 * Server für ein volles Postfach falsch setzen.
 */
export function bounceArt(meldung: string): BounceArt {
  if (!meldung.trim()) return "unklar";
  if (enthaelt(meldung, VORUEBERGEHEND)) return "voruebergehend";
  if (enthaelt(meldung, DAUERHAFT)) return "dauerhaft";
  // Statuscodes: 5.x.x dauerhaft, 4.x.x vorübergehend. Gesucht wird die Form
  // „Status: 5.1.1" oder ein „550 5.1.1" — eine nackte 5 irgendwo im Text wäre
  // jede Hausnummer im zitierten Brief.
  const status = meldung.match(/\b([45])\.\d{1,3}\.\d{1,3}\b/);
  if (status) return status[1] === "5" ? "dauerhaft" : "voruebergehend";
  const code = meldung.match(/\b([45])\d{2}[ -]/);
  if (code) return code[1] === "5" ? "dauerhaft" : "voruebergehend";
  return "unklar";
}

/**
 * Nach wie vielen Tagen ein vorübergehend gescheiterter Versand erneut probiert
 * wird.
 *
 * Ein volles Postfach ist in wenigen Tagen wieder leer; früher zu probieren
 * heißt, dieselbe Mail in dasselbe volle Postfach zu legen.
 */
export const WIEDERVORLAGE_TAGE = 5;

/**
 * Wie oft eine Gemeinde einen dauerhaften Bouncer erzeugen darf, bevor Schluss
 * ist.
 *
 * OHNE DIESE GRENZE LÄUFT DER AUTOMATISMUS IM KREIS: Eine Gemeinde mit kaputtem
 * Mailserver liefert bei jeder Adresse denselben Fehler, und der Lauf sucht
 * jedes Mal eine neue. Nach dem zweiten Mal ist die Annahme „wir hatten nur die
 * falsche Adresse" widerlegt.
 */
export const MAX_DAUERHAFTE_BOUNCER = 2;

/**
 * Der Zustand einer Gemeinde, deren Adresse nach einer Unzustellbarkeit
 * ersetzt wurde und die deshalb WIEDER angeschrieben werden soll.
 *
 * EIN EIGENER ZUSTAND, NICHT ZURÜCK AUF „OFFEN": Dort heißt offen „nie
 * angeschrieben", und das stimmt nach einem gescheiterten Versuch nicht mehr.
 *
 * UND ER REICHT ALLEIN NICHT — gemessen von der Outreach-Sitzung: Deren
 * Empfängerauswahl überspringt jeden Ort mit gesetztem Kontaktdatum,
 * unabhängig vom Zustand. Das Datum zurückzusetzen wäre die falsche Reparatur
 * (daran hängt die Tagesmengen-Zählung, und der Zeitpunkt des ersten Versuchs
 * wäre für immer weg). Die Ausnahme baut deshalb der Versandlauf; hier steht
 * nur der Name, damit ihn keine Seite tippt.
 */
export const STATUS_BOUNCE_BEHOBEN = "bounce-behoben";

/**
 * Taugt die neu gefundene Adresse als Ersatz?
 *
 * DREI BEDINGUNGEN, und jede hat ihren Grund:
 *
 *   Sie muss sich von der toten unterscheiden — sonst ersetzt der Lauf eine
 *   Adresse durch sich selbst und meldet Erfolg. Genau das wäre bei Schashagen
 *   passiert, dessen Impressum die tote Adresse weiterhin nennt.
 *
 *   Sie muss ein Funktionspostfach sein. Eine unverlangte Mail geht an eine
 *   Funktion, nicht an eine Person — dieselbe Regel wie beim Einsammeln.
 *
 *   Sie darf nicht auf der Domain des Website-Dienstleisters liegen. Die Prüfung
 *   bleibt hier bewusst grob (der Aufrufer kennt die erlaubten Domains besser);
 *   was diese Funktion sicherstellt, ist, dass überhaupt jemand hinsieht.
 */
export function ersatzAdresseTaugt(
  neu: string,
  tote: string[],
  istRollenpostfach: (adresse: string) => boolean,
): { ok: true } | { ok: false; grund: string } {
  const n = neu.trim().toLowerCase();
  if (!n.includes("@")) return { ok: false, grund: "keine Adresse" };
  if (tote.map((t) => t.trim().toLowerCase()).includes(n)) {
    return { ok: false, grund: "diese Adresse hat schon einmal geprellt" };
  }
  if (!istRollenpostfach(n)) return { ok: false, grund: "kein Funktionspostfach" };
  return { ok: true };
}

/**
 * ALLE Adressen, die an dieser Stelle schon einmal gescheitert sind.
 *
 * DER GRUND IST GEMESSEN, NICHT BEFÜRCHTET (10.09.2026, erster Probelauf): Die
 * toten Adressen stehen weiterhin im Impressum — Schashagens Seite nennt bis
 * heute die Adresse, die ihr eigener Server abweist. Wer den Ersatz nur gegen
 * die AKTUELL hinterlegte Adresse prüft, trägt nach einer Handkorrektur genau
 * die tote wieder ein und meldet dabei Erfolg. Der Lauf hätte alle drei
 * Korrekturen von heute rückgängig gemacht.
 *
 * Die Geschichte steht in der Notiz, und sie ist die einzige Quelle dafür:
 * gelesen werden die Empfänger aus den Zustellmeldungen und die linke Seite
 * jeder Ersetzung.
 */
export function toteAdressen(notes: string | null): string[] {
  const text = notes ?? "";
  const gefunden = new Set<string>();
  // Empfänger, wie ihn ein Mailserver in seiner Meldung nennt.
  for (const m of text.matchAll(/<([^\s<>@]+@[^\s<>@]+)>/g)) gefunden.add(m[1].toLowerCase());
  for (const m of text.matchAll(/Final-Recipient:\s*rfc822;\s*([^\s]+@[^\s]+)/gi)) gefunden.add(m[1].toLowerCase());
  // Die linke Seite einer Ersetzung — egal ob von Hand oder vom Lauf.
  for (const m of text.matchAll(/([^\s]+@[^\s]+)\s*(?:→|->)/g)) gefunden.add(m[1].toLowerCase());
  return [...gefunden];
}

/**
 * Woran ein Notizeintrag als Zustellmeldung zu erkennen ist — dieselbe
 * Formulierung, die der Rücklauf-Lauf schreibt.
 */
export const BOUNCE_VERMERK = "unzustellbar aus Postfach";

/**
 * Die Zustellmeldungen einer Notiz, jede als ganzer Text.
 *
 * Die Notiz ist eine Kette von Einträgen, die mit „[JJJJ-MM-TT] " beginnen; nur
 * die mit dem Vermerk des Rücklauf-Laufs sind Zustellmeldungen. Alles andere
 * (Handkorrekturen, Recherchevermerke) steht in derselben Form daneben und
 * enthält oft dieselben Wörter — „existiert nicht mehr (No such mailbox)" steht
 * wörtlich in Dennheritz' Korrekturvermerk.
 */
export function zustellmeldungen(notes: string | null): string[] {
  const text = notes ?? "";
  if (!text.trim()) return [];
  const eintraege = text.split(/\n(?=\[\d{4}-\d{2}-\d{2}\])/);
  return eintraege.filter((e) => e.split("\n")[0]?.includes(BOUNCE_VERMERK));
}

/**
 * Wie oft ein Brief an diese Gemeinde schon DAUERHAFT gescheitert ist.
 *
 * NICHT die Zahl der toten Adressen — die ist etwas anderes, und die
 * Verwechslung hat den ersten Probelauf gekostet (10.09.2026): Lassans einzige
 * Unzustellbarkeit nennt ZWEI Adressen, weil unser Empfänger info@lassan.de auf
 * ein gelöschtes Personenpostfach in Wolgast weiterleitete und der Server beide
 * meldet. Ein Fehlversuch, zwei Adressen, Obergrenze gerissen — die Gemeinde
 * wäre mit frisch belegter Adresse für immer aus dem Versand gefallen, und der
 * Lauf hätte dabei grün gemeldet. Dieselbe Verdopplung entsteht bei jeder
 * Alias-Erweiterung (Selzen: info@ und webmaster@ aus einer Meldung).
 *
 * GEZÄHLT WIRD DER EINTRAG, NICHT DIE ADRESSE, und nur der dauerhafte: Ein
 * volles Postfach ist kein Grund, eine Gemeinde aufzugeben.
 *
 * Eine Handkorrektur zählt NICHT mit. Sie ist die Reparatur eines
 * Fehlversuchs, nicht ein zweiter — sie einzurechnen wäre dieselbe Verdopplung,
 * nur eine Zeile tiefer.
 */
export function dauerhafteBouncer(notes: string | null): number {
  return zustellmeldungen(notes).filter((m) => bounceArt(m) === "dauerhaft").length;
}
