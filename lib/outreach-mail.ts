// Der Versandweg für Kommunen-Anschreiben — Regeln, nicht nur Zugangsdaten.
//
// Reine Funktionen ohne Netzzugriff, damit die Regeln testbar sind. Das
// eigentliche Senden macht scripts/kommunen-versand.ts mit nodemailer.
//
// DREI DINGE STEHEN HIER, WEIL SIE SONST NIRGENDS STEHEN WÜRDEN:
//
// 1. ÜBER WELCHEN ANBIETER NICHT GESENDET WIRD. Resend ist der Dienst, über den
//    das Kontaktformular und alle Wächter-Meldungen laufen. Seine
//    Nutzungsbedingungen verbieten Kaltakquise wörtlich; eine Sperre träfe
//    dasselbe Konto und damit die Alarm-Mails. Das private Postfach des
//    Betreibers scheidet aus demselben Grund aus, nur schlimmer: Es ist eine
//    Privatadresse in einem Vorgang, der geschäftlich ist.
// 2. DASS DER ABSENDER ZUR DOMAIN PASSEN MUSS. Der SPF-Eintrag von
//    solar-check.io erlaubt ausschließlich die Mailserver von All-Inkl
//    (`include:spf.kasserver.com`). Eine Mail mit diesem Absender über einen
//    anderen Server scheitert SPF, verfehlt die DMARC-Ausrichtung und landet
//    bei jeder größeren Verwaltung im Spam — der teuerste denkbare Fehlschlag,
//    weil er unsichtbar ist: Das Skript meldet „versendet".
// 3. DASS EIN ANSCHREIBEN OHNE PFLICHTANGABEN NICHT HINAUSGEHT. Klarname,
//    Impressum und der Herkunftshinweis nach Art. 14 DSGVO stehen im Text der
//    Vorlage. Steht einer nicht drin — weil jemand einen Entwurf von Hand
//    bearbeitet hat —, ist das kein Schönheitsfehler, sondern eine
//    Informationspflicht, die verletzt wird.

/** Anbieter, über die niemals ein Anschreiben hinausgeht. */
export const VERBOTENE_MAIL_HOSTS = [
  "resend.com",
  "smtp.resend.com",
  "gmail.com",
  "smtp.gmail.com",
  "googlemail.com",
];

export type SmtpKonfiguration = {
  host: string;
  port: number;
  user: string;
  pass: string;
  /** Absender, wie er im Kopf steht. */
  from: string;
  /** Wohin Antworten gehen sollen, falls abweichend. */
  replyTo?: string;
};

export type KonfigBefund = { ok: true; konfig: SmtpKonfiguration } | { ok: false; fehler: string[] };

