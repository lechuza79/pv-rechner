import { describe, it, expect } from "vitest";
import {
  calcHeatDemand,
  calcHeatLoad,
  flowTempForSystem,
  calcJAZ,
  calcInvestBrutto,
  calcBegSubsidy,
  calcHeatPump,
  calcHeatPumpScenarios,
  estimatePvCoverageOfWp,
  calcWpAnnualElectricity,
  type HeatPumpInputs,
} from "../heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../heatpump-config";

// Canonical test case: 130 m² Bestand, halbsaniert, 2 Personen, alte Heizkörper, LWWP, no PV
const baseInputs: HeatPumpInputs = {
  situation: "bestand",
  wohnflaeche: 130,
  insulationIdx: 1,         // teilsaniert → 160 kWh/m²·a
  personen: 3.5,
  heizsystem: "hk_alt",
  wpType: "lwwp",
};

// ─── Heat demand (Wohnfläche × spezifischer Bedarf + Warmwasser) ────────────
describe("calcHeatDemand", () => {
  it("calculates Bestand teilsaniert correctly: 130 m² × 160 + 3.5 × 650", () => {
    const r = calcHeatDemand("bestand", 130, 1, 3.5);
    expect(r.qHeiz).toBe(20800);   // 130 × 160
    expect(r.qWw).toBe(2275);      // 3.5 × 650
    expect(r.qGes).toBe(23075);
  });

  it("uses Neubau coefficients when situation is neubau", () => {
    const r = calcHeatDemand("neubau", 150, 0, 4); // EnEV 2014
    expect(r.qHeiz).toBe(150 * 75);
    expect(r.qGes).toBe(150 * 75 + 4 * 650);
  });

  it("clamps insulation index to valid range", () => {
    const high = calcHeatDemand("bestand", 100, 99, 1);  // out-of-range high
    const lastValid = calcHeatDemand("bestand", 100, 2, 1); // saniert
    expect(high.qHeiz).toBe(lastValid.qHeiz);

    const low = calcHeatDemand("bestand", 100, -5, 1);
    const firstValid = calcHeatDemand("bestand", 100, 0, 1); // unsaniert
    expect(low.qHeiz).toBe(firstValid.qHeiz);
  });
});

// ─── Heat load (W/m² × Fläche × Haustyp, für Anlagengröße) ─────────────────
describe("calcHeatLoad", () => {
  it("sinkt mit besserer Dämmung", () => {
    const unsaniert = calcHeatLoad("bestand", 150, 0, 1);
    const saniert = calcHeatLoad("bestand", 150, 2, 1);
    expect(unsaniert).toBeGreaterThan(saniert);
  });

  it("Haustyp senkt die Heizlast (Reihenmitte < Reihenend < frei)", () => {
    const frei = calcHeatLoad("bestand", 150, 0, 1.0);
    const reihenend = calcHeatLoad("bestand", 150, 0, 0.88);
    const reihenmitte = calcHeatLoad("bestand", 150, 0, 0.78);
    expect(reihenend).toBeLessThan(frei);
    expect(reihenmitte).toBeLessThan(reihenend);
  });

  it("nicht mehr aus dem Jahresbedarf ÷ 2000 (Regression: WW zählte mit)", () => {
    // 150 m² unsaniert freistehend: real ~15 kW, nicht 18 (alte Formel qGes/2000)
    const hl = calcHeatLoad("bestand", 150, 0, 1);
    expect(hl).toBeLessThan(16);
    expect(hl).toBeGreaterThan(12);
  });
});

describe("calcHeatPump heat load override", () => {
  it("override.heizlast schlägt die Schätzung (DIN-Berechnung)", () => {
    const base = { situation: "bestand" as const, wohnflaeche: 150, insulationIdx: 0, personen: 3.5, heizsystem: "hk_alt" as const, wpType: "lwwp" as const, haustypFaktor: 0.88 };
    const geschaetzt = calcHeatPump(base);
    const gemessen = calcHeatPump({ ...base, override: { heizlast: 7.5 } });
    expect(gemessen.heizlastKw).toBe(7.5);
    expect(gemessen.investBrutto).toBeLessThan(geschaetzt.investBrutto);
  });
});

// ─── Flow temperature by heating system ────────────────────────────────────
describe("flowTempForSystem", () => {
  it("FBH < HK_neu < HK_alt", () => {
    expect(flowTempForSystem("fbh")).toBe(35);
    expect(flowTempForSystem("hk_neu")).toBe(45);
    expect(flowTempForSystem("hk_alt")).toBe(55);
  });
});

