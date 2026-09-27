import React from "react";
import { afterAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HeatPumpInvestmentAssumptions from "../../components/HeatPumpInvestmentAssumptions";

vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

const defaults = {
  wpInvestment: 14000,
  fuelKind: "gas" as const, wpType: "lwwp" as const, heatLoadKw: 8.4, costClassKw: 7.1,
  referenceInvestment: 15900,
  referenceLabel: "Gasheizung",
  wpInvestmentEntered: false,
  referenceInvestmentEntered: false,
  onWpInvestmentChange: () => {},
  onReferenceInvestmentChange: () => {},
};

describe("building comparison investment assumptions", () => {
  it("shows the displayed investment amounts and distinguishes the two estimates", () => {
    const html = renderToStaticMarkup(<HeatPumpInvestmentAssumptions {...defaults} />);
    expect(html).toContain("14.000");
    expect(html).toContain("15.900");
    expect(html).toContain("Anlage und Basismontage mit der Größe");
    expect(html).toContain("Unter 10 kW verwenden wir dieselbe kleine Kostenreferenz");
    expect(html).toContain("Kosten und Förderung der Dämmung sind nicht enthalten");
  });

  it("does not claim a manually entered heat pump price scales with capacity", () => {
    const html = renderToStaticMarkup(<HeatPumpInvestmentAssumptions {...defaults}
      wpInvestmentEntered referenceInvestmentEntered referenceLabel="Ölheizung" fuelKind="oil" />);
    expect(html).toContain("Wärmepumpenpreis bleibt für alle Dämmvarianten gleich");
    expect(html).toContain("eingetragener Preis für die Ölheizung");
    expect(html).not.toContain("Bei der Wärmepumpe ändern sich");
    expect(html).not.toContain("pauschale Anschaffungspreis");
    expect(html).not.toContain("Gasheizung");
  });

  it("preserves zero as continued operation, including an entered zero WP price", () => {
    const html = renderToStaticMarkup(<HeatPumpInvestmentAssumptions {...defaults}
      wpInvestment={0} wpInvestmentEntered referenceInvestment={0} referenceInvestmentEntered />);
    expect(html).toContain("Weiterbetrieb deiner Gasheizung");
    expect(html).toContain("ohne Neuanschaffung");
    expect(html).not.toContain("neue Gasheizung");
    expect(html).not.toContain("15.900");
    expect(html).not.toContain("14.000");
  });
});
