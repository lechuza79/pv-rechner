import { describe, it, expect } from "vitest";
import { leseSmtpKonfig, fehlendePflichtangaben, mailKopfzeilen, adresseAus, postfachBefund } from "../outreach-mail";
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
    const k = mailKopfzeilen({ widerspruchAn: "hey@solar-check.io" });
    expect(k["List-Unsubscribe"]).toContain("mailto:hey@solar-check.io");
    // Nichts, woraus sich der Empfänger ableiten ließe.
    expect(JSON.stringify(k)).not.toContain("Musterdorf");
  });

  // Die Mail ist ein einzelner Textbrief an einen Empfänger. Sich per Kopfzeile
  // selbst als Massensendung zu deklarieren, hilft der Zustellung nicht und
  // fließt bei Microsoft in die Massen-Einstufung ein.
  it("deklariert sich nicht selbst als Massensendung", () => {
    const k = mailKopfzeilen({ widerspruchAn: "hey@solar-check.io" });
    expect(k["Precedence"]).toBeUndefined();
    expect(k["Auto-Submitted"]).toBeUndefined();
  });

  it("verweigert einen Anbieter außerhalb des SPF-Eintrags", () => {
    const b = leseSmtpKonfig({ ...GUT, OUTREACH_SMTP_HOST: "smtp.strato.de" });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.fehler.join(" ")).toContain("SPF-Eintrag");
  });

  it("verweigert einen Absender, der nicht das angemeldete Konto ist", () => {
    const b = leseSmtpKonfig({ ...GUT, OUTREACH_SMTP_USER: "anders@solar-check.io" });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.fehler.join(" ")).toContain("SMTP-Konto");
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

// Zwei Briefe des ersten Schubs gingen an das Amtspostfach einer ANDEREN
// Kommune, mehrere an Adressen mit dem Nachnamen eines ehrenamtlichen
// Ortsbürgermeisters. Beides entsteht beim Einsammeln; hier wird es abgefangen.
describe("Wer Empfänger sein darf", () => {
  it("nimmt ein Funktionspostfach auf der Domain des Ortes", () => {
    expect(postfachBefund("info@riedstadt.de", "Riedstadt").ok).toBe(true);
    expect(postfachBefund("stadtkommunikation@langen.de", "Langen (Hessen)").ok).toBe(true);
    expect(postfachBefund("gemeinde@muendersbach.de", "Mündersbach").ok).toBe(true);
  });

  it("nimmt eine gemeinsame Verwaltung, wenn die Domain sich als solche zu erkennen gibt", () => {
    expect(postfachBefund("rathaus@vgv-kelberg.de", "Gelenberg").ok).toBe(true);
    expect(postfachBefund("info@bitburgerland.de", "Hamm").ok).toBe(true);
  });

  // Daubach liegt in der VG Nahe-Glan; bad-sobernheim.de ist die Stadt
  // nebenan, die zufällig im selben Haus sitzt.
  it("verweigert eine Domain, die schlicht einen anderen Ortsnamen trägt", () => {
    const b = postfachBefund("stadtbuergermeister@bad-sobernheim.de", "Daubach");
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.grund).toContain("Zuordnung ungeprüft");
    expect(postfachBefund("info@betzdorf.de", "Scheuerfeld").ok).toBe(false);
  });

  it("verweigert ein Postfach mit Personennamen", () => {
    const b = postfachBefund("buergermeister-klein@badem.de", "Badem");
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.grund).toContain("Personenname");
  });

  it("verweigert die Website-Betreuung und Datenschutz-Postfächer", () => {
    expect(postfachBefund("webmaster@winterbachsoonwald.de", "Winterbach").ok).toBe(false);
    expect(postfachBefund("datenschutz@riedstadt.de", "Riedstadt").ok).toBe(false);
  });

  it("lässt den Ortsnamen als Zusatz im Postfachnamen zu", () => {
    // Der Zusatz ist der Ortsname, kein Personenname — der Postfach-Teil ist
    // also in Ordnung. Ob die Domain (hier die der Verbandsgemeinde) zum Ort
    // gehört, ist die zweite, davon unabhängige Frage.
    const b = postfachBefund("buergermeister.immert@erbeskopf.de", "Immert");
    if (!b.ok) expect(b.grund).not.toContain("Personenname");
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
