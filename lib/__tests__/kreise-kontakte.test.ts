import { describe, expect, it } from "vitest";
import { istKreisPostfach, KREISE_ROLLENWERK, KREISE_SCOPE } from "../../scripts/kreise-kontakte";

describe("Kontakte der Landkreise", () => {
  it("nimmt das bayerische Landratsamt unter bayern.de als eigenes Postfach", () => {
    expect(istKreisPostfach("DiehrJ@lra-m.bayern.de", "https://www.landkreis-muenchen.de/")).toBe(true);
    expect(istKreisPostfach("poststelle@landratsamt-dachau.bayern.de", "https://www.landkreis-dachau.de/")).toBe(true);
  });

  it("lässt andere Stellen unter bayern.de draußen", () => {
    expect(istKreisPostfach("poststelle@wwa-m.bayern.de", "https://www.landkreis-muenchen.de/")).toBe(false);
    expect(istKreisPostfach("presse@stmuv.bayern.de", "https://www.landkreis-muenchen.de/")).toBe(false);
  });

  it("berührt Postfächer außerhalb von bayern.de nicht", () => {
    expect(istKreisPostfach("presse@kreis-herford.de", "https://www.kreis-herford.de/")).toBe(true);
  });

  it("liest Gebäudeverwaltung und Vorzimmer nicht als Fachstelle", () => {
    for (const w of ["Hochbau", "Gebäudemanagement", "Liegenschaften", "Vorzimmer Landrätin"]) expect(KREISE_ROLLENWERK.fremdeEinheit.test(w)).toBe(true);
    expect(KREISE_ROLLENWERK.fremdeEinheit.test("Klimaschutzmanagement")).toBe(false);
  });

  it("dreht die Zuständigkeit gegenüber den Gemeinden um", () => {
    expect(KREISE_SCOPE.fremdeBehoerde.test("stadt-herford")).toBe(true);
    expect(KREISE_SCOPE.fremdeBehoerde.test("kreis-herford")).toBe(false);
  });
});
