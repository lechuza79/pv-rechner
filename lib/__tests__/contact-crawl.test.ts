import { describe, it, expect } from "vitest";
import { crawlContacts } from "../../scripts/lib/contact-crawl";
import { contactCandidates } from "../contact-evidence";
import { contactUrl } from "../contact-discovery";

const source = (pages: Record<string, string | { status: number; body?: string; final?: string }>) => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async input => {
    const url = String(input); calls.push(url);
    const value = pages[url] ?? { status: 404 };
    const response = new Response(typeof value === "string" ? value : value.body ?? "", {
      status: typeof value === "string" ? 200 : value.status,
      headers: { "content-type": /sitemap/.test(url) ? "application/xml" : "text/html" },
    });
    Object.defineProperty(response, "url", { value: typeof value !== "string" && value.final ? value.final : url });
    return response;
  };
  return { calls, fetcher };
};

describe("bounded contact recovery", () => {
  it("removes only invisible anti-spam text and preserves split inline addresses", () => {
    const html = '<p>poststelle<span style="display: none;">noSpam</span>@ort.de</p><p><a>c</a><a>onstantin@ort.de</a></p><p>nospam@ort.de</p>';
    expect(contactCandidates(html, "https://ort.de", "ort.de").map(c => c.email).sort()).toEqual(["constantin@ort.de", "nospam@ort.de", "poststelle@ort.de"]);
  });
  it("retains contacts in collapsed public directory panels", () => {
    const html = '<div style="display:none"><p>Klimaschutz klima@ort.de</p></div>';
    expect(contactCandidates(html, "https://ort.de", "ort.de").map(c => c.email)).toEqual(["klima@ort.de"]);
  });
  it("does not concatenate addresses with headings, phone numbers or navigation", () => {
    const html = '<section><p>01234</p><p><a href="mailto:info@ort.de">info@ort.de</a></p><h2>Umsatzsteuer-ID</h2></section><div><span>Text</span><p>presse@ort.de</p><h3>Kontakt</h3></div>';
    expect(contactCandidates(html, "https://ort.de", "ort.de").map(c => c.email).sort()).toEqual(["info@ort.de", "presse@ort.de"]);
  });
  it("reads no-script fallback and encoded mail while keeping external ownership unconfirmed", () => {
    const html = '<p>Verwaltung <script>email("ignored")</script><object><noscript>amt(at)verwaltung.de</noscript></object></p><p><joomla-hidden-mail first="aW5mbw==" last="b3J0LmRl">Hidden</joomla-hidden-mail></p><p>epost (ad) verlag (dot) de</p>';
    const found = contactCandidates(html, "https://ort.de/kontakt", "ort.de");
    expect(found.map(c => c.email).sort()).toEqual(["amt@verwaltung.de", "epost@verlag.de", "info@ort.de"]);
    expect(found.find(c => c.email === "amt@verwaltung.de")?.relation).toBe("unconfirmed");
  });
  it("keeps department identifiers while dropping print copies and linked images", () => {
    expect(contactUrl("https://ort.de/amt?cat=20&modus=drucken&utm_source=x#main")).toBe("https://ort.de/amt?cat=20");
    expect(contactUrl("https://ort.de/amt?cat=21")).toBe("https://ort.de/amt?cat=21");
    expect(contactUrl("https://ort.de/kontakt.png")).toBeNull();
  });
  it("recovers from a stale deep link through the actual homepage and records the failure", async () => {
    const mock = source({ "https://ort.de/": '<a href="/kontakt">Kontakt</a>', "https://ort.de/kontakt": '<p>info@ort.de</p>' });
    const result = await crawlContacts({ website: "https://ort.de/alte-seite", dataset: "kommunen", pageBudget: 5, fetcher: mock.fetcher });
    expect(result.candidates.map(c => c.email)).toContain("info@ort.de");
    expect(result.status).toBe("partial");
    expect(result.requests).toBeLessThanOrEqual(5);
  });
  it("follows an observed relocation without silently verifying its addresses", async () => {
    const mock = source({ "https://old.de/": { status: 200, body: '<a href="/kontakt">Kontakt</a>', final: "https://new.de/" }, "https://new.de/kontakt": '<p>info@new.de</p>' });
    const result = await crawlContacts({ website: "https://old.de", dataset: "versorger", pageBudget: 3, fetcher: mock.fetcher });
    expect(result.candidates[0]).toMatchObject({ email: "info@new.de", relation: "unconfirmed" });
  });
  it("discovers unlinked contact pages from a sitemap within the same total request budget", async () => {
    const mock = source({ "https://ort.de/": '<h1>Ort</h1>', "https://ort.de/robots.txt": 'Sitemap: https://ort.de/sitemap.xml', "https://ort.de/sitemap.xml": '<urlset><url><loc>https://ort.de/ansprechpartner</loc></url><url><loc>https://agent.de/kontakt</loc></url></urlset>', "https://ort.de/ansprechpartner": '<p>presse@ort.de</p>' });
    const result = await crawlContacts({ website: "https://ort.de", dataset: "presse", pageBudget: 5, fetcher: mock.fetcher });
    expect(result.candidates[0].email).toBe("presse@ort.de");
    expect(mock.calls).not.toContain("https://agent.de/kontakt");
    expect(result.requests).toBe(mock.calls.length);
    expect(result.requests).toBeLessThanOrEqual(5);
  });
  it("does not spend the budget twice on observed redirects or print copies", async () => {
    const mock = source({ "https://ort.de/": { status: 200, body: '<a href="https://www.ort.de/">Kontakt</a><a href="/kontakt">Kontakt</a><a href="/kontakt?modus=drucken">Kontakt drucken</a>', final: "https://www.ort.de/" }, "https://www.ort.de/kontakt": '<p>info@ort.de</p>' });
    const result = await crawlContacts({ website: "https://ort.de", dataset: "fachbetriebe", pageBudget: 3, fetcher: mock.fetcher });
    expect(result.pages).toHaveLength(2);
    expect(mock.calls).toEqual(["https://ort.de/", "https://www.ort.de/kontakt"]);
  });
  it("reads an explicitly linked publisher contact without assigning its organization", async () => {
    const mock = source({ "https://ort.de/": '<a href="https://publisher.de/kontakt">Verlag Kontakt</a>', "https://ort.de/robots.txt": '', "https://ort.de/sitemap.xml": '', "https://publisher.de/kontakt": '<p>Redaktion editor@publisher.de</p>' });
    const result = await crawlContacts({website:"https://ort.de",dataset:"presse",pageBudget:8,fetcher:mock.fetcher});
    expect(result.candidates[0]).toMatchObject({email:"editor@publisher.de",relation:"unconfirmed"});
    expect(result.quality.contacts[0].suitability).toBe("needs-review");
    expect(result.requests).toBeLessThanOrEqual(8);
  });
  it("recognizes additional encrypted contact markup instead of declaring an empty readable page", async () => {
    const { fetchContactPage } = await import("../../scripts/lib/contact-fetch");
    const result = await fetchContactPage("https://ort.de/kontakt", {fetcher:async()=>new Response('<a data-encrypted href="mailto:encoded"><hrencrypted>encoded</hrencrypted></a>',{headers:{'content-type':'text/html'}}),render:async()=>'<p>Leitung <a href="mailto:person@ort.de">person@ort.de</a></p>'});
    expect(result.observation).toMatchObject({status:"read",rendered:true});
    expect(result.observation.candidates[0].email).toBe("person@ort.de");
  });
  it("returns a recorded timeout when a transport ignores cancellation", async () => {
    const { fetchContactPage } = await import("../../scripts/lib/contact-fetch");
    const result = await fetchContactPage("https://ort.de/", {timeoutMs:10,fetcher:()=>new Promise(()=>{})});
    expect(result.observation).toMatchObject({status:"failed",error:"Timeout"});
  });
  it("prioritizes inclusive directory labels over general communication pages", async () => {
    const mock = source({"https://ort.de/": '<a href="/verwaltung/ansprechpersonen.html">Ansprechpersonen</a><a href="/kommunikation">Elektronische Kommunikation</a>',"https://ort.de/verwaltung/ansprechpersonen.html":'<p>Öffentlichkeitsarbeit info@ort.de</p>'});
    const result = await crawlContacts({website:"https://ort.de",dataset:"kommunen",pageBudget:2,fetcher:mock.fetcher});
    expect(result.candidates[0].email).toBe("info@ort.de");
    expect(result.quality.status).toBe("role-indicated");
  });
  it("keeps a missing website as an acquisition gap instead of a completed empty search", async () => {
    const mock = source({});
    const result = await crawlContacts({ website: null, dataset: "kommunen", fetcher: mock.fetcher });
    expect(result.status).toBe("missing-website");
    expect(mock.calls).toEqual([]);
  });
});
