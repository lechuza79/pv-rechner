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
    ["/solar-atlas/niedersachsen/gifhorn/meinersen", "monitor"],
    ["/solar-atlas/ranking", "monitor"],
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
    expect($('[data-section="local"]').length).toBe(0);
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

  it("uses the existing Atlas destination in the regional monitor", () => {
    const $ = load(navigationContent());
    for (const section of ["monitor"]) {
      expect($(`[data-section="${section}"] a[href="/solar-atlas"]`).length).toBeGreaterThan(0);
    }
    expect($('a[href^="/energiemonitor/"]').length).toBe(0);
    expect($('a[href="#"]').length).toBe(0);
    expect($('img:not([alt=""])').length).toBe(0);
  });

  it("offers one regional search and a separate state selection", () => {
    const $ = load(navigationContent());
    const local = $('[data-section="monitor"]');
    // The town field comes first: postcode or name is the main way in.
    expect(local.find('[data-local-search="regional"]').length).toBe(1);
    expect(local.find('[data-local-search="kreis"]').length).toBe(0);
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
  it("groups monitor topics, regions and the additional park directory without duplicate article destinations", () => {
    const $ = load(navigationContent());
    const monitor = $('[data-section="monitor"]');
    expect(monitor.find('.sc-nav-column > [role="heading"]').map((_, el) => $(el).text()).get()).toEqual(['Deutschland', 'Energiemonitor regional']);
    expect(monitor.find('a[href="/datenstand"]').length).toBe(0);
    expect(monitor.find('a[href="/atomstrom-import"]').closest('.sc-nav-column').find('[role="heading"]').first().text()).toBe('Deutschland');
    expect(monitor.find('a[href="/langzeit-strommix"]').length).toBe(0);
    const parks = $('[data-section="parks"]');
    expect(monitor.find('img[src="/illustrations/energy/nuclear-mono.webp"]').closest('.sc-nav-tool').find('a[href="/atomstrom-import"]').length).toBe(1);
    expect(parks.find('img[src="/brand/wind-ranking-mono.svg"]').length).toBe(1);
    expect(parks.text()).toContain('Demnächst');
    expect(parks.find('a').length).toBe(0);
  });

});
