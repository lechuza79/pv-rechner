import { describe, it, expect } from "vitest";
import { gemeindeSzenarioTexte, pvErtragSatz, szenarioUeberschrift } from "../gemeinde-szenario-text";
import { NATIONAL_AVG_YIELD } from "../constants";

describe("pvErtragSatz", () => {
  // Es gibt drei Formulierungen je Richtung; geprüft wird die AUSSAGE, nicht
  // eine bestimmte Formulierung — sonst nagelt der Test die Variation fest.
  const alleFormen = (name: string, ertrag: number) =>
    ["09679147", "08111000", "05315000", "02000000", "04011000", "13003000"].map((id) =>
      pvErtragSatz(name, ertrag, id),
    );

  it("ordnet den Standort gegen den Bundesschnitt ein", () => {
    for (const t of alleFormen("Höchberg", Math.round(NATIONAL_AVG_YIELD * 1.08))) {
      expect(t).toMatch(/8 %/);
      expect(t).toMatch(/über dem Bundesschnitt|ergiebiger|besser als der Durchschnitt/);
    }
    for (const t of alleFormen("Flensburg", Math.round(NATIONAL_AVG_YIELD * 0.88))) {
      expect(t).toMatch(/12 %/);
      expect(t).toMatch(/unter dem Bundesschnitt|geringer/);
    }
    for (const t of alleFormen("Kassel", NATIONAL_AVG_YIELD)) {
      expect(t).toMatch(/Bundesschnitt/);
    }
  });

  it("formuliert verschieden, aber je Gemeinde immer gleich", () => {
    const ertrag = Math.round(NATIONAL_AVG_YIELD * 1.08);
    expect(new Set(alleFormen("Höchberg", ertrag)).size).toBeGreaterThan(1);
    expect(pvErtragSatz("Höchberg", ertrag, "09679147")).toBe(pvErtragSatz("Höchberg", ertrag, "09679147"));
  });

  it("nennt die Gemeinde beim Namen", () => {
    expect(pvErtragSatz("Höchberg", 1200)).toContain("Höchberg");
    expect(pvErtragSatz("Kassel", NATIONAL_AVG_YIELD)).toContain("Kassel");
  });

  it("schreibt keine Einheit in den Satz — die steht in der Parameterzeile", () => {
    for (const y of [800, 1050, 1300]) {
      const satz = pvErtragSatz("Höchberg", y) ?? "";
      expect(satz).not.toMatch(/kWh|kWp|kW\b/);
    }
  });

  it("schweigt ohne Ertrag statt zu raten", () => {
    expect(pvErtragSatz("Höchberg", null)).toBeNull();
    expect(pvErtragSatz("Höchberg", 0)).toBeNull();
    expect(pvErtragSatz("Höchberg", Number.NaN)).toBeNull();
  });
});

describe("szenarioUeberschrift", () => {
  it("nennt die Gemeinde und bleibt bei jedem Aufruf gleich", () => {
    const a = szenarioUeberschrift("Höchberg", "09679147");
    expect(a).toContain("Höchberg");
    expect(szenarioUeberschrift("Höchberg", "09679147")).toBe(a);
  });

  it("variiert zwischen Gemeinden", () => {
    const formen = new Set(
      ["09679147", "08111000", "09679135", "05315000", "02000000"].map((id) => szenarioUeberschrift("X", id)),
    );
    expect(formen.size).toBeGreaterThan(1);
  });

  it("bildet keine Einwohnerbezeichnung — die folgt keiner Regel", () => {
    // "Bremer", "Hallenser", "Kasseler": aus dem Ortsnamen nicht ableitbar.
    for (const id of ["09679147", "08111000", "04011000"]) {
      const t = szenarioUeberschrift("Halle", id);
      expect(t).not.toMatch(/Hallee?r|Hallenser/);
      expect(t).toContain("Halle");
    }
  });
});

describe("gemeindeSzenarioTexte", () => {
  it("beugt den Numerus mit — in jeder Variante", () => {
    const ids = ["09679147", "08111000", "05315000", "02000000", "04011000", "13003000"];
    for (const regionId of ids) {
      expect(gemeindeSzenarioTexte({ name: "Höchberg", regionId, balkonCount: 0 }).balkon).toMatch(
        /kein einziges|keines/,
      );
      expect(gemeindeSzenarioTexte({ name: "Höchberg", regionId, balkonCount: 1 }).balkon).toMatch(
        /genau eines/,
      );
      const viele = gemeindeSzenarioTexte({ name: "Höchberg", regionId, balkonCount: 2 }).balkon ?? "";
      expect(viele).toContain("2");
      // Keine Singular-Form bei Mehrzahl.
      expect(viele).not.toMatch(/ist bisher|genau eines/);
    }
  });

  it("setzt Tausenderpunkte", () => {
    expect(gemeindeSzenarioTexte({ name: "Stuttgart", regionId: "08111000", balkonCount: 6036 }).balkon).toContain(
      "6.036",
    );
  });

  it("schweigt ohne Zahl", () => {
    expect(gemeindeSzenarioTexte({ name: "Höchberg", balkonCount: null }).balkon).toBeNull();
  });

  it("wiederholt nicht, was die Einleitung schon sagt", () => {
    // Die Einleitung nennt Anlagenzahl, Speicher, Rang, Zubau und den
    // Pro-Kopf-Abstand zum Land. Nichts davon darf hier ein zweites Mal stehen.
    const alles = [gemeindeSzenarioTexte({ name: "Höchberg", balkonCount: 237 }).balkon, pvErtragSatz("Höchberg", 1132)]
      .filter(Boolean)
      .join(" ");
    for (const wort of ["Schnitt von", "Platz", "Zubau", "Hausbatterien", "je Einwohner"]) {
      expect(alles).not.toContain(wort);
    }
  });
});
