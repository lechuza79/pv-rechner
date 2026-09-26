import { describe, expect, it } from "vitest";
import { load } from "cheerio";
import { navigationContent, navigationOwner } from "../../public/shared-nav/nav-content.js";
import { BUNDESLAENDER } from "../mastr-regions";
import { RATGEBER } from "../ratgeber";

describe("Shared public navigation", () => {
  it.each([
    ["/balkonkraftwerk", "knowledge"],
    ["/balkonkraftwerk/rechner", "tools"],
    ["/balkonkraftwerk/foerderung", "funding"],
    ["/balkonkraftwerk/ratgeber/mit-speicher", "knowledge"],
    ["/angebot-pruefen", "tools"],
    ["/solar-atlas/niedersachsen/gifhorn/meinersen", "local"],
    ["/solar-atlas/ranking", "local"],
    ["/atomstrom-import", "monitor"],
    ["/photovoltaik-zubau-deutschland", "monitor"],
    ["/energie-widgets", "organisations"],
  ])("owns %s in %s even when other menus link to it", (path, owner) => {
    expect(navigationOwner(path)).toBe(owner);
  });

  it("recognizes registry articles with top-level URLs", () => {
    for (const article of RATGEBER) {
      expect(navigationOwner(article.slug, "ratgeber")).toBe(
        /foerderung/.test(article.slug) ? "funding" : "knowledge",
      );
    }
  });

  it("keeps the waiting list inside Tools and never advertises an available check", () => {
    const $ = load(navigationContent({ showOrganisations: true }));
    const offer = $('[data-section="tools"] a[href="/angebot-pruefen"]');
    expect(offer.length).toBe(1);
    expect(offer.closest("article").text()).toContain("Demnächst");
    expect(offer.text()).toContain("Warteliste");
    expect($('[data-section="organisations"] a[href="/energie-widgets"]').length).toBeGreaterThan(0);
  });

  it("uses the existing Atlas destination for both local entry points", () => {
    const $ = load(navigationContent());
    for (const section of ["local", "monitor"]) {
      expect($(`[data-section="${section}"] a[href="/solar-atlas"]`).length).toBeGreaterThan(0);
    }
    expect($('a[href^="/energiemonitor/"]').length).toBe(0);
    expect($('a[href="#"]').length).toBe(0);
    expect($('img:not([alt=""])').length).toBe(0);
  });

  it("leads 'Vor Ort' with the place field, then Deutschland, Bundesland and Landkreis", () => {
    const $ = load(navigationContent());
    const local = $('[data-section="local"]');
    // The town field comes first: postcode or name is the main way in.
    expect(local.find("form, a").first().is('[data-local-search="ort"]')).toBe(true);
    expect(local.find('[data-local-search="kreis"]').length).toBe(1);
    expect(local.find('a[href="/solar-atlas"]').length).toBe(1);
    // One option per Land, from the shared list, each opening its atlas page.
    const options = local.find("[data-local-land] select option[value]").filter((_, o) => $(o).attr("value") !== "");
    expect(options.map((_, o) => $(o).attr("value")).get().sort()).toEqual(BUNDESLAENDER.map(b => b.ags).sort());
    expect(local.find("[data-local-land]").attr("action")).toBe("/api/atlas/goto");
  });

  it("keeps field ids unique when the menu stands twice on a page", () => {
    // React pages carry a no-JS copy next to the live menu; a shared id sends
    // the label (and any lookup by id) to the hidden copy.
    const ids = (html: string) => load(html)("[id]").map((_, e) => e.attribs.id).get();
    const live = ids(navigationContent());
    const fallback = ids(navigationContent({ idPrefix: "sc-fallback-local" }));
    expect(live.length).toBeGreaterThan(0);
    expect(live.filter(id => fallback.includes(id))).toEqual([]);
  });
});
