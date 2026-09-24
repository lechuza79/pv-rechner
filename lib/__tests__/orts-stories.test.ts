import { describe, it, expect } from "vitest";
import {
  MIN_ANLAGEN_FUER_AUSLAUF,
  MIN_ANLAGEN_FUER_GELD,
  ortsStories,
  type StoryDaten,
} from "../orts-stories";
import { FEED_IN_YEARS } from "../constants";

// Die Schranken und die INNERE WIDERSPRUCHSFREIHEIT sind der Inhalt dieser
// Datei, nicht die Formulierungen.
//
// Der Fehler, der diese Tests ausgelöst hat, war beim ersten Lauf im Browser da
// und in keinem Diff zu sehen: Die Kachel zeigte „17.100 € je Anlage", der Satz
// daneben „17.139 €". Beide Zahlen sahen richtig aus, beide meinten dieselbe
// Größe, und keine Prüfung hätte angeschlagen — es gab zwei Rundungen für einen
// Wert.

const JAHR = 2026;

const BASIS: StoryDaten = {
  name: "Musterdorf",
  regionId: "06440012",
  population: 6000,
  solar: {
    total_count: 400,
    total_kwp: 4000,
    by_segment: [
      { segment: "privat_dach", count: 300, kwp: 2400 },
      { segment: "gewerbe_dach", count: 60, kwp: 1000 },
    ],
    by_year_segment: [
      { year: 2006, segment: "privat_dach", count: 40, kwp: 200 },
      { year: 2012, segment: "privat_dach", count: 120, kwp: 900 },
      { year: 2020, segment: "privat_dach", count: 140, kwp: 1300 },
      { year: 2021, segment: "gewerbe_dach", count: 60, kwp: 1000 },
    ],
  },
  speicher: { kwh_batterie: 900, by_segment: [{ segment: "batterie_privat", count: 90 }] },
  standIso: "2026-08-05",
};

/** Referenzfall mit gezielt geänderten Teilen. */
type Teilweise = Omit<Partial<StoryDaten>, "solar"> & { solar?: Partial<StoryDaten["solar"]> };
function daten(o: Teilweise = {}): StoryDaten {
  return { ...BASIS, ...o, solar: { ...BASIS.solar, ...(o.solar ?? {}) } };
}

const stories = (d = daten()) => ortsStories({ daten: d, heuteJahr: JAHR });

/** Alle Zahlen einer Zeichenkette in deutscher Schreibweise. */
function zahlenIm(text: string): string[] {
  return text.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+|\b\d+\b/g) ?? [];
}

describe("Eine Zahl, eine Rundung", () => {
  it("jeder Kachelwert steht wortgleich im Text oder gar nicht darin", () => {
    // Der eigentliche Fund: Es genügt NICHT, dass beide Zahlen für sich richtig
    // gerundet sind. Sobald dieselbe Größe zweimal auftaucht, muss sie
    // zeichengleich dastehen — sonst widerspricht die Karte sich selbst, und
    // von außen sieht keine der beiden falsch aus.
    for (const s of stories()) {
      for (const w of s.werte) {
        const stellen = Number.isInteger(w.wert) ? 0 : 1;
        const alsText = w.wert.toLocaleString("de-DE", {
          minimumFractionDigits: stellen,
          maximumFractionDigits: stellen,
        });
        // Eine Zahl derselben Größenordnung, die NICHT die gerundete ist, wäre
        // die zweite Fassung. Verglichen wird auf zwei Prozent genau: Weiter
        // auseinander sind es zwei verschiedene Größen, näher dran ist es
        // dieselbe, anders gerundet.
        for (const z of zahlenIm(s.text)) {
          const roh = Number(z.replace(/\./g, "").replace(",", "."));
          if (!Number.isFinite(roh) || roh === 0) continue;
          const abstand = Math.abs(roh - w.wert) / Math.max(Math.abs(w.wert), 1);
          if (abstand > 0 && abstand < 0.02) {
            expect.fail(
              `${s.kennung}: „${z}" im Text gegen „${alsText}" (${w.name}) in der Kachel — ` +
                `dieselbe Größe, zwei Rundungen.`,
            );
          }
        }
      }
    }
  });
});

