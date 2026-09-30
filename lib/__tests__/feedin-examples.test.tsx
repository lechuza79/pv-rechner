import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { feedinExamples } from "../feedin-examples";
import { calc } from "../calc";
import { NATIONAL_AVG_YIELD } from "../constants";

const read = (p: string) => readFileSync(resolve(p), "utf8");
describe("editorial feed-in examples", () => {
  it("reconciles both displayed benefits with the existing calculator", () => {
    for (const date of ["2026-07-31", "2026-08-01"]) {
      for (const e of feedinExamples(date, 0.31)) {
        const result = calc({ kwp:e.kwp, kosten:0, strompreis:0.31,
          eigenverbrauch:e.selfUsePercent, einspeisung:e.rate,
          stromSteigerung:0, ertragKwp:NATIONAL_AVG_YIELD, monthly:null });
        expect(Math.round(e.feedIn + e.saving)).toBe(result.years[1].j);
        expect(e.selfUse).toBeLessThanOrEqual(3800);
      }
    }
  });
  it("applies the commissioning cutoff and weighted rate above 10 kWp", () => {
    const before = feedinExamples("2026-07-31", 0.31);
    const after = feedinExamples("2026-08-01", 0.31);
    expect(after[0].rate).toBeLessThan(before[0].rate);
    expect(after[0].rate).toBe(after[1].rate);
    expect(after[2].rate).toBeLessThan(after[1].rate);
  });
  it("uses the same example component on municipal and editorial pages", () => {
    expect(read("components/gemeinde/GemeindeBeispiele.tsx")).toContain("<ExampleCard");
    const next = read("app/(site)/einspeiseverguetung-tabelle/NextSteps.tsx");
    expect(next).toContain("<ExampleCard");
    expect(read("app/(site)/einspeiseverguetung-tabelle/page.tsx")).toContain('<PvConsumerExample initialSystem=');
    const page = read("app/(site)/einspeiseverguetung-tabelle/page.tsx");
    for (const id of ["aktuelle-saetze", "bestandsanlage", "anfangsjahre", "verlauf"])
      expect(page).toContain(`id="${id}"`);
    expect(page).toContain('<ArchivTabelle field="u10"');
    expect(page).toContain('<ArchivTabelle field="u40"');
  });
});
