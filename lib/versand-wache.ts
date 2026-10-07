/**
 * Wer darf Mails über das Versandpostfach verschicken — und wo steht, was er
 * verschickt hat.
 *
 * DER ANLASS (07.10.2026): 138 Pressemitteilungen gingen am 29./30.09.2026 aus
 * einem Skript hinaus, das nie eingecheckt war und sein Protokoll in einen
 * temporären Ordner schrieb. Der wurde aufgeräumt; eine Woche später wusste
 * niemand mehr, welche Redaktion was bekommen hatte. Die Regel, die daraus
 * folgt, gilt unabhängig davon, in welcher Sitzung gesendet wird:
 *
 *   JEDE AUSSENDUNG STEHT IN DER DATENBANK. Ein Versandlauf, der das nicht
 *   tut, darf nicht senden — und ein Skript außerhalb des Repos darf es gar
 *   nicht.
 *
 * Zwei Sicherungen hängen an dieser Datei, weil eine allein nicht reicht:
 *   1. lib/__tests__/versand-protokoll.test.ts hält jedes EINGECHECKTE Skript,
 *      das über das Postfach sendet, gegen die Liste unten. Ein neuer
 *      Versandlauf ohne Eintrag macht den Lauf rot.
 *   2. `npm run sessions` sucht in JEDEM Arbeitsstand nach nie eingecheckten
 *      Dateien, die senden. Genau dort lag das verlorene Skript — und dort sieht
 *      kein Test hin, weil Tests nur das Eingecheckte kennen.
 *
 * Transaktionale Mails über den Systemdienst (Kontaktformular, Wächter-Meldungen,
 * Bestätigungen) sind keine Aussendungen und stehen nicht hier; Kaltakquise
 * über diesen Dienst schließt lib/outreach-mail.ts aus.
 */

/** Woran ein Quelltext erkennbar ist, der über das Postfach sendet. */
export const SENDE_MUSTER = /\.sendMail\(|createTransport\(/;

export function sendetMails(quelltext: string): boolean {
  return SENDE_MUSTER.test(quelltext);
}

export type ErlaubterSender = {
  /** Die Tabelle, in der jede einzelne Mail dieses Laufs steht. */
  tabelle: string;
  /** Was dort steht und wann es geschrieben wird. */
  protokoll: string;
};

/**
 * Jeder eingecheckte Versandweg — mit der Stelle, an der seine Mails
 * nachzulesen sind. Ein Eintrag ohne Tabelle ist keine Ausnahme, sondern genau
 * der Fehler, gegen den diese Liste steht.
 */
export const ERLAUBTE_SENDER: Record<string, ErlaubterSender> = {
  "scripts/kommunen-versand.ts": {
    tabelle: "kommunen_kontakt",
    protokoll:
      "Je Gemeinde Empfänger, Art des Empfängers, Kennung des Mailservers und der verschickte Text — " +
      "unmittelbar nach dem Senden; scheitert das Schreiben, hält der Lauf an.",
  },
  "scripts/funding-anfrage.ts": {
    tabelle: "funding_anfragen",
    protokoll: "Je Anfrage ein Eintrag VOR dem Senden, danach die Kennung des Mailservers.",
  },
  "scripts/presse-versand.ts": {
    tabelle: "presse_versand",
    protokoll: "Je Mail an eine Redaktion ein Eintrag VOR dem Senden, danach die Kennung des Mailservers.",
  },
  "lib/abo-versand.ts": {
    tabelle: "gemeinde_abos",
    protokoll:
      "Gemeinsamer Versandweg für Abo-, Bestätigungs- und Umstellungsmails; jeder Aufrufer setzt seinen " +
      "Versandmerker vor dem Senden (Abo-Lauf, Umstellungsnachricht).",
  },
};

/** Ein Befund für eine nie eingecheckte Datei, die sendet. */
export function befundUnverfolgterSender(arbeitsstand: string, dateien: string[]): string | null {
  if (!dateien.length) return null;
  return (
    `${arbeitsstand}: ${dateien.length === 1 ? "eine nie eingecheckte Datei verschickt" : `${dateien.length} nie eingecheckte Dateien verschicken`} ` +
    `Mails (${dateien.join(", ")}). Was dort hinausgeht, steht in keiner Datenbank — ` +
    "vor dem nächsten Versand über einen eingecheckten Versandlauf führen."
  );
}
