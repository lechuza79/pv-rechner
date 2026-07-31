import { describe, it, expect } from "vitest";
import { buildGemeindeHighlight } from "../gemeinde-highlight";

type Seg = { segment: string; count: number; kwp: number };
const mk = (
  segs: Record<string, number>,
  speicher: number,
  count = 900,
  opts: { segCounts?: Record<string, number>; batterien?: number } = {},
) => ({
  solar: {
    total_count: count,
    total_kwp: Object.values(segs).reduce((a, b) => a + b, 0),
    by_segment: Object.entries(segs).map(
      ([segment, kwp]): Seg => ({ segment, count: opts.segCounts?.[segment] ?? 0, kwp }),
    ),
  },
  speicher: {
    kwh_batterie: speicher,
    by_segment: [{ segment: "batterie_privat", count: opts.batterien ?? 50 }],
  },
});

// Bundesland: ausgewogener Referenz-Mix.
const bl = mk({ privat_dach: 200000, gewerbe_dach: 150000, freiflaeche: 150000 }, 80000, 100000);

describe("buildGemeindeHighlight", () => {
  it("beginnt immer mit dem Basissatz", () => {
    const t = buildGemeindeHighlight({
      name: "Musterhausen", atlas: mk({ privat_dach: 5000, gewerbe_dach: 3000, freiflaeche: 1000 }, 400),
      blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
    });
    expect(t.startsWith("In Musterhausen sind 900 Solaranlagen")).toBe(true);
  });

  it("nennt den Rang im Landkreis, wenn ≥3 Gemeinden", () => {
    const t = buildGemeindeHighlight({
      name: "Mitteldorf", atlas: mk({ privat_dach: 5000, gewerbe_dach: 3000 }, 400),
      blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
      kreisName: "Landkreis Testberg", rankInKreis: 5, kreisTotal: 12,
    });
    expect(t).toContain("Platz 5 von 12 im Landkreis Testberg");
  });

  it("Rang 1 nennt die richtige Gattung — eine Stadt ist keine Gemeinde", () => {
    const rang1 = (bezeichnung?: string) =>
      buildGemeindeHighlight({
        name: "Spitzenort", atlas: mk({ privat_dach: 9000 }, 0),
        blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
        bezeichnung, kreisName: "Landkreis Testberg", rankInKreis: 1, kreisTotal: 12,
      });
    expect(rang1("Stadt")).toContain("solarstärkste Stadt im Landkreis Testberg");
    expect(rang1("Gemeinde")).toContain("solarstärkste Gemeinde im Landkreis Testberg");
    expect(rang1("Markt")).toContain("solarstärkste Marktgemeinde im Landkreis Testberg");
    // Unbekannte oder fehlende Bezeichnung: neutral, statt zu raten.
    expect(rang1()).toContain("solarstärkste Kommune im Landkreis Testberg");
  });

  it("beschreibt den Zubau-Trend", () => {
    const t = buildGemeindeHighlight({
      name: "Wachstumsheim", atlas: mk({ privat_dach: 5000 }, 0),
      blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
      byYear: [{ year: 2024, count: 20 }, { year: 2025, count: 45 }], lastYear: 2025,
    });
    expect(t).toContain("Zubau zieht an");
  });

  it("fällt auf die Mix-Zusammensetzung zurück, wenn kein Ausreißer heraussticht", () => {
    const t = buildGemeindeHighlight({
      name: "Ausgewogen", atlas: mk({ privat_dach: 4000, gewerbe_dach: 3000, freiflaeche: 2000 }, 400),
      blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
    });
    expect(t).toContain("verteilt sich auf");
  });

  it("zwei verschiedene Gemeinden → verschiedener Text", () => {
    const a = buildGemeindeHighlight({
      name: "Alpha", atlas: mk({ freiflaeche: 8000, privat_dach: 1000 }, 0),
      blAtlas: bl, blName: "Bayern", perCapita: 3000, perCapitaVsBl: 0.5,
      kreisName: "Landkreis X", rankInKreis: 2, kreisTotal: 10,
      byYear: [{ year: 2025, count: 12 }], lastYear: 2025,
    });
    const b = buildGemeindeHighlight({
      name: "Beta", atlas: mk({ privat_dach: 7000, gewerbe_dach: 500 }, 3000),
      blAtlas: bl, blName: "Bayern", perCapita: 800, perCapitaVsBl: -0.4,
      kreisName: "Landkreis X", rankInKreis: 8, kreisTotal: 10,
      byYear: [{ year: 2024, count: 30 }, { year: 2025, count: 10 }], lastYear: 2025,
    });
    expect(a).not.toBe(b);
  });

  it("zählt eine einzelne Freiflächen-Anlage im Singular", () => {
    const einer = buildGemeindeHighlight({
      name: "Parkdorf",
      atlas: mk({ privat_dach: 1000, freiflaeche: 90000 }, 0, 30, { segCounts: { freiflaeche: 1 } }),
      blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
    });
    expect(einer).toContain("Eine große Freiflächen-Anlage prägt das Bild");
    const mehrere = buildGemeindeHighlight({
      name: "Parkdorf",
      atlas: mk({ privat_dach: 1000, freiflaeche: 90000 }, 0, 30, { segCounts: { freiflaeche: 4 } }),
      blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
    });
    expect(mehrere).toContain("Freiflächen-Anlagen prägen das Bild");
    // Nie von "Parks" reden: gezählt werden Anlagen, ein Park kann mehrere sein.
    expect(einer + mehrere).not.toContain("Solarpark");
  });

  it("behauptet keine Speicher-Dichte bei zwei Batterien", () => {
    const wenige = buildGemeindeHighlight({
      name: "Kleinort", atlas: mk({ privat_dach: 500 }, 400, 12, { batterien: 2 }),
      blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
    });
    expect(wenige).not.toContain("Batteriespeicher —");
    const viele = buildGemeindeHighlight({
      name: "Speicherdorf", atlas: mk({ privat_dach: 500 }, 400, 12, { batterien: 40 }),
      blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
    });
    expect(viele).toContain("Überdurchschnittlich viel Batteriespeicher");
  });

  it("schreibt „ist eine Solaranlage“ statt „sind 1 Solaranlagen“", () => {
    const t = buildGemeindeHighlight({
      name: "Winzigheim", atlas: mk({ privat_dach: 10 }, 0, 1),
      blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
    });
    expect(t.startsWith("In Winzigheim ist eine Solaranlage mit")).toBe(true);
  });

  it("übersetzt groteske Abstände in ein Vielfaches", () => {
    // Ein Solarpark in einem 700-Einwohner-Ort: „4.935 % über dem Schnitt“.
    const t = buildGemeindeHighlight({
      name: "Riedenheim", atlas: mk({ freiflaeche: 90000 }, 0, 30),
      blAtlas: bl, blName: "Bayern", perCapita: 126865, perCapitaVsBl: 49.35,
    });
    expect(t).toContain("das 50-fache des Bayern-Schnitts");
    expect(t).not.toContain("4935 %");
  });
});
