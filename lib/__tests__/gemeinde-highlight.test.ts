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
/** Einwohner des Referenz-Bundeslands: 500 Wp je Kopf über alle Anlagen,
 *  davon 200 Wp auf privaten Dächern. Runde Zahlen, damit die erwarteten
 *  Abstände in den Tests im Kopf nachrechenbar bleiben. */
const BL_EINWOHNER = 1_000_000;

describe("buildGemeindeHighlight", () => {
  it("beginnt immer mit dem Basissatz", () => {
    const t = buildGemeindeHighlight({
      name: "Musterhausen", atlas: mk({ privat_dach: 5000, gewerbe_dach: 3000, freiflaeche: 1000 }, 400),
      blAtlas: bl, blName: "Bayern", population: null, blPopulation: null,
    });
    expect(t.startsWith("In Musterhausen sind 900 Solaranlagen")).toBe(true);
  });

  it("nennt den Rang im Landkreis, wenn ≥3 Gemeinden", () => {
    const t = buildGemeindeHighlight({
      name: "Mitteldorf", atlas: mk({ privat_dach: 5000, gewerbe_dach: 3000 }, 400),
      blAtlas: bl, blName: "Bayern", population: null, blPopulation: null,
      kreisName: "Landkreis Testberg", rankInKreis: 5, kreisTotal: 12,
    });
    expect(t).toContain("Platz 5 von 12 im Landkreis Testberg");
  });

  it("Rang 1 nennt die richtige Gattung — eine Stadt ist keine Gemeinde", () => {
    const rang1 = (bezeichnung?: string) =>
      buildGemeindeHighlight({
        name: "Spitzenort", atlas: mk({ privat_dach: 9000 }, 0),
        blAtlas: bl, blName: "Bayern", population: null, blPopulation: null,
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
      blAtlas: bl, blName: "Bayern", population: null, blPopulation: null,
      byYear: [{ year: 2024, count: 20 }, { year: 2025, count: 45 }], lastYear: 2025,
    });
    expect(t).toContain("Zubau zieht an");
  });

  it("fällt auf die Mix-Zusammensetzung zurück, wenn kein Ausreißer heraussticht", () => {
    const t = buildGemeindeHighlight({
      name: "Ausgewogen", atlas: mk({ privat_dach: 4000, gewerbe_dach: 3000, freiflaeche: 2000 }, 400),
      blAtlas: bl, blName: "Bayern", population: null, blPopulation: null,
    });
    expect(t).toContain("verteilt sich auf");
  });

  it("zwei verschiedene Gemeinden → verschiedener Text", () => {
    const a = buildGemeindeHighlight({
      name: "Alpha", atlas: mk({ freiflaeche: 8000, privat_dach: 1000 }, 0),
      blAtlas: bl, blName: "Bayern", population: 3000, blPopulation: BL_EINWOHNER,
      kreisName: "Landkreis X", rankInKreis: 2, kreisTotal: 10,
      byYear: [{ year: 2025, count: 12 }], lastYear: 2025,
    });
    const b = buildGemeindeHighlight({
      name: "Beta", atlas: mk({ privat_dach: 7000, gewerbe_dach: 500 }, 3000),
      blAtlas: bl, blName: "Bayern", population: 20000, blPopulation: BL_EINWOHNER,
      kreisName: "Landkreis X", rankInKreis: 8, kreisTotal: 10,
      byYear: [{ year: 2024, count: 30 }, { year: 2025, count: 10 }], lastYear: 2025,
    });
    expect(a).not.toBe(b);
  });

  it("zählt eine einzelne Freiflächen-Anlage im Singular", () => {
    const einer = buildGemeindeHighlight({
      name: "Parkdorf",
      atlas: mk({ privat_dach: 1000, freiflaeche: 90000 }, 0, 30, { segCounts: { freiflaeche: 1 } }),
      blAtlas: bl, blName: "Bayern", population: null, blPopulation: null,
    });
    expect(einer).toContain("Eine große Freiflächen-Anlage prägt das Bild");
    const mehrere = buildGemeindeHighlight({
      name: "Parkdorf",
      atlas: mk({ privat_dach: 1000, freiflaeche: 90000 }, 0, 30, { segCounts: { freiflaeche: 4 } }),
      blAtlas: bl, blName: "Bayern", population: null, blPopulation: null,
    });
    expect(mehrere).toContain("Freiflächen-Anlagen prägen das Bild");
    // Nie von "Parks" reden: gezählt werden Anlagen, ein Park kann mehrere sein.
    expect(einer + mehrere).not.toContain("Solarpark");
  });

  it("behauptet keine Speicher-Dichte bei zwei Batterien", () => {
    const wenige = buildGemeindeHighlight({
      name: "Kleinort", atlas: mk({ privat_dach: 500 }, 400, 12, { batterien: 2 }),
      blAtlas: bl, blName: "Bayern", population: null, blPopulation: null,
    });
    expect(wenige).not.toContain("Batteriespeicher —");
    const viele = buildGemeindeHighlight({
      name: "Speicherdorf", atlas: mk({ privat_dach: 500 }, 400, 12, { batterien: 40 }),
      blAtlas: bl, blName: "Bayern", population: null, blPopulation: null,
    });
    expect(viele).toContain("Überdurchschnittlich viel Batteriespeicher");
  });

  it("schreibt „ist eine Solaranlage“ statt „sind 1 Solaranlagen“", () => {
    const t = buildGemeindeHighlight({
      name: "Winzigheim", atlas: mk({ privat_dach: 10 }, 0, 1),
      blAtlas: bl, blName: "Bayern", population: null, blPopulation: null,
    });
    expect(t.startsWith("In Winzigheim ist eine Solaranlage mit")).toBe(true);
  });

  it("übersetzt groteske Abstände in ein Vielfaches", () => {
    // Ein Solarpark in einem 700-Einwohner-Ort: „4.935 % über dem Schnitt“.
    const t = buildGemeindeHighlight({
      name: "Riedenheim", atlas: mk({ freiflaeche: 90000 }, 0, 30),
      blAtlas: bl, blName: "Bayern", population: 3600, blPopulation: BL_EINWOHNER,
    });
    expect(t).toContain("das 50-fache des Bayern-Schnitts");
    expect(t).not.toContain("4935 %");
  });
});

