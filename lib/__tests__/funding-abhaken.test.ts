import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Source guards deliberately avoid executing the production-writing CLI.
// A municipality-wide stamp must not silently return through a refactor.
describe("Source-specific funding review stamps", () => {
  const source = readFileSync(resolve(process.cwd(), "scripts/funding-screen.ts"), "utf8");
  const review = source.slice(source.indexOf("async function gelesen()"), source.indexOf("async function main()"));

  it("requires one municipality, an exact source and a quote", () => {
    expect(review).toContain('ids.length !== 1 || !sourceUrl || !quote');
    expect(review).not.toMatch(/\.in\("region_id"/);
    expect(review).toContain('.eq("url", normalized)');
  });

  it("checks the quote against the fetched original before writing", () => {
    const check = review.indexOf('sichtbarerText(original).includes(sichtbarerText(quote))');
    expect(check).toBeGreaterThan(review.indexOf('sources.verify(adresse'));
    expect(check).toBeLessThan(review.indexOf('.update('));
    expect(review).toContain('seitenSchluessel(coverage.url) === normalized');
    expect(review).toContain('.eq("url", coverage.url)');
  });

  it("requires an explicit review result", () => {
    expect(review).toMatch(/if \(!roh \|\| !ergebnis\)/);
  });
  // Gemessen am 20.09.2026: Der Abhak-Befehl rief den Reader ohne die
  // Browser-Kennung auf, die der Screening-Lauf in derselben Datei mitgibt.
  // herzogenaurach.de antwortet darauf mit 403 — und der Abhaken schrieb
  // diesen 403 als Crawl-Beobachtung fort und sperrte fünf Adressen eine
  // Woche lang. Beide Hälften stehen hier, weil keine für sich reicht: ohne
  // Kennung kommt kein Beleg durch, mit `fetch` kostet jeder Fehlversuch den
  // Vorrat eine Woche.
  it("identifies itself like the screening pass does", () => {
    expect(review).toContain('"User-Agent": UA');
    expect(review).toContain('"Accept-Language"');
  });

  it("reads for verification, so a failed counter-read cannot lock the source", () => {
    expect(review).toContain("sources.verify(");
    expect(review).not.toContain("sources.fetch(");
  });

  // Der gespeicherte Schluessel traegt weder Schema noch „www." und bei rund
  // jeder neunten Adresse eine HTML-Maskierung. Gemessen am 20.09.2026 an
  // zwoelf zufaelligen solchen Adressen: vier antworteten so mit HTTP 400,
  // waehrend die entmaskierte Fassung eine volle Seite lieferte, zwei
  // lieferten eine ANDERE Seite. Wer hier die Rohadresse nimmt, laesst das
  // Abhaken an der Schreibweise scheitern.
  it("fetches through the same address path as the page runs", () => {
    expect(review).toContain("seitenAbrufAdressen(sourceUrl)");
  });
});

// Die Gegenrichtung, und die wichtigere: NICHT nur der Abhak-Befehl, sondern
// JEDER Aufrufer des Quellen-Lesers muss sich ausweisen. Gemessen am
// 20.09.2026 an herzogenaurach.de: ohne Kennung 403, mit Kennung 200 (130 kB).
// Vier der fünf Aufrufer taten es längst — der fünfte fiel niemandem auf,
// weil die Folge kein Fehler ist, sondern ein stiller Wochen-Eintrag im
// Quellen-Zustand. Ein Vorrat, der durch das Werkzeug wächst, das ihn abbauen
// soll, sieht von außen aus wie ein Vorrat, an dem gearbeitet wird.
describe("Every funding source read identifies itself", () => {
  const dateien = [
    "scripts/funding-screen.ts",
    "scripts/funding-discover.ts",
    "scripts/funding-watch.ts",
    "scripts/funding-coverage-watch.ts",
  ];
  for (const datei of dateien) {
    it(`${datei} passes a browser identification on every source read`, () => {
      const quelle = readFileSync(resolve(process.cwd(), datei), "utf8");
      const aufrufe = [...quelle.matchAll(/sources\.(?:fetch|verify)\(/g)];
      expect(aufrufe.length).toBeGreaterThan(0);
      for (const treffer of aufrufe) {
        // Nur das Options-Objekt DIESES Aufrufs wird gelesen — per
        // Klammerzaehlung, nicht per fester Fensterbreite: Ein Aufruf endet
        // je nach Stelle auf `});` oder auf `}, true);`, und ein Fenster, das
        // daran vorbeischneidet, prueft den falschen Text.
        const start = quelle.indexOf("{", treffer.index);
        let tiefe = 0, ende = start;
        for (; ende < quelle.length; ende++) {
          if (quelle[ende] === "{") tiefe++;
          else if (quelle[ende] === "}" && --tiefe === 0) break;
        }
        expect(quelle.slice(start, ende + 1)).toContain('"User-Agent": UA');
      }
    });
  }
});
