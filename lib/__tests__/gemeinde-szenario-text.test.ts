import { describe, it, expect } from "vitest";
import { gemeindeSzenarioTexte, pvErtragSatz } from "../gemeinde-szenario-text";
import { NATIONAL_AVG_YIELD } from "../constants";

describe("pvErtragSatz", () => {
  it("ordnet den Standort gegen den Bundesschnitt ein", () => {
    expect(pvErtragSatz("Höchberg", Math.round(NATIONAL_AVG_YIELD * 1.08))).toContain("8 % über dem Bundesschnitt");
    expect(pvErtragSatz("Flensburg", Math.round(NATIONAL_AVG_YIELD * 0.88))).toContain("12 % unter dem Bundesschnitt");
    expect(pvErtragSatz("Kassel", NATIONAL_AVG_YIELD)).toContain("im Bundesschnitt");
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

describe("gemeindeSzenarioTexte", () => {
  it("beugt den Numerus mit", () => {
    expect(gemeindeSzenarioTexte({ name: "Höchberg", balkonCount: 0 }).balkon).toContain("kein einziges");
    expect(gemeindeSzenarioTexte({ name: "Höchberg", balkonCount: 1 }).balkon).toContain("genau eines");
    expect(gemeindeSzenarioTexte({ name: "Höchberg", balkonCount: 2 }).balkon).toContain("sind bisher 2 gemeldet");
  });

  it("setzt Tausenderpunkte", () => {
    expect(gemeindeSzenarioTexte({ name: "Stuttgart", balkonCount: 6036 }).balkon).toContain("6.036");
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
