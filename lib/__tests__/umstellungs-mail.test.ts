import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { umstellungsMail, beipackBefund, VERBOTEN_IN_UMSTELLUNGSMAIL } from "../umstellungs-mail";

/**
 * Wächter für die einmalige Nachricht zur Umstellung der Anmeldung.
 *
 * SIE IST KEINE WERBUNG — sie führt ein bestehendes Nutzungsverhältnis fort.
 * Genau diese Einordnung kippt, sobald irgendetwas beigepackt wird: Der
 * Bundesgerichtshof hat eine im Kern zulässige Rechnungsmail allein wegen
 * einer angehängten Zufriedenheitsbefragung als unzulässige Werbung eingestuft
 * (VI ZR 225/17). Legal-Judge am 02.09.2026, Fundstellen im Volltext geprüft.
 */

const ROOT = join(__dirname, "..", "..");
const lies = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("Nachricht zur Umstellung der Anmeldung", () => {
  const mail = umstellungsMail();

  it("trägt keinen werblichen Beipack", () => {
    expect(beipackBefund(mail.html)).toEqual([]);
    expect(beipackBefund(mail.text)).toEqual([]);
    // Die Prüfung muss überhaupt etwas suchen — eine leere Liste wäre eine,
    // die alles durchlässt.
    expect(VERBOTEN_IN_UMSTELLUNGSMAIL.length).toBeGreaterThan(3);
  });

  it("erkennt einen Beipack, wenn einer da wäre", () => {
    // Gegenprobe im Test selbst: Ohne sie prüfte er nur, dass unser Text
    // sauber ist — nicht, dass die Prüfung überhaupt greift.
    expect(beipackBefund(mail.html + "<p>Folge uns auf LinkedIn</p>")).toContain("Verweis auf soziale Netze");
    expect(beipackBefund(mail.html + "<p>Jetzt berechnen</p>")).toContain("Aufforderung zur Nutzung");
  });

  it("trägt keinen fertigen Zugang, sondern führt auf die Anmeldeseite", () => {
    // Ein Anmeldelink in der Mail bliebe als gültiger Kontozugang im Postfach
    // liegen — und die Nachricht trüge punktgenau das Muster einer
    // Phishing-Mail. Den kurzlebigen Link fordert der Nutzer selbst an.
    expect(mail.html).toContain("https://solar-check.io/login");
    expect(mail.html).not.toMatch(/token|code=|access_token|\{\{/i);
  });

  it("sagt, dass Konto und Berechnungen unverändert da sind", () => {
    // Die einzige Frage, die jemand beim Lesen wirklich hat.
    expect(mail.html).toMatch(/unverändert da/);
    expect(mail.text).toMatch(/unverändert da/);
  });

  it("hat dieselbe Hülle wie alle anderen Mails an Nutzer", () => {
    expect(mail.html).toContain('alt="Solar Check"');
    expect(mail.html).toContain("/impressum");
    expect(mail.html).toContain("/datenschutz");
  });

  it("nennt den Grund, warum die Nachricht kam", () => {
    expect(mail.html).toMatch(/weil du bei Solar Check ein Konto hast/);
  });

  it("geht laut Versandlauf nur an bestätigte Adressen", () => {
    // Wer den Anmeldelink nie eingelöst hat, hat im doppelten
    // Bestätigungsverfahren Nein gesagt. Eine zweite Mail behandelte dieses
    // Nein als Vielleicht.
    const skript = lies("scripts/umstellungs-versand.ts");
    expect(skript).toMatch(/email_confirmed_at\s*\?\s*bestaetigt\s*:\s*unbestaetigt/);
    expect(skript).toContain("bekommen NICHTS");
  });

  it("verschickt ohne ausdrückliche Ansage gar nichts", () => {
    const skript = lies("scripts/umstellungs-versand.ts");
    expect(skript).toContain('process.argv.includes("--senden")');
    expect(skript).toMatch(/if \(!senden\)[\s\S]{0,200}return;/);
  });

  it("schreibt niemanden zweimal an", () => {
    // Der Merker wird VOR dem Versand geschrieben: Bricht der Lauf zwischen
    // zwei Adressen ab, darf der Neustart niemanden ein zweites Mal treffen.
    const skript = lies("scripts/umstellungs-versand.ts");
    const schleife = skript.slice(skript.indexOf("for (const adresse of offen)"));
    const merker = schleife.indexOf("protokollSchreiben");
    const versand = schleife.indexOf("sendeAboMail");
    expect(merker).toBeGreaterThan(-1);
    expect(versand).toBeGreaterThan(-1);
    expect(merker, "Merker wird erst nach dem Versand geschrieben").toBeLessThan(versand);
  });
});
