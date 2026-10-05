import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Cache writes are the largest item of the hosting bill, and they are paid per
 * stored copy, read or not. In October 2026 they tripled: a crawler walked the
 * municipality pages, and every visit stored the page plus the three frames it
 * embeds. Two guards against the way back.
 */
const root = resolve(__dirname, "..", "..");
const lies = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("Gemeinde-Einbettungen und Seitenfrist", () => {
  it("baut die eingebetteten Ansichten bei jedem Aufruf, ohne Ablage", () => {
    const seite = lies("app/(embed)/embed/gemeinde/[ags]/[ansicht]/page.tsx");
    expect(seite).toMatch(/export const dynamic = "force-dynamic"/);
    expect(seite).not.toMatch(/export const revalidate/);
    expect(seite).not.toMatch(/generateStaticParams/);
  });

  it("zieht die Gemeindeseite nicht unter einen Tag Haltbarkeit", () => {
    // Next hands the shortest data-cache lifetime inside a page to the page
    // itself. The outreach list sits in every municipality page; at one hour
    // it cut the page's own day to one hour (measured: cache TTL 3600).
    const quelle = lies("lib/atlas-outreach-freigabe.ts");
    const frist = quelle.match(/revalidate:\s*(\d+)/);
    expect(frist, "keine Frist gefunden").not.toBeNull();
    expect(Number(frist![1])).toBeGreaterThanOrEqual(86400);
  });

  it("legt einen Fehlschlag der Versandliste nicht ab", () => {
    // The fallback (empty list, pages stay closed) must sit OUTSIDE the cache;
    // stored for a day it would close every mailed town for a day.
    const quelle = lies("lib/atlas-outreach-freigabe.ts");
    const innen = quelle.slice(quelle.indexOf("async function verlinkendeGemeindenUncached"), quelle.indexOf("const verlinkendeGemeindenGecacht"));
    expect(innen).not.toMatch(/return \[\]/);
    expect(innen).not.toMatch(/catch/);
  });
});
