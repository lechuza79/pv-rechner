import { describe, expect, it } from "vitest";
import { KATEGORIEN } from "../redaktions-kategorien";
import { moeglicheFormen, templateVon } from "../social-bildformen";
import { ortsPostId, ortsPostTeile, ortsPosts, stellenVon } from "../orts-posts";
import { ortsStories, STORY_FAMILIE, type OrtsStory, type StoryDaten } from "../orts-stories";

// Eine Ortsgeschichte IST ein Beitrag — und dieser Test hält das fest.
//
// Er prüft nicht Formulierungen, sondern die vier Eigenschaften, ohne die eine
// Ortsgeschichte im Redaktionssystem nicht ankommt: Sie steht in einer Familie,
// die es wirklich gibt; ihr Bild trägt die Form, die ihre Zahlen hergeben; ihre
// Quellenzeile nennt die Lizenz; und ihre Kennung trägt den Ort, weil sonst
// zwei Gemeinden dieselbe redaktionelle Fassung teilen.

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
      { segment: "freiflaeche", count: 2, kwp: 600 },
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
  wohnungen: { gesamt: 2800, einZwei: 1900 },
  monate: [
    ...Array.from({ length: 20 }, (_, i) => ({
      monat: `2024-${String((i % 12) + 1).padStart(2, "0")}`,
      segment: "privat_dach",
      count: 3,
    })),
  ],
};

const ORT = { regionId: BASIS.regionId, name: BASIS.name };

const geschichten = (): OrtsStory[] => ortsStories({ daten: BASIS, heuteJahr: JAHR });
const beitraege = (fassungen = {}) =>
  ortsPosts({ stories: geschichten(), ort: ORT, standIso: BASIS.standIso, fassungen });

