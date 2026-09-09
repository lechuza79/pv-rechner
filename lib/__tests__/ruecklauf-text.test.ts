import { describe, it, expect } from "vitest";
import { ordneEin } from "../outreach-ruecklauf";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { notizZeile, notizMitText, liesNotiz, ANTWORT_MAX_ZEICHEN } from "../outreach-ruecklauf";

/**
 * Der Rücklauf ist der einzige Kanal, in dem eine Gemeinde uns von sich aus
 * Daten gibt — und bis zum 26.08.2026 hoben wir davon vier Angaben auf: Datum,
 * Art, Betreff, Absender. Der Inhalt war nach dem Lauf weg.
 *
 * Was das kostet, ist an einem Fall gemessen: Die Stadt Nidda schickte uns ihre
 * eigene Förderseite (die unsere Suche nicht hatte), nannte den Newsletter, über
 * den sie Neuauflagen ankündigt, empfahl einen Versorger mit Montage- und
 * Anmeldeservice und teilte den Vier-Jahres-Ertrag ihrer Anlage mit. Gespeichert
 * war davon: eine Zeile mit dem Betreff.
 */

const ZEILE = {
  datum: "2026-08-25",
  art: "antwort" as const,
  betreff: "AW: Solaranlagen in Nidda",
  von: "k.knoelcke@nidda.de",
};

describe("Der eigene Text einer Antwort wird aufgehoben", () => {
  it("hängt ihn unter die Verlaufszeile", () => {
    const eintrag = notizMitText(ZEILE, "Alle Infos zu unserer PV-Förderung finden Sie hier:\nhttps://www.nidda.de/foerderung");
    expect(eintrag.split("\n")[0]).toBe(notizZeile(ZEILE));
    expect(eintrag).toContain("nidda.de/foerderung");
  });

  it("schneidet das mitzitierte Anschreiben ab", () => {
    // Ohne den Schnitt stünde unser eigener Brief unter jeder Antwort noch
    // einmal im Datenbestand. Dieselbe Falle hätte die Widerspruchs-Erkennung
    // fast alle hundert Briefe als Widerspruch einstufen lassen.
    const mail = [
      "Gern, hier ist der Link: https://nidda.de/foerderung",
      "",
      "-----Ursprüngliche Nachricht-----",
      "Von: Solar Check",
      "Ihr Widerspruchsrecht: Sie können der Verarbeitung jederzeit widersprechen.",
    ].join("\n");
    const eintrag = notizMitText(ZEILE, mail);
    expect(eintrag).toContain("nidda.de/foerderung");
    expect(eintrag).not.toContain("Widerspruchsrecht");
    expect(eintrag).not.toContain("Ursprüngliche Nachricht");
  });

  it("kürzt lange Antworten und sagt es", () => {
    const eintrag = notizMitText(ZEILE, "x".repeat(ANTWORT_MAX_ZEICHEN + 500));
    expect(eintrag).toContain("[…]");
    expect(eintrag.length).toBeLessThan(ANTWORT_MAX_ZEICHEN + 400);
  });

  it("bleibt die blanke Zeile, wenn nichts Eigenes übrig ist", () => {
    // Eine maschinelle Unzustellbarkeit hat keinen eigenen Text — dann darf
    // auch kein leerer Block entstehen.
    expect(notizMitText(ZEILE, "\n\n   \n")).toBe(notizZeile(ZEILE));
  });

  it("die Verlaufszeile bleibt lesbar, der Text gilt als Freitext", () => {
    // `liesNotiz` trennt beides. Freitext gilt dort als das Wertvollere und
    // geht nie verloren — genau deshalb ist der Block dort richtig aufgehoben.
    const notiz = notizMitText(ZEILE, "Der Zuschuss beträgt 200 Euro.");
    const { verlauf, freitext } = liesNotiz(notiz);
    expect(verlauf).toHaveLength(1);
    expect(verlauf[0].betreff).toBe(ZEILE.betreff);
    expect(freitext.join(" ")).toContain("200 Euro");
  });
});

