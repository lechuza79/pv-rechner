import { describe, it, expect } from "vitest";
import { waehleTestballon, type Kandidat, type AuswahlRegeln } from "../kommunen-testballon";

const K = (over: Partial<Kandidat> & { regionId: string }): Kandidat => ({
  name: over.regionId,
  population: 3000,
  verbundKey: null,
  hookKind: "sieger",
  hookRang: 1,
  hookTotal: 10,
  hatKanal: true,
  ...over,
});

// Kleine Regeln, damit sich die Verteilung von Hand nachrechnen lässt.
const REGELN: AuswahlRegeln = { ziel: 6, charge1: 3, kleinAnteil: 2 / 3, grenze: 10_000 };

describe("Versandliste", () => {
  it("nimmt nur erreichbare Gemeinden", () => {
    const r = waehleTestballon([K({ regionId: "a" }), K({ regionId: "b", hatKanal: false })], REGELN);
    expect(r.gewaehlt.map((g) => g.regionId)).toEqual(["a"]);
    expect(r.bericht.ohneKanal).toBe(1);
  });

  it("nimmt je Verwaltungs-Verbund nur die stärkste Gemeinde", () => {
    // Kastl und Unterneukirchen teilen sich eine Verwaltung — nur eine Mail.
    const r = waehleTestballon(
      [
        K({ regionId: "kastl", verbundKey: "unterneukirchen.de", hookRang: 3, hookTotal: 10 }),
        K({ regionId: "unterneukirchen", verbundKey: "unterneukirchen.de", hookRang: 1, hookTotal: 10 }),
      ],
      REGELN,
    );
    expect(r.gewaehlt.map((g) => g.regionId)).toEqual(["unterneukirchen"]);
    expect(r.bericht.verbundGeschwister).toBe(1);
  });

  it("hält die Mischung: zwei Drittel klein", () => {
    const kandidaten = [
      ...Array.from({ length: 10 }, (_, i) => K({ regionId: `klein${i}`, population: 2000, hookRang: i + 1, hookTotal: 10 })),
      ...Array.from({ length: 10 }, (_, i) => K({ regionId: `gross${i}`, population: 50_000, hookRang: i + 1, hookTotal: 10 })),
    ];
    const r = waehleTestballon(kandidaten, REGELN);
    expect(r.bericht.kleinGewaehlt).toBe(4); // 6 × 2/3
    expect(r.bericht.grossGewaehlt).toBe(2);
  });

  it("Charge 1 nimmt die stärksten Aufhänger, anteilig aus beiden Größen", () => {
    const kandidaten = [
      ...Array.from({ length: 10 }, (_, i) => K({ regionId: `klein${i}`, population: 2000, hookRang: i + 1, hookTotal: 10 })),
      ...Array.from({ length: 10 }, (_, i) => K({ regionId: `gross${i}`, population: 50_000, hookRang: i + 1, hookTotal: 10 })),
    ];
    const c1 = waehleTestballon(kandidaten, REGELN).gewaehlt.filter((g) => g.charge === 1);
    expect(c1).toHaveLength(3);
    expect(c1.filter((g) => g.regionId.startsWith("klein"))).toHaveLength(2);
    expect(c1.filter((g) => g.regionId.startsWith("gross"))).toHaveLength(1);
    // die stärksten, also Rang 1 und 2 je Topf
    expect(c1.map((g) => g.regionId).sort()).toEqual(["gross0", "klein0", "klein1"]);
  });

  it("meldet eine nicht erreichte Mischung, statt sie still zu füllen", () => {
    const kandidaten = [
      K({ regionId: "klein0", population: 2000 }),
      ...Array.from({ length: 10 }, (_, i) => K({ regionId: `gross${i}`, population: 50_000, hookRang: i + 1, hookTotal: 10 })),
    ];
    const r = waehleTestballon(kandidaten, REGELN);
    expect(r.bericht.kleinFehlend).toBe(3); // 4 gewollt, 1 vorhanden
    expect(r.gewaehlt).toHaveLength(6); // trotzdem voll, aus dem anderen Topf
  });

  it("stärkerer Aufhänger kommt zuerst", () => {
    const r = waehleTestballon(
      [K({ regionId: "schwach", hookRang: 9, hookTotal: 10 }), K({ regionId: "stark", hookRang: 1, hookTotal: 10 })],
      { ...REGELN, ziel: 1, charge1: 1 },
    );
    expect(r.gewaehlt[0].regionId).toBe("stark");
  });
});