describe("Mindestgrößen", () => {
  it("meldet den Auslauf erst ab der eigenen Schwelle", () => {
    const knapp = daten({
      solar: {
        by_year_segment: [
          {
            year: JAHR - FEED_IN_YEARS,
            segment: "privat_dach",
            count: MIN_ANLAGEN_FUER_AUSLAUF - 1,
            kwp: 100,
          },
        ],
      },
    });
    expect(stories(knapp).some((s) => s.art === "auslauf")).toBe(false);

    const genug = daten({
      solar: {
        by_year_segment: [
          {
            year: JAHR - FEED_IN_YEARS,
            segment: "privat_dach",
            count: MIN_ANLAGEN_FUER_AUSLAUF,
            kwp: 100,
          },
        ],
      },
    });
    expect(stories(genug).some((s) => s.art === "auslauf")).toBe(true);
  });

  it("zählt für den Auslauf NUR private Dächer", () => {
    // Bei Gewerbe und Freifläche ist der Weiterbetrieb eine
    // Unternehmensentscheidung, keine Haushaltsfrage.
    const gewerbe = daten({
      solar: {
        by_year_segment: [
          { year: JAHR - FEED_IN_YEARS, segment: "gewerbe_dach", count: 500, kwp: 5000 },
        ],
      },
    });
    expect(stories(gewerbe).some((s) => s.art === "auslauf")).toBe(false);
  });

  it("rechnet kein Geld über eine Handvoll Anlagen", () => {
    const winzig = daten({
      population: 16,
      solar: {
        total_count: MIN_ANLAGEN_FUER_GELD - 1,
        total_kwp: 20,
        by_year_segment: [{ year: 2012, segment: "privat_dach", count: 4, kwp: 20 }],
      },
    });
    // Der belegte Fall dahinter: Hamm im Eifelkreis, 16 Einwohner, eine Anlage.
    // Jede Pro-Kopf-Zahl entsteht dort vollständig im Nenner.
    expect(stories(winzig)).toEqual([]);
  });
});

describe("Was auf der Seite steht, gehört nicht in den Feed", () => {
  it("keine Geschichte beschreibt den Bestand oder den Zubau des Vorjahres", () => {
    // Die Ortsseite zeigt Anlagenzahl, Leistung, Leistung je Einwohner, den
    // Zubau des Vorjahres und die Platzierung ohnehin als Kacheln, Ring und
    // eigene Karte. Eine Geschichte, die das wiederholt, ist der Grund, warum
    // die erste Fassung dieses Feeds verworfen wurde.
    const verboten = [/kamen \d.* dazu/i, /auf privaten Dächern in/i, /steht .* auf Platz/i];
    for (const s of stories()) {
      for (const muster of verboten) {
        expect(s.titel, `${s.kennung}: ${s.titel}`).not.toMatch(muster);
      }
    }
  });
});

describe("Der Nenner und der Vorbehalt stehen dabei", () => {
  it("jede Geschichte nennt ihre Grundlage", () => {
    for (const s of stories()) {
      expect(s.grundlage.length, s.kennung).toBeGreaterThan(60);
    }
  });

  it("die Geldsumme nennt die Fehlerrichtung", () => {
    // Bei Gewerbe und Freifläche ist der Eigenverbrauch nicht belegt; dort
    // fällt die Summe zu hoch aus. Eine Unschärfe, die nur wir kennen, gehört
    // an die Zahl — nicht in einen Code-Kommentar.
    const geld = stories().find((s) => s.art === "eingespielt");
    expect(geld).toBeTruthy();
    expect(geld!.grundlage).toMatch(/zu hoch/);
  });


  it("das Wort „Subvention“ kommt nicht vor", () => {
    // Katalog G4.1: Es kapert den Kommentarstrang, und die Aussage ist ohnehin
    // eine andere — gezahlt hat der Stromkunde, nicht der Steuerzahler.
    for (const s of stories()) {
      expect(`${s.titel} ${s.text} ${s.grundlage}`).not.toMatch(/subvention/i);
    }
  });
});

describe("Leer ist ein zulässiges Ergebnis", () => {
  it("ein Ort ohne Anlagen erzeugt keine Geschichte", () => {
    const leer = daten({
      solar: { total_count: 0, total_kwp: 0, by_segment: [], by_year_segment: [] },
    });
    expect(stories(leer)).toEqual([]);
  });
});


describe("Area story: count and power share use matching populations", () => {
  const area = (rows: StoryDaten["solar"]["by_segment"]) => stories(daten({ solar: { by_segment: rows } })).find(s => s.kennung === "flaeche");
  it("compares segment means without including balcony systems", () => {
    const story = area([
      { segment: "gewerbe_dach", count: 10, kwp: 600 },
      { segment: "privat_dach", count: 100, kwp: 400 },
      { segment: "balkon", count: 900, kwp: 700 },
    ])!;
    expect(story.text).toContain("10 von 110");
    expect(story.text).toContain("60 kWp");
    expect(story.text).toContain("4 kWp");
    expect(story.text).not.toMatch(/wenige|einzelne|Investor/);
  });
  it("does not invent a comparison for a single populated segment", () => {
    const story = area([{ segment: "gewerbe_dach", count: 1, kwp: 600 }])!;
    expect(story.text).toContain("Die erfasste Anlage gehört");
    expect(story.text).not.toContain("übrigen");
    expect(story.text).not.toMatch(/NaN|Infinity/);
  });
  it("omits the interpretation when powered segments lack valid counts", () => {
    expect(area([{ segment: "gewerbe_dach", count: 0, kwp: 600 }, { segment: "privat_dach", count: 100, kwp: 400 }])!.text).toBe("");
  });
  it("can describe a dominant category with smaller average plants", () => {
    const story = area([{ segment: "privat_dach", count: 100, kwp: 600 }, { segment: "gewerbe_dach", count: 2, kwp: 400 }])!;
    expect(story.text).toContain("100 von 102");
    expect(story.text).toContain("6 kWp");
    expect(story.text).toContain("200 kWp");
  });
});


