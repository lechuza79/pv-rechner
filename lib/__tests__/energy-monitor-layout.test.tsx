import {describe, expect, it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {EnergyMonitor} from "../../components/dashboard/EnergyMonitor";

describe("Shared municipality monitor composition", () => {
  it("keeps the accepted order regardless of adapter prop order", () => {
    const html = renderToStaticMarkup(<EnergyMonitor energy={{radial:<div>radial-widget</div>,"electricity-value":<div>energy-widget</div>}} stock={<div>stock-widget</div>} growth={<div>growth-widget</div>} currentPower={<div>live-widget</div>} kpis={<div>kpi-widget</div>} map={<div>map-widget</div>}/>);
    const order = ["kpi-widget", "live-widget", "growth-widget", "Anlagenbestand", "stock-widget", "Strom und Wert", "energy-widget", "radial-widget", "map-widget"].map(text => html.indexOf(text));
    expect(order.every(index => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a,b) => a-b));
  });
  it("omits unavailable capabilities without empty headings and retains missing-data explanations", () => {
    const html = renderToStaticMarkup(<EnergyMonitor growth={<div>growth-widget</div>} energyNotice={<p>Missing weather</p>}/>);
    expect(html).not.toContain("Anlagenbestand");
    expect(html).toContain("Strom und Wert");
    expect(html).toContain("Missing weather");
    expect(html.match(/sc-widget-grid/g)).toHaveLength(1);
  });
});
