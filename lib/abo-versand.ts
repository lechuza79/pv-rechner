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

import { leseSmtpKonfig, anmeldeBefundAus, adresseAus, type AnmeldeBefund, type SmtpKonfiguration } from "./outreach-mail";
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
  /**
   * Abweichender Absender, z. B. für die einmalige persönliche Nachricht.
   *
   * NUR auf derselben Domain — sonst brechen SPF und DKIM, und die Mail landet
   * genau dort, wo die Vorgänger schon lagen. Ein fremder Absender wird
   * abgewiesen statt stillschweigend durch den Standard ersetzt: Wer eine
   * Absenderadresse angibt und eine andere verschickt bekommt, merkt es nie.
   */
  absender?: string;
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

  const standardDomain = adresseAus(befund.konfig.from).split("@")[1] ?? "";
  if (o.absender && adresseAus(o.absender).split("@")[1] !== standardDomain) {
    return {
      ok: false,
      fehler: `Absender ${adresseAus(o.absender)} liegt nicht auf ${standardDomain} — SPF und DKIM würden brechen.`,
    };
  }

  const transport = await baueTransport(befund.konfig);

  try {
    const quittung = await transport.sendMail({
      from: o.absender ?? befund.konfig.from,
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

// ─── Die Verbindung zum Postfach ─────────────────────────────────────────────
//
// EINE Stelle für beides — Versand und Anmeldeprobe. Zwei Fassungen davon
// liefen unweigerlich auseinander, und dann prüfte die Probe eine Verbindung,
// die der Versand so gar nicht aufbaut: Sie meldete grün, während der echte
// Versand an einem anderen Port scheitert.

/** Zeitgrenzen der Anmeldeprobe. Der Versand selbst läuft ohne — siehe unten. */
const PROBE_TIMEOUT_MS = 8000;

async function baueTransport(konfig: SmtpKonfiguration, timeoutMs?: number) {
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport({
    host: konfig.host,
    port: konfig.port,
    secure: konfig.port === 465,
    auth: { user: konfig.user, pass: konfig.pass },
    // NUR DIE PROBE BEKOMMT EINE ZEITGRENZE. Sie hängt an einer Route, die
    // alle drei Stunden abgefragt wird; ein hängender Verbindungsversuch
    // blockierte dort eine Funktion, bis die Plattform sie abräumt. Der
    // Versand behält die großzügigen Vorgabewerte der Mail-Bibliothek: Dort
    // ist ein Abbruch teurer als ein langsamer Server, weil eine
    // Bestätigungsmail dann gar nicht ankommt.
    ...(timeoutMs
      ? { connectionTimeout: timeoutMs, greetingTimeout: timeoutMs, socketTimeout: timeoutMs }
      : {}),
  });
}

/**
 * Nimmt das Postfach unsere Zugangsdaten an? Meldet sich an, sendet nichts.
 *
 * DER ANLASS (02.09.2026): Die Bereitschaftsprüfung sagte „gesetzt" und meinte
 * genau das — ob ein Passwort auch STIMMT, sieht man ihm nicht an. Diese Probe
 * schließt die Lücke bis zum letzten Glied, das ohne einen echten Empfänger
 * messbar ist.
 *
 * Sie verschickt bewusst KEINE Testmail: Jede Mail braucht einen Empfänger,
 * und ein Postfach, das nur zum Prüfen angeschrieben wird, ist entweder ein
 * echter Mensch (dem man alle drei Stunden schreibt) oder eine Adresse, deren
 * Erreichbarkeit selbst wieder niemand prüft. Die Anmeldung beweist
 * Zugangsdaten und Erreichbarkeit; die Zustellung beweist erst eine echte
 * Mail an einen echten Menschen.
 */
export async function pruefePostfachAnmeldung(
  env: Record<string, string | undefined> = process.env,
): Promise<AnmeldeBefund> {
  const befund = leseSmtpKonfig(env);
  // Ohne vollständige Zugangsdaten gibt es nichts zu probieren, und der Grund
  // steht bereits im Befund daneben. Zwei Meldungen über dieselbe Ursache sind
  // der Lärm, von dem man sich abgewöhnt, Meldungen zu lesen.
  if (!befund.ok) return "nicht-konfiguriert";
  try {
    const transport = await baueTransport(befund.konfig, PROBE_TIMEOUT_MS);
    await transport.verify();
    transport.close();
    return "ok";
  } catch (e) {
    return anmeldeBefundAus(e);
  }
}