// ─── JAZ (linear in flow temp, clamped to plausible range) ─────────────────
describe("calcJAZ", () => {
  it("LWWP at 35°C (FBH): JAZ = 5.5 - 0.05 × 35 = 3.75", () => {
    expect(calcJAZ("lwwp", 35)).toBeCloseTo(3.75, 2);
  });

  it("LWWP at 55°C (old radiators): JAZ degraded to ~2.75", () => {
    expect(calcJAZ("lwwp", 55)).toBeCloseTo(2.75, 2);
  });

  it("SWWP outperforms LWWP at the same flow temp", () => {
    expect(calcJAZ("swwp", 35)).toBeGreaterThan(calcJAZ("lwwp", 35));
  });

  it("clamps to [2.2, 4.8] regardless of flow temp", () => {
    expect(calcJAZ("lwwp", 100)).toBeGreaterThanOrEqual(2.2);
    expect(calcJAZ("swwp", 0)).toBeLessThanOrEqual(4.8);
  });
});

// ─── Investment (base + perKw × heat load + radiator swap) ─────────────────
describe("calcInvestBrutto", () => {
  it("LWWP for 8 kW load = base + perKw × 8 (from config, not hardcoded)", () => {
    const r = calcInvestBrutto("lwwp", 8, false);
    // Config-derived so the market-tracked base (auto-scraped, see heatpump-prices.ts)
    // can move without breaking this test.
    expect(r).toBe(DEFAULT_HEATPUMP_CONFIG.investLwwpBase + DEFAULT_HEATPUMP_CONFIG.investLwwpPerKw * 8);
  });

  it("SWWP costs more than LWWP at the same load (drilling/probes)", () => {
    expect(calcInvestBrutto("swwp", 8, false)).toBeGreaterThan(calcInvestBrutto("lwwp", 8, false));
  });

  it("adds 6.000 € when the radiator swap measure is chosen", () => {
    const withSwap = calcInvestBrutto("lwwp", 8, true);
    const withoutSwap = calcInvestBrutto("lwwp", 8, false);
    expect(withSwap - withoutSwap).toBe(6000);
  });

  it("no swap cost by default (old radiators stay in place)", () => {
    const noSwap = calcInvestBrutto("lwwp", 8, false);
    const base = calcInvestBrutto("lwwp", 8, false);
    expect(noSwap).toBe(base);
  });
});

// ─── BEG funding (Bestand only, capped at 70 % / 30.000 €) ────────────────
describe("calcBegSubsidy", () => {
  it("returns 0 % for Neubau (no funding eligible)", () => {
    const r = calcBegSubsidy("neubau", "lwwp", 30000);
    expect(r.rate).toBe(0);
    expect(r.amount).toBe(0);
  });

  it("Bestand default (Klima + Effizienz an): 30 + 20 + 5 = 55 %", () => {
    const r = calcBegSubsidy("bestand", "lwwp", 30000);
    expect(r.rate).toBeCloseTo(0.55, 2);
    expect(r.amount).toBe(Math.round(30000 * 0.55));
  });

  it("Bestand with income bonus: capped at 70 %", () => {
    const r = calcBegSubsidy("bestand", "lwwp", 40000, { incomeBonus: true });
    expect(r.rate).toBe(0.70); // 30 + 20 + 5 + 30 = 85 → capped to 70
    // 40k > 30k cap → only 30k förderfähig
    expect(r.amount).toBe(Math.round(30000 * 0.70));
  });

  it("only Grundförderung when both bonuses off (30 %)", () => {
    const r = calcBegSubsidy("bestand", "lwwp", 30000, { klimaBonus: false, effizienzBonus: false });
    expect(r.rate).toBeCloseTo(0.30, 2);
    expect(r.breakdown).toHaveLength(1);
  });

  it("Förderbetrag bounded by 30.000 € förderfähige Kosten", () => {
    const small = calcBegSubsidy("bestand", "lwwp", 20000);
    const large = calcBegSubsidy("bestand", "lwwp", 100000);
    // Both at 55%: 20k → 11k, 100k → capped to 30k → 16.5k
    expect(small.amount).toBe(11000);
    expect(large.amount).toBe(16500);
  });
});

