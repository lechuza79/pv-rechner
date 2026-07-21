import { describe, it, expect } from "vitest";
import { atlasOwnerSlice, ownerKeeps } from "../atlas";

// A small stand-in stock: private roofs + Steckersolar on one side, commercial
// roofs + open field on the other, plus a pumped-storage plant that belongs to
// neither and must never land in a total.
const atlas = {
  solar: {
    by_segment: [
      { segment: "privat_dach", count: 100, kwp: 800 },
      { segment: "steckersolar", count: 40, kwp: 30 },
      { segment: "gewerbe_dach", count: 10, kwp: 500 },
      { segment: "freiflaeche", count: 2, kwp: 5000 },
    ],
    by_year_segment: [
      { year: 2024, segment: "privat_dach", count: 7, kwp: 60 },
      { year: 2025, segment: "privat_dach", count: 12, kwp: 95 },
      { year: 2025, segment: "steckersolar", count: 5, kwp: 4 },
      { year: 2025, segment: "gewerbe_dach", count: 3, kwp: 150 },
    ],
  },
  speicher: {
    by_segment: [
      { segment: "batterie_privat", count: 60, kwh: 500 },
      { segment: "batterie_gewerbe", count: 4, kwh: 900 },
      { segment: "pumpspeicher", count: 1, kwh: 0 },
    ],
  },
};

describe("Eigentümer-Schnitt der KPI-Kacheln", () => {
  it("teilt Anlagen und Leistung nach Eigentümer", () => {
    const privat = atlasOwnerSlice(atlas, "privat", 2025);
    expect(privat.count).toBe(140);
    expect(privat.kwp).toBe(830);

    const gewerbe = atlasOwnerSlice(atlas, "gewerbe", 2025);
    expect(gewerbe.count).toBe(12);
    expect(gewerbe.kwp).toBe(5500);
  });

  it("addiert sich bei 'alle' aus beiden Kategorien", () => {
    const alle = atlasOwnerSlice(atlas, "alle", 2025);
    const privat = atlasOwnerSlice(atlas, "privat", 2025);
    const gewerbe = atlasOwnerSlice(atlas, "gewerbe", 2025);
    expect(alle.count).toBe(privat.count + gewerbe.count);
    expect(alle.kwp).toBe(privat.kwp + gewerbe.kwp);
    expect(alle.speicherKwh).toBe(privat.speicherKwh + gewerbe.speicherKwh);
  });

  it("zählt Zubau nur im gewählten Jahr und in der gewählten Kategorie", () => {
    expect(atlasOwnerSlice(atlas, "privat", 2025).neu).toBe(17);
    expect(atlasOwnerSlice(atlas, "gewerbe", 2025).neu).toBe(3);
    expect(atlasOwnerSlice(atlas, "privat", 2024).neu).toBe(7);
  });

  it("hält Freifläche aus dem Speicher-Nenner heraus", () => {
    // kwpDach ist der Nenner für „kWh je kWp" — ein Solarpark gehört nicht hinein.
    expect(atlasOwnerSlice(atlas, "gewerbe", 2025).kwpDach).toBe(500);
    expect(atlasOwnerSlice(atlas, "alle", 2025).kwpDach).toBe(1330);
  });

  it("lässt Pumpspeicher in keiner Kategorie auftauchen", () => {
    expect(ownerKeeps("alle", "pumpspeicher")).toBe(false);
    expect(ownerKeeps("privat", "pumpspeicher")).toBe(false);
    expect(ownerKeeps("gewerbe", "pumpspeicher")).toBe(false);
    expect(atlasOwnerSlice(atlas, "alle", 2025).speicherCount).toBe(64);
  });

  it("trennt Batteriespeicher nach Eigentümer", () => {
    expect(atlasOwnerSlice(atlas, "privat", 2025).speicherKwh).toBe(500);
    expect(atlasOwnerSlice(atlas, "gewerbe", 2025).speicherCount).toBe(4);
  });
});
