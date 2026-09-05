import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { SHARE_KEYS, traegtRechnung } from "../share-keys";

const WURZEL = join(__dirname, "..", "..");
const NACKT = join(WURZEL, "app", "(site)", "photovoltaik-rechner", "page.tsx");
const ERGEBNIS = join(WURZEL, "app", "(site)", "photovoltaik-rechner", "ergebnis", "page.tsx");

/**
 * DIE TEUERSTE ZEILE DES PROJEKTS IST EINE, DIE MAN NICHT SIEHT.
 *
 * Liest die nackte Rechner-Seite irgendetwas aus dem Abfrageteil, ist sie in
 * dem Moment vollstaendig dynamisch: kein Zwischenspeicher, ein voller
 * Serverless-Aufbau bei JEDEM Aufruf. Nichts daran sieht kaputt aus — die Seite
 * ist schnell, gruen und richtig. Gemessen am 05.09.2026, bevor es getrennt
 * wurde: 2.612 Aufbauten am Tag fuer diese eine Adresse, 19 % aller Aufbauten
 * der Domain, bei neun menschlichen Besuchen am Tag.
 */
describe("Rechner-Einstieg", () => {
  it("die nackte Seite liest nichts aus dem Abfrageteil", () => {
    const quelle = readFileSync(NACKT, "utf8");
    // Kommentare heraus: Sie sprechen ueber `searchParams`, ohne es zu benutzen.
    const code = quelle.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/searchParams/);
    // `generateMetadata` ist der zweite Weg in dieselbe Falle: Schon ihr blosses
    // Vorhandensein macht die Seite dynamisch, sobald sie die Adresse liest.
    expect(code).not.toMatch(/generateMetadata/);
  });

  it("die Ergebnis-Seite liest ihn und bleibt damit bewusst dynamisch", () => {
    const quelle = readFileSync(ERGEBNIS, "utf8");
    expect(quelle).toMatch(/searchParams/);
    // Das persoenliche Vorschaubild ist der Grund, warum sie dynamisch sein DARF.
    expect(quelle).toMatch(/api\/og/);
    // Kanonisch bleibt die nackte Adresse — sonst stuenden geteilte Rechnungen
    // als eigene Seiten im Index.
    expect(quelle).toMatch(/path: "\/photovoltaik-rechner"/);
  });

  it("die Weiche steht in der Middleware und greift nur auf der nackten Adresse", () => {
    const mw = readFileSync(join(WURZEL, "middleware.ts"), "utf8");
    expect(mw).toMatch(/traegtRechnung\(request\.nextUrl\.searchParams\)/);
    expect(mw).toMatch(/rewrite/);
    expect(mw).toMatch(/"\/photovoltaik-rechner",/);
    // Eine WEITERLEITUNG waere der Fehler: Sie aenderte die Adresse jedes je
    // geteilten Links.
    expect(mw).not.toMatch(/redirect\(.*photovoltaik-rechner/);
  });

  it("erkennt eine Rechnung, ignoriert fremde Parameter", () => {
    expect(traegtRechnung(new URLSearchParams("a=2&s=1&p=2&n=1"))).toBe(true);
    expect(traegtRechnung(new URLSearchParams("er=1050"))).toBe(true);
    expect(traegtRechnung(new URLSearchParams("foe=muenchen-pv"))).toBe(true);
    expect(traegtRechnung(new URLSearchParams(""))).toBe(false);
    // Kampagnen-Kennungen aendern an der Seite nichts und duerfen den
    // Zwischenspeicher nicht umgehen.
    expect(traegtRechnung(new URLSearchParams("utm_source=newsletter&gclid=abc"))).toBe(false);
  });

  /**
   * DIE GEGENRICHTUNG, und der eigentliche Wert dieser Datei.
   *
   * Ein neuer interner Link in den Rechner mit einem Parameter, den die Liste
   * nicht kennt, wuerde von der Weiche nicht erkannt: Der Besucher landete auf
   * der statischen Seite, seine Vorbefuellung waere still weg. Kein Fehler,
   * keine kaputte Seite — nur eine Angabe, die verschwindet.
   */
  it("jeder interne Link in den Rechner benutzt einen bekannten Parameter", () => {
    const treffer: string[] = [];
    const durchlaufen = (ordner: string) => {
      for (const eintrag of readdirSync(ordner)) {
        if (eintrag === "node_modules" || eintrag.startsWith(".")) continue;
        const pfad = join(ordner, eintrag);
        if (statSync(pfad).isDirectory()) { durchlaufen(pfad); continue; }
        if (!/\.tsx?$/.test(pfad)) continue;
        const quelle = readFileSync(pfad, "utf8");
        for (const m of quelle.matchAll(/photovoltaik-rechner\?([^"'`\s]+)/g)) {
          const roh = m[1];
          // Der erste Parametername steht vor dem ersten "=" — auch wenn der
          // Wert eine Template-Einsetzung ist.
          const name = roh.split("=")[0].replace(/^\$\{[^}]*\}/, "");
          if (!name || name.startsWith("$")) continue;
          if (!SHARE_KEYS.includes(name)) treffer.push(`${pfad}: ?${roh}`);
        }
      }
    };
    for (const ordner of ["app", "components", "lib"]) durchlaufen(join(WURZEL, ordner));
    expect(treffer).toEqual([]);
  });
});
