import { describe, it, expect } from "vitest";
import { buildRegionHighlight, type RegionHighlightInput } from "../region-highlight";

/**
 * Der Einordnungs-Absatz der Atlas-Regionsseiten.
 *
 * Geprüft wird, was beim ersten Durchlauf im Browser schiefging (18.08.2026) —
 * jeder dieser Fälle stand einmal so auf der Seite:
 *   „Gemessen an der Dachleistung je Einwohner führt damit alle 16 an."  (kein Subjekt)
 *   „Am weitesten ist Landkreis Dingolfing-Landau …"                     (kein Artikel)
 *   „… das 25-fache des schwächsten Kreises"                            (Faktor ohne Einordnung)
 *
 * Grammatik ist hier kein Geschmack, sondern Richtigkeit: „1 neue Anlagen" ist
 * derselbe Fehler wie eine falsche Einheit, nur in Worten (CLAUDE.md).
 */

const basis: RegionHighlightInput = {
  level: "bundesland",
  name: "Bayern",
  kindWort: "Kreise",
  kinder: [
    { name: "Landkreis Dingolfing-Landau", wPerCapitaDach: 4339, count: 9000 },
    { name: "Landkreis Haßberge", wPerCapitaDach: 3800, count: 13015 },
    { name: "München", wPerCapitaDach: 174, count: 40000 },
  ],
  rang: 1,
  rangVon: 16,
  rangGattung: "Bundesländer",
  byYear: [
    { year: 2024, count: 170000 },
    { year: 2025, count: 155184 },
  ],
  lastYear: 2025,
  count: 1399105,
};

describe("Einordnungs-Absatz der Regionsseiten", () => {
  it("nennt die Region im Rangsatz — sonst fehlt das Subjekt", () => {
    const t = buildRegionHighlight(basis);
    expect(t).toContain("führt Bayern alle 16 Bundesländer an");
    expect(t).not.toMatch(/führt damit alle/);
  });

  it("setzt den Artikel vor Gattungsnamen", () => {
    const t = buildRegionHighlight(basis);
    expect(t).toContain("der Landkreis Dingolfing-Landau");
    // Städte bleiben ohne Artikel.
    expect(t).toContain("steht München");
  });

  it("benennt das andere Ende, statt nur einen Faktor zu behaupten", () => {
    const t = buildRegionHighlight(basis);
    expect(t).toContain("Am anderen Ende steht München mit");
    expect(t).not.toMatch(/-fache/);
  });

  it("sagt den Zubau als Anteil und mit Richtung", () => {
    const t = buildRegionHighlight(basis);
    expect(t).toContain("11 % des heutigen Bestands");
    expect(t).toContain("weniger als im Jahr davor");
  });

  it("schreibt Singular, wenn nur eine Anlage dazukam", () => {
    const t = buildRegionHighlight({
      ...basis,
      byYear: [{ year: 2025, count: 1 }],
      count: 40,
    });
    // Auch das Verb muss mitgehen: „kamen eine Anlage dazu" wäre derselbe
    // Fehler wie „1 neue Anlagen".
    expect(t).toContain("kam eine Anlage dazu");
    expect(t).not.toMatch(/\b1 Anlagen|kamen eine/);
  });

  it("lässt Sätze weg, statt Lücken zu schreiben", () => {
    // Keine Kinder, kein Rang, kein Zubau → leerer Absatz, kein „—" und kein
    // halber Satz. Der Aufrufer rendert dann gar nichts.
    const t = buildRegionHighlight({
      level: "landkreis",
      name: "Landkreis Irgendwo",
      kindWort: "Gemeinden",
      kinder: [],
      count: 0,
    });
    expect(t).toBe("");
  });

  it("setzt nach 'von' den Dativ und gibt dem Saarland seinen Artikel", () => {
    // Beide Fehler standen am 18.08.2026 auf der Saarland-Seite:
    // „liegt Saarland auf Platz 12 von 16 Bundesländer".
    const t = buildRegionHighlight({ ...basis, name: "Saarland", rang: 12 });
    expect(t).toContain("liegt das Saarland auf Platz 12 von 16 Bundesländern");
    expect(t).not.toMatch(/von 16 Bundesländer\b/);
    expect(t).not.toMatch(/liegt Saarland/);
  });

  it("verschweigt einen Rang, der nichts aussagt", () => {
    // Zwei Geschwister: „Platz 2 von 2" ist keine Einordnung.
    const t = buildRegionHighlight({ ...basis, rang: 2, rangVon: 2 });
    expect(t).not.toMatch(/Platz 2/);
  });

  it("nennt keine Spanne, wenn das Feld eng beieinander liegt", () => {
    const eng = buildRegionHighlight({
      ...basis,
      kinder: [
        { name: "Kreis A", wPerCapitaDach: 1000, count: 10 },
        { name: "Kreis B", wPerCapitaDach: 900, count: 10 },
        { name: "Kreis C", wPerCapitaDach: 800, count: 10 },
      ],
    });
    expect(eng).not.toContain("Am anderen Ende");
  });
});
