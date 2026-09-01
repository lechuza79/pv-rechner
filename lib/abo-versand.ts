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

/**
 * Der Versand meldet zurück, WAS der Mailserver bestätigt hat.
 *
 * `beleg` ist die Kennung, die der Server der angenommenen Nachricht gibt. Sie
 * ist der Nachweis, DASS eine Bestätigungsmail hinausging — den verlangt der
 * BGH (I ZR 164/09 Rn. 38: „Speicherung und die jederzeitige Möglichkeit, sie
 * auszudrucken"), und an seinem Fehlen ist ein Versender vor dem VG Düsseldorf
 * gescheitert (29 K 9714/24 Rn. 46).
 *
 * KEINE KOPIE DER MAIL: Der Inhalt lässt sich aus der gespeicherten Fassung des
 * Einwilligungstexts wortgleich neu erzeugen. Eine zweite Kopie jeder Mail wäre
 * mehr Daten für denselben Nachweis (EDSA 05/2020 Rn. 106, Datenminimierung).
 */
export type VersandErgebnis = { ok: true; beleg: string | null } | { ok: false; fehler: string };

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
    const quittung = await transport.sendMail({
      from: befund.konfig.from,
      to: o.an,
      subject: o.subject,
      text: o.text,
      html: o.html,
      headers: o.abmeldeUrl ? aboMailKopfzeilen(o.abmeldeUrl) : undefined,
    });
    // Der Server gibt die Kennung zurück, unter der er die Nachricht
    // angenommen hat. Fehlt sie (ein Server muss sie nicht liefern), bleibt der
    // Beleg leer statt erfunden.
    const beleg = typeof quittung?.messageId === "string" ? quittung.messageId : null;
    return { ok: true, beleg };
  } catch (e) {
    return { ok: false, fehler: e instanceof Error ? e.message : String(e) };
  }
}
