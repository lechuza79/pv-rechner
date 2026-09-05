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
    expect(stories(knapp).some((s) => s.kategorie === "G4.2")).toBe(false);

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
    expect(stories(genug).some((s) => s.kategorie === "G4.2")).toBe(true);
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
    expect(stories(gewerbe).some((s) => s.kategorie === "G4.2")).toBe(false);
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
    const geld = stories().find((s) => s.kategorie === "G4.1");
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
