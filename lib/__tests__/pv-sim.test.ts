import { describe, it, expect } from "vitest";
import { simulatePvYear, simulateExampleDay, EXAMPLE_DAYS } from "../pv-sim";
import { calcAutarkie } from "../calc";
import type { HouseholdProfile } from "../consumption";

// Reiner Haushalt bei HTWs implizitem Tagverbrauch (~40 %) — der Betriebspunkt,
// an dem sich Simulation und HTW-Kennfeld vergleichen lassen.
function pureHH(tagQuote = 0.40, base = 3800): HouseholdProfile {
  return { baseKwh: base, tagQuote, wpActive: false, eaActive: false };
}

describe("simulatePvYear", () => {
  // ── Validierungs-Anker: Simulation vs. HTW-Referenzkennfeld (calcAutarkie) ──
  // Bei gleichem Tagverbrauch muss die Stundensimulation das HTW-Ergebnis treffen.
  // Das war der Kern der Evaluierung: keine systematische Abweichung, nur wenn man
  // (wie anfangs fälschlich) unterschiedliche Tagverbrauchs-Annahmen vergleicht.
  it("trifft das HTW-Referenzkennfeld bei gleichem Tagverbrauch (±3 pp)", () => {
    const C = 3800, YIELD = 1024;
    const points: [number, number][] = [[5, 0], [5, 5], [8, 4], [10, 8], [6, 6], [12, 10], [4, 4]];
    for (const [kwp, sp] of points) {
      const sim = simulatePvYear({ kwp, speicherKwh: sp, monthlyYieldPerKwp: null, ertragKwp: YIELD, household: pureHH() });
      const htw = calcAutarkie({ kwp, speicherKwh: sp, gesamtVerbrauch: C, ertragKwp: YIELD });
      expect(Math.abs(sim.autarky - htw)).toBeLessThanOrEqual(3);
    }
  });

  it("Reddit-Fall 22,5 kWp + 13 kWh: hohe, aber KEINE 100 % Autarkie", () => {
    const sim = simulatePvYear({ kwp: 22.5, speicherKwh: 13, monthlyYieldPerKwp: null, ertragKwp: 950, household: pureHH(0.38) });
    expect(sim.autarky).toBeGreaterThan(82);
    expect(sim.autarky).toBeLessThan(96);
  });

  it("Wärmepumpe senkt die Autarkie deutlich (Winter-Mismatch, was das Kennfeld nicht kann)", () => {
    const base: HouseholdProfile = { baseKwh: 4500, tagQuote: 0.30, wpActive: false, eaActive: false };
    const withWp: HouseholdProfile = { ...base, wpActive: true, wpAnnualKwh: 5000 };
    const noWp = simulatePvYear({ kwp: 10, speicherKwh: 8, monthlyYieldPerKwp: null, ertragKwp: 950, household: base });
    const yesWp = simulatePvYear({ kwp: 10, speicherKwh: 8, monthlyYieldPerKwp: null, ertragKwp: 950, household: withWp });
    // Wärmepumpe verdoppelt den (winterlastigen) Verbrauch → Autarkie fällt klar.
    expect(yesWp.autarky).toBeLessThan(noWp.autarky - 10);
  });

  it("steigt monoton mit Speicher und mit Anlagengröße", () => {
    const hh = pureHH();
    const base = simulatePvYear({ kwp: 6, speicherKwh: 0, monthlyYieldPerKwp: null, ertragKwp: 950, household: hh }).autarky;
    const moreBat = simulatePvYear({ kwp: 6, speicherKwh: 8, monthlyYieldPerKwp: null, ertragKwp: 950, household: hh }).autarky;
    const morePv = simulatePvYear({ kwp: 12, speicherKwh: 0, monthlyYieldPerKwp: null, ertragKwp: 950, household: hh }).autarky;
    expect(moreBat).toBeGreaterThan(base);
    expect(morePv).toBeGreaterThan(base);
  });

  it("liefert 12 kohärente Monate, mit Netzbezug im Winter trotz großer Anlage", () => {
    const sim = simulatePvYear({ kwp: 22.5, speicherKwh: 13, monthlyYieldPerKwp: null, ertragKwp: 950, household: pureHH(0.38) });
    expect(sim.monthly).toHaveLength(12);
    // Jahres-Autarkie = Summe Eigenversorgung / Summe Verbrauch (±1 pp Rundung).
    const self = sim.monthly.reduce((s, m) => s + m.selfUsed, 0);
    const cons = sim.monthly.reduce((s, m) => s + m.consumption, 0);
    expect(Math.abs(Math.round((self / cons) * 100) - sim.autarky)).toBeLessThanOrEqual(1);
    // Dezember: trotz Überdimensionierung bleibt Netzbezug — der Kern des Fixes.
    expect(sim.monthly[11].gridDraw).toBeGreaterThan(0);
    // Hochsommer: praktisch alles aus Sonne.
    expect(sim.monthly[5].gridDraw).toBeLessThan(sim.monthly[11].gridDraw);
    // Produktions-Seite: jeder Monat erfüllt production = direct + stored + feedIn
    // (die Aufteilung für den Kombi-Chart) — Rundungstoleranz ±2 kWh.
    for (const m of sim.monthly) {
      expect(Math.abs(m.production - (m.direct + m.stored + m.feedIn))).toBeLessThanOrEqual(2);
    }
    // Sommer speist massiv ein, Winter kaum.
    expect(sim.monthly[5].feedIn).toBeGreaterThan(sim.monthly[11].feedIn);
  });

  it("gibt 0 zurück ohne PV oder ohne Verbrauch", () => {
    expect(simulatePvYear({ kwp: 0, speicherKwh: 5, monthlyYieldPerKwp: null, ertragKwp: 950, household: pureHH() }).autarky).toBe(0);
    const empty = simulatePvYear({ kwp: 8, speicherKwh: 5, monthlyYieldPerKwp: null, ertragKwp: 950, household: { baseKwh: 0, tagQuote: 0.4, wpActive: false, eaActive: false } });
    expect(empty.autarky).toBe(0);
  });

  it("Beispieltag: sonniger Wintertag zeigt Mittags-Überschuss UND Nacht-Netzbezug", () => {
    // Genau der Innerhalb-des-Tages-Mismatch, den die Monatsbilanz versteckt.
    const hh: HouseholdProfile = { baseKwh: 3800, tagQuote: 0.30, wpActive: false, eaActive: false };
    const cfg = EXAMPLE_DAYS[0]; // Sonniger Wintertag (Dez, sonnigster Tagestyp)
    const d = simulateExampleDay({ kwp: 22, speicherKwh: 15, monthlyYieldPerKwp: null, ertragKwp: 950, household: hh }, cfg.month, cfg.dayType);
    expect(d.hours).toHaveLength(24);
    expect(d.feedIn).toBeGreaterThan(0); // mittags Überschuss ins Netz
    expect(d.grid).toBeGreaterThan(0);   // nachts Strom aus dem Netz
    // Jede Stunde: Verbrauch = direkt + Speicher + Netz (Deckungs-Zerlegung)
    for (const h of d.hours) {
      expect(Math.abs(h.cons - (h.direct + h.discharge + h.grid))).toBeLessThan(0.001);
    }
    // Mittags (12–14 Uhr) wird eingespeist, nachts (0–4 Uhr) nicht.
    expect(d.hours.slice(12, 15).some(h => h.feedIn > 0)).toBe(true);
    expect(d.hours.slice(0, 5).every(h => h.feedIn === 0)).toBe(true);
  });

  it("Beispieltag: trüber Wintertag deckt kaum etwas aus Sonne", () => {
    const hh: HouseholdProfile = { baseKwh: 3800, tagQuote: 0.30, wpActive: false, eaActive: false };
    const dull = simulateExampleDay({ kwp: 22, speicherKwh: 15, monthlyYieldPerKwp: null, ertragKwp: 950, household: hh }, EXAMPLE_DAYS[1].month, EXAMPLE_DAYS[1].dayType);
    const sunny = simulateExampleDay({ kwp: 22, speicherKwh: 15, monthlyYieldPerKwp: null, ertragKwp: 950, household: hh }, EXAMPLE_DAYS[0].month, EXAMPLE_DAYS[0].dayType);
    expect(dull.grid).toBeGreaterThan(sunny.grid); // trüber Tag → mehr Netzbezug
  });

  it("Eigenverbrauch sinkt mit der Anlagengröße und bleibt ≤ 100 %", () => {
    const hh = pureHH();
    const small = simulatePvYear({ kwp: 4, speicherKwh: 0, monthlyYieldPerKwp: null, ertragKwp: 950, household: hh }).selfConsumption;
    const big = simulatePvYear({ kwp: 16, speicherKwh: 0, monthlyYieldPerKwp: null, ertragKwp: 950, household: hh }).selfConsumption;
    expect(small).toBeGreaterThan(big);
    expect(small).toBeLessThanOrEqual(100);
  });
});
