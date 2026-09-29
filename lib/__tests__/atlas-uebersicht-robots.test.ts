import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { atlasIsIndexable, atlasRobots, atlasUebersichtRobots } from "../atlas-index";

/**
 * Audit 28.09.2026: Die freigegebenen Ortsseiten (angeschriebene Gemeinden,
 * indexierbar, in der Sitemap) werden im Atlas nur von ihrer Kreisseite
 * verlinkt, und die stand auf „noindex, nofollow". Übersichten stehen seitdem
 * auf „noindex, follow", solange ihre Ebene nicht freigegeben ist — die
 * Freigabe der Kreisebene selbst bleibt unberührt.
 */
describe("Atlas-Übersichten: noindex, aber follow", () => {
  const route = readFileSync(resolve(__dirname, "../../app/(site)/solar-atlas/[[...pfad]]/page.tsx"), "utf8");
  const gemeinde = readFileSync(resolve(__dirname, "../../components/gemeinde/gemeinde-metadata.ts"), "utf8");

  it("eine nicht freigegebene Übersicht bleibt aus dem Index, lässt Google aber ihren Links folgen", () => {
    expect(atlasUebersichtRobots(false)).toEqual({ index: false, follow: true });
    expect(atlasUebersichtRobots(true)).toEqual({ index: true, follow: true });
  });

  it("die Kreisebene bleibt gesperrt — das ist die Entscheidung des Betreibers, nicht dieser Änderung", () => {
    expect(atlasIsIndexable("landkreis")).toBe(false);
    expect(atlasUebersichtRobots(atlasIsIndexable("landkreis"))).toEqual({ index: false, follow: true });
  });

  it("die Atlas-Route setzt für eine gefundene Region die Übersichts-Regel", () => {
    // District pages: released per page once a town in them got our letter
    // (operator, 29.09.2026) — still via the overview rule, so never nofollow.
    expect(route).toMatch(/robots:\s*atlasUebersichtRobots\(\s*region\.level === "landkreis"\s*\?\s*kreisseiteIndexierbar\([\s\S]*?:\s*atlasIsIndexable\(region\.level\),?\s*\)/);
    // Eine unbekannte Adresse bleibt noindex, nofollow.
    expect(route).toContain("if (!region) return { robots: atlasRobots(false) };");
  });

  it("nicht freigegebene Ortsseiten bleiben noindex, nofollow", () => {
    expect(atlasRobots(false)).toEqual({ index: false, follow: false });
    expect(gemeinde).not.toContain("atlasUebersichtRobots");
  });
});
