import { describe, it, expect } from "vitest";
import { leseSmtpKonfig, fehlendePflichtangaben, mailKopfzeilen, adresseAus } from "../outreach-mail";
import { ordneEin, STATUS_ZU_ART } from "../outreach-ruecklauf";
import { renderOutreachDraft } from "../kommunen-outreach-draft";

const GUT = {
  OUTREACH_SMTP_HOST: "w01cbc22.kasserver.com",
  OUTREACH_SMTP_PORT: "465",
  OUTREACH_SMTP_USER: "hey@solar-check.io",
  OUTREACH_SMTP_PASS: "geheim",
  OUTREACH_MAIL_FROM: "Sebastian Schäder <hey@solar-check.io>",
};

describe("Versandweg", () => {
  it("nimmt eine vollständige Konfiguration an", () => {
    const b = leseSmtpKonfig(GUT);
    expect(b.ok).toBe(true);
    if (b.ok) expect(b.konfig.port).toBe(465);
  });

  // Resend trägt das Kontaktformular und alle Wächter-Meldungen. Eine Sperre
  // wegen Kaltakquise träfe dasselbe Konto — dann kommen auch die Alarm-Mails
  // nicht mehr an, und zwar ohne dass es jemandem auffällt.
  it("verweigert den Anbieter, über den die Alarm-Mails laufen", () => {
    const b = leseSmtpKonfig({ ...GUT, OUTREACH_SMTP_HOST: "smtp.resend.com" });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.fehler.join(" ")).toContain("Kaltakquise");
  });

  it("verweigert das private Postfach", () => {
    const b = leseSmtpKonfig({ ...GUT, OUTREACH_SMTP_HOST: "smtp.gmail.com" });
    expect(b.ok).toBe(false);
  });

  // Der SPF-Eintrag von solar-check.io erlaubt nur die Mailserver von All-Inkl.
  // Ein fremder Absender besteht die Ausrichtung nicht und landet im Spam —
  // der teuerste Fehlschlag, weil das Skript trotzdem „versendet" meldet.
  it("verweigert einen Absender außerhalb der eigenen Domain", () => {
    const b = leseSmtpKonfig({ ...GUT, OUTREACH_MAIL_FROM: "Sebastian <sebastian@gmail.com>" });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.fehler.join(" ")).toContain("SPF");
  });

  it("meldet fehlende Angaben einzeln statt pauschal", () => {
    const b = leseSmtpKonfig({});
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.fehler.length).toBeGreaterThanOrEqual(4);
  });

  it("liest die Adresse aus einem Namen-Kopf", () => {
    expect(adresseAus("Sebastian Schäder <hey@solar-check.io>")).toBe("hey@solar-check.io");
    expect(adresseAus("hey@solar-check.io")).toBe("hey@solar-check.io");
  });

  it("die Kopfzeilen tragen einen Ein-Klick-Widerspruch und keine Empfänger-Kennung", () => {
    const k = mailKopfzeilen({ widerspruchAn: "hey@solar-check.io", betreff: "Musterdorf auf Platz 1" });
    expect(k["List-Unsubscribe"]).toContain("mailto:hey@solar-check.io");
    // Nichts, woraus sich der Empfänger ableiten ließe.
    expect(JSON.stringify(k)).not.toContain("Musterdorf");
  });
});

