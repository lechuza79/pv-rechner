/**
 * The municipality page's ranking list must not wait for all ~11,000 towns.
 *
 * Anlass 07.10.2026: the list (app/api/gemeinde/rangliste) loaded the full
 * award stats in eleven sequential blocks per table, held per instance. Every
 * fresh instance — after each deploy, and several at once when an outreach
 * batch lands — made the first visitor wait 3.6 s for the podium. A Kreis or
 * Land list now reads only its own towns; the full load fetches its blocks in
 * waves and is shared by concurrent requests. Equivalence was checked live
 * (616 lists over seven areas, zero differences).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/gemeinde/rangliste/route.ts", "utf8");
const awards = readFileSync("lib/awards-server.ts", "utf8");

describe("ranking list of the municipality page", () => {
  it("a Kreis or Land list reads only its own towns; only the national list loads all", () => {
    expect(route).toMatch(/scope === "de" \? loadAwardStats\(\) : loadAwardStatsImGebiet\(scope\)/);
    // No second, unscoped full load slipped back in beside it.
    expect(route.match(/loadAwardStats\(\)/g)?.length).toBe(1);
  });

  it("the public ranking pages read only their area as well", () => {
    const seite = readFileSync("app/(site)/solar-atlas/ranking/[[...pfad]]/page.tsx", "utf8");
    expect(seite).toMatch(/scopeId \? loadAwardStatsImGebiet\(scopeId\) : loadAwardStats\(\)/);
    expect(seite.match(/loadAwardStats\(\)/g)?.length).toBe(1);
  });

  it("the area load filters BOTH tables by the area prefix", () => {
    const fn = awards.slice(awards.indexOf("export async function loadAwardStatsImGebiet"), awards.indexOf("function zuStats"));
    expect(fn.match(/\.like\("region_id", `\$\{gebiet\}%`\)/g)?.length).toBe(2);
  });

  it("the full load fetches its blocks in waves, not one after another", () => {
    const welle = Number(/const WELLE = (\d+);/.exec(awards)?.[1]);
    expect(welle).toBeGreaterThan(1);
    expect(awards).toMatch(/Promise\.all\(Array\.from\(\{ length: WELLE \}/);
  });

  it("concurrent requests on a fresh instance share one load (the promise is memoised)", () => {
    const memo = awards.slice(awards.indexOf("function memoize"), awards.indexOf("function pageAll"));
    expect(memo).toMatch(/cache: \{ at: number; val: Promise<T> \}/);
    expect(memo).not.toMatch(/await fn\(\)/);
  });
});