describe("Die Dublettenprüfung überlebt den mehrzeiligen Eintrag", () => {
  // DIE FALLE, DIE DIESE ÄNDERUNG FAST AUSGELÖST HÄTTE: Das Skript prüft
  // zeilenweise, ob eine Rückmeldung schon eingetragen ist. Verglichen es den
  // ganzen Block, fände es nie eine Übereinstimmung — dieselbe Antwort stünde
  // nach einer Woche siebenmal da. Genau das ist Nidda schon einmal passiert,
  // bevor es die Prüfung gab.

  it("die Zeile aus einem Texteintrag wird als vorhanden erkannt", () => {
    const bestand = notizMitText(ZEILE, "Mit freundlichen Grüßen");
    expect(bestand.split("\n").includes(notizZeile(ZEILE))).toBe(true);
  });

  it("das Skript vergleicht die Zeile und hängt den Eintrag an", () => {
    const skript = readFileSync(resolve(__dirname, "../../scripts/kommunen-ruecklauf.ts"), "utf8");
    const code = skript.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    // Verglichen wird `neueNotiz` (die Zeile), angehängt `neuerEintrag`.
    expect(code).toMatch(/includes\(neueNotiz\)/);
    expect(code).toMatch(/notes\s*=\s*vorher\?\.notes\s*\?\s*`\$\{vorher\.notes\}\\n\$\{neuerEintrag\}`/);
  });
});

// Der Outreach hat genau EINE Messgröße für „jemand hat gelesen und reagiert".
// Eine Empfangsquittung darin macht sie wertlos — und die kommt aus demselben
// Amtspostfach, mit unserem eigenen Betreff und ohne maschinelle Kopfzeile.
describe("Eingangsbestätigung ist keine Antwort", () => {
  const roemhild = {
    von: "info@stadt-roemhild.de",
    betreff: "Römhild bei privater Solarleistung auf Platz 1 von 79 in Thüringen",
    text: [
      "Sehr geehrte Damen und Herren,",
      "",
      "Ihre E-Mail ist in der Stadtverwaltung eingegangen.",
      "Sollten Sie ein Anliegen an uns gerichtet haben, melden wir uns so bald wie möglich.",
      "",
      "Bitte antworten Sie nicht auf diese E-Mail.",
      "",
      "Mit freundlichen Grüßen",
      "K. Rußwurm, Sekretariat",
    ].join("\n"),
    datum: "2026-09-01T10:12:00Z",
  };

  it("erkennt sie am Text, nicht am Betreff", () => {
    // Der Betreff ist unser eigener, unverändert — daran ist nichts zu sehen.
    expect(ordneEin(roemhild)).toBe("abwesenheit");
  });

  it("erkennt das Wort Eingangsbestätigung auch im Betreff", () => {
    expect(
      ordneEin({ ...roemhild, betreff: "Eingangsbestätigung", text: "Ihre Nachricht ist angekommen." }),
    ).toBe("abwesenheit");
  });

  // DIE WICHTIGERE RICHTUNG: Eine echte Antwort darf nicht wegsortiert werden.
  // „Ihre Mail ist eingegangen und wird geprüft" ist eine Zusage eines Menschen,
  // keine Quittung — deshalb sind die Muster lang und wörtlich statt kurz.
  it("hält eine echte Antwort für eine Antwort", () => {
    expect(
      ordneEin({
        ...roemhild,
        text: "Guten Tag, Ihre Meldung ist bei uns eingegangen. Wir prüfen sie und melden uns.",
      }),
    ).toBe("antwort");
  });

  it("lässt sich nicht von unserem eigenen zitierten Brief täuschen", () => {
    // Steht der Satz nur im ZITAT, ist es trotzdem eine Antwort.
    expect(
      ordneEin({
        ...roemhild,
        text: [
          "Wir veröffentlichen das gern, danke!",
          "",
          "> Am 01.09.2026 schrieb Sebastian Schäder:",
          "> Bitte antworten Sie nicht auf diese E-Mail.",
        ].join("\n"),
      }),
    ).toBe("antwort");
  });
});