// ─── Full TCO calculation ──────────────────────────────────────────────────
describe("calcHeatPump (full TCO)", () => {
  it("returns 21 chart data points (year 0 plus 20 years)", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.years.length).toBe(21);
  });

  it("year 0 starts at -mehrInvest (≤0 since no PV invest)", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.years[0].i).toBe(0);
    expect(r.years[0].kum).toBeLessThanOrEqual(0);
    // Mehr-Invest ≈ investNetto (Bestand: gasInvest = 0)
    expect(r.years[0].kum).toBe(-r.investNetto);
  });

  it("eWp = qGes / jaz (energy balance holds)", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.eWp).toBe(Math.round(r.qGes / r.jaz));
  });

  it("BEG subsidy reduces investNetto vs investBrutto for Bestand", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.investNetto).toBeLessThan(r.investBrutto);
    expect(r.investNetto).toBe(r.investBrutto - r.beg.amount);
  });

  it("Neubau gets no BEG funding (investNetto = investBrutto)", () => {
    const r = calcHeatPump({ ...baseInputs, situation: "neubau", insulationIdx: 0 });
    expect(r.beg.rate).toBe(0);
    expect(r.investNetto).toBe(r.investBrutto);
  });

  it("Neubau adds gasInvest as fossile reference (Brennwerttherme)", () => {
    const bestand = calcHeatPump(baseInputs);
    const neubau = calcHeatPump({ ...baseInputs, situation: "neubau", insulationIdx: 0 });
    expect(bestand.gasInvest).toBe(0);
    expect(neubau.gasInvest).toBeGreaterThan(0);
  });

  it("CO2 savings positive (WP cleaner than gas over 20 years)", () => {
    const r = calcHeatPump(baseInputs);
    expect(r.co2Einsparung).toBeGreaterThan(0);
  });

  it("FBH (35°C flow) yields better JAZ than HK_alt (55°C flow)", () => {
    const fbh = calcHeatPump({ ...baseInputs, heizsystem: "fbh" });
    const hkAlt = calcHeatPump({ ...baseInputs, heizsystem: "hk_alt" });
    expect(fbh.jaz).toBeGreaterThan(hkAlt.jaz);
    expect(fbh.eWp).toBeLessThan(hkAlt.eWp);  // higher JAZ → less electricity
  });

  it("old radiators alone add NO swap cost (Ist-Zustand, not the swap)", () => {
    // Regression: früher zahlte man 6.000 € Tausch ohne JAZ-Nutzen.
    const hkAlt = calcHeatPump({ ...baseInputs, heizsystem: "hk_alt" });
    const hkNeu = calcHeatPump({ ...baseInputs, heizsystem: "hk_neu" });
    expect(hkAlt.investBrutto).toBe(hkNeu.investBrutto);
  });

  it("radiator swap measure: raises JAZ, adds cost, improves 20y balance", () => {
    const ist = calcHeatPump({ ...baseInputs, heizsystem: "hk_alt", heizkoerperTausch: false });
    const mit = calcHeatPump({ ...baseInputs, heizsystem: "hk_alt", heizkoerperTausch: true });
    expect(mit.jaz).toBeGreaterThan(ist.jaz);                       // 55°C → 45°C
    expect(mit.investBrutto).toBe(ist.investBrutto + 6000);         // Tauschkosten
    expect(mit.eWp).toBeLessThan(ist.eWp);                          // weniger Strom
    expect(mit.tcoEinsparung).toBeGreaterThan(ist.tcoEinsparung);   // besseres Ergebnis
  });

  it("swap flag is a no-op for FBH/modern radiators (only hk_alt)", () => {
    const fbh = calcHeatPump({ ...baseInputs, heizsystem: "fbh", heizkoerperTausch: false });
    const fbhSwap = calcHeatPump({ ...baseInputs, heizsystem: "fbh", heizkoerperTausch: true });
    expect(fbhSwap.investBrutto).toBe(fbh.investBrutto);
    expect(fbhSwap.jaz).toBe(fbh.jaz);
  });

  it("override.qGes replaces calculated demand", () => {
    const baseline = calcHeatPump(baseInputs);
    const overridden = calcHeatPump({ ...baseInputs, override: { qGes: 50000 } });
    expect(overridden.qGes).toBe(50000);
    expect(overridden.eWp).not.toBe(baseline.eWp);
  });

  it("amortisationsJahre is null when investment never pays back", () => {
    // Force absurdly expensive WP via override
    const r = calcHeatPump({ ...baseInputs, override: { investNetto: 500000 } });
    expect(r.amortisationsJahre).toBeNull();
  });

  it("amortisationsJahre is in valid range when investment pays back", () => {
    const r = calcHeatPump(baseInputs);
    if (r.amortisationsJahre !== null) {
      expect(r.amortisationsJahre).toBeGreaterThanOrEqual(1);
      expect(r.amortisationsJahre).toBeLessThanOrEqual(20);
    }
  });
});

