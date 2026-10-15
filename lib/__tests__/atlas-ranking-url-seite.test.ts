import { describe, expect, it } from "vitest";
import { ranglisteUrl, RANGLISTE_PRO_SEITE } from "../atlas-ranking";

describe("ranglisteUrl opens the page that carries the rank", () => {
  it("stays on page 1 up to the page size", () => {
    expect(ranglisteUrl("zubau-5-jahre-je-einwohner", "gemeinden-und-kleinstaedte", [], true, RANGLISTE_PRO_SEITE)).toBe(
      "/solar-atlas/ranking/zubau-5-jahre-je-einwohner/gemeinden-und-kleinstaedte#rangliste",
    );
  });
  it("links page 2 for rank 217 (Sassenberg, 14.10.2026)", () => {
    expect(ranglisteUrl("zubau-5-jahre-je-einwohner", "gemeinden-und-kleinstaedte", [], true, 217)).toBe(
      "/solar-atlas/ranking/zubau-5-jahre-je-einwohner/gemeinden-und-kleinstaedte/seite-2#rangliste",
    );
  });
  it("puts the page after the area", () => {
    expect(ranglisteUrl("x", null, ["nordrhein-westfalen", "kreis-soest"], false, 401)).toBe(
      "/solar-atlas/ranking/x/nordrhein-westfalen/kreis-soest/seite-3",
    );
  });
});
