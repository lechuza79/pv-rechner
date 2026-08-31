import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ABGEMELDET_MAX_TAGE, UNBESTAETIGT_MAX_TAGE } from "../gemeinde-abo";
import { aboBestaetigungsMail } from "../abo-mail";

// Die Datenschutzerklärung ist eine ZUSAGE, keine Bestandsaufnahme — und die
// gefährlichsten Falschaussagen des Projekts standen genau dort („keine
// Nutzer-Accounts, keine Cookies", während es beides gab).
//
// Dieser Test hält die veröffentlichten Sätze über das Abo gegen den Code, der
// sie einlösen muss. Er prüft auf die AUSSAGE per Muster, nicht auf den
// Wortlaut: Eine frühere Fassung eines solchen Tests verbot „alle Werte, mit
// denen wir rechnen", während die Seite „alle Annahmen" sagte — ein Wort
// daneben, Test grün, Falschaussage auf jeder Seite.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/**
 * Fließtext im JSX bricht um, wo Prettier es für richtig hält.
 *
 * Ein Test, der einen Satz als EINE Zeile sucht, prüft damit die Formatierung
 * und nicht die Aussage — er wird bei einem Prettier-Lauf rot und lässt eine
 * echte Änderung durch, sobald sie den Umbruch mitverschiebt. Deshalb wird der
 * Text vor dem Vergleich auf einfache Leerzeichen normalisiert.
 */
const fliessend = (s: string) => s.replace(/\s+/g, " ");

describe("Was die Datenschutzerklärung über das Abo zusagt", () => {
  const dse = fliessend(lies("app/(site)/datenschutz/page.tsx"));

  it("hat überhaupt einen Abschnitt dazu", () => {
    // Das Kontaktformular stand einen Tag nach seinem Livegang mit keinem Wort
    // in der Erklärung. Dieselbe Lücke soll hier nicht entstehen.
    expect(dse).toMatch(/Meldungen zu einer Gemeinde/);
  });

  it("nennt das Bestätigungsverfahren und die Einwilligung als Grundlage", () => {
    expect(dse).toMatch(/Bestätigungsverfahren/);
    expect(dse).toMatch(/Art\.\s*6\s*Abs\.\s*1\s*lit\.\s*a\s*DSGVO/);
  });

  it("sagt die Löschung nicht bestätigter Eintragungen zu — und der Code kann sie", () => {
    expect(dse).toMatch(/Klickst du nicht, wird die Eintragung gelöscht/);
    // Ohne eine endliche Frist im Code wäre der Satz eine Absichtserklärung.
    expect(UNBESTAETIGT_MAX_TAGE).toBeGreaterThan(0);
    expect(UNBESTAETIGT_MAX_TAGE).toBeLessThanOrEqual(30);
  });

  it("nennt zwölf Monate — und der Code rechnet mit demselben Zeitraum", () => {
    // Die Zahl steht an zwei Stellen: als Wort in der Erklärung, als Frist im
    // Code. Laufen sie auseinander, ist die veröffentlichte Aussage falsch.
    expect(dse).toMatch(/nach zwölf Monaten wird der Eintrag entfernt/);
    expect(ABGEMELDET_MAX_TAGE).toBeGreaterThanOrEqual(365);
    expect(ABGEMELDET_MAX_TAGE).toBeLessThan(400);
  });

  it("sagt zu, dass keine IP-Adresse gespeichert wird — und der Code speichert keine", () => {
    expect(dse).toMatch(/IP-Adresse speichern wir dabei nicht/);
    // Gegenprobe am Code: Die Ablage darf kein IP-Feld beschreiben.
    const ablage = lies("lib/gemeinde-abo.ts");
    const anmelden = lies("app/api/abo/anmelden/route.ts");
    expect(ablage).not.toMatch(/\bip\b\s*:/i);
    // Die Anmelde-Route liest eine Herkunft für die Ratenbegrenzung — sie darf
    // sie NICHT in die Ablage geben.
    expect(anmelden).not.toMatch(/insert\([^)]*\bip\b/i);
  });

  it("sagt zu, dass keine Zählpixel in den Mails stecken — und es steckt keiner drin", () => {
    expect(dse).toMatch(/<strong>keine Zählpixel<\/strong>/);
    const mail = lies("lib/abo-mail.ts");
    // Kein Bild überhaupt: Ein Zählpixel ist ein <img>, und die Vorlage kommt
    // ohne jedes Bild aus (die Wortmarke steht als Text).
    expect(mail).not.toMatch(/<img/i);
  });

  it("nennt die Herkunftsangabe, die wir am Abo speichern", () => {
    // Seit 31.08.2026 merken wir uns, WO jemand sich eingetragen hat (Atlas-
    // oder Förderseite) und ob der Aufruf über ein Anschreiben kam. Das sind
    // zwei zusätzliche Angaben an einer E-Mail-Adresse — und was wir speichern,
    // steht in der Erklärung, sonst ist sie unvollständig.
    expect(dse).toMatch(/auf welcher Seite du dich eingetragen hast/);
    expect(dse).toMatch(/über ein Anschreiben an die Gemeinde/);
  });

  it("verspricht die Abmeldung mit einem Klick ohne Anmeldung", () => {
    expect(dse).toMatch(/jederzeit abmelden/);
    expect(dse).toMatch(/ohne Anmeldung/);
  });
});

describe("Was die Bestätigungsmail zusagt", () => {
  const mail = aboBestaetigungsMail({
    ortName: "Musterdorf",
    bestaetigenUrl: "https://solar-check.io/abo/bestaetigen?t=x.1.y",
  });

  it("sagt, dass ohne Klick nichts passiert — und dass die Eintragung verfällt", () => {
    expect(mail.html).toMatch(/Ohne diesen Klick verschicken wir nichts/);
    expect(mail.html).toMatch(/von selbst gelöscht/);
  });

  it("nennt die Gültigkeitsdauer des Links", () => {
    expect(mail.html).toMatch(/48 Stunden/);
  });
});
