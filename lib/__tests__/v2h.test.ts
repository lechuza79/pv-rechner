import { describe, it, expect } from "vitest";
import { calcArbitrage, toSpotHours, type SpotHour } from "../v2h-arbitrage";
import { simulateSolarYear, monthlyFromAnnual, type CarBatteryInput } from "../balkon-sim";
import { V2H_PROFILES } from "../v2h-config";

const ALWAYS = Array(24).fill(1);
const household = { baseKwh: 3800, tagQuote: 0.3, wpActive: false, eaActive: false };

function priceSeries(perHour: (h: number) => number, days = 30): SpotHour[] {
  const out: SpotHour[] = [];
  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      out.push({ hour: h, day: d, weekday: d % 7, price: perHour(h) });
    }
  }
  return out;
}

function car(over: Partial<CarBatteryInput> = {}): CarBatteryInput {
  return {
    usableKwh: 77, wallboxKw: 10, roundtrip: 0.86, minReserveKwh: 20,
    availabilityByHour: ALWAYS, availabilityWeekend: ALWAYS,
    drivingKwhPerDay: 7.4, bidirectional: true, ...over,
  };
}

function runYear(over: Parameters<typeof simulateSolarYear>[0]["car"] | undefined, battery = 0) {
  const monthly = monthlyFromAnnual(950);
  return simulateSolarYear({
    moduleKwp: 10, inverterKw: 10, monthlyYieldPerKwp: monthly,
    orientation: "sued_flach", household, batteryKwh: battery, roundtrip: 0.9, car: over,
  });
}

describe("calcArbitrage — Netzhandel", () => {
  it("liefert nichts, wenn der Preis über den Tag konstant ist", () => {
    const r = calcArbitrage({
      prices: priceSeries(() => 0.10), availabilityByHour: ALWAYS,
      availabilityWeekend: ALWAYS, usableKwh: 57, wallboxKw: 10, roundtrip: 0.86,
    });
    expect(r.annualRevenue).toBe(0);
    expect(r.medianSpreadCt).toBe(0);
  });

  it("handelt nicht, wenn die Spanne den Wirkungsgradverlust nicht deckt", () => {
    // 5 % Spanne bei 14 % Verlust — jeder Zyklus wäre ein Verlustgeschäft.
    const r = calcArbitrage({
      prices: priceSeries(h => (h < 12 ? 0.100 : 0.105)), availabilityByHour: ALWAYS,
      availabilityWeekend: ALWAYS, usableKwh: 57, wallboxKw: 10, roundtrip: 0.86,
    });
    expect(r.annualRevenue).toBe(0);
    expect(r.activeDays).toBe(0);
  });

  it("sättigt an der Wallbox-Grenze: mehr Akku bringt dann nichts mehr", () => {
    const prices = priceSeries(h => (h < 6 ? 0.05 : 0.30));
    const base = { prices, availabilityByHour: ALWAYS, availabilityWeekend: ALWAYS, wallboxKw: 10, roundtrip: 0.86 };
    const klein = calcArbitrage({ ...base, usableKwh: 15 });   // Akku begrenzt
    const gross = calcArbitrage({ ...base, usableKwh: 57 });   // Wallbox begrenzt
    const riesig = calcArbitrage({ ...base, usableKwh: 200 }); // ebenfalls Wallbox
    expect(klein.annualRevenue).toBeLessThan(gross.annualRevenue);
    // Jenseits der Wallbox-Grenze (10 kW × 3 h = 30 kWh) ändert sich nichts mehr.
    expect(riesig.annualRevenue).toBe(gross.annualRevenue);
  });

  it("berücksichtigt nur Stunden, in denen das Auto angesteckt ist", () => {
    // Günstig ist es nachts (0–5 h). Wer dann nicht am Netz hängt, kann nicht laden.
    const prices = priceSeries(h => (h < 6 ? 0.05 : 0.30));
    const nachtsWeg = Array(24).fill(1).map((_, h) => (h < 6 ? 0 : 1));
    const immer = calcArbitrage({ prices, availabilityByHour: ALWAYS, availabilityWeekend: ALWAYS, usableKwh: 57, wallboxKw: 10, roundtrip: 0.86 });
    const ohneNacht = calcArbitrage({ prices, availabilityByHour: nachtsWeg, availabilityWeekend: nachtsWeg, usableKwh: 57, wallboxKw: 10, roundtrip: 0.86 });
    expect(ohneNacht.annualRevenue).toBeLessThan(immer.annualRevenue);
  });

  it("unterscheidet Werktag und Wochenende", () => {
    const prices = priceSeries(h => (h < 6 ? 0.05 : 0.30), 28);
    const werktagsWeg = Array(24).fill(1).map((_, h) => (h < 6 ? 0 : 1));
    // Am Wochenende immer da → muss mehr bringen als durchgehend weg.
    const mitWE = calcArbitrage({ prices, availabilityByHour: werktagsWeg, availabilityWeekend: ALWAYS, usableKwh: 57, wallboxKw: 10, roundtrip: 0.86 });
    const ohneWE = calcArbitrage({ prices, availabilityByHour: werktagsWeg, availabilityWeekend: werktagsWeg, usableKwh: 57, wallboxKw: 10, roundtrip: 0.86 });
    expect(mitWE.annualRevenue).toBeGreaterThan(ohneWE.annualRevenue);
  });

  it("mittelt viertelstündliche Rohdaten auf Stunden", () => {
    const unix = [0, 900, 1800, 2700].map(s => s + 86400 * 100);
    const rows = toSpotHours(unix, [100, 200, 300, 400]);
    expect(rows).toHaveLength(1);
    expect(rows[0].price).toBeCloseTo(0.25, 5); // Mittel 250 €/MWh = 0,25 €/kWh
  });
});

