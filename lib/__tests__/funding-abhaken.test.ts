import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Source guards deliberately avoid executing the production-writing CLI.
// A municipality-wide stamp must not silently return through a refactor.
describe("Source-specific funding review stamps", () => {
  const source = readFileSync(resolve(process.cwd(), "scripts/funding-screen.ts"), "utf8");
  const review = source.slice(source.indexOf("async function gelesen()"), source.indexOf("async function main()"));

  it("requires one municipality, an exact source and a quote", () => {
    expect(review).toContain('ids.length !== 1 || !sourceUrl || !quote');
    expect(review).not.toMatch(/\.in\("region_id"/);
    expect(review).toContain('.eq("url", normalized)');
  });

  it("checks the quote against the fetched original before writing", () => {
    const check = review.indexOf('sichtbarerText(original).includes(sichtbarerText(quote))');
    expect(check).toBeGreaterThan(review.indexOf('sources.fetch(sourceUrl'));
    expect(check).toBeLessThan(review.indexOf('.update('));
    expect(review).toContain('seitenSchluessel(coverage.url) === normalized');
    expect(review).toContain('.eq("url", coverage.url)');
  });

  it("requires an explicit review result", () => {
    expect(review).toMatch(/if \(!roh \|\| !ergebnis\)/);
  });
});
