import "server-only";

// Eine Abo-Mail wirklich verschicken.
//
// Der Versandweg ist DERSELBE wie beim Kommunen-Anschreiben — das eigene
// Postfach bei All-Inkl, geprüft von `leseSmtpKonfig`. Das ist keine
// Bequemlichkeit, sondern die Trennung, auf die es ankommt: Der andere
// Mail-Dienst im Projekt trägt das Kontaktformular UND sämtliche
// Wächter-Alarme. Eine wachsende Verteilerliste dort würde bei der ersten
// Beschwerdewelle dasselbe Konto treffen — und dann kommen die Alarm-Mails
// nicht mehr an, ohne dass es jemandem auffällt.
//
// WAS VOM ANSCHREIBEN NICHT ÜBERNOMMEN WIRD, und warum:
//
//   Schulferien, Wochentag, Tagespensum — das sind Bremsen gegen KALTAKQUISE.
//   Sie sollen verhindern, dass eine unverlangte Mail zur Unzeit im Rathaus
//   liegt. Bei einem Abo hat der Empfänger darum gebeten; ihm seine Meldung
//   vorzuenthalten, weil in seinem Bundesland Ferien sind, wäre keine
//   Rücksicht, sondern ein Fehler.
//
//   Die Rollen-Postfach-Prüfung — sie stellt sicher, dass eine unverlangte
//   Mail an eine Funktion geht und nicht an eine Person. Ein Abo ist der
//   umgekehrte Fall: Es IST die Adresse einer Person, und die hat sie selbst
//   eingetragen.
//
// WAS BLEIBT: die Prüfung des Versandwegs (richtiger Anbieter, Absender gehört
// zur Domain, Konto und Absender sind dieselben) und die Pflichtangaben. Beides
// sind Zustellbarkeits- und Rechtsfragen und gelten unabhängig davon, ob jemand
// gefragt hat.

import { leseSmtpKonfig } from "./outreach-mail";
import { aboMailKopfzeilen, fehlendeAboPflichtangaben, type AboMailArt } from "./abo-mail";

export type VersandErgebnis = { ok: true } | { ok: false; fehler: string };

/**
 * Eine einzelne Abo-Mail versenden.
 *
 * `abmeldeUrl` ist Pflicht, sobald es eine Meldung ist — sie speist die
 * Kopfzeile für die Ein-Klick-Abmeldung. Bei der Bestätigungsmail entfällt
 * sie: Dort gibt es noch nichts, wovon man sich abmelden könnte, und eine
 * Abmelde-Kopfzeile auf einer transaktionalen Mail lässt Postfächer die
 * Bestätigung selbst als Werbung einstufen.
 */
export async function sendeAboMail(o: {
  an: string;
  subject: string;
  html: string;
  text: string;
  abmeldeUrl?: string;
  /**
   * Welche Art Mail. Entscheidet, welche Pflichtangaben gelten — die
   * Bestätigung trägt keinen Abmeldelink, und ohne diese Unterscheidung wies
   * die Prüfung sie ab (siehe lib/abo-mail.ts).
   */
  art: AboMailArt;
}): Promise<VersandErgebnis> {
  const befund = leseSmtpKonfig(process.env);
  if (!befund.ok) {
    return { ok: false, fehler: `Versandweg nicht einsatzbereit: ${befund.fehler.join(" · ")}` };
  }

  // Die Pflichtangaben werden am fertigen HTML geprüft, nicht an der Vorlage.
  // Eine Vorlage kann richtig sein und trotzdem falsch zusammengesetzt werden;
  // geprüft wird das, was hinausgeht.
  const fehlend = fehlendeAboPflichtangaben(o.html, o.art);
  if (fehlend.length) {
    return { ok: false, fehler: `Pflichtangaben fehlen: ${fehlend.join(", ")}` };
  }

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: befund.konfig.host,
    port: befund.konfig.port,
    secure: befund.konfig.port === 465,
    auth: { user: befund.konfig.user, pass: befund.konfig.pass },
  });

  try {
    await transport.sendMail({
      from: befund.konfig.from,
      to: o.an,
      subject: o.subject,
      text: o.text,
      html: o.html,
      headers: o.abmeldeUrl ? aboMailKopfzeilen(o.abmeldeUrl) : undefined,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, fehler: e instanceof Error ? e.message : String(e) };
  }
}