/** Absender-Adresse aus einem „Name <adresse>"-Kopf herausziehen. */
export function adresseAus(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

/**
 * Versandweg aus der Umgebung lesen und prüfen.
 *
 * Prüft nicht nur auf Vollständigkeit, sondern auf die zwei Fehler, die man
 * einer laufenden Konfiguration nicht ansieht: falscher Anbieter und ein
 * Absender, der nicht zur Domain gehört, für die SPF und DKIM eingerichtet
 * sind.
 */
export function leseSmtpKonfig(env: Record<string, string | undefined>): KonfigBefund {
  const fehler: string[] = [];
  const host = (env.OUTREACH_SMTP_HOST ?? "").trim();
  const user = (env.OUTREACH_SMTP_USER ?? "").trim();
  const pass = env.OUTREACH_SMTP_PASS ?? "";
  const from = (env.OUTREACH_MAIL_FROM ?? "").trim();
  const port = parseInt(env.OUTREACH_SMTP_PORT ?? "465", 10);

  if (!host) fehler.push("OUTREACH_SMTP_HOST fehlt");
  if (!user) fehler.push("OUTREACH_SMTP_USER fehlt");
  if (!pass) fehler.push("OUTREACH_SMTP_PASS fehlt");
  if (!from) fehler.push("OUTREACH_MAIL_FROM fehlt (Format: \"Name <adresse@solar-check.io>\")");
  if (!Number.isFinite(port) || port <= 0) fehler.push(`OUTREACH_SMTP_PORT ist keine Portnummer: ${env.OUTREACH_SMTP_PORT}`);

  const hostKlein = host.toLowerCase();
  if (VERBOTENE_MAIL_HOSTS.some((h) => hostKlein === h || hostKlein.endsWith(`.${h}`))) {
    fehler.push(
      `Über ${host} wird kein Anschreiben versendet — dieser Anbieter trägt die Alarm- und Formular-Mails ` +
        "und verbietet Kaltakquise (siehe Kopf von lib/outreach-mail.ts).",
    );
  }

  const absender = adresseAus(from);
  if (from && !absender.endsWith("@solar-check.io")) {
    fehler.push(
      `Absender ${absender} gehört nicht zu solar-check.io — SPF und DKIM gelten nur für diese Domain, ` +
        "die Mail würde die Ausrichtung verfehlen.",
    );
  }

  if (fehler.length) return { ok: false, fehler };
  return { ok: true, konfig: { host, port, user, pass, from, replyTo: env.OUTREACH_MAIL_REPLY_TO?.trim() || undefined } };
}

/** Pflichtangaben, die in JEDEM Anschreiben stehen müssen. */
export const PFLICHTANGABEN: { was: string; pruefe: (text: string) => boolean }[] = [
  { was: "Klarname des Absenders", pruefe: (t) => t.includes("Sebastian Schäder") },
  { was: "Impressum-Link", pruefe: (t) => t.includes("solar-check.io/impressum") },
  { was: "Datenschutz-Link", pruefe: (t) => t.includes("solar-check.io/datenschutz") },
  { was: "Herkunftshinweis nach Art. 14 DSGVO", pruefe: (t) => t.includes("Art. 14 DSGVO") },
];

export function fehlendePflichtangaben(body: string): string[] {
  return PFLICHTANGABEN.filter((p) => !p.pruefe(body)).map((p) => p.was);
}

/**
 * Kopfzeilen einer Anschreiben-Mail.
 *
 * `List-Unsubscribe` ist bewusst dabei, obwohl es für eine einzelne
 * Geschäftsmail nicht vorgeschrieben ist: Es gibt dem Empfänger den
 * Widerspruch als Ein-Klick statt als Suchaufgabe, und es ist das Signal, an
 * dem große Mailsysteme eine ordentliche von einer unerwünschten Aussendung
 * unterscheiden. Der `mailto:`-Weg ohne One-Click-POST ist hier der richtige:
 * Ein Widerspruch soll bei einem Menschen ankommen und die Gemeinde dauerhaft
 * sperren, nicht in einem automatischen Endpunkt verschwinden.
 *
 * KEINE Kennung des Empfängers in irgendeinem Header oder Link — die
 * Datenschutzerklärung sagt zu, dass ein Aufruf sich keiner angeschriebenen
 * Kommune zuordnen lässt.
 */
export function mailKopfzeilen(o: { widerspruchAn: string; betreff: string }): Record<string, string> {
  return {
    "List-Unsubscribe": `<mailto:${o.widerspruchAn}?subject=${encodeURIComponent("Keine weiteren Nachrichten")}>`,
    "Auto-Submitted": "no",
    Precedence: "bulk",
  };
}

/**
 * Wartezeit zwischen zwei Mails, in Millisekunden.
 *
 * Nicht Höflichkeit, sondern Zustellbarkeit: 25 Mails in einer Minute aus einem
 * Postfach, das vorher nichts versendet hat, ist das Muster, auf das jeder
 * Spamfilter anspringt. Über eine Vormittagsstunde verteilt ist es das Muster
 * eines Menschen, der Mails schreibt.
 */
export const PAUSE_MS = 90_000;

/** Obergrenze je Lauf — das Tagespensum aus dem Briefing (15–25). */
export const MAX_JE_LAUF = 25;
