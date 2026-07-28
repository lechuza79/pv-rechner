import { describe, it, expect } from "vitest";
import { brauchtNeueEinreichung, daysSinceDownload, type SitemapStatus } from "../gsc-index-status";

// Der Auslöser (27.07.2026): Google hatte die Sitemap um 14:27 geholt, war also
// „frisch". Am Abend ging Welle 0b mit ~400 Landkreisseiten live — 85 URLs bei
// Google gegen 486 bei uns. Die reine Alterssperre hätte die Neueinreichung
// blockiert, obwohl vier Fünftel der Seiten für Google nicht existierten.

const JETZT = new Date("2026-07-27T19:00:00Z").getTime();

function sitemap(over: Partial<SitemapStatus> = {}): SitemapStatus {
  return {
    path: "https://solar-check.io/sitemap.xml",
    lastSubmitted: "2026-07-27T14:27:28Z",
    lastDownloaded: "2026-07-27T14:27:29Z",
    isPending: false,
    warnings: 0,
    errors: 0,
    submittedUrls: 85,
    ...over,
  };
}

describe("daysSinceDownload", () => {
  it("zählt in ganzen Tagen", () => {
    expect(daysSinceDownload(sitemap(), JETZT)).toBe(0);
    expect(daysSinceDownload(sitemap({ lastDownloaded: "2026-07-22T04:38:51Z" }), JETZT)).toBe(5);
  });

  it("liefert null, wenn Google nie abgerufen hat", () => {
    expect(daysSinceDownload(sitemap({ lastDownloaded: null }), JETZT)).toBeNull();
  });
});

describe("brauchtNeueEinreichung", () => {
  it("schlägt an, wenn unsere Sitemap mehr URLs führt als Google kennt", () => {
    // Der eigentliche Fall: frisch abgerufen, aber inhaltlich überholt.
    const r = brauchtNeueEinreichung(sitemap({ submittedUrls: 85 }), 486, 3, JETZT);
    expect(r.noetig).toBe(true);
    expect(r.grund).toMatch(/85.*486/);
    expect(r.automatisch).toBe(true); // gewachsen = sichere Richtung
  });

  it("reicht eine GESCHRUMPFTE Sitemap NICHT von selbst ein", () => {
    // Nach der Rücknahme von Welle 0b am 27.07.2026 abends: Google zählte 486,
    // unsere Sitemap wieder 85. Genauso sähe es aber aus, wenn der
    // Landkreis-Zweig in app/sitemap.ts still ausfällt (er fängt Fehler bewusst
    // ab). Automatisch einreichen hieße dann, Google 401 Seiten abzumelden, die
    // es noch gibt — deshalb nur melden, nicht tun.
    const r = brauchtNeueEinreichung(sitemap({ submittedUrls: 486 }), 85, 3, JETZT);
    expect(r.noetig).toBe(true);
    expect(r.automatisch).toBe(false);
    expect(r.grund).toMatch(/GESCHRUMPFT/);
  });

  it("schlägt an, wenn Google lange nicht geschaut hat", () => {
    const r = brauchtNeueEinreichung(sitemap({ lastDownloaded: "2026-07-22T04:38:51Z" }), 85, 3, JETZT);
    expect(r.noetig).toBe(true);
    expect(r.grund).toMatch(/5 Tagen/);
  });

  it("schlägt an, wenn Google die Sitemap nie geholt hat", () => {
    expect(brauchtNeueEinreichung(sitemap({ lastDownloaded: null }), 85, 3, JETZT).noetig).toBe(true);
  });

  it("hält still, wenn frisch abgerufen UND die Zahl stimmt", () => {
    // Sonst reicht der Wächter bei jedem Lauf neu ein — das ist Lärm, keine Pflege.
    expect(brauchtNeueEinreichung(sitemap({ submittedUrls: 486 }), 486, 3, JETZT).noetig).toBe(false);
  });

  it("entscheidet allein nach Alter, wenn die eigene Sitemap nicht zählbar war", () => {
    expect(brauchtNeueEinreichung(sitemap({ submittedUrls: 85 }), null, 3, JETZT).noetig).toBe(false);
    expect(brauchtNeueEinreichung(sitemap({ lastDownloaded: "2026-07-20T00:00:00Z" }), null, 3, JETZT).noetig).toBe(true);
  });
});
