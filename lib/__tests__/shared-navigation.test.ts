import { describe, expect, it } from "vitest";
import { load } from "cheerio";
import { navigationContent, navigationOwner } from "../../public/shared-nav/nav-content.js";
import { BUNDESLAENDER } from "../mastr-regions";
import { slugify } from "../atlas-cities";
import { RATGEBER } from "../ratgeber";

describe("Shared public navigation", () => {
  it.each([
    ["/balkonkraftwerk", "knowledge"],
    ["/balkonkraftwerk/rechner", "tools"],
    ["/balkonkraftwerk/foerderung", "funding"],
    ["/balkonkraftwerk/ratgeber/mit-speicher", "knowledge"],
    ["/angebot-pruefen", "tools"],
    ["/elektroauto-check", "tools"],
    ["/solar-atlas/niedersachsen/gifhorn/meinersen", "local"],
    ["/solar-atlas/ranking", "local"],
    ["/atomstrom-import", "monitor"],
    ["/photovoltaik-zubau-deutschland", "monitor"],
    ["/energie-widgets", "organisations"],
    ["/fuer-organisationen/kommunen", "organisations"],
  ])("owns %s in %s even when other menus link to it", (path, owner) => {
    expect(navigationOwner(path)).toBe(owner);
  });

  it("exposes the municipal offering and clearly marks the other B2B audiences as upcoming", () => {
    const $ = load(navigationContent());
    expect($('[data-section="tools"] summary').text()).toContain('Checks & Rechner');
    const organisations = $('[data-section="organisations"]');
    expect(organisations.length).toBe(1);
    expect(organisations.find('a[href="/fuer-organisationen/kommunen"]').length).toBe(1);
    expect($('[data-section="local"] a[href="/fuer-organisationen/kommunen"]').length).toBe(1);
    const upcoming = organisations.find('article').filter((_, el) => $(el).text().includes('Demnächst'));
    expect(upcoming.length).toBe(3);
    expect(upcoming.find('a').length).toBe(0);
  });

  it("recognizes registry articles with top-level URLs", () => {
    for (const article of RATGEBER) {
      expect(navigationOwner(article.slug, "ratgeber")).toBe(
        /foerderung/.test(article.slug) ? "funding" : "knowledge",
      );
    }
  });

  it.each(["/angebot-pruefen", "/elektroauto-check"])("links to the upcoming check information at %s inside Tools", (path) => {
    const $ = load(navigationContent({ showOrganisations: true }));
    const offer = $(`[data-section="tools"] a[href="${path}"]`);
    expect(offer.length).toBe(1);
    expect(offer.closest("article").text()).toContain("Demnächst");
    expect(offer.text()).toBe("Mehr Info");
    expect(offer.attr("data-waitlist")).toBeUndefined();
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
    // One link per Land, from the shared list, each a real atlas address.
    const lands = local.find("[data-local-land] a").map((_, a) => $(a).attr("href")).get();
    expect(lands.sort()).toEqual(BUNDESLAENDER.map(b => `/solar-atlas/${slugify(b.name)}`).sort());
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
