import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Seit dem 27.08.2026 stehen unter dem Wärmepumpen-Rechner als Anzeige
 * gekennzeichnete Produktempfehlungen mit Provisionslinks. Damit ist "Keine
 * Werbung" auf jeder Oberfläche eine Falschaussage nach § 5 UWG — und zwar
 * genau auf den Seiten, die mit Ehrlichkeit werben.
 *
 * Die Zusage stand an fünf Stellen: Startseite, PV-Ergebnis, zwei
 * Anmelde-Hinweise und die Datenschutzerklärung. Vier davon hätte niemand
 * gefunden, der nur die eine ändert, an die er gerade denkt — dieselbe
 * Fehlerklasse wie beim Datenstand-Umbau ("alle Werte, mit denen wir rechnen"
 * blieb in Seitentitel und Beschreibung stehen, nachdem der Satz in der Leiste
 * längst korrigiert war).
 *
 * Geprüft wird deshalb per MUSTER, nicht per Wortlaut. Der frühere Test der
 * Vertrauens-Leiste verbot einen Satz, die Leiste sagte ein Wort daneben, und
 * der Test blieb grün, während die Falschaussage auf jeder Seite stand.
 *
 * Was WEITERHIN erlaubt ist, weil es wahr bleibt: "Keine Werbebanner",
 * "Kein Werbe-Tracking", "Keine Werbe-E-Mails". Das sind engere Zusagen, die
 * wir halten — Affiliate-Kacheln sind kein Banner, setzen bei uns keine
 * Cookies und gehen in keine Mail.
 */

const WURZEL = path.resolve(__dirname, "..", "..");
const ORDNER = ["app", "components", "lib"];

/**
 * Die pauschale Zusage — "keine Werbung", "ohne Werbung", "werbefrei" — in
 * jeder Schreibweise. Die zulässigen Verengungen tragen einen Bindestrich oder
 * ein angehängtes Wort ("Werbebanner", "Werbe-Tracking") und werden vom
 * Wortende-Anker nicht getroffen; "Werbeversprechen" ist eine Aussage über
 * andere, keine eigene Zusage.
 */
const PAUSCHAL = /\b(?:keine?|ohne)\s+Werbung\b|\bwerbefrei/i;

function dateien(dir: string, treffer: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "__tests__") continue;
      dateien(p, treffer);
    } else if (/\.tsx?$/.test(e.name)) {
      treffer.push(p);
    }
  }
  return treffer;
}

describe("Werbe-Zusagen", () => {
  it("verspricht nirgends pauschal 'keine Werbung' — wir haben Affiliate-Links", () => {
    const funde: string[] = [];
    for (const ordner of ORDNER) {
      for (const datei of dateien(path.join(WURZEL, ordner))) {
        const text = fs.readFileSync(datei, "utf-8");
        text.split("\n").forEach((zeile, i) => {
          // Kommentare dürfen den Begriff erklären; nur ausgelieferter Text zählt.
          if (/^\s*(\/\/|\*|\/\*)/.test(zeile)) return;
          if (PAUSCHAL.test(zeile)) {
            funde.push(`${path.relative(WURZEL, datei)}:${i + 1} — ${zeile.trim()}`);
          }
        });
      }
    }
    expect(funde, `Pauschale Werbe-Zusage gefunden:\n${funde.join("\n")}`).toEqual([]);
  });

  it("erlaubt die engeren Zusagen, die wir halten", () => {
    for (const zulaessig of [
      "Keine Lead-Erfassung · Keine Werbebanner · Kein Vertriebskontakt",
      "kein Werbe-Tracking durch Drittanbieter",
      "Kein Passwort, keine Werbe-E-Mails.",
      "und was die Werbeversprechen gern weglassen.",
    ]) {
      expect(PAUSCHAL.test(zulaessig), zulaessig).toBe(false);
    }
  });

  it("erkennt die Schreibweisen, die zurückkommen würden", () => {
    for (const falsch of [
      "Keine Werbung · Kein Vertriebskontakt",
      "ohne Werbung und ohne Leadfunnel",
      "Diese Seite ist werbefrei.",
      "keine Werbung, keine Anmeldung",
    ]) {
      expect(PAUSCHAL.test(falsch), falsch).toBe(true);
    }
  });

  it("die Datenschutzerklärung benennt die Provisionslinks", () => {
    const text = fs.readFileSync(
      path.join(WURZEL, "app", "(site)", "datenschutz", "page.tsx"),
      "utf-8",
    );
    expect(text).toMatch(/Provisionslink/i);
    expect(text).toMatch(/Anzeige/);
  });
});
