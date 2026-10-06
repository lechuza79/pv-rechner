import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { atlasLevelReleased, kreisseiteIndexierbar } from "../atlas-index";

describe("Kreisseite wird mit dem ersten Brief im Kreis indexierbar", () => {
  it("Kreis mit angeschriebener Gemeinde ist freigegeben", () => {
    expect(kreisseiteIndexierbar("05758", ["05758020"])).toBe(true);
  });

  it("Kreis ohne angeschriebene Gemeinde bleibt gesperrt, solange die Ebene gesperrt ist", () => {
    if (atlasLevelReleased("landkreis")) return;
    expect(kreisseiteIndexierbar("05758", ["05382024"])).toBe(false);
    expect(kreisseiteIndexierbar("05758", [])).toBe(false);
  });

  it("ein Kreisschlüssel ist kein Präfix für einen fremden Kreis", () => {
    if (atlasLevelReleased("landkreis")) return;
    expect(kreisseiteIndexierbar("0575", ["05758020"])).toBe(false);
  });

  it("Seite und Sitemap benutzen die Regel wirklich", () => {
    const seite = readFileSync(resolve(__dirname, "../../app/(site)/solar-atlas/[[...pfad]]/page.tsx"), "utf8");
    expect(seite).toMatch(/kreisseiteIndexierbar\(region\.region_id, await verlinkendeGemeinden\(\)/);
    const sitemap = readFileSync(resolve(__dirname, "../../app/sitemap.ts"), "utf8");
    expect(sitemap).toMatch(/for \(const ags of ausOutreach\)[\s\S]*solar-atlas\/\$\{p\.bundesland\}\/\$\{p\.kreis\}`\)/);
  });
});
