import { describe, expect, it } from "vitest";
import { bilanz, ordneKanal, quoteText, type Veroeffentlichung } from "../kommunen-veroeffentlichung";

// Echte Fälle vom 22.09.2026.
describe("Art des Beitrags", () => {
  it("die Domain der Gemeinde ist ihre Website, auch mit www", () => {
    expect(ordneKanal("https://www.nidda.de/news/balkonsolar/", "https://nidda.de")).toBe("eigene-website");
  });
  it("der Ortsname im Pfad macht ein Portal nicht zur Gemeindeseite", () => {
    expect(ordneKanal("https://wetterau.news/wetteraukreis/nidda/480-nidda/x.html", "https://www.nidda.de")).toBe("presse");
  });
  it("eine App-Unterdomain der Gemeinde ist eine App", () => {
    expect(ordneKanal("https://app.wallertheim.de/news/7358", "https://www.wallertheim.de")).toBe("app");
  });
  it("soziale Netze", () => {
    expect(ordneKanal("https://www.facebook.com/StadtAue/posts/1", "https://www.aue-bad-schlema.de")).toBe("soziales-netz");
    expect(ordneKanal("https://de.linkedin.com/posts/x", null)).toBe("soziales-netz");
  });
});

describe("Bilanz", () => {
  const p = (region_id: string, kanal: Veroeffentlichung["kanal"], mit_link = true, noch_online = true): Veroeffentlichung => ({
    region_id, url: `${region_id}-${kanal}-${Math.random()}`, kanal, mit_link, gesehen_ab: null, noch_online,
  });
  const b = bilanz(
    [
      p("nidda", "eigene-website"), p("nidda", "presse"), p("nidda", "presse"),
      p("berkenthin", "eigene-website", false), p("berkenthin", "presse"),
      p("heringen", "eigene-website", true, false),
    ],
    285,
  );
  it("zählt Gemeinden, nicht Beiträge, für die Quote", () => {
    expect(b.gemeinden).toBe(3);
    expect(b.beitraege).toBe(6);
    expect(quoteText(b.quote)).toBe("1,1 %");
  });
  it("trennt Links, erreichbare Links und Beiträge woanders", () => {
    expect(b.mitLink).toBe(5);
    expect(b.mitLinkOnline).toBe(4);
    expect(b.woanders).toBe(3);
  });
  it("ohne Angeschriebene keine Division durch null", () => {
    expect(bilanz([], 0).quote).toBe(0);
  });
});