describe("Eine Ortsgeschichte ist ein Beitrag des Redaktionssystems", () => {
  it("es gibt überhaupt welche — sonst prüft alles Folgende nichts", () => {
    expect(beitraege().length).toBeGreaterThan(3);
  });

  it("jede Kategorie ist eine Familie des Katalogs, keine eigene Aufzählung", () => {
    // Bis zum 06.09.2026 führte lib/orts-stories.ts „G4.1", „G3.vergleich",
    // „G10" als private Union neben demselben Katalog. Zwei Ordnungen für
    // dieselbe Sache — und die erfundene stand in der Ortsansicht.
    const bekannt = new Set(KATEGORIEN.map((k) => k.schluessel));
    for (const p of beitraege()) {
      expect(bekannt, `Kategorie „${p.kategorie}" gibt es im Katalog nicht`).toContain(p.kategorie);
    }
    for (const [art, f] of Object.entries(STORY_FAMILIE)) {
      expect(bekannt, `Sorte „${art}" zeigt auf eine Familie, die es nicht gibt`).toContain(
        f.kategorie,
      );
    }
  });

  it("die Beschriftung ist nie der Schlüssel selbst", () => {
    // Der Fund reichte bis zum 06.09.2026 `f.kategorie` als Beschriftung durch —
    // auf der Ortsseite stand damit wörtlich „g10". Unsichtbar geblieben, weil
    // der Block ausgeblendet war.
    for (const s of geschichten()) {
      expect(s.kategorieLabel, `„${s.kennung}" zeigt einen Schlüssel als Beschriftung`).not.toMatch(
        /^g\d+$/,
      );
      expect(s.kategorieLabel.length).toBeGreaterThan(3);
    }
  });

  it("jedes Bild trägt eine Form, die seine Zahlen wirklich hergeben", () => {
    // Die eingebaute Form ist ein Startwert, kein Freibrief: Trägt sie nicht,
    // behauptet das Bild etwas, das die Zahlen nicht sagen.
    for (const p of beitraege()) {
      expect(p.bild).toBeTruthy();
      const moeglich = moeglicheFormen(p.bild!);
      expect(moeglich, `„${p.id}" startet mit einer Form, die nicht trägt`).toContain(p.bild!.art);
    }
  });

  it("jede Quellenzeile nennt Bereitsteller UND Lizenz", () => {
    // Lizenzpflicht: Die Zeile reist im Bild mit, der Beitragstext tut das nicht.
    for (const p of beitraege()) {
      expect(p.bild!.quelle).toMatch(/Marktstammdatenregister|Zensus/);
      expect(p.bild!.quelle).toContain("Eigene Berechnung");
    }
    // Die Wohnform rechnet auf dem Zensus — eine gemeinsame Zeile über allen
    // wäre für genau sie falsch.
    const wohnform = beitraege().find((p) => p.id.endsWith("-wohnform"));
    expect(wohnform, "Referenzfall enthält keine Wohnform-Geschichte").toBeTruthy();
    expect(wohnform!.bild!.quelle).toContain("Zensus 2022");
  });

  it("die Kennung trägt den Ort, sonst teilen zwei Gemeinden eine Fassung", () => {
    for (const p of beitraege()) {
      expect(p.id.startsWith(`ort-${ORT.regionId}-`)).toBe(true);
      expect(ortsPostTeile(p.id)?.regionId).toBe(ORT.regionId);
      // Weder Farbschema noch Bildform dürfen hinein — wer umfärbt, verlöre
      // sonst seinen umformulierten Text.
      expect(p.id).not.toMatch(/hell|dunkel|highlight|kennzahl|saeule|donut/);
    }
    expect(ortsPostId("06632012", "eingespielt")).toBe("ort-06632012-eingespielt");
    expect(ortsPostTeile("g13-wachstum-balkon-solar")).toBeUndefined();
  });

  it("der Ort steht am Beitrag, nicht als Kategorie", () => {
    // Sieben Familien unter einem Reiter „Kommune" wären in der Ansicht nicht
    // mehr auseinanderzuhalten.
    for (const p of beitraege()) expect(p.ort).toEqual(ORT);
    expect(KATEGORIEN.some((k) => /kommune|ort/i.test(k.schluessel))).toBe(false);
  });

  it("eine gespeicherte Fassung greift — aber nur, wenn die Form trägt", () => {
    const erste = beitraege()[0];
    const mit = ortsPosts({
      stories: geschichten(),
      ort: ORT,
      standIso: BASIS.standIso,
      fassungen: { [erste.id]: { stil: "dunkel", form: "verlauf" } },
    })[0];
    expect(mit.bild!.stil).toBe("dunkel");
    // „verlauf" braucht eine Zeitachse — die hat keine Ortsgeschichte, also
    // bleibt die eingebaute Form stehen.
    expect(mit.bild!.art).toBe(erste.bild!.art);
  });

  it("mindestens eine Ortsgeschichte landet auf einem abgenommenen Template", () => {
    // Ohne das wäre die Umstellung folgenlos: Die Templates sind der Grund,
    // warum ein Ortsbeitrag ohne eigenes Design auskommt.
    expect(beitraege().some((p) => templateVon(p.bild!) !== undefined)).toBe(true);
  });

  it("die Nachkommastellen im Bild sind die des Textes", () => {
    // Die Geschichten runden EINMAL; zeigt das Bild mehr Stellen, widerspricht
    // es dem Satz daneben.
    expect(stellenVon(12)).toBe(0);
    expect(stellenVon(1.7)).toBe(1);
    expect(stellenVon(0.25)).toBe(2);
    // Fließkomma-Artefakt: kein zwanzigstelliger Wert im Bild.
    expect(stellenVon(1.7999999999999998)).toBe(2);
  });

  it("die tragende Zahl ist genau eine", () => {
    for (const p of beitraege()) {
      const haupt = p.bild!.serien.filter((s) => s.hervorgehoben);
      expect(haupt.length, `„${p.id}" hebt ${haupt.length} Werte hervor`).toBe(1);
    }
  });
});
