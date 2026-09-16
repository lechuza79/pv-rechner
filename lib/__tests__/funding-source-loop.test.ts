import { expect, it } from "vitest";
import { fundingNavigationSignature, repeatedFundingPath } from "../funding-source-loop";
import { walkFundingSources } from "../funding-navigation";
it("detects repeated index path growth without rewriting legitimate URLs", () => {
  expect(repeatedFundingPath("https://amt.example/index.php/kontakt", "https://amt.example/index.php/index.php/kontakt")).toBe(true);
  expect(repeatedFundingPath("https://amt.example/index.php/kontakt", "https://amt.example/index.php/team/kontakt")).toBe(false);
  expect(repeatedFundingPath("https://amt.example/index.php/kontakt?q=1", "https://amt.example/index.php/index.php/kontakt?q=2")).toBe(false);
  expect(fundingNavigationSignature('<p>A</p><a href="one">Weiter</a>')).not.toBe(fundingNavigationSignature('<p>A</p><a href="two">Weiter</a>'));
});
it("stops an unchanged repeated path while retaining a genuine sibling source", async () => {
  const root = "https://amt.example/";
  const recursive = '<p>Förderung: Zuschuss für Balkonkraftwerke 200 Euro.</p><a href="index.php/start">Förderprogramm Solar</a>';
  const read: string[] = [];
  const result = await walkFundingSources({ root, html: '<a href="/index.php/start">Förderprogramm Solar</a><a href="/klima">Klimaschutz</a>', budget: 8, read: async url => {
    read.push(url);
    return { url, html: url.endsWith('/klima') ? '<p>Ein anderer Inhalt: Förderung Wärmepumpe 300 Euro.</p>' : recursive };
  } });
  expect(read).toContain(root + 'klima');
  expect(read.filter(url => url.includes('index.php'))).toHaveLength(2);
  expect(result.leads.some(l => l.duplicateOf === root + 'index.php/start')).toBe(true);
});

it("resolves published links against the declared HTML base while retaining the real referrer", async () => {
  const { fundingLinks } = await import('../funding-navigation');
  const current = 'https://amt.example/index.php/index.php/start';
  const html = '<base href="https://amt.example/"><a href="index.php/foerderung">Förderprogramm Solar</a><iframe src="docs/richtlinie.pdf"></iframe>';
  const links = fundingLinks(html, current, 'https://amt.example/');
  expect(links.map(l => l.url)).toEqual(['https://amt.example/index.php/foerderung', 'https://amt.example/docs/richtlinie.pdf']);
  expect(links.every(l => l.referrer === current)).toBe(true);
});
