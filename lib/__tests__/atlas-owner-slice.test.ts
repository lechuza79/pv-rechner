import { describe, it, expect } from "vitest";
import { atlasOwnerSlice, ownerKeeps, ownerKeepsSpeicher } from "../atlas";

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
  // Speicher nachgebildet an Herdecke: viele Hausbatterien, ein paar gewerbliche
  // und ein Pumpspeicherwerk, dessen Kapazität alles andere erschlägt.
  speicher: {
    by_segment: [
      { segment: "batterie_privat", count: 60, kwh: 500 },
      { segment: "batterie_gewerbe", count: 4, kwh: 900 },
      { segment: "pumpspeicher", count: 1, kwh: 634_000 },
      { segment: "sonstige", count: 2, kwh: 0 },
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

  it("trennt Batteriespeicher nach Eigentümer", () => {
    expect(atlasOwnerSlice(atlas, "privat", 2025).speicherKwh).toBe(500);
    expect(atlasOwnerSlice(atlas, "privat", 2025).speicherCount).toBe(60);
    expect(atlasOwnerSlice(atlas, "gewerbe", 2025).speicherCount).toBe(4);
  });
});

/**
 * Zwei Achsen, die nichts miteinander zu tun haben: WEM ein Speicher gehört und
 * WELCHE BAUFORM er hat. Der Eigentümer-Filter darf nur die erste schneiden.
 * Genau diese Verwechslung hat die Kachel unter „Alle" um die Pumpspeicher
 * gebracht (Herdecke 513 → 512 Anlagen).
 */
describe("Eigentümer-Filter vs. Speicher-Bauform", () => {
  it("zählt unter 'alle' jeden Speicher, auch Pumpspeicher und Sonstige", () => {
    // 60 + 4 Batterien + 1 Pumpspeicher + 2 sonstige
    expect(atlasOwnerSlice(atlas, "alle", 2025).speicherCount).toBe(67);
  });

  it("zählt unter 'alle' mehr Speicher als privat und gewerbe zusammen", () => {
    const alle = atlasOwnerSlice(atlas, "alle", 2025);
    const privat = atlasOwnerSlice(atlas, "privat", 2025);
    const gewerbe = atlasOwnerSlice(atlas, "gewerbe", 2025);
    // Kein Rechenfehler, sondern der Punkt: Pumpspeicher und Sonstige haben
    // keinen Eigentümer, verschwinden aus der Gesamtzahl aber nicht.
    expect(alle.speicherCount).toBeGreaterThan(privat.speicherCount + gewerbe.speicherCount);
  });

  it("nimmt Pumpspeicher-Kapazität in KEINER Filterstufe in die kWh", () => {
    // Ältere, davon unabhängige Entscheidung: ein Goldisthal (8,7 GWh) neben
    // Kellerbatterien (10 kWh) macht jede kWh-Zahl unlesbar.
    for (const owner of ["alle", "privat", "gewerbe"] as const) {
      expect(atlasOwnerSlice(atlas, owner, 2025).speicherKwh).toBeLessThan(2_000);
    }
    expect(atlasOwnerSlice(atlas, "alle", 2025).speicherKwh).toBe(1_400);
  });

  it("hält die Speicher-Regel von der Solar-Regel getrennt", () => {
    // Solar: Pumpspeicher gibt es dort nicht, „alle" heißt „hat einen Eigentümer".
    expect(ownerKeeps("alle", "pumpspeicher")).toBe(false);
    // Speicher: „alle" heißt „alle Bauformen".
    expect(ownerKeepsSpeicher("alle", "pumpspeicher")).toBe(true);
    expect(ownerKeepsSpeicher("alle", "sonstige")).toBe(true);
    // Sobald eine Eigentümer-Kategorie gewählt ist, bleibt beides draußen.
    expect(ownerKeepsSpeicher("privat", "pumpspeicher")).toBe(false);
    expect(ownerKeepsSpeicher("gewerbe", "pumpspeicher")).toBe(false);
    expect(ownerKeepsSpeicher("privat", "batterie_privat")).toBe(true);
    expect(ownerKeepsSpeicher("gewerbe", "batterie_gewerbe")).toBe(true);
  });
});
