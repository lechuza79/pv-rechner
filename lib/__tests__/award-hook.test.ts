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
  const sieger = (key: string, label: string) =>
    hookText(
      { kind: "sieger", categoryKey: key, categoryLabel: label, traeger: "buerger", level: "kreis", scopeId: "09111", rank: 1, total: 34, percentile: null, value: 65 },
      names,
    );

  it("nennt die Messgröße im Klartext, nicht den internen Titel", () => {
    // Vorher stand hier der Titel: „Musterdorf ist Balkon-Pionier im Landkreis".
    // Der sagt nicht, was gemessen wurde, und die Auszeichnung existiert
    // öffentlich nirgends — eine Verwaltung liest das als Marketing-Erfindung.
    const s = sieger("balkon-pk", "Balkon-Pionier");
    expect(s.betreff).toBe("Musterdorf hat die meisten Balkonkraftwerke je 1.000 Einwohner im Landkreis Musterkreis");
    expect(s.einstieg).toContain("Platz 1 von 34");
  });

  it("lässt die internen Titel NIRGENDS nach außen", () => {
    // Blocker: sobald ein Kunstwort im Brief steht, müssten wir es öffentlich
    // führen, pflegen und verteidigen. Gilt für jede Kategorie.
    for (const [key, label] of [
      ["balkon-pk", "Balkon-Pionier"],
      ["batterie-privat-abs", "Speicher-Hauptstadt"],
      ["dach-privat-pk", "Solardach-Spitzenreiter"],
      ["dach-privat-abs", "Solardach-Hauptstadt"],
    ] as const) {
      const s = sieger(key, label);
      expect(`${s.betreff} ${s.einstieg}`).not.toContain(label);
    }
  });

  it("formuliert Platzierungen unterhalb von Platz 1 ohne Superlativ", () => {
    const p = hookText(
      { kind: "podium", categoryKey: "balkon-pk", categoryLabel: "Balkon-Pionier", traeger: "buerger", level: "kreis", scopeId: "09111", rank: 3, total: 34, percentile: null, value: 40 },
      names,
    );
    expect(p.betreff).toBe("Musterdorf: Platz 3 im Landkreis Musterkreis bei Balkonkraftwerke je 1.000 Einwohner");
    expect(p.betreff).not.toContain("die meisten");
  });

  it("fällt ohne Aufhänger auf einen neutralen Satz zurück", () => {
    const neutral = hookText({ kind: "neutral", categoryKey: null, categoryLabel: null, traeger: null, level: null, scopeId: null, rank: null, total: null, percentile: null, value: null }, names);
    expect(neutral.betreff).toContain("So steht Musterdorf beim Solarausbau da");
  });
});
