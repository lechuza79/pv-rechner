import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// More than 1,000 towns are written to since 14.10.2026. A capped read released
// an arbitrary 1,000 and left the rest on noindex.
describe("search release reads every written-to town", () => {
  const src = readFileSync(new URL("../atlas-outreach-freigabe.ts", import.meta.url), "utf8");
  const code = src.replace(/\/\/.*$/gm, "");
  it("pages through the list in a fixed order", () => {
    expect(code).toMatch(/\.order\("region_id"\)/);
    expect(code).toMatch(/\.range\(von, von \+ 999\)/);
  });
  it("has no single capped read", () => {
    expect(code).not.toMatch(/\.limit\(/);
  });
});
