import {describe, expect, it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {EnergyMonitor} from "../../components/dashboard/EnergyMonitor";
import {useWidgetHost, WidgetHostProvider} from "../../components/dashboard/WidgetHost";

function DetailScopeProbe() {
  return <output>{useWidgetHost()?.instanceId ?? 'stable-place-and-metric'}</output>;
}

describe("Shared municipality monitor composition", () => {
  it("preserves published municipal chart identities while keeping dashboard scopes", () => {
    const monitor = renderToStaticMarkup(<EnergyMonitor density="compact" energy={{radial:<DetailScopeProbe/>}}/>);
    expect(monitor).toContain('<output>stable-place-and-metric</output>');
    const dashboard = renderToStaticMarkup(<WidgetHostProvider instanceId="dashboard-second-solar" query={{}} appearance={{}}><DetailScopeProbe/></WidgetHostProvider>);
    expect(dashboard).toContain('<output>dashboard-second-solar</output>');
  });
  it("keeps the accepted order regardless of adapter prop order", () => {
    const html = renderToStaticMarkup(<EnergyMonitor density="compact" energy={{radial:<div>radial-widget</div>,"electricity-value":<div>energy-widget</div>}} stockItems={[{id:"stock",widgetId:"regional-composition",content:<div>stock-widget</div>}]} growth={<div>growth-widget</div>} currentPower={<div>live-widget</div>} kpis={<div>kpi-widget</div>} map={<div>map-widget</div>}/>);
    const order = ["kpi-widget", "live-widget", "growth-widget", "Anlagenbestand", "stock-widget", "Strom und Wert", "energy-widget", "radial-widget", "map-widget"].map(text => html.indexOf(text));
    expect(order.every(index => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a,b) => a-b));
    expect(html).toContain('data-widget-density="compact"');
    expect(html).not.toContain('data-widget-layout="allocated"');
  });
  it("omits unavailable capabilities without empty headings and retains missing-data explanations", () => {
    const html = renderToStaticMarkup(<EnergyMonitor growth={<div>growth-widget</div>} energyNotice={<p>Missing weather</p>}/>);
    expect(html).not.toContain("Anlagenbestand");
    expect(html).toContain("Strom und Wert");
    expect(html).toContain("Missing weather");
    expect(html.match(/data-responsive-composition/g)).toHaveLength(1);
  });
  it("supports light topic sections without inventing regional headings", () => {
    const html = renderToStaticMarkup(<EnergyMonitor scheme="light" topics={[{id:"imports", title:"Atomstrom im Überblick", layout:"pair", description:<p>Seven days and year to date</p>, widgets:<><div>Import value</div><div>Share chart</div></>}]} />);
    expect(html).toContain('data-story-scheme="light"');
    expect(html).toContain('aria-labelledby="imports-title"');
    expect(html).toContain('data-layout="pair"');
    expect(html).toContain('Seven days and year to date');
    expect(html.indexOf('Import value')).toBeLessThan(html.indexOf('Share chart'));
    expect(html).not.toContain('Anlagenbestand');
    expect(html).not.toContain('Strom und Wert');
  });

  it("gives each municipal stock card its own space, including repeated widget types", () => {
    const html = renderToStaticMarkup(<EnergyMonitor density="compact" stockItems={[
      {id:'solar-mix',widgetId:'regional-composition',content:<div>Solar mix</div>},
      {id:'buildings',widgetId:'gemeinde-anlagenraster',content:<div>Building plants</div>},
      {id:'balcony',widgetId:'gemeinde-anlagenraster',content:<div>Balcony plants</div>},
    ]}/>);
    const section = html.slice(html.indexOf('<section aria-label="Anlagenbestand"')).split('</section>')[0];
    expect(section.match(/data-widget-host="dashboard"/g)).toHaveLength(3);
    for (const id of ['solar-mix', 'buildings', 'balcony']) {
      expect(section).toContain(`data-composition-item="${id}"`);
    }
    for (const label of ['Solar mix', 'Building plants', 'Balcony plants']) {
      expect(section).toContain(label);
    }
  });
  it("retains the allocated layout for other monitor consumers", () => {
    const html = renderToStaticMarkup(<EnergyMonitor currentPower={<div>Existing power chart</div>} stock={<div>Existing regional stock</div>}/>);
    expect(html).toContain('data-widget-layout="allocated"');
    expect(html).not.toContain('data-widget-density');
    expect(html).toContain('Existing regional stock');
  });
  it("keeps a single stock embed unwrapped and reports missing stock", () => {
    const html = renderToStaticMarkup(<EnergyMonitor single="stock" stockItems={[{id:'stock',widgetId:'regional-composition',content:<article>Single chart</article>}]}/>);
    expect(html).toContain('<article>Single chart</article></div>');
    expect(html).not.toContain('data-responsive-composition');
    expect(html).not.toContain('data-widget-density');
    expect(renderToStaticMarkup(<EnergyMonitor single="stock" stockItems={[]}/>)).toContain('Für diesen Ort liegen noch keine Daten vor.');
  });
});
