import { describe, it, expect } from "vitest";
import {
  solarTrendVergleich, latestComparableMonth, earliestComparableMonth,
  letzteVergleiche, periodOf, monatsName, type SolarMonat,
} from "../solar-trend";
import { formatGWhCompare } from "../chart-utils";

// Die Trend-Rechnung speist Server-Tabelle UND Client-Karte — dieselbe
// Funktion, deshalb reicht ein Test für beide Oberflächen.

const serie: SolarMonat[] = [
  { period: "2024-06", solarGWh: 9000, installedGw: 90 },
  { period: "2024-07", solarGWh: 8400, installedGw: 92 },
  { period: "2025-06", solarGWh: 10000, installedGw: 100 },
  { period: "2025-07", solarGWh: 12000, installedGw: 115 },
];

describe("solarTrendVergleich", () => {
  it("zerlegt multiplikativ: (1+gesamt) = (1+zubau) × (1+wetter)", () => {
    const v = solarTrendVergleich(serie, 2025, 6)!; // Juli 2025 vs. Juli 2024
    expect(v.totalPct).toBe(43); // 12000/8400 − 1 = 42,86 → 43
    expect(v.zerlegung!.zubauPct).toBe(25); // 115/92 − 1
    // Wetter = (12000/115)/(8400/92) − 1 = 1,4286/1,25 − 1 = 14,29 → 14
    expect(v.zerlegung!.wetterPct).toBe(14);
    // Multiplikative Probe auf den UNGERUNDETEN Faktoren
    const gesamt = v.curGWh / v.prevGWh;
    const zubau = v.zerlegung!.curGw / v.zerlegung!.prevGw;
    const wetter = (v.curGWh / v.zerlegung!.curGw) / (v.prevGWh / v.zerlegung!.prevGw);
    expect(zubau * wetter).toBeCloseTo(gesamt, 10);
  });

  it("liefert Monats-Ertrag je kWp als GWh÷GWp", () => {
    const v = solarTrendVergleich(serie, 2025, 6)!;
    expect(v.zerlegung!.curYield).toBeCloseTo(12000 / 115);
    expect(v.zerlegung!.prevYield).toBeCloseTo(8400 / 92);
  });

  it("ohne Leistungsdaten gibt es KEINE Zerlegung statt einer geratenen", () => {
    const ohneGw = serie.map((s) => ({ ...s, installedGw: s.period === "2024-07" ? null : s.installedGw }));
    const v = solarTrendVergleich(ohneGw, 2025, 6)!;
    expect(v.totalPct).toBe(43);
    expect(v.zerlegung).toBeNull();
  });

  it("fehlt einer der beiden Monate, gibt es keinen Vergleich", () => {
    expect(solarTrendVergleich(serie, 2025, 7)).toBeNull(); // August fehlt
    expect(solarTrendVergleich(serie, 2024, 6)).toBeNull(); // Vorjahr 2023 fehlt
  });
});

describe("Blätter-Grenzen", () => {
  it("jüngster und ältester vergleichbarer Monat", () => {
    expect(latestComparableMonth(serie)).toEqual({ year: 2025, month0: 6 });
    expect(earliestComparableMonth(serie)).toEqual({ year: 2025, month0: 5 });
  });

  it("letzteVergleiche: jüngster zuerst, Lücken übersprungen", () => {
    const list = letzteVergleiche(serie, 12);
    expect(list.map((x) => periodOf(x.year, x.month0))).toEqual(["2025-07", "2025-06"]);
  });

  it("leere Reihe: alles null/leer", () => {
    expect(latestComparableMonth([])).toBeNull();
    expect(letzteVergleiche([], 12)).toEqual([]);
  });
});

describe("Beschriftung", () => {
  it("deutsche Monatsnamen", () => {
    expect(monatsName(0)).toBe("Januar");
    expect(monatsName(6)).toBe("Juli");
  });
});

// Zahlen-Kohärenz: In einer Vergleichszeile muss der Leser die Prozentangabe
// aus den beiden angezeigten Zahlen nachrechnen können. formatGWhIn lässt ab
// 10 die Nachkommastelle weg — daraus wurde in der ersten Fassung der Tabelle
// „11 TWh gegen 10 TWh, +11 %", was beim Nachrechnen 10 % ergibt.
describe("formatGWhCompare (Vergleichs-Formatierung)", () => {
  it("behält die Nachkommastelle auch über 10", () => {
    expect(formatGWhCompare(11200, "TWh")).toBe("11,2 TWh");
    expect(formatGWhCompare(10000, "TWh")).toBe("10,0 TWh");
    expect(formatGWhCompare(12035, "TWh")).toBe("12,0 TWh");
  });

  it("nachgerechnete Veränderung weicht höchstens 1 Punkt ab", () => {
    for (const [cur, prev] of [[11200, 10000], [10900, 9800], [12035, 8376], [2500, 2900]] as const) {
      const echt = Math.round((cur / prev - 1) * 100);
      const parse = (s: string) => Number(s.split(" ")[0].replace(",", "."));
      const abgelesen = Math.round(
        (parse(formatGWhCompare(cur, "TWh")) / parse(formatGWhCompare(prev, "TWh")) - 1) * 100,
      );
      expect(Math.abs(abgelesen - echt)).toBeLessThanOrEqual(1);
    }
  });

  it("deutsche Dezimaltrennung", () => {
    expect(formatGWhCompare(8376, "TWh")).toBe("8,4 TWh");
    expect(formatGWhCompare(500, "GWh")).toBe("500,0 GWh");
  });
});