//
// DER FALL AUS DEM BRIEF-AUDIT (19.08.2026).
//
// Melsungen: auf den privaten Dächern 39 % ÜBER dem Hessen-Schnitt, über alle
// Anlagen zusammen 6 % DARUNTER. Der Brief nannte die erste Zahl, der erste
// Absatz dieser Seite die zweite — und eine Pressestelle las zwei Messgrößen
// als Widerspruch.
//
// Die Seite muss deshalb beide Größen nennen, sobald sie auseinandergehen, und
// die schwächere ausdrücklich als „für alle Anlagen" kennzeichnen.
describe("Pro-Kopf-Satz: die starke Größe zuerst, die schwächere mit ihrer Bezugsgröße", () => {
  /** Ort mit starken privaten Dächern und schwacher Gesamtleistung: 300 Wp/Kopf
   *  privat (bl: 200 → +50 %), 400 Wp/Kopf gesamt (bl: 500 → −20 %). */
  const nachzuegler = () =>
    buildGemeindeHighlight({
      name: "Melsungen",
      atlas: mk({ privat_dach: 3000, gewerbe_dach: 1000 }, 0, 500),
      blAtlas: bl,
      blName: "Hessen",
      population: 10_000,
      blPopulation: BL_EINWOHNER,
    });

  it("nennt zuerst die privaten Dächer und ihren Vorsprung", () => {
    const t = nachzuegler();
    expect(t).toContain("Je Einwohner stehen auf den privaten Dächern 300 Wp Photovoltaik — 50 % über dem Hessen-Schnitt");
  });

  it("benennt die andere Messgröße ausdrücklich — sonst steht Zahl gegen Zahl", () => {
    // Ohne „für alle Anlagen" liest sich der Nachsatz als Widerspruch zur Zahl
    // davor. Genau dieser Zusatz löst ihn auf (Formulierung des Betreibers).
    expect(nachzuegler()).toContain("jedoch 20 % unter dem Durchschnitt in Hessen für alle Anlagen.");
  });

  it("beschönigt nicht: der Rückstand steht im selben Satz", () => {
    const t = nachzuegler();
    expect(t).toContain("unter dem Durchschnitt");
    expect(t).not.toContain("viel Luft nach oben");
  });

  it("liegt alles über dem Schnitt, bleibt es beim gewohnten Satz", () => {
    // 800 Wp/Kopf gesamt gegen 500 im Land. Hier gibt es nichts aufzulösen —
    // ein Brief über die privaten Dächer widerspricht dem nicht.
    const t = buildGemeindeHighlight({
      name: "Sonnendorf",
      atlas: mk({ privat_dach: 5000, gewerbe_dach: 3000 }, 0, 500),
      blAtlas: bl,
      blName: "Hessen",
      population: 10_000,
      blPopulation: BL_EINWOHNER,
    });
    expect(t).toContain("Je Einwohner sind das 800 Wp Photovoltaik — 60 % über dem Hessen-Schnitt.");
    expect(t).not.toContain("für alle Anlagen");
  });

  it("liegt auch privat nichts vorn, wird nichts erfunden", () => {
    // 100 Wp/Kopf privat (bl 200) und 150 gesamt (bl 500): Es gibt keine starke
    // Größe. Dann bleibt der ehrliche Satz stehen — und der Brief schweigt
    // ohnehin, weil sein Vergleich unter der Meldeschwelle liegt.
    const t = buildGemeindeHighlight({
      name: "Schattendorf",
      atlas: mk({ privat_dach: 1000, gewerbe_dach: 500 }, 0, 500),
      blAtlas: bl,
      blName: "Hessen",
      population: 10_000,
      blPopulation: BL_EINWOHNER,
    });
    expect(t).toContain("70 % unter dem Hessen-Schnitt, hier ist also noch viel Luft nach oben.");
    expect(t).not.toContain("auf den privaten Dächern");
  });

  it("ohne Einwohnerzahl steht gar kein Pro-Kopf-Satz", () => {
    const t = buildGemeindeHighlight({
      name: "Ohnezahl",
      atlas: mk({ privat_dach: 3000 }, 0, 500),
      blAtlas: bl,
      blName: "Hessen",
      population: null,
      blPopulation: BL_EINWOHNER,
    });
    expect(t).not.toContain("Je Einwohner");
  });
});
