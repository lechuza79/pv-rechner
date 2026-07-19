import { describe, it, expect } from "vitest";
import { buildGemeindeHighlight } from "../gemeinde-highlight";

type Seg = { segment: string; count: number; kwp: number };
const mk = (segs: Record<string, number>, speicher: number, count = 900) => ({
  solar: {
    total_count: count,
    total_kwp: Object.values(segs).reduce((a, b) => a + b, 0),
    by_segment: Object.entries(segs).map(([segment, kwp]): Seg => ({ segment, count: 0, kwp })),
  },
  speicher: { kwh_batterie: speicher },
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

  it("Rang 1 = solarstärkste Gemeinde", () => {
    const t = buildGemeindeHighlight({
      name: "Spitzenort", atlas: mk({ privat_dach: 9000 }, 0),
      blAtlas: bl, blName: "Bayern", perCapita: null, perCapitaVsBl: null,
      kreisName: "Landkreis Testberg", rankInKreis: 1, kreisTotal: 12,
    });
    expect(t).toContain("solarstärkste Gemeinde im Landkreis Testberg");
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
});