describe("Auto-Speicher in der geteilten Simulation", () => {
  it("ändert ohne Auto nichts am bisherigen Ergebnis (Schutz der geteilten Basis)", () => {
    const ohne = runYear(undefined);
    expect(ohne.carDrivingKwh).toBe(0);
    expect(ohne.carFromPvKwh).toBe(0);
    expect(ohne.carToHomeKwh).toBe(0);
    // Die Kernbilanz muss weiterhin aufgehen.
    expect(ohne.selfUsedKwh).toBeGreaterThan(0);
    expect(ohne.selfUsedKwh).toBeLessThanOrEqual(ohne.consumptionKwh);
  });

  it("speist nur zurück, wenn bidirektional erlaubt ist", () => {
    expect(runYear(car({ bidirectional: false })).carToHomeKwh).toBe(0);
    expect(runYear(car({ bidirectional: true })).carToHomeKwh).toBeGreaterThan(0);
  });

  it("deckt den Fahrbedarf und zählt ihn nicht als Haushaltslast", () => {
    const r = runYear(car());
    // 7,4 kWh/Tag × 365 ≈ 2.700 kWh Fahrstrom
    expect(r.carDrivingKwh).toBeGreaterThan(2500);
    expect(r.carDrivingKwh).toBeLessThan(2900);
    // Der Haushaltsverbrauch bleibt davon unberührt (kein Doppelzählen).
    const ohne = runYear(undefined);
    expect(r.consumptionKwh).toBe(ohne.consumptionKwh);
  });

  it("lädt fürs Fahren notfalls aus dem Netz nach", () => {
    // Winzige Anlage → die Sonne kann den Fahrbedarf nicht decken.
    const monthly = monthlyFromAnnual(950);
    const r = simulateSolarYear({
      moduleKwp: 1, inverterKw: 1, monthlyYieldPerKwp: monthly, orientation: "sued_flach",
      household, batteryKwh: 0, roundtrip: 0.9, car: car(),
    });
    expect(r.carFromGridKwh).toBeGreaterThan(0);
  });

  it("holt bei größerer Anlage mehr Fahrstrom aus der Sonne", () => {
    const klein = runYear(car(), 0);
    const monthly = monthlyFromAnnual(950);
    const gross = simulateSolarYear({
      moduleKwp: 20, inverterKw: 20, monthlyYieldPerKwp: monthly, orientation: "sued_flach",
      household, batteryKwh: 0, roundtrip: 0.9, car: car(),
    });
    expect(gross.carFromPvKwh).toBeGreaterThan(klein.carFromPvKwh);
  });

  it("bringt dem Pendler weniger Solar-Ladung als dem Homeoffice-Haushalt", () => {
    // Das Ehrlichkeits-Pfund: Wer tagsüber wegfährt, verpasst die Sonne.
    const p = V2H_PROFILES.find(x => x.id === "pendler")!;
    const h = V2H_PROFILES.find(x => x.id === "homeoffice")!;
    const pend = runYear(car({ availabilityByHour: p.availabilityByHour, availabilityWeekend: p.availabilityWeekend }));
    const home = runYear(car({ availabilityByHour: h.availabilityByHour, availabilityWeekend: h.availabilityWeekend }));
    expect(pend.carFromPvKwh).toBeLessThan(home.carFromPvKwh);
  });

  it("schiebt keine Netzenergie im Kreis: Rückspeisung nur aus Solarladung", () => {
    // Ohne PV gibt es nichts zu puffern — dann darf auch nichts ins Haus zurück.
    const r = simulateSolarYear({
      moduleKwp: 0, inverterKw: 1, monthlyYieldPerKwp: monthlyFromAnnual(950),
      orientation: "sued_flach", household, batteryKwh: 0, roundtrip: 0.9, car: car(),
    });
    expect(r.carFromPvKwh).toBe(0);
    expect(r.carToHomeKwh).toBe(0);
  });
});
