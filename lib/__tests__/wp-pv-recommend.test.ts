import { describe, expect, it } from "vitest";
import { wpPvRecommendation } from "../wp-pv-recommend";
import { wpAusParametern, wpZuParametern, WP_STANDARD } from "../wp-share-state";
describe("heat pump to PV handoff", () => {
  it("uses the originating heating demand even for a non-standard house", () => {
    const context = { personen: 2, haustyp: 3, wohnflaeche: 220, annualKwh: 1234 };
    const r = wpPvRecommendation(context);
    expect(r.reasoning.wpConsumption).toBe(1234);
    expect(r.kwp).toBeGreaterThan(0);
    const noHeat = wpPvRecommendation({ ...context, annualKwh: 0 });
    expect(r.reasoning.totalConsumption - noHeat.reasoning.totalConsumption).toBe(1234);
  });
  it("keeps assumed and confirmed PV distinct in shared links", () => {
    for (const confirmed of [false, true]) {
      const state = { ...WP_STANDARD, pvStatus: "vorhanden" as const, pvConfirmed: confirmed, pvKwp: 8, pvSpeicher: 0 };
      expect(wpAusParametern(wpZuParametern(state)).pvConfirmed).toBe(confirmed);
    }
  });
});
