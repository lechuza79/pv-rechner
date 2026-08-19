import { describe, it, expect } from "vitest";
import {
  buildRegionHighlight,
  highlightAlsText,
  type RegionHighlightInput,
} from "../region-highlight";

/**
 * Der Einordnungs-Absatz der Atlas-Regionsseiten.
 *
 * Geprüft wird, was beim ersten Durchlauf im Browser schiefging (18.08.2026) —
 * jeder dieser Fälle stand einmal so auf der Seite:
 *   „Gemessen an der Dachleistung je Einwohner führt damit alle 16 an."  (kein Subjekt)
 *   „Am weitesten ist Landkreis Dingolfing-Landau …"                     (kein Artikel)
 *   „… liegt Saarland auf Platz 12 von 16 Bundesländer"                  (kein Dativ)
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
    {
      name: "Landkreis Dingolfing-Landau",
      wPerCapitaDach: 4339,
      count: 9000,
      href: "/solar-atlas/bayern/landkreis-dingolfing-landau",
    },
    { name: "Landkreis Haßberge", wPerCapitaDach: 3800, count: 13015, href: "/solar-atlas/bayern/landkreis-hassberge" },
    { name: "München", wPerCapitaDach: 174, count: 40000, href: "/solar-atlas/bayern/muenchen" },
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

/** Der fertige Absatz als Text — die Form, die ein Leser sieht. */
const text = (i: RegionHighlightInput) => highlightAlsText(buildRegionHighlight(i));

describe("Einordnungs-Absatz der Regionsseiten", () => {
  it("nennt die Region im Rangsatz — sonst fehlt das Subjekt", () => {
    expect(text(basis)).toContain("führt Bayern alle 16 Bundesländer an");
    expect(text(basis)).not.toMatch(/führt damit alle/);
  });

  it("setzt den Artikel vor Gattungsnamen", () => {
    expect(text(basis)).toContain("der Landkreis Dingolfing-Landau");
    // Städte bleiben ohne Artikel.
    expect(text(basis)).toContain("steht München");
  });

  it("benennt das andere Ende, statt nur einen Faktor zu behaupten", () => {
    expect(text(basis)).toContain("Am anderen Ende steht München mit");
    expect(text(basis)).not.toMatch(/-fache/);
  });

  it("sagt den Zubau als Anteil und mit Richtung", () => {
    expect(text(basis)).toContain("11 % des heutigen Bestands");
    expect(text(basis)).toContain("weniger als im Jahr davor");
  });

  it("schreibt Singular, wenn nur eine Anlage dazukam", () => {
    const t = text({ ...basis, byYear: [{ year: 2025, count: 1 }], count: 40 });
    // Auch das Verb muss mitgehen: „kamen eine Anlage dazu" wäre derselbe
    // Fehler wie „1 neue Anlagen".
    expect(t).toContain("kam eine Anlage dazu");
    expect(t).not.toMatch(/\b1 Anlagen|kamen eine/);
  });

  it("stellt nach vorn, was für diese Region auffällig ist", () => {
    // Platz 1 von 16 ist eine Nachricht — der Rangsatz führt.
    expect(text(basis).startsWith("Gemessen an der Dachleistung")).toBe(true);

    // Mittelfeld ohne besondere Spanne, dafür ein eingebrochener Zubau: dann
    // führt der Zubau, und derselbe Baustein erzeugt einen anders gebauten Text.
    const mittelfeld = text({
      ...basis,
      rang: 8,
      kinder: [
        { name: "Kreis A", wPerCapitaDach: 1000, count: 10 },
        { name: "Kreis B", wPerCapitaDach: 900, count: 10 },
        { name: "Kreis C", wPerCapitaDach: 800, count: 10 },
      ],
      byYear: [
        { year: 2024, count: 200000 },
        { year: 2025, count: 100000 },
      ],
    });
    expect(mittelfeld.startsWith("2025 kamen")).toBe(true);
    expect(mittelfeld).toContain("Platz 8 von 16");
  });

  it("liefert für dieselben Daten immer denselben Text", () => {
    // Keine Zufalls-Variation: Die Seite ist gecacht, und ein Text, der sich bei
    // jedem Aufbau umsortiert, ist für Google eine wechselnde Seite.
    expect(text(basis)).toBe(text(basis));
  });

  it("verlinkt die genannten Gebiete, aber erfindet keine Adresse", () => {
    const teile = buildRegionHighlight(basis);
    const links = teile.filter((t): t is { text: string; href: string } => typeof t !== "string");
    expect(links.map((l) => l.href)).toEqual([
      "/solar-atlas/bayern/landkreis-dingolfing-landau",
      "/solar-atlas/bayern/muenchen",
    ]);
    // Der Ankertext ist der Ortsname, nicht „hier" — und er trägt seinen Artikel.
    expect(links[0].text).toBe("der Landkreis Dingolfing-Landau");

    // Ohne Adresse bleibt der Name unverlinkter Text, statt auf „#" zu zeigen.
    const ohne = buildRegionHighlight({
      ...basis,
      kinder: basis.kinder.map((k) => ({ ...k, href: null })),
    });
    expect(ohne.every((t) => typeof t === "string")).toBe(true);
    expect(highlightAlsText(ohne)).toContain("der Landkreis Dingolfing-Landau");
  });

  it("lässt Sätze weg, statt Lücken zu schreiben", () => {
    // Keine Kinder, kein Rang, kein Zubau → leerer Absatz, kein „—" und kein
    // halber Satz. Der Aufrufer rendert dann gar nichts.
    const teile = buildRegionHighlight({
      level: "landkreis",
      name: "Landkreis Irgendwo",
      kindWort: "Gemeinden",
      kinder: [],
      count: 0,
    });
    expect(teile).toEqual([]);
  });

  it("setzt nach 'von' den Dativ und gibt dem Saarland seinen Artikel", () => {
    // Beide Fehler standen am 18.08.2026 auf der Saarland-Seite:
    // „liegt Saarland auf Platz 12 von 16 Bundesländer".
    const t = text({ ...basis, name: "Saarland", rang: 12 });
    expect(t).toContain("liegt das Saarland auf Platz 12 von 16 Bundesländern");
    expect(t).not.toMatch(/von 16 Bundesländer\b/);
    expect(t).not.toMatch(/liegt Saarland/);
  });

  it("verschweigt einen Rang, der nichts aussagt", () => {
    // Zwei Geschwister: „Platz 2 von 2" ist keine Einordnung.
    expect(text({ ...basis, rang: 2, rangVon: 2 })).not.toMatch(/Platz 2/);
  });

  it("nennt keine Spanne, wenn das Feld eng beieinander liegt", () => {
    const eng = text({
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
