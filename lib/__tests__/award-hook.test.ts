import { describe, it, expect } from "vitest";
import { computePlacements, hookText, selectHook, type Placement } from "../award-hook";
import type { GemeindeStats } from "../awards";

function g(regionId: string, over: Partial<GemeindeStats> = {}): GemeindeStats {
  return {
    regionId, name: over.name ?? regionId, bezeichnung: "Gemeinde", population: 5000,
    privatDachKwp: 0, gewerbeDachKwp: 0, freiflaecheKwp: 0, balkonCount: 0, balkonKwp: 0,
    batteriePrivatKwh: 0, batterieGewerbeKwh: 0, windKwp: 0, biomasseKwp: 0, wasserKwp: 0,
    solarZubauKwp: 0, ...over,
  };
}

const names = { gemeinde: "Musterdorf", kreis: "Landkreis Musterkreis", land: "Bayern" };

describe("computePlacements", () => {
  it("vergibt Rang und Gruppengröße je Kategorie und Ebene", () => {
    const gem = [
      g("09111001", { privatDachKwp: 9000 }),
      g("09111002", { privatDachKwp: 3000 }),
      g("09222001", { privatDachKwp: 6000 }),
    ];
    const pl = computePlacements(gem);
    const kreis1 = pl.get("09111001")!.find((p) => p.categoryKey === "dach-privat-pk" && p.level === "kreis")!;
    expect(kreis1.rank).toBe(1);
    expect(kreis1.total).toBe(2); // zwei Gemeinden im Kreis 09111
    const bund1 = pl.get("09111001")!.find((p) => p.categoryKey === "dach-privat-pk" && p.level === "bund")!;
    expect(bund1.rank).toBe(1);
    expect(bund1.total).toBe(3);
  });
});

describe("Aufhänger-Guardrails (Gegenprüfung 2026-07-25)", () => {
  it("nimmt nur Bürger-Kategorien als Aufhänger (kein Standort/Gewerbe/Zubau)", () => {
    const gem = [
      g("09111001", { population: 5000, gewerbeDachKwp: 9000, freiflaecheKwp: 5000, windKwp: 9000, solarZubauKwp: 9000, privatDachKwp: 100 }),
    ];
    const keys = new Set((computePlacements(gem).get("09111001") ?? []).map((p) => p.categoryKey));
    for (const off of ["solar-standort", "freiflaeche-standort", "zubau", "wind-standort", "gewerbespeicher-abs"]) {
      expect(keys.has(off)).toBe(false);
    }
  });

  it("schließt Pro-Kopf-Aufhänger für Gemeinden unter der Einwohner-Schwelle aus", () => {
    const winzling = g("09111001", { population: 300, privatDachKwp: 9000 }); // absurde Pro-Kopf-Zahl
    const stadt = g("09111002", { population: 5000, privatDachKwp: 3000 });
    const pl = computePlacements([winzling, stadt]);
    expect((pl.get("09111001") ?? []).some((p) => p.categoryKey === "dach-privat-pk")).toBe(false);
    expect((pl.get("09111002") ?? []).some((p) => p.categoryKey === "dach-privat-pk")).toBe(true);
  });
});

describe("selectHook", () => {
  const P = (over: Partial<Placement>): Placement => ({
    categoryKey: "dach-privat-pk", level: "kreis", scopeId: "09111", rank: 1, total: 20, value: 100, spike: false, ...over,
  });

  it("überspringt Spike-Platzierungen (Datenfehler-Verdacht)", () => {
    expect(selectHook([P({ rank: 1, total: 20, spike: true })]).kind).toBe("neutral");
  });

  it("wählt einen Sieg", () => {
    const h = selectHook([P({ rank: 1, total: 20 })]);
    expect(h.kind).toBe("sieger");
    expect(h.categoryKey).toBe("dach-privat-pk");
  });

  it("bevorzugt die höhere Ebene bei gleichem Sieg", () => {
    const h = selectHook([P({ level: "kreis" }), P({ level: "bund" })]);
    expect(h.level).toBe("bund");
  });

  it("ein echter Sieg schlägt ein Podium auf höherer Ebene", () => {
    const h = selectHook([P({ level: "kreis", rank: 1 }), P({ level: "bund", rank: 2 })]);
    expect(h.kind).toBe("sieger");
    expect(h.level).toBe("kreis");
  });

  it("greift die Glaubwürdigkeits-Schwelle (kleine Gruppe zählt nicht als Sieg)", () => {
    const h = selectHook([P({ rank: 1, total: 3 })]); // total < minTotal(5)
    expect(h.kind).toBe("neutral");
  });

  it("fällt auf Perzentil zurück", () => {
    const h = selectHook([P({ rank: 8, total: 100 })]); // 8% → Top 10%
    expect(h.kind).toBe("perzentil");
    expect(Math.round((h.percentile ?? 0) * 100)).toBe(8);
  });

  it("liefert neutral, wenn nichts trägt", () => {
    expect(selectHook([P({ rank: 50, total: 100 })]).kind).toBe("neutral");
    expect(selectHook([]).kind).toBe("neutral");
  });

  it("bevorzugt Bürger bei sonst gleichem Sieg", () => {
    const h = selectHook([
      P({ categoryKey: "solar-standort", rank: 1, total: 20 }),
      P({ categoryKey: "dach-privat-pk", rank: 1, total: 20 }),
    ]);
    expect(h.categoryKey).toBe("dach-privat-pk");
  });
});

describe("hookText", () => {
  it("baut Betreff und Einstieg je Aufhänger-Art", () => {
    const sieg = hookText(
      { kind: "sieger", categoryKey: "balkon-pk", categoryLabel: "Balkon-Pionier", traeger: "buerger", level: "kreis", scopeId: "09111", rank: 1, total: 34, percentile: null, value: 65 },
      names,
    );
    expect(sieg.betreff).toContain("Musterdorf ist Balkon-Pionier im Landkreis Musterkreis");
    expect(sieg.einstieg).toContain("Platz 1 von 34");

    const neutral = hookText({ kind: "neutral", categoryKey: null, categoryLabel: null, traeger: null, level: null, scopeId: null, rank: null, total: null, percentile: null, value: null }, names);
    expect(neutral.betreff).toContain("So steht Musterdorf beim Solarausbau da");
  });
});
