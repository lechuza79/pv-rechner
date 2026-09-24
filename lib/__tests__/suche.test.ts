import { describe, expect, it } from "vitest";
import { suchVerzeichnis, suchePassendeSeiten, SUCH_STICHWORTE } from "../suche-verzeichnis";
import { zerlegeAnfrage } from "../suche";
import { searchResultsHtml, searchFormHtml } from "../../public/shared-nav/search-content.js";
import { RATGEBER } from "../ratgeber";
import { load } from "cheerio";
import { navigationContent } from "../../public/shared-nav/nav-content.js";

describe("Suchverzeichnis", () => {
  const hrefs = suchVerzeichnis().map((e) => e.href);

  it("liest die Rechner aus dem Menü, nicht aus einer eigenen Liste", () => {
    const $ = load(navigationContent());
    const menueRechner = $('details[data-section="tools"] a[href^="/"]').map((_, a) => $(a).attr("href")).get();
    expect(menueRechner.length).toBeGreaterThan(4);
    for (const href of menueRechner) expect(hrefs).toContain(href);
  });

  it("enthält jeden Ratgeber mit seinem Titel", () => {
    for (const r of RATGEBER) {
      const e = suchVerzeichnis().find((x) => x.href === r.slug);
      expect(e?.titel, r.slug).toBe(r.title);
    }
  });

  it("jede Adresse genau einmal", () => {
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("Suchwörter hängen nur an Seiten, die es im Verzeichnis gibt", () => {
    const pfade = new Set(hrefs.map((h) => h.split("?")[0]));
    for (const pfad of Object.keys(SUCH_STICHWORTE)) expect(pfade.has(pfad), pfad).toBe(true);
  });

});

describe("Seitentreffer", () => {
  const erste = (q: string) => suchePassendeSeiten(q)[0]?.href;
  it.each([
    ["Wärmepumpe", "/waermepumpe-rechner"],
    ["waermepumpe", "/waermepumpe-rechner"],
    ["balkon", "/balkonkraftwerk/rechner"],
    ["wallbox", "/photovoltaik-rechner"],
    ["einspeisevergütung", "/einspeiseverguetung-rechner"],
  ])("%s → %s", (q, href) => {
    expect(erste(q)).toBe(href);
  });

  it("der Gruppenname findet die Gruppe", () => {
    const rechner = suchePassendeSeiten("Rechner").map((e) => e.href);
    expect(rechner).toEqual(expect.arrayContaining(["/waermepumpe-rechner", "/balkonkraftwerk/rechner"]));
  });

  it("jedes Wort muss treffen", () => {
    expect(suchePassendeSeiten("wärmepumpe quatschwort")).toEqual([]);
  });

  it("ein Wort zählt ab seinem Anfang, nicht aus der Mitte", () => {
    expect(suchePassendeSeiten("pumpe")).toEqual([]);
  });
});

describe("Anfrage zerlegen", () => {
  it("trennt Thema und Ort", () => {
    expect(zerlegeAnfrage("Förderung Würzburg")).toEqual({ themen: ["Förderung"], ort: "Würzburg", plz: null });
  });
  it("Füllwörter sind weder Thema noch Ort", () => {
    expect(zerlegeAnfrage("Förderung in Würzburg").ort).toBe("Würzburg");
  });
  it("erkennt eine Postleitzahl", () => {
    expect(zerlegeAnfrage("97070").plz).toBe("97070");
  });
  it("reine Themen brauchen keine Ortssuche", () => {
    expect(zerlegeAnfrage("Wärmepumpe Förderung").ort).toBe("");
  });
});

describe("Darstellung der Treffer", () => {
  it("maskiert, was aus der Anfrage kommt", () => {
    const html = searchResultsHtml({ q: '<img src=x onerror=alert(1)>', orte: [], seiten: [], orteNichtVerfuegbar: false });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(searchFormHtml('"><script>')).not.toContain("<script>");
  });

  it("sagt, wenn die Ortssuche ausgefallen ist, statt 'nichts gefunden'", () => {
    const html = searchResultsHtml({ q: "Würzburg", orte: [], seiten: [], orteNichtVerfuegbar: true });
    expect(html).toContain("nicht erreichbar");
    expect(html).not.toContain("nichts gefunden");
  });

  it("leere Anfrage → nichts", () => {
    expect(searchResultsHtml({ q: "  ", orte: [], seiten: [], orteNichtVerfuegbar: false })).toBe("");
  });
});
