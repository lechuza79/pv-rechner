import { describe, it, expect } from "vitest";
import { jetztAusReihe } from "../../components/charts/JetztDonut";
import type { GenerationDataPoint } from "../energy";

// Der Donut zeigt eine Momentaufnahme neben einer Kachelreihe, die denselben
// Zeitraum MITTELT. Beide Zahlen müssen für sich stimmen — und der Donut muss
// den LETZTEN Punkt nehmen, nicht irgendeinen.

const punkt = (ts: string, werte: Record<string, number>): GenerationDataPoint => ({ ts, ...werte });

describe("jetztAusReihe", () => {
  const reihe = [
    punkt("2026-08-08T10:00:00Z", { solar: 1000, fossil_gas: 1000 }),
    punkt("2026-08-08T14:45:00Z", { solar: 30000, wind_onshore: 6000, fossil_brown_coal_lignite: 3000, fossil_gas: 1000 }),
  ];

  it("nimmt den letzten Punkt, nicht den ersten", () => {
    const r = jetztAusReihe(reihe)!;
    expect(r.ts).toBe("2026-08-08T14:45:00Z");
    expect(r.totalMw).toBe(40000);
  });

  it("rechnet den Erneuerbaren-Anteil aus genau diesem Punkt", () => {
    const r = jetztAusReihe(reihe)!;
    expect(r.eeSharePct).toBeCloseTo((36000 / 40000) * 100); // 90 %
  });

  it("fasst Kleinstträger zu 'Sonstige' zusammen statt Haarlinien zu zeichnen", () => {
    const mitWinzling = [
      punkt("2026-08-08T14:45:00Z", { solar: 30000, wind_onshore: 9000, geothermal: 50, waste: 60 }),
    ];
    const r = jetztAusReihe(mitWinzling)!;
    const labels = r.segments.map((s) => s.label);
    expect(labels).toContain("Solar");
    expect(labels).toContain("Sonstige");
    expect(labels).not.toContain("Geothermie");
  });

  it("führt gleichnamige Träger zusammen (Wasserkraft steht in mehreren Reihen)", () => {
    const wasser = [
      punkt("2026-08-08T14:45:00Z", {
        solar: 10000, hydro_run_of_river: 2000, hydro_water_reservoir: 1000,
      }),
    ];
    const r = jetztAusReihe(wasser)!;
    const wasserSegmente = r.segments.filter((s) => s.label === "Wasserkraft");
    expect(wasserSegmente).toHaveLength(1);
    expect(wasserSegmente[0].value).toBe(3000);
  });

  it("Segmentsumme ist die Gesamtleistung — nichts fällt unter den Tisch", () => {
    const r = jetztAusReihe(reihe)!;
    expect(r.segments.reduce((s, x) => s + x.value, 0)).toBeCloseTo(r.totalMw);
  });

  it("leere oder leistungslose Reihe liefert nichts statt eines Null-Rings", () => {
    expect(jetztAusReihe([])).toBeNull();
    expect(jetztAusReihe([punkt("2026-08-08T03:00:00Z", { solar: 0 })])).toBeNull();
  });
});

// Ein Träger, der normalerweise groß ist und gerade fast nichts liefert, IST
// die Nachricht. Beim ersten Bau verschwand Wind bei Flaute in „Sonstige".
describe("Hauptträger bleiben sichtbar", () => {
  const flaute = [
    punkt("2026-08-08T12:45:00Z", {
      solar: 48490, wind_onshore: 495, wind_offshore: 151,
      fossil_brown_coal_lignite: 3493, fossil_gas: 1341, biomass: 3310, geothermal: 20,
    }),
  ];

  it("zeigt Wind auch bei rund einem Prozent Anteil", () => {
    const r = jetztAusReihe(flaute)!;
    const wind = r.segments.find((s) => s.label === "Wind");
    expect(wind).toBeDefined();
    expect(wind!.value).toBe(646); // onshore + offshore zusammengefasst
  });

  it("Kleinstträger ohne Hauptrolle wandern weiterhin in 'Sonstige'", () => {
    const r = jetztAusReihe(flaute)!;
    expect(r.segments.map((s) => s.label)).not.toContain("Geothermie");
    expect(r.segments.find((s) => s.label === "Sonstige")?.value).toBe(20);
  });
});

// Die Ringgrößen sind Konstanten, keine Laufzeitwerte — deshalb hier statt im
// Browser geprüft: stabil, ohne Netz und ohne die externe Datenquelle.
// Anlass: Der Donut bekam zuerst dieselbe LEINWANDgröße wie das Radial (160),
// zeichnete darin aber einen vollen Ring bis zum Rand, während das Radial nur
// bis Radius 72 geht. Gleiche Leinwand hieß damit ungleich große Ringe.
describe("Ringgrößen von Donut und Radial", () => {
  const DONUT_SIZE = 144; // was JetztImNetz dem Donut übergibt
  const RADIAL_OUTER_R = 72; // DIM.compact.outerR in MastrLiveRadial

  it("beide zeichnen denselben Außendurchmesser", () => {
    expect(DONUT_SIZE).toBe(RADIAL_OUTER_R * 2);
  });
});
