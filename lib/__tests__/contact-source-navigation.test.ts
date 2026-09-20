import { expect, it } from "vitest";
import { contactLinks } from "../contact-discovery";
import { fetchContactPage } from "../../scripts/lib/contact-fetch";
import { crawlContacts } from "../../scripts/lib/contact-crawl";

const links = (html: string) => contactLinks(html, "https://ort.de/", "ort.de", "kommunen").map(x => x.url);
it("follows published continuation, council, frame and contextual document links without inventing routes", () => {
  expect(links('<a href="/portal/start.html?vs=1">Zur aufgerufenen Seite »</a><a href="/rat/">Gemeindevertretung</a><p>Die aktuelle Telefonliste finden Sie <a href="/downloads/datei/opaque">hier.</a></p>')).toEqual(expect.arrayContaining([
    "https://ort.de/portal/start.html?vs=1", "https://ort.de/rat/", "https://ort.de/downloads/datei/opaque",
  ]));
  expect(links('<frameset><frame src="/left.html"><frame src="/inhalt.html"></frameset>')).toEqual(expect.arrayContaining(["https://ort.de/left.html", "https://ort.de/inhalt.html"]));
  expect(links('<p>Telefonliste <a href="https://fremd.de/contacts">hier</a></p><a href="/other">hier</a><a href="javascript:go()">Weiter zur Startseite</a>')).toEqual([]);
});
it("does not promote loading shells or frames to successful source reads", async () => {
  for (const html of ['<p>Beitragsliste wird geladen...</p>', '<frameset><frame src="/inhalt.html"></frameset>']) {
    const result = await fetchContactPage('https://ort.de/', {fetcher: async () => new Response(html, {headers: {'content-type':'text/html'}})});
    expect(result.observation.status).toBe('needs-rendering');
    expect(result.html).toBe(html);
  }
  const fetcher = async () => new Response('<p>Beitragsliste wird geladen...</p>', {headers:{'content-type':'text/html'}});
  expect((await fetchContactPage('https://ort.de/', {fetcher, render:async()=>'<p>Beitragsliste wird geladen...</p>'})).observation.status).toBe('needs-rendering');
  expect((await fetchContactPage('https://ort.de/', {fetcher, render:async()=>'<p>Gemeindeverwaltung kontakt@ort.de</p>'})).observation.status).toBe('read');
});
it("treats a short continuation notice as navigation while retaining normal pages with embedded content", async () => {
  const check = async (html:string) => (await fetchContactPage('https://ort.de/', {fetcher:async()=>new Response(html,{headers:{'content-type':'text/html'}})})).observation.status;
  expect(await check('<p>Neue Telefonnummern der Verwaltung</p><a href="/portal?vs=1">Zur aufgerufenen Seite »</a>')).toBe('needs-rendering');
  expect(await check('<h1>Gemeindeverwaltung</h1><p>Kontakt: info@ort.de</p><iframe src="https://video.de/embed"></iframe>')).toBe('read');
});
it("the shared crawler reaches a real contact behind a notice and retains the incomplete parent", async () => {
  const fetcher = async (input: Parameters<typeof fetch>[0]) => new Response(String(input).includes('vs=1')
    ? '<p>Gemeinde Beispiel, Bürgermeister: buergermeister@ort.de</p>'
    : '<a href="/?vs=1">Zur aufgerufenen Seite »</a>', {headers:{'content-type':'text/html'}});
  const result = await crawlContacts({website:'https://ort.de/',dataset:'kommunen',pageBudget:2,fetcher});
  expect(result.pages.map(p=>p.status)).toEqual(['needs-rendering','read']);
  expect(result.candidates.map(c=>c.email)).toContain('buergermeister@ort.de');
  expect(result.status).toBe('partial');
});