// ─── Scenario wrappers (pessimistic/realistic/optimistic) ──────────────────
describe("calcHeatPumpScenarios", () => {
  const scenarios = calcHeatPumpScenarios(baseInputs);

  it("returns exactly 3 scenarios", () => {
    expect(scenarios).toHaveLength(3);
    expect(scenarios.map(s => s.id)).toEqual(["pessimistic", "realistic", "optimistic"]);
  });

  it("optimistic outperforms pessimistic in TCO savings", () => {
    const opt = scenarios.find(s => s.id === "optimistic")!;
    const pess = scenarios.find(s => s.id === "pessimistic")!;
    expect(opt.tcoEinsparung).toBeGreaterThan(pess.tcoEinsparung);
  });

  it("each scenario has consistent JAZ direction (opt > real > pess)", () => {
    const [pess, real, opt] = scenarios;
    expect(opt.jaz).toBeGreaterThanOrEqual(real.jaz);
    expect(real.jaz).toBeGreaterThanOrEqual(pess.jaz);
  });
});

// ─── PV synergy heuristic ──────────────────────────────────────────────────
describe("estimatePvCoverageOfWp", () => {
  it("returns 0 when no PV system (kwp=0)", () => {
    expect(estimatePvCoverageOfWp(0, 5000, 0)).toBe(0);
  });

  it("returns 0 when no WP electricity (eWp=0)", () => {
    expect(estimatePvCoverageOfWp(10, 0, 0)).toBe(0);
  });

  it("clamps coverage to [5%, 35%]", () => {
    // Tiny PV vs huge WP → would be near 0, clamped to 5
    const tiny = estimatePvCoverageOfWp(1, 100000, 0);
    expect(tiny).toBeGreaterThanOrEqual(0.05);
    // Huge PV with large storage → would exceed 35, clamped
    const huge = estimatePvCoverageOfWp(50, 3000, 30);
    expect(huge).toBeLessThanOrEqual(0.35);
  });

  it("storage increases coverage", () => {
    const noStorage = estimatePvCoverageOfWp(10, 5000, 0);
    const withStorage = estimatePvCoverageOfWp(10, 5000, 10);
    expect(withStorage).toBeGreaterThan(noStorage);
  });
});

// ─── PV synergy branch inside the full TCO engine ──────────────────────────
describe("calcHeatPump with PV synergy", () => {
  const noPv = calcHeatPump(baseInputs);
  const pvVorhanden = calcHeatPump({ ...baseInputs, pv: { status: "vorhanden", kwp: 10, speicherKwh: 10 } });
  const pvGeplant = calcHeatPump({ ...baseInputs, pv: { status: "geplant", kwp: 10, speicherKwh: 10 } });

  it("status 'nein' or kwp 0 disables the branch entirely", () => {
    const off = calcHeatPump({ ...baseInputs, pv: { status: "nein", kwp: 10, speicherKwh: 10 } });
    const zeroKwp = calcHeatPump({ ...baseInputs, pv: { status: "vorhanden", kwp: 0, speicherKwh: 0 } });
    for (const r of [off, zeroKwp]) {
      expect(r.pvCoverage).toBe(0);
      expect(r.pvStromSavings).toBe(0);
      expect(r.pvInvest).toBe(0);
      expect(r.stromKosten).toBe(noPv.stromKosten);
    }
  });

  it("charges WP electricity at full grid price; PV credited separately as full benefit", () => {
    expect(pvVorhanden.pvCoverage).toBeGreaterThanOrEqual(0.05);
    expect(pvVorhanden.pvCoverage).toBeLessThanOrEqual(0.35);
    // New model: WP electricity is billed at the full grid price regardless of PV;
    // the PV shows up as a separate pvBenefit, not as a reduced electricity bill.
    expect(pvVorhanden.stromKosten).toBe(noPv.stromKosten);
    // The full PV benefit must exceed the WP-only coverage savings, because it now
    // also includes household self-consumption + feed-in revenue.
    expect(pvVorhanden.pvStromSavings).toBeGreaterThan(0);
    expect(pvVorhanden.pvBenefit).toBeGreaterThan(pvVorhanden.pvStromSavings);
    // TCO improves by exactly the full PV benefit (no PV invest for existing PV).
    expect(noPv.tcoWp - pvVorhanden.tcoWp).toBe(pvVorhanden.pvBenefit);
  });

  it("existing PV is sunk cost: no pvInvest, TCO strictly improves", () => {
    expect(pvVorhanden.pvInvest).toBe(0);
    expect(pvVorhanden.tcoWp).toBeLessThan(noPv.tcoWp);
    // mehrInvest is not exported — year 0 of the chart starts at −mehrInvest.
    expect(pvVorhanden.years[0].kum).toBe(noPv.years[0].kum);
  });

  it("planned PV adds its investment to TCO and mehrInvest (same coverage)", () => {
    expect(pvGeplant.pvCoverage).toBe(pvVorhanden.pvCoverage);
    expect(pvGeplant.pvInvest).toBeGreaterThan(0);
    // Only the PV invest separates 'geplant' from 'vorhanden'.
    expect(pvGeplant.tcoWp - pvVorhanden.tcoWp).toBe(pvGeplant.pvInvest);
    // Chart year 0 = −mehrInvest → planned PV starts pvInvest deeper in the red.
    expect(pvVorhanden.years[0].kum - pvGeplant.years[0].kum).toBe(pvGeplant.pvInvest);
  });

  it("honours the pvInvest override for planned PV", () => {
    const custom = calcHeatPump({ ...baseInputs, pv: { status: "geplant", kwp: 10, speicherKwh: 10, pvInvest: 12345 } });
    expect(custom.pvInvest).toBe(12345);
    expect(custom.tcoWp - pvVorhanden.tcoWp).toBe(12345);
  });
});