// Klarname, Impressum und Herkunftshinweis sind Informationspflichten, keine
// Höflichkeit. Ein von Hand bearbeiteter Entwurf kann sie verlieren — deshalb
// prüft der Versand jeden einzelnen Text, nicht die Vorlage.
describe("Pflichtangaben", () => {
  const brief = renderOutreachDraft({
    name: "Musterdorf",
    pageUrl: "https://solar-check.io/solar-atlas/hessen/kreis/musterdorf",
    betreff: "Musterdorf bei Hausspeichern auf Platz 1 im Landkreis",
    einstieg: "Musterdorf hat die meiste private Speicherkapazität — Platz 1 von 34.",
    variante: "nur_meldung",
    wo: "im Landkreis Musterkreis",
    bestleistung: "die meiste private Speicherkapazität",
    themaDativ: "privater Speicherkapazität je Einwohner",
    phrase: "bei Hausspeichern",
    gruppe: "Kleinen Gemeinden im Landkreis Musterkreis",
    rang: { platz: 1, von: 34 },
    rangWert: "53,4 kWh",
    zahlen: { anlagen: 412, leistungKwp: 3800, privatDachKwp: 2900, wpProKopf: 1200, stand: "2026-08-05" },
  });

  it("die Vorlage trägt alle vier", () => {
    expect(fehlendePflichtangaben(brief.body)).toEqual([]);
  });

  it("ein Text ohne Herkunftshinweis wird beanstandet", () => {
    const ohne = brief.body.replace(/Datenschutz-Hinweis \(Art\. 14 DSGVO\)/, "Hinweis");
    expect(fehlendePflichtangaben(ohne)).toContain("Herkunftshinweis nach Art. 14 DSGVO");
  });

  it("ein Text ohne Impressum wird beanstandet", () => {
    const ohne = brief.body.replace(/solar-check\.io\/impressum/g, "example.org");
    expect(fehlendePflichtangaben(ohne)).toContain("Impressum-Link");
  });
});

describe("Rückläufer einordnen", () => {
  const mail = (o: Partial<Parameters<typeof ordneEin>[0]>) =>
    ordneEin({ von: "info@musterdorf.de", betreff: "", text: "", ...o });

  it("erkennt eine Unzustellbarkeit am Absender und am Fehlercode", () => {
    expect(
      mail({
        von: "MAILER-DAEMON@kasserver.com",
        betreff: "Undelivered Mail Returned to Sender",
        text: "550 5.1.1 <info@musterdorf.de>: Recipient address rejected: User unknown",
      }),
    ).toBe("unzustellbar");
  });

  it("hält eine Verzögerung NICHT für eine Unzustellbarkeit", () => {
    expect(
      mail({
        von: "MAILER-DAEMON@kasserver.com",
        betreff: "Delivery Status Notification (Delay)",
        text: "Your message has not been delivered yet. The server will retry.",
      }),
    ).toBe("abwesenheit");
  });

  it("erkennt eine Urlaubsantwort und zählt sie nicht als Antwort", () => {
    expect(mail({ betreff: "Automatische Antwort: Musterdorf auf Platz 1" })).toBe("abwesenheit");
    expect(mail({ betreff: "Re: Musterdorf", kopf: { "auto-submitted": "auto-replied" } })).toBe("abwesenheit");
    expect(STATUS_ZU_ART.abwesenheit).toBeNull();
  });

  it("erkennt einen Widerspruch und sperrt", () => {
    expect(mail({ betreff: "Re: Musterdorf", text: "Bitte keine weiteren Nachrichten an uns." })).toBe("widerspruch");
    expect(STATUS_ZU_ART.widerspruch).toBe("gesperrt");
  });

  // Eine Unzustellbarkeit zitiert unseren Brief mit. Stünde die Widerspruchs-
  // Suche vorher, würde sie in diesem Zitat fündig und sperrte eine Gemeinde,
  // die nie etwas gesagt hat.
  it("ein zitierter Brieftext in einer Fehlermeldung ist kein Widerspruch", () => {
    expect(
      mail({
        von: "MAILER-DAEMON@kasserver.com",
        betreff: "Mail delivery failed: returning message to sender",
        text: "550 user unknown — Original message: … Ihr Widerspruchsrecht: https://solar-check.io/datenschutz",
      }),
    ).toBe("unzustellbar");
  });

  it("alles andere ist eine echte Antwort", () => {
    expect(mail({ betreff: "Re: Musterdorf auf Platz 1", text: "Vielen Dank, wir nehmen das auf." })).toBe("antwort");
    expect(STATUS_ZU_ART.antwort).toBe("geantwortet");
  });
});
