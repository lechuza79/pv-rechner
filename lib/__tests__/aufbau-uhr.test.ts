/**
 * The Atlas page times its own reads and logs a slow build (lib/aufbau-uhr.ts).
 * Anlass 07.10.2026: four post-deploy outliers on district pages (3.9–6.2 s)
 * whose cause could not be reproduced on demand.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ATLAS_AUFBAU_MARKE, LANGSAM_AB_MS, aufbauBericht, messe, neueUhr } from "../aufbau-uhr";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("stopwatch per read", () => {
  it("records each read's settle time from the page start, also a failed one, without rethrowing", async () => {
    let t = 1000;
    const uhr = neueUhr(1000);
    let loese!: () => void;
    let lehne!: (e: Error) => void;
    messe(uhr, "kinder", new Promise<void>((r) => (loese = r)), () => t);
    messe(uhr, "monitorpaket", new Promise<void>((_, j) => (lehne = j)), () => t);
    t = 1300; loese(); await tick();
    t = 5200; lehne(new Error("timeout")); await tick();
    expect(uhr.schritte).toEqual([{ name: "kinder", ms: 300 }, { name: "monitorpaket", ms: 4200, fehler: true }]);
  });
  it("logs only a slow build, slowest step first, under one searchable mark", () => {
    const uhr = neueUhr(0);
    uhr.schritte.push({ name: "adresse", ms: 120 }, { name: "monitorpaket", ms: 5100 }, { name: "kinder", ms: 900 });
    expect(aufbauBericht(uhr, "/solar-atlas/x", LANGSAM_AB_MS - 1)).toBeNull();
    const zeile = aufbauBericht(uhr, "/solar-atlas/x", 5400)!;
    expect(zeile.startsWith(`${ATLAS_AUFBAU_MARKE} `)).toBe(true);
    const daten = JSON.parse(zeile.slice(ATLAS_AUFBAU_MARKE.length + 1));
    expect(daten.gesamtMs).toBe(5400);
    expect(daten.schritte.map((s: { name: string }) => s.name)).toEqual(["monitorpaket", "kinder", "adresse"]);
  });
  it("the Atlas page actually uses it: every started read is timed and the report is written after the response", () => {
    const seite = readFileSync("app/(site)/solar-atlas/[[...pfad]]/page.tsx", "utf8");
    expect(seite).toMatch(/for \(const \[name, p\] of Object\.entries\(reads\)\) messe\(uhr, name, p\);/);
    expect(seite).toMatch(/messe\(uhr, "monitorpaket", preloadPublishedPackage\(/);
    expect(seite).toMatch(/messe\(uhr, "foerderkatalog", getFundingPrograms\(\)\)/);
    expect(seite).toMatch(/after\(\(\) => \{\s*const bericht = aufbauBericht\(uhr, seite, Date\.now\(\)\);\s*if \(bericht\) console\.warn\(bericht\);/);
    const ort = readFileSync("app/(gemeinde)/solar-atlas/[bundesland]/[kreis]/[gemeinde]/page.tsx", "utf8");
    expect(ort).toMatch(/for \(const \[name, p\] of Object\.entries\(reads\)\) messe\(uhr, name, p\);/);
    expect(ort).toMatch(/messe\(uhr, "adresse", adresse\)/);
    expect(ort).toMatch(/messe\(uhr, "foerderkatalog", foerderung\)/);
    expect(ort).toMatch(/after\(\(\) => \{\s*const bericht = aufbauBericht\(uhr, seite, Date\.now\(\)\);\s*if \(bericht\) console\.warn\(bericht\);/);
    expect(readFileSync("lib/district-monitor-server.ts", "utf8")).toMatch(/export function preloadPublishedPackage\([^)]*\):Promise<unknown>\{\s*const p=readPublished/);
  });
});

import { kaltaufbauHerkunft } from "../auslieferungs-alter";
it("a slow-build finding tells the repair run where the breakdown is logged", () => {
  expect(kaltaufbauHerkunft(4)).toContain(ATLAS_AUFBAU_MARKE);
});
