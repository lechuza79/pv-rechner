import { describe, expect, it } from "vitest";
import { orderFundingEntries, fundingExampleAmount, type FundingOverviewEntry } from "../funding-overview";
import { FUNDING_PROGRAMS } from "../funding-programs";
import { fundingCalculatorHref } from "../funding-calculator-links";

const entry = (id: string, amount: number | null, agsCode = "07335049"): FundingOverviewEntry => ({ id, name: id, agsCode, technologies: ["pv"], amounts: { pv: amount, balkon: null, waermepumpe: null } });
describe("funding overview comparison", () => {
  it("keeps unknown amounts after known zeroes and orders comparable amounts descending", () => {
    expect(orderFundingEntries([entry("unknown", null), entry("zero", 0), entry("small", 100), entry("large", 500)], "pv", "amount").map(p => p.id)).toEqual(["large", "small", "zero", "unknown"]);
  });
  it("uses exact municipal membership, while including county and state programmes", () => {
    const association = { ...entry("association", null), agsCode: undefined, agsCodes: ["07335049", "07335007"] };
    const result = orderFundingEntries([entry("neighbour", 999, "07335048"), entry("county", 100, "07335"), entry("state", 200, "07"), association], "pv", "amount", "07335049");
    expect(result.map(p => p.id)).toEqual(["state", "county", "association"]);
    expect(orderFundingEntries([association], "pv", "amount", "07335048")).toEqual([]);
  });
  it("does not mix technologies or invent a euro amount for annual prize points", () => {
    expect(orderFundingEntries([entry("pv", 100)], "balkon", "amount")).toEqual([]);
    const p = FUNDING_PROGRAMS["vg-weilerbach-meilenstein-preisgeld"];
    expect(fundingExampleAmount(p, "pv")).toBeNull();
    expect(fundingExampleAmount(p, "waermepumpe")).toBeNull();
    expect(fundingCalculatorHref(p, "waermepumpe")).toBe("/waermepumpe-rechner");
    expect(fundingCalculatorHref(p, "pv")).toBe("/photovoltaik-rechner");
  });
});