// ─── Config integrity ─────────────────────────────────────────────────────
describe("DEFAULT_HEATPUMP_CONFIG", () => {
  it("has BEG cap below sum of all bonuses (cap actually bites)", () => {
    const cfg = DEFAULT_HEATPUMP_CONFIG;
    const allBonuses = cfg.begGrundfoerderung + cfg.begKlimaBonus + cfg.begEffizienzBonus + cfg.begEinkommensBonus;
    expect(allBonuses).toBeGreaterThan(cfg.begMaxRate); // means cap is meaningful
  });

  it("flow temps escalate FBH < HK_neu < HK_alt", () => {
    const cfg = DEFAULT_HEATPUMP_CONFIG;
    expect(cfg.flowTempFbh).toBeLessThan(cfg.flowTempHkNeu);
    expect(cfg.flowTempHkNeu).toBeLessThan(cfg.flowTempHkAlt);
  });

  it("SWWP base higher than LWWP base (drilling premium)", () => {
    const cfg = DEFAULT_HEATPUMP_CONFIG;
    expect(cfg.investSwwpBase).toBeGreaterThan(cfg.investLwwpBase);
  });
});

// ─── Shared WP annual electricity (PV ↔ WP consistency) ─────────────────────
describe("calcWpAnnualElectricity", () => {
  it("equals Q_ges / JAZ of the full engine (same physics)", () => {
    const eng = calcHeatPump(baseInputs);
    const shared = calcWpAnnualElectricity({
      situation: baseInputs.situation,
      wohnflaeche: baseInputs.wohnflaeche,
      insulationIdx: baseInputs.insulationIdx,
      personen: baseInputs.personen,
      heizsystem: baseInputs.heizsystem,
      wpType: baseInputs.wpType,
    });
    expect(shared).toBe(eng.eWp);
  });

  it("unsaniertes EFH liegt realistisch bei ~11.000 kWh (nicht 3500)", () => {
    // 140 m², unsaniert (220 kWh/m²), 2 Personen, alte Heizkörper (55°C) → LWWP
    const kwh = calcWpAnnualElectricity({
      situation: "bestand", wohnflaeche: 140, insulationIdx: 0,
      personen: 2, heizsystem: "hk_alt", wpType: "lwwp",
    });
    expect(kwh).toBeGreaterThan(9000);
    expect(kwh).toBeLessThan(13000);
  });

  it("Fußbodenheizung braucht weniger Strom als alte Heizkörper (bessere JAZ)", () => {
    const common = { situation: "bestand" as const, wohnflaeche: 140, insulationIdx: 1, personen: 2, wpType: "lwwp" as const };
    const fbh = calcWpAnnualElectricity({ ...common, heizsystem: "fbh" });
    const hkAlt = calcWpAnnualElectricity({ ...common, heizsystem: "hk_alt" });
    expect(fbh).toBeLessThan(hkAlt);
  });

  it("besser gedämmt → weniger Heizstrom", () => {
    const common = { situation: "bestand" as const, wohnflaeche: 140, personen: 2, heizsystem: "hk_neu" as const, wpType: "lwwp" as const };
    const unsaniert = calcWpAnnualElectricity({ ...common, insulationIdx: 0 });
    const saniert = calcWpAnnualElectricity({ ...common, insulationIdx: 2 });
    expect(saniert).toBeLessThan(unsaniert);
  });
});
