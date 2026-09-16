import { describe, expect, it } from "vitest";
import { fundingLinks, walkFundingSources } from "../funding-navigation";
import { linkKandidaten } from "../funding-url-suche";
const root = "https://gemeinde.example/";
const a = (url: string, text: string) => `<a href="${url}">${text}</a>`;
describe("outreach navigation transferred to funding discovery", () => {
  it("keeps sibling branches and follows a lower-ranked intermediate page", async () => {
    const html = a("/energie/beratung", "Energieberatung und Förderung") + a("/klima", "Klimaschutz");
    const pages: Record<string,string> = {
      [root + "energie/beratung"]: "<p>Beratung ohne kommunalen Zuschuss.</p>",
      [root + "klima"]: a("/bauen/wohnen", "Bauen und Wohnen"),
      [root + "bauen/wohnen"]: a("/solar/foerderprogramm", "Förderprogramm Balkonkraftwerke"),
      [root + "solar/foerderprogramm"]: "<p>Die Gemeinde bezuschusst Balkonkraftwerke mit 200 Euro.</p>",
    };
    const read: string[] = [];
    const result = await walkFundingSources({ html, root, budget: 4, read: async url => { read.push(url); return pages[url] ? { html: pages[url], url } : null; } });
    expect(read).toContain(root + "klima");
    expect(result.candidates.some(l => l.url === root + "solar/foerderprogramm")).toBe(true);
  });
  it("follows published frames, continuation links, fragments and embedded PDFs", () => {
    const frames = `<frameset><frame src="/inhalt"></frameset>`;
    const html = `<a href="/start">Zur aufgerufenen Seite</a><integration-bim result-url="/foerderliste.html"></integration-bim><iframe src="/pdfjs/web/viewer.html?file=%2Frichtlinie.pdf"></iframe>`;
    expect(fundingLinks(frames, root, root).map(l => l.url)).toEqual([root + "inhalt"]);
    expect(fundingLinks(html, root, root).map(l => l.url)).toEqual(expect.arrayContaining([ root + "start", root + "foerderliste.html", root + "richtlinie.pdf"]));
    expect(linkKandidaten(html, root)).toHaveLength(0);
  });
  it("decodes HTML entities, drops unresolved templates and preserves meaningful parameters", () => {
    const html = a("/download?id=17&amp;format=pdf", "Förderrichtlinie Solar") + a("/{{ item.url }}", "Förderprogramm Solar");
    expect(fundingLinks(html, root, root).map(l => l.url)).toEqual([root + "download?format=pdf&id=17"]);
  });
  it("records foreign provenance without expanding into unrelated sites", async () => {
    const url = "https://amt.example/foerderung";
    const html = a(url, "Amtsverwaltung Klimaschutzförderung") + a("https://shop.example/", "Werbung");
    const result = await walkFundingSources({ html, root, budget: 3, read: async target => ({ url: target, html: "<p>Photovoltaik erhält einen Zuschuss von 500 Euro.</p>" + a("https://dritte.example/foerderung", "Förderprogramm Solar") }) });
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0]).toMatchObject({ relation: "published-external", referrer: root });
    expect(result.requests).toBe(1);
    expect(result.candidates).toHaveLength(0); // Foreign content still needs municipal attribution.
    expect(result.leads.some(l => l.url.includes("shop"))).toBe(false);
  });
  it("preserves unread and budget-limited leads instead of reporting a complete negative", async () => {
    const result = await walkFundingSources({ html: a("/klima", "Klimaschutz") + a("/energie", "Energie Förderung"), root, budget: 1, read: async () => null });
    expect(result.unreadable).toHaveLength(1);
    expect(result.remaining).toBe(1);
  });
});

it("continues saved unvisited sources before repeating the initial branches", async () => {
  const html = a("/klima", "Klimaschutz") + a("/energie", "Energie Förderung");
  const first = await walkFundingSources({ html, root, budget: 1, read: async url => ({ url, html: "<p>Information.</p>" }) });
  const pending = first.leads.filter(l => !l.attempted);
  expect(pending).toHaveLength(1);
  const visited: string[] = [];
  await walkFundingSources({ html, root, priorLeads: pending, budget: 1, read: async url => { visited.push(url); return { url, html: "<p>Information.</p>" }; } });
  expect(visited).toEqual([pending[0].url]);
});

it("does not count explicitly declared translations as independent funding sources", async () => {
  const url = root + "foerderprogramm-solar";
  const html = a("/ar/foerderprogramm-solar", "Förderprogramm Solar") + a("/foerderprogramm-solar", "Förderprogramm Solar");
  const result = await walkFundingSources({ html, root, budget: 3, read: async target => ({ url: target, html: `<link rel="alternate" hreflang="x-default" href="${url}"><link rel="alternate" hreflang="ar" href="${root}ar/foerderprogramm-solar"><p>Die Stadt fördert Balkonkraftwerke mit einem Zuschuss von 200 Euro.</p>` }) });
  expect(result.candidates.map(l => l.url)).toEqual([url]);
  expect(result.leads.find(l => l.url.includes('/ar/'))?.duplicateOf).toBe(url);
});
