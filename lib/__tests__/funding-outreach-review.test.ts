import { describe, expect, it } from "vitest";
import { fundingAmount, fundingForAgs, getFundingProgram, stackFunding, type FundingAnlage } from "../funding-programs";
import { ATLAS_CITIES, fundingFor } from "../atlas-cities";
const today = "2026-09-16";
const balcony: FundingAnlage = { technik: "balkon", wattPeak: 800, kosten: 600, speicherKwh: 0 };
const roof: FundingAnlage = { technik: "pv", kwp: 8, speicherKwh: 6, kosten: 24000 };
const verified = (id: string) => ({ ...getFundingProgram(id)!, lastVerified: today });
describe("Municipal grants from the outreach source review", () => {
  it.each([["minden-klimaplus", 75], ["kirchlengern-pv-kleinanlagen", 250], ["eppelheim-balkonkraftwerke", 75], ["luedinghausen-klimaschutzfonds", 300]])("calculates the supported household grant for %s", (id, amount) => {
    expect(fundingAmount(verified(String(id)), balcony, today)).toEqual({ total: amount, computable: true, active: true });
  });
  it("caps Lüdinghausen including an eligible balcony battery", () => {
    expect(fundingAmount(verified("luedinghausen-klimaschutzfonds"), { ...balcony, kosten: 1800, speicherKwh: 2 }, today).total).toBe(500);
  });
  it("calculates Idstein roof and stationary storage separately", () => {
    expect(fundingAmount(verified("idstein-klimaschutz"), roof, today).total).toBe(1400);
    expect(fundingAmount(verified("idstein-klimaschutz"), { ...roof, kwp: 30, speicherKwh: 20 }, today).total).toBe(2000);
  });
  it("enforces Flörsheim's minimum and cap", () => {
    for (const [kwp, amount] of [[1.9, 0], [2, 200], [5, 500], [15, 500]]) expect(fundingAmount(verified("floersheim-photovoltaik"), { ...roof, kwp }, today).total).toBe(amount);
  });
  it.each(["radolfzell-sonnige-zukunft", "wolfratshausen-pv", "idstein-klimaschutz", "sandhausen-foerderprogramme"])("does not subsidize an unseparated battery cost in %s", id => {
    expect(fundingAmount(verified(id), { ...balcony, kosten: 2000, speicherKwh: 2 }, today).computable).toBe(false);
  });
  it.each(["wendlingen-energie", "haltern-klimafonds-balkon", "erkelenz-klimaschutz"])("does not promise an unconditional balcony grant for %s", id => {
    expect(fundingAmount(verified(id), balcony, today).computable).toBe(false);
  });
  it.each(["salzkotten-klimaschutz", "minden-klimaplus", "wendlingen-energie"])("does not subtract a heat-pump grant without its prerequisites in %s", id => {
    expect(fundingAmount(verified(id), { technik: "waermepumpe", kosten: 30000 }, today).computable).toBe(false);
  });
  it("does not turn restricted storage or planning grants into ordinary roof grants", () => {
    for (const id of ["schwandorf-klimaschutz", "wolfratshausen-pv", "luebeck-solargruendach", "vaterstetten-pv-begleitung", "recklinghausen-stecker-solar", "unterhaching-energiesparen"]) expect(fundingAmount(verified(id), roof, today).computable, id).toBe(false);
  });
  it("requires official verification before reducing the price", () => {
    const p = getFundingProgram("kirchlengern-pv-kleinanlagen")!;
    expect(stackFunding([p], balcony, today).total).toBe(0);
    expect(stackFunding([verified(p.id)], balcony, today).total).toBe(250);
  });
  it("does not leak grants to a neighbouring municipality", () => {
    expect(fundingForAgs("05758020").map(p => p.id)).toContain("kirchlengern-pv-kleinanlagen");
    expect(fundingForAgs("05758036").map(p => p.id)).not.toContain("kirchlengern-pv-kleinanlagen");
  });
  it("keeps Recklinghausen's existing page unambiguous after adding storage", () => {
    const p = fundingFor(ATLAS_CITIES.find(c => c.slug === "recklinghausen")!)!;
    expect(p.id).toBe("recklinghausen-stecker-solar");
    expect(p.foerdert).toEqual(expect.arrayContaining(["pv", "balkon"]));
  });
  it("never reactivates closed rounds or interprets purchase prices as watts", () => {
    for (const id of ["meschede-balkon-speicher", "bergkamen-balkon", "pfaffenhofen-balkon", "ingelheim-photovoltaik", "verl-nachhaltigkeit", "eschborn-klimaschutz", "delmenhorst-balkon-solar"]) expect(stackFunding([verified(id)], balcony, today).total, id).toBe(0);
    expect(fundingAmount(verified("delmenhorst-balkon-solar"), { ...balcony, kosten: 250 }, today).computable).toBe(false);
  });
});
