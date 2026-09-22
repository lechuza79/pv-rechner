import { describe, expect, it } from "vitest";
import { unterscheidendeWoerter, kontaktFuer } from "../../scripts/fachbetriebe-kontakte";

describe("Kontakterfassung der Fachbetriebe", () => {
  it("erkennt dieselbe Firma unter anderer Schreibweise, aber nicht über Branchenwörter", () => {
    expect(unterscheidendeWoerter("christian-spatz-bedachungen.de")).toContain("spatz");
    expect(unterscheidendeWoerter("spatz-bedachungen.com")).toContain("spatz");
    // "solar" and "elektro" are shared by thousands of businesses and prove nothing.
    expect(unterscheidendeWoerter("solar-elektro.de")).toEqual([]);
    expect(unterscheidendeWoerter("team-beck.de")).toEqual(["beck"]);
  });
  it("wählt das Postfach auf der eigenen Domain vor dem auf einer verwandten", () => {
    expect(kontaktFuer({ id: "muster-solar.de", general: ["info@muster-gruppe.de", "info@muster-solar.de"], kanaele: {} })).toBe("info@muster-solar.de");
    expect(kontaktFuer({ id: "muster-solar.de", general: [], kanaele: { betrieb: ["inhaber@web.de"] } })).toBe("inhaber@web.de");
    expect(kontaktFuer({ id: "muster-solar.de", general: [], kanaele: {} })).toBeNull();
  });
});
