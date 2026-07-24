import { describe, it, expect } from "vitest";
import {
  AWARD_CATEGORY_BY_KEY,
  DEFAULT_AWARD_OPTIONS,
  categoryHasData,
  isEligible,
  rankByScope,
  rankGemeinden,
  scopeIdOf,
  scopeWinners,
  type GemeindeStats,
} from "../awards";

const dach = AWARD_CATEGORY_BY_KEY["solardach-spitzenreiter"];
const standort = AWARD_CATEGORY_BY_KEY["solar-standort"];
const balkonPionier = AWARD_CATEGORY_BY_KEY["balkon-pionier"];
const opts = DEFAULT_AWARD_OPTIONS;

// Hilfsbau: minimaler Gemeinde-Datensatz mit sinnvollen Defaults.
function g(regionId: string, over: Partial<GemeindeStats> = {}): GemeindeStats {
  return { regionId, population: 5000, kwpAlle: 1000, kwpDach: 1000, ...over };
}

describe("scopeIdOf", () => {
  it("liest Bundesland (2) und Landkreis (5) aus dem AGS", () => {
    expect(scopeIdOf("09564000", "de")).toBe("de");
    expect(scopeIdOf("09564000", "bundesland")).toBe("09");
    expect(scopeIdOf("09564000", "landkreis")).toBe("09564");
  });
});

describe("Freiflächen-Regel", () => {
  // Der Kern des Konzepts: ein einzelner Freiflächenpark in einer winzigen
  // Gemeinde darf NICHT die Pro-Kopf-Bürgerkennzahl anführen.
  const dorfMitPark = g("09111001", {
    population: 3000,
    kwpAlle: 40000, // riesiger Park
    kwpDach: 300, // aber kaum Dächer
  });
  const echterDachvorreiter = g("09111002", {
    population: 3000,
    kwpAlle: 6000,
    kwpDach: 6000, // alles auf Dächern
  });

  it("rankt Solardach-Spitzenreiter nach Dachleistung, nicht nach Gesamt", () => {
    const ranking = rankGemeinden([dorfMitPark, echterDachvorreiter], dach, opts);
    expect(ranking[0].regionId).toBe("09111002"); // der Dachvorreiter führt
    expect(ranking[1].regionId).toBe("09111001");
  });

  it("lässt den Park-Standort aber ehrlich die absolute Kategorie gewinnen", () => {
    const ranking = rankGemeinden([dorfMitPark, echterDachvorreiter], standort, opts);
    expect(ranking[0].regionId).toBe("09111001"); // hier zählt Gesamt
  });
});

describe("Einwohner-Schwelle", () => {
  it("schließt Kleinst-Gemeinden aus den Pro-Kopf-Kategorien aus", () => {
    const winzling = g("09111003", { population: 100, kwpDach: 5000 }); // absurde Pro-Kopf-Zahl
    expect(isEligible(winzling, dach, opts)).toBe(false);
    // In der absoluten Kategorie ohne Schwelle bleibt sie wertbar.
    expect(isEligible(winzling, standort, opts)).toBe(true);
  });

  it("lässt Gemeinden ab der Schwelle zu", () => {
    const gross = g("09111004", { population: 2000, kwpDach: 5000 });
    expect(isEligible(gross, dach, opts)).toBe(true);
  });

  it("respektiert eine geänderte Schwelle", () => {
    const mittel = g("09111005", { population: 1500, kwpDach: 5000 });
    expect(isEligible(mittel, dach, { minPopulation: 2000 })).toBe(false);
    expect(isEligible(mittel, dach, { minPopulation: 1000 })).toBe(true);
  });
});

describe("Wertbarkeit", () => {
  it("wertet keine Gemeinde ohne Solarleistung", () => {
    expect(isEligible(g("09111006", { kwpAlle: 0, kwpDach: 0 }), standort, opts)).toBe(false);
  });

  it("markiert Kategorien ohne Datengrundlage (Balkon vor Rollup-Erweiterung)", () => {
    const ohneBalkon = [g("09111007"), g("09111008")]; // balkonCount undefined
    expect(categoryHasData(ohneBalkon, balkonPionier)).toBe(false);
    expect(categoryHasData(ohneBalkon, dach)).toBe(true);
  });

  it("wertet Balkon-Kategorien sobald die Daten da sind", () => {
    const mitBalkon = [
      g("09111009", { population: 4000, balkonCount: 120 }),
      g("09111010", { population: 4000, balkonCount: 40 }),
    ];
    expect(categoryHasData(mitBalkon, balkonPionier)).toBe(true);
    const ranking = rankGemeinden(mitBalkon, balkonPionier, opts);
    expect(ranking[0].regionId).toBe("09111009");
  });
});

describe("rankByScope / scopeWinners", () => {
  const gemeinden: GemeindeStats[] = [
    // Bayern (09), zwei Kreise
    g("09111001", { population: 5000, kwpDach: 5000 }), // Kreis 09111
    g("09111002", { population: 5000, kwpDach: 3000 }),
    g("09222001", { population: 5000, kwpDach: 9000 }), // Kreis 09222
    // Baden-Württemberg (08)
    g("08111001", { population: 5000, kwpDach: 4000 }),
  ];

  it("kürt je Bundesland genau einen Sieger", () => {
    const winners = scopeWinners(gemeinden, dach, "bundesland", opts);
    const by = Object.fromEntries(winners.map((w) => [w.scopeId, w.winner.regionId]));
    expect(by["09"]).toBe("09222001"); // stärkstes Dach je Kopf in Bayern
    expect(by["08"]).toBe("08111001");
    expect(winners).toHaveLength(2);
  });

  it("kürt je Landkreis einen Sieger", () => {
    const winners = scopeWinners(gemeinden, dach, "landkreis", opts);
    const by = Object.fromEntries(winners.map((w) => [w.scopeId, w.winner.regionId]));
    expect(by["09111"]).toBe("09111001");
    expect(by["09222"]).toBe("09222001");
    expect(by["08111"]).toBe("08111001");
  });

  it("liefert für Deutschland eine einzige Gruppe mit vollständigem Ranking", () => {
    const scopes = rankByScope(gemeinden, dach, "de", opts);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].entries[0].regionId).toBe("09222001");
    expect(scopes[0].total).toBe(4);
  });
});
