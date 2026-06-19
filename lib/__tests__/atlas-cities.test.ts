import { describe, it, expect } from "vitest";
import { ATLAS_CITIES, slugify, cityPath, bundeslaenderWithCities, citiesInBundesland, liveCities, isCityLive, isCityArchived, archivedCities, isCityPublished, publishedCities, publishedCitiesInBundesland, publishedBundeslaender } from "../atlas-cities";
import { landProgramBundeslaender, getFundingProgram } from "../funding-programs";
import nextConfig from "../../next.config.js";

// Live-Policy (Juni 2026): nur Regionen mit aktivem Programm bekommen eine Seite.
describe("live cities (only active programs)", () => {
  it("a city is live iff its program status is aktiv", () => {
    for (const c of liveCities()) {
      expect(c.fundingId).toBeTruthy();
      expect(getFundingProgram(c.fundingId!)?.status).toBe("aktiv");
    }
  });
  it("includes an active program city and excludes inactive/no-program ones", () => {
    const slugs = liveCities().map((c) => c.slug);
    expect(slugs).toContain("wuerzburg"); // aktiv
    expect(slugs).toContain("schweinfurt"); // aktiv
    expect(slugs).not.toContain("muenchen"); // eingestellt
    expect(slugs).not.toContain("karlsruhe"); // ausgeschoepft
    expect(slugs).not.toContain("dresden"); // kein Programm
  });
  it("isCityLive is false for cities without a fundingId", () => {
    const noProg = ATLAS_CITIES.find((c) => !c.fundingId)!;
    expect(isCityLive(noProg)).toBe(false);
  });
});

// Archive-Policy (Juni 2026): Regionen mit inaktivem Programm (ausgeschöpft/
// pausiert/eingestellt) bekommen eine Archiv-Seite; "unsicher" und "kein
// Programm" bleiben auf 404.
describe("archived cities (inactive but published programs)", () => {
  it("a city is archived iff its program is exhausted/paused/discontinued", () => {
    const inactive = ["ausgeschoepft", "pausiert", "eingestellt"];
    for (const c of archivedCities()) {
      expect(c.fundingId).toBeTruthy();
      expect(inactive).toContain(getFundingProgram(c.fundingId!)?.status);
    }
  });
  it("includes inactive-program cities and excludes active/unsicher/no-program", () => {
    const slugs = archivedCities().map((c) => c.slug);
    expect(slugs).toContain("muenchen"); // eingestellt
    expect(slugs).toContain("karlsruhe"); // ausgeschoepft
    expect(slugs).toContain("duesseldorf"); // pausiert
    expect(slugs).not.toContain("wuerzburg"); // aktiv
    expect(slugs).not.toContain("heidelberg"); // unsicher → bewusst NICHT veröffentlicht
    expect(slugs).not.toContain("dresden"); // kein Programm
  });
  it("live and archived are disjoint; published is their union", () => {
    const live = new Set(liveCities().map((c) => c.slug));
    const archived = archivedCities().map((c) => c.slug);
    for (const s of archived) expect(live.has(s)).toBe(false);
    const published = new Set(publishedCities().map((c) => c.slug));
    expect(published.size).toBe(live.size + archived.length);
    for (const c of publishedCities()) expect(isCityPublished(c)).toBe(true);
  });
  it("an 'unsicher' city is neither live nor archived (stays 404)", () => {
    const heidelberg = ATLAS_CITIES.find((c) => c.slug === "heidelberg")!;
    expect(getFundingProgram(heidelberg.fundingId!)?.status).toBe("unsicher");
    expect(isCityLive(heidelberg)).toBe(false);
    expect(isCityArchived(heidelberg)).toBe(false);
    expect(isCityPublished(heidelberg)).toBe(false);
  });
  it("publishedBundeslaender covers Rheinland-Pfalz (only archived cities there)", () => {
    // Mainz + Mayen-Koblenz sind ausgeschöpft → RLP hat ohne Archiv keine Seite.
    expect(publishedBundeslaender().map((b) => b.slug)).toContain("rheinland-pfalz");
    const rlp = publishedCitiesInBundesland("rheinland-pfalz").map((c) => c.slug);
    expect(rlp).toEqual(expect.arrayContaining(["mainz", "mayen-koblenz"]));
  });
  it("publishedCitiesInBundesland lists active programs before archived ones", () => {
    for (const bl of publishedBundeslaender().map((b) => b.slug)) {
      const cities = publishedCitiesInBundesland(bl);
      const firstArchived = cities.findIndex((c) => !isCityLive(c));
      if (firstArchived === -1) continue;
      // no live city may appear after the first archived one
      for (let i = firstArchived; i < cities.length; i++) expect(isCityLive(cities[i])).toBe(false);
    }
  });
});

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
    // jede zurückgegebene Stadt liegt wirklich in dem Bundesland
    for (const slug of ["bayern", "hessen", "baden-wuerttemberg"]) {
      for (const c of citiesInBundesland(slug)) expect(slugify(c.bundesland)).toBe(slug);
    }
    expect(citiesInBundesland("bayern").map((c) => c.slug)).toContain("muenchen");
    expect(citiesInBundesland("hessen").map((c) => c.slug)).toContain("wiesbaden");
    // Sachsen has Leipzig and Dresden (more may follow) — assert membership, not an exact list.
    expect(citiesInBundesland("sachsen").map((c) => c.slug)).toEqual(expect.arrayContaining(["leipzig", "dresden"]));
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
    const redirects = await nextConfig.redirects!();
    for (const c of ATLAS_CITIES) {
      // Stadtstaaten (Slug == Bundesland-Slug, z. B. Hamburg) bekommen KEINEN
      // flachen Redirect — der würde die Bundesland-Seite abfangen.
      if (c.slug === slugify(c.bundesland)) {
        const flat = `/photovoltaik-foerderung/${c.slug}`;
        expect(redirects.find((x: { source: string }) => x.source === flat), `Stadtstaat ${c.slug} darf keinen flachen Redirect haben`).toBeFalsy();
        continue;
      }
      const flat = `/photovoltaik-foerderung/${c.slug}`;
      const r = redirects.find((x: { source: string }) => x.source === flat);
      expect(r, `redirect for ${flat} missing in next.config.js`).toBeTruthy();
      expect(r!.destination).toBe(cityPath(c));
      expect(r!.permanent).toBe(true);
    }
  });
});
