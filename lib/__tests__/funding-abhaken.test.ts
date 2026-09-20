import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ABSCHLIESSENDE_ERGEBNISSE,
  pendingFundingSources,
  type ReviewSource,
} from "../funding-source-review";

// Source guards deliberately avoid executing the production-writing CLI.
// A municipality-wide stamp must not silently return through a refactor.
describe("Source-specific funding review stamps", () => {
  const source = readFileSync(resolve(process.cwd(), "scripts/funding-screen.ts"), "utf8");
  const review = source.slice(source.indexOf("async function gelesen()"), source.indexOf("async function main()"));

  it("requires one municipality, an exact source and a quote", () => {
    // Seit 20.09.2026 darf statt des Belegs eine gemessene 404 stehen (--tot);
    // Ort und genaue Adresse bleiben Pflicht, und eines von beiden Nachweisen.
    expect(review).toContain('ids.length !== 1 || !sourceUrl || (!quote && !tot)');
    expect(review).not.toMatch(/\.in\("region_id"/);
    expect(review).toContain('.eq("url", normalized)');
  });

  it("weist ein Ergebnis ab, das die Zeile gar nicht abhakt", () => {
    // DIE VERWENDUNG, NICHT DAS VORHANDENSEIN. Beim Bauen dieser Sperre am
    // 20.09.2026 war der Unit-Test darunter schon grün, während die Prüfung im
    // Werkzeug ausgebaut war — er kannte nur die Liste, nicht ihren Einsatz.
    // Geprüft wird deshalb hier: Das Werkzeug liest dieselbe Liste UND bricht
    // ab, bevor es irgendetwas schreibt.
    expect(source).toContain("ABSCHLIESSENDE_ERGEBNISSE");
    const sperre = review.indexOf("ABSCHLIESSENDE_ERGEBNISSE.has(ergebnis");
    expect(sperre, "die Sperre gegen Freitext-Ergebnisse fehlt").toBeGreaterThan(-1);
    expect(sperre).toBeLessThan(review.indexOf(".update("));
    expect(review.slice(sperre, sperre + 400)).toContain("process.exit(1)");
  });

  it("checks the quote against the fetched original before writing", () => {
    const check = review.indexOf('sichtbarerText(original).includes(sichtbarerText(quote!))');
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

// EINE TOTE ADRESSE IST EIN BEFUND, KEIN HINDERNIS (20.09.2026). Der
// Abhak-Befehl verlangte bis dahin einen Beleg AUS der Seite; eine Adresse,
// die mit 404 antwortet, konnte deshalb nie aus dem Vorrat heraus. Gemessen:
// 1.767 der 13.401 offenen Quellzeilen (13 %) stehen auf Adressen, die der
// Seiten-Wächter als unerreichbar führt.
//
// Die Gegenrichtung ist die gefährlichere und steht deshalb zuerst: In einer
// Stichprobe von 14 solchen Adressen antworteten SECHS am selben Tag mit
// HTTP 200, zwei davon mit einem Förderprogramm im Namen. Ein Werkzeug, das
// dem abgelegten Zustand glaubt, wirft jede dritte lesbare Förderseite weg —
// ohne Fehler, ohne roten Test, ohne dass die Zahl im Vorrat verdächtig
// aussieht.
describe("Removed addresses may be checked off, but only when measured", () => {
  const source = readFileSync(resolve(process.cwd(), "scripts/funding-screen.ts"), "utf8");
  const review = source.slice(source.indexOf("async function gelesen()"), source.indexOf("async function main()"));

  it("never decides from the stored state, only from a read in this moment", () => {
    // Kein Zugriff auf das Zustandsfeld der Seiten-Tabelle in diesem Befehl.
    expect(review).not.toMatch(/\bzustand\b/);
    expect(review).toContain("sources.verify(adresse");
  });

  it("accepts only 'missing' as a statement about the source", () => {
    expect(review).toContain('gruende.every((g) => g === "missing")');
    // Alles andere beschreibt unseren Versuch, nicht die Quelle.
    for (const grund of ["blocked", "shell", "network", "server"]) {
      expect(review).not.toContain(`=== "${grund}"`);
    }
  });

  it("requires every address spelling to be gone, not just one", () => {
    // `some` statt `every` hieße: ein Tippfehler in der Erfassung hakt die
    // Zeile ab, während die richtige Schreibweise die Förderseite ausliefert.
    expect(review).not.toMatch(/gruende\.some\(/);
    expect(review).toContain("gruende.length > 0");
  });

  it("refuses --tot as soon as the address answers at all", () => {
    const wache = review.indexOf("if (response) throw new Error");
    expect(wache).toBeGreaterThan(-1);
    expect(wache).toBeLessThan(review.indexOf(".update("));
  });

  it("keeps quote and --tot mutually exclusive, and still demands one of them", () => {
    expect(review).toContain("tot && quote");
    expect(review).toContain("!quote && !tot");
  });

  it("reads the reason from the typed error instead of parsing a message", () => {
    expect(review).toContain("fehler instanceof FundingSourceUnreadable");
    expect(review).not.toMatch(/Source unreadable/);
  });

  it("records what was measured, not an assumed quote", () => {
    expect(review).toContain("HTTP 404/410 beim Gegenlesen am");
    expect(review).toContain("quote: nachweis");
  });
});

/**
 * EIN GELESENES ERGEBNIS MUSS DIE ZEILE AUCH WIRKLICH ABHAKEN (20.09.2026).
 *
 * Der Filter kennt acht abschließende Wörter; alles andere lässt die Zeile im
 * Vorrat stehen — mit Datum, Beleg und Notiz, aber ununterscheidbar von einer
 * nie gelesenen. Gemessen an diesem Tag: 625 der 2.375 gelesenen Zeilen (26 %)
 * tragen Freitext und liegen deshalb weiter im Vorrat. Mir selbst ist es im
 * selben Lauf mit drei Zeilen passiert.
 *
 * Seitdem weist das Abhak-Werkzeug ein unbekanntes Ergebnis ab. Dieser Test
 * hält die EINE Liste fest, aus der beide Seiten lesen — zwei Fassungen davon
 * würden genau diesen Fehler zurückbringen.
 */
describe("Abschließende Ergebnisse — eine Liste für Filter und Abhaken", () => {
  const zeile = (ergebnis: string): ReviewSource => ({
    region_id: "06634005",
    url: "beispiel.de/foerderung",
    gelesen_am: "2026-09-20",
    gelesen_ergebnis: ergebnis,
    gelesen_notiz: null,
    seite_geaendert_am: null,
  });

  it("jedes erlaubte Wort nimmt die Zeile wirklich aus dem Vorrat", () => {
    for (const wort of ABSCHLIESSENDE_ERGEBNISSE) {
      expect(pendingFundingSources([zeile(wort)]), wort).toEqual([]);
    }
  });

  it("Freitext lässt die Zeile stehen — deshalb weist das Werkzeug ihn ab", () => {
    for (const freitext of ["verworfen", "Adresse entfernt (404/410 beim Gegenlesen)", "Programm aufgenommen (mauer)"]) {
      expect(pendingFundingSources([zeile(freitext)]), freitext).toHaveLength(1);
      expect(ABSCHLIESSENDE_ERGEBNISSE.has(freitext.trim().toLowerCase()), freitext).toBe(false);
    }
  });

  it("die Liste ist nicht leer und wird groß- und kleingeschrieben gleich gelesen", () => {
    expect(ABSCHLIESSENDE_ERGEBNISSE.size).toBeGreaterThan(0);
    expect(pendingFundingSources([zeile("AUFGENOMMEN")])).toEqual([]);
  });
});
