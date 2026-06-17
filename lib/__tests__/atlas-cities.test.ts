import { describe, it, expect } from "vitest";
import { ATLAS_CITIES, slugify, cityPath, bundeslaenderWithCities, citiesInBundesland } from "../atlas-cities";
import { landProgramBundeslaender } from "../funding-programs";
import nextConfig from "../../next.config.js";

describe("slugify", () => {
  it("transliterates umlauts and ß and collapses separators", () => {
    expect(slugify("Baden-Württemberg")).toBe("baden-wuerttemberg");
    expect(slugify("Bayern")).toBe("bayern");
    expect(slugify("Nordrhein-Westfalen")).toBe("nordrhein-westfalen");
    expect(slugify("Groß Düsseldorf")).toBe("gross-duesseldorf");
  });
});

describe("geo helpers", () => {
  it("cityPath builds the nested Bundesland/Stadt path", () => {
    const wue = ATLAS_CITIES.find((c) => c.slug === "wuerzburg")!;
    expect(cityPath(wue)).toBe("/photovoltaik-foerderung/bayern/wuerzburg");
  });

  it("citiesInBundesland returns only that Land's cities", () => {
    expect(citiesInBundesland("bayern").map((c) => c.slug).sort()).toEqual(["regensburg", "wuerzburg"]);
    expect(citiesInBundesland("hessen").map((c) => c.slug).sort()).toEqual(["darmstadt", "frankfurt"]);
  });

  it("bundeslaenderWithCities is unique and covers every city's Bundesland", () => {
    const slugs = bundeslaenderWithCities().map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of ATLAS_CITIES) expect(slugs).toContain(slugify(c.bundesland));
  });
});

describe("landProgramBundeslaender", () => {
  it("includes Berlin (Land program without cities)", () => {
    expect(landProgramBundeslaender().map((b) => b.slug)).toContain("berlin");
  });
});

// Drift guard: the old flat slugs are redirected to the nested paths via a
// hand-written list in next.config.js. If a city is added/renamed in
// atlas-cities but the redirect isn't updated, a live URL breaks. Lock it.
describe("slug redirects stay in sync with atlas-cities", () => {
  it("every city's flat URL redirects (308) to its current nested path", async () => {
    const redirects = await nextConfig.redirects();
    for (const c of ATLAS_CITIES) {
      const flat = `/photovoltaik-foerderung/${c.slug}`;
      const r = redirects.find((x: { source: string }) => x.source === flat);
      expect(r, `redirect for ${flat} missing in next.config.js`).toBeTruthy();
      expect(r!.destination).toBe(cityPath(c));
      expect(r!.permanent).toBe(true);
    }
  });
});
