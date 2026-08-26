import { describe, it, expect } from "vitest";
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
