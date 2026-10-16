import { describe, expect, it } from "vitest";
import { atlasAufbauZeilen } from "../laufzeitprotokoll";

const msg = (gesamtMs: number) =>
  JSON.stringify({ message: `[atlas-aufbau] {"seite":"/x","gesamtMs":${gesamtMs},"schritte":[]}` });

describe("atlasAufbauZeilen", () => {
  it("returns only marked lines, slowest first, capped", () => {
    const log = [msg(2600), JSON.stringify({ message: "other" }), msg(7000), msg(4000), msg(3000)].join("\n");
    const z = atlasAufbauZeilen(log, 2);
    expect(z).toHaveLength(2);
    expect(z[0]).toContain('"gesamtMs":7000');
    expect(z[1]).toContain('"gesamtMs":4000');
  });
  it("survives broken lines and empty input", () => {
    expect(atlasAufbauZeilen("")).toEqual([]);
    expect(atlasAufbauZeilen('garbage [atlas-aufbau] {"gesamtMs":3000}')[0]).toContain("3000");
  });
});
