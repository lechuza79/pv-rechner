import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = () => readFileSync(join(__dirname, "../../app/(site)/waermepumpe-rechner/waermepumpe.tsx"), "utf8");

// The approved design compares heating alternatives within each building state.
// It cannot rank renovation investments because their costs are not in this model.
describe("Building-state comparison scope", () => {
  it("states what is compared and which renovation costs are excluded", () => {
    const text = source();
    expect(text).toContain("Die Beträge vergleichen Wärmepumpe und Vergleichsheizung im jeweiligen Gebäudezustand.");
    expect(text).toContain("Dämmkosten und Dämmförderung fehlen");
    expect(text).toContain("ob sich die Dämmung lohnt, wird hier nicht berechnet");
  });

  it("does not infer a renovation recommendation from heating savings", () => {
    const text = source();
    expect(text).not.toMatch(/Am meisten bringt|Weitere Schritte am Gebäude ändern daran wenig|So wirken sich weitere Schritte auf die Wirtschaftlichkeit aus/);
  });

  it("explains why fixed demand or load cannot be carried into a renovated house", () => {
    const text = source();
    expect(text).toMatch(/updateSettings\(\{ \.\.\.patch, oQges: null, oHeizlast: null \}\)/);
    expect(text).toContain("Bei geänderten Gebäudeangaben werden Wärmebedarf und Heizlast neu geschätzt.");
  });
});