describe("Area story: imported size range", () => {
  const rangeText = (min?: number | null, max?: number | null) => stories(daten({ solar: { by_segment: [
    { segment: "gewerbe_dach", count: 10, kwp: 600, min_kwp: min, max_kwp: max },
    { segment: "privat_dach", count: 100, kwp: 400, min_kwp: 1, max_kwp: 9 },
  ] } })).find(s => s.kennung === "flaeche")!.text;
  it("uses extrema of the chart's leading segment", () => {
    expect(rangeText(12.34, 150)).toContain("Die Anlagen dieser Gruppe reichen von 12,34 bis 150 kWp.");
  });
  it.each([[undefined, undefined], [null, 150], [12, null], [0, 150], [70, 150], [12, 50], [NaN, 150], [12, Infinity]])("omits missing or inconsistent extrema %s / %s", (min, max) => {
    expect(rangeText(min, max)).not.toContain("reichen von");
  });
  it("does not invent a spread when all plants are the same size", () => {
    expect(rangeText(60, 60)).toContain("jeweils 60 kWp");
    expect(rangeText(60, 60)).not.toContain("reichen von");
  });
});

describe("Calendar month stories", () => {
  const monthStory = (rows: [string, number][], standIso = "2026-08-05") =>
    stories(daten({ standIso, monate: rows.map(([monat, count]) => ({ monat, count, segment: "privat_dach" })) }))
      .find((s) => s.kennung.startsWith("monat-"));

  it("uses the data date cutoff instead of dropping the last two populated rows", () => {
    expect(monthStory([["2026-01", 5], ["2026-03", 5], ["2026-05", 5], ["2026-06", 5]])?.kennung)
      .toBe("monat-2026-06");
  });
  it("excludes recent months across a year boundary", () => {
    const s = monthStory([["2025-11", 7], ["2025-12", 20], ["2026-01", 40]], "2026-01-10");
    expect(s?.kennung).toBe("monat-2025-11");
    expect(s?.werte[0].wert).toBe(7);
  });
  it("does not substitute an old populated month for a zero month", () => {
    expect(monthStory([["2026-05", 9], ["2026-07", 4]])).toBeUndefined();
  });
  it("does not treat a stale or missing series as current", () => {
    expect(monthStory([["2026-02", 9]])).toBeUndefined();
    expect(monthStory([])).toBeUndefined();
    expect(monthStory([["2026-06", 9]], "invalid")).toBeUndefined();
  });
  it.each([[4, "6 Anlagen mehr"], [15, "5 Anlagen weniger"], [10, "unverändert"]])(
    "compares the same month last year (%s)", (previous, expected) => {
      const s = monthStory([["2025-06", previous as number], ["2026-06", 10]]);
      expect(s?.text).toContain(expected);
      expect(s?.werte.map((v) => [v.name, v.wert])).toEqual([["Juni 2026", 10], ["Juni 2025", previous]]);
    },
  );
  it("counts a missing prior-year month inside coverage as zero without a percentage", () => {
    const s = monthStory([["2025-05", 2], ["2025-07", 3], ["2026-06", 10]]);
    expect(s?.werte[1].wert).toBe(0);
    expect(s?.text).toContain("10 Anlagen mehr");
    expect(s?.text).not.toMatch(/Infinity|NaN|%/);
  });
  it("does not invent prior-year coverage", () => {
    expect(monthStory([["2025-07", 3], ["2026-06", 10]])?.werte).toHaveLength(1);
  });
});


describe("Source-backed wording", () => {
  it("labels the revenue as a model in the visible claim", () => {
    const story = stories().find(s => s.art === "eingespielt")!;
    expect(story.titel).toContain("Modellrechnung");
    expect(story.titel).not.toContain("geflossen");
  });
  it("does not infer ownership or solar potential from dwelling structure", () => {
    const story = stories(daten({ wohnungen: { gesamt: 1000, einZwei: 400 } })).find(s => s.art === "wohnform")!;
    expect(story).toBeDefined();
    expect(story.text).not.toMatch(/eigenes Dach|praktisch nichts|bisher|Potenzial/);
    expect(story.grundlage).toContain("nicht Gebäude, Eigentümer oder freie Dachflächen");
  });
  it("does not present a residual operator group as commercial roof use", () => {
    const story = stories().find(s => s.art === "flaeche")!;
    expect(JSON.stringify(story)).not.toMatch(/Gewerbedäch|privaten Däch/);
    expect(story.grundlage).toContain("unbekannte Betreiber");
  });
});
