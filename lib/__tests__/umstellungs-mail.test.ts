import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SIGNATURE } from "../kommunen-outreach-draft";
import { umstellungsMail, beipackBefund, loeschdatum, VERBOTEN_IN_UMSTELLUNGSMAIL } from "../umstellungs-mail";

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
  const jetzt = new Date("2026-09-02T12:00:00Z");
  const mail = umstellungsMail({ gruppe: "bestaetigt", jetzt });
  const loesch = umstellungsMail({ gruppe: "unbestaetigt", jetzt });

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
    expect(beipackBefund(mail.html + "<p>Meldungen zu deiner Gemeinde abonnieren</p>")).toContain(
      "Hinweis auf das Themen-Abo",
    );
  });

  it("trägt keinen fertigen Zugang, sondern führt auf die Anmeldeseite", () => {
    // Ein Anmeldelink in der Mail bliebe als gültiger Kontozugang im Postfach
    // liegen — und die Nachricht trüge punktgenau das Muster einer
    // Phishing-Mail. Den kurzlebigen Link fordert der Nutzer selbst an.
    expect(mail.html).toContain("https://solar-check.io/login");
    expect(mail.html).not.toMatch(/token|code=|access_token|\{\{/i);
  });

  it("sagt, WIE man wieder hineinkommt", () => {
    // Die einzige Frage, die jemand beim Lesen wirklich hat. Sie haben kein
    // Passwort und bekommen hier auch keins — ohne den Weg über „Passwort
    // vergessen" stehen sie vor einem Formular, in das sie nichts eintragen
    // können.
    expect(mail.html.replace(/\s+/g, " ")).toMatch(/Passwort vergessen/);
    expect(mail.html).toContain("https://solar-check.io/login");
    expect(mail.html).not.toMatch(/Berechnungen sind unverändert/); // niemand hat welche
  });

  it("ist eine persönliche Mail, KEINE gestaltete Systemmail", () => {
    // Umgekehrt zur ersten Fassung (Betreiber, 03.09.2026): Eine gestaltete
    // Mail über eine geänderte Anmeldung trägt genau die Merkmale, an denen
    // man Phishing erkennt. Wortmarke und Karte gehören hier NICHT hinein.
    expect(mail.html).not.toContain('alt="Solar Check"');
    expect(mail.html).not.toMatch(/<table/i);
    expect(mail.text).toContain("Viele Grüße\nSebastian Schäder");
    // Dieselbe Signatur wie im Kommunen-Anschreiben, nicht eine zweite
    // Fassung — wer hier antwortet, landet in demselben Postfach.
    expect(mail.text).toContain(SIGNATURE);
    expect(mail.html).toContain("/impressum");
    expect(mail.html).toContain("/datenschutz");
  });

  it("trägt KEINE Systemzeile über den Grund der Zusendung", () => {
    // Sie war da und ist bewusst raus (Betreiber, 03.09.2026): „Diese E-Mail
    // bekommst du, weil …" ist der Systemton, gegen den die Nachricht gebaut
    // ist. Rechtlich verlangt ihn hier nichts — der Empfänger hat sich selbst
    // eingetragen, es gibt keinen Verteiler. Impressum und Datenschutz bleiben.
    expect(mail.html).not.toMatch(/Diese E-Mail bekommst du, weil/);
    expect(mail.html).toContain("/impressum");
    expect(mail.html).toContain("/datenschutz");
    // Die Bestätigten haben KEIN Passwort. Ohne diesen Hinweis stehen sie vor
    // einem Anmeldeformular, in das sie nichts eintragen können.
    expect(mail.text).toMatch(/Passwort vergessen/);
  });

  it("gibt jeder Gruppe ihre eigene Fassung", () => {
    const skript = lies("scripts/umstellungs-versand.ts");
    expect(skript).toMatch(/email_confirmed_at\s*\?\s*bestaetigt\s*:\s*unbestaetigt/);
    // Nie zwei Gruppen mit derselben Nachricht bedienen — die Fassungen
    // unterscheiden sich in dem, was sie überhaupt tragen darf.
    expect(skript).toContain("fassungen[gruppe]");
    expect(mail.betreff).not.toBe(loesch.betreff);
  });

  it("stellt bei den Unbestätigten die Löschung nach vorn", () => {
    // Sie ist der GRUND der Nachricht. Kommt sie als Nachsatz hinter einer
    // Einladung, ist sie ein Vorwand, und die Nachricht trägt nichts mehr.
    expect(loesch.betreff).toMatch(/löschen|gelöscht/i);
    const ueberschrift = loesch.text.indexOf("automatisch gelöscht");
    const neuerungen = loesch.text.indexOf("einiges");
    expect(ueberschrift).toBeGreaterThan(-1);
    expect(neuerungen).toBeGreaterThan(-1);
    expect(ueberschrift, "Neuerungen stehen vor der Löschankündigung").toBeLessThan(neuerungen);
    // Und sie sagt, dass Nichtstun genügt.
    // Gegen den FLIESSTEXT geprüft, nicht gegen die umbrochenen Zeilen: Die
    // Textfassung bricht bei 78 Zeichen um, und wo der Umbruch fällt, ist eine
    // Formatfrage — ein Test, der daran hängt, prüft die Zeilenbreite statt der
    // Aussage.
    const fliess = loesch.text.replace(/\s+/g, " ");
    expect(fliess).toMatch(/falls du nichts tust/);
  });

  it("nennt in beiden Fassungen dieselbe Löschfrist wie der Versandlauf", () => {
    // Im BETREFF steht das Datum bewusst nicht (Betreiber, 03.09.2026): Er
    // muss im Postfach in einer Zeile lesbar sein, und die Frist steht im
    // ersten Absatz. Im Text steht sie zwingend — sie ist der Grund der Mail.
    const frist = loeschdatum(jetzt);
    expect(loesch.betreff).toMatch(/gelöscht/);
    expect(loesch.betreff.length).toBeLessThan(50);
    expect(loesch.html).toContain(frist);
    expect(loesch.text).toContain(frist);
  });

  it("hält die Neuerungen auf drei begrenzt", () => {
    // Was darüber hinausgeht, ist ein Newsletter — und dafür bräuchte es eine
    // Einwilligung, die hier niemand erteilt hat.
    const quelle = lies("lib/umstellungs-mail.ts");
    const liste = quelle.slice(quelle.indexOf("const NEUERUNGEN"), quelle.indexOf("function neuerungenHtml"));
    // Gezählt werden die Einträge, nicht das Wort — im Typ steht es auch.
    expect((liste.match(/^\s{2}\{ was:/gm) ?? []).length).toBeLessThanOrEqual(3);
    expect((liste.match(/^\s{2}\{ was:/gm) ?? []).length).toBeGreaterThan(0);
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
    const schleife = skript.slice(skript.indexOf("for (const { adresse, gruppe } of offen)"));
    const merker = schleife.indexOf("protokollSchreiben");
    const versand = schleife.indexOf("sendeAboMail");
    expect(merker).toBeGreaterThan(-1);
    expect(versand).toBeGreaterThan(-1);
    expect(merker, "Merker wird erst nach dem Versand geschrieben").toBeLessThan(versand);
  });
});
