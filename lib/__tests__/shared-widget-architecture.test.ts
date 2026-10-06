import {describe, expect, it} from 'vitest';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const root = join(__dirname, '../..');
const read = (path:string) => readFileSync(join(root,path),'utf8');
// These dependencies are product contracts: changing a page must not fork an
// accepted drawing, interaction, source footer, or export pipeline.
const consumers: Record<string,string[]> = {
  'components/FlowNav.tsx':['./calculator/usePageActionLayout','./Modal','./ActionButton'],
  'components/AffiliateActions.tsx':['./ActionButton'],
  'components/calculator/ResultActions.tsx':['../ActionButton'],
  'components/SecondaryButton.tsx':['./ActionButton'],
  'components/KlebenderKnopf.tsx':['./calculator/usePageActionLayout'],
  'components/StickyCta.tsx':['./calculator/usePageActionLayout'],
  'components/Toast.tsx':['./calculator/usePageActionLayout'],
  'components/PvConsumerSection.tsx':['./PvConsumerFields','./PvConsumerComparison','./ResultChoiceHeader','./KlebenderKnopf','../lib/pv-consumer-model'],
  'components/PvConsumerExample.tsx':['./PvConsumerSection','./ResultSettings','./PvPlantFields'],
  'app/(site)/photovoltaik-rechner/rechner.tsx':['../../../components/PvConsumerSection','../../../components/PvPlantFields'],
  'lib/prices-config.ts':['./electricity-projection'],
  'lib/constants.ts':['./electricity-projection'],
  'lib/heatpump-config.ts':['./electricity-projection'],
  'lib/balkon.ts':['./electricity-projection','./balkon-sim'],
  'lib/calc.ts':['./electricity-projection'],
  'lib/kostenrennen.ts':['./electricity-projection'],
  'components/WpGeraeteEmpfehlung.tsx':['./AffiliateTrust','./AffiliateActions','./AffiliateCarousel','./AffiliateDetails'],
  'components/BalkonAngebot.tsx':['./AffiliateTrust','./AffiliateActions','./AffiliateCarousel','./AffiliateDetails'],
  'components/dashboard/ExportableWidgetFrame.tsx':['./WidgetFrame','../ChartOptionsMenu','../Modal','../WidgetExport','../../lib/useChartExport','../../lib/chart-animation-export'],
  'components/dashboard/WidgetFrame.tsx':['../InfoTooltip'],
  'components/GlossaryTerm.tsx':['./InfoTooltip'],
  'components/InfoTooltipBindings.tsx':['./InfoTooltip'],
  'components/gemeinde/GemeindeMonitor.tsx':['../dashboard/EnergyMonitor','../dashboard/KpiOverview','../charts/AnnualGrowthWidget','../charts/CurrentPowerWidget','../charts/CompositionChart','../dashboard/ExportableWidgetFrame'],
  'components/landkreis/LandkreisMonitor.tsx':['../dashboard/EnergyMonitor','../dashboard/KpiOverview','../charts/AnnualGrowthWidget','../charts/CurrentPowerWidget','../charts/CompositionChart','../dashboard/ExportableWidgetFrame'],
  'components/landkreis/DistrictRaceWidget.tsx':['../dashboard/ExportableWidgetFrame'],
  'components/landkreis/DistrictEnergyWidgets.tsx':['../dashboard/ExportableWidgetFrame'],
  'components/gemeinde/MonitorMonthlySolarChart.tsx':['../charts/MonthlySolarRadial','../dashboard/WidgetSetting'],
  'components/social/MonthlySolarChart.tsx':['../charts/MonthlySolarRadial'],
  'components/gemeinde/MonitorAnnualEnergyChart.tsx':['../charts/EnergyYearRadial','../dashboard/WidgetSetting'],
  'components/social/AnnualEnergyChart.tsx':['../charts/EnergyYearRadial'],
  'components/social/ApprovedStoryVisual.tsx':['../charts/CompositionChart'],
  'components/landkreis/LandkreisSeite.tsx':['./RegionKarte'],
};
function files(dir:string):string[] {
  return readdirSync(join(root,dir),{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(`${dir}/${item.name}`):/\.[jt]sx?$/.test(item.name)?[`${dir}/${item.name}`]:[]);
}
describe('Shared widget architecture',()=>{
  for(const [consumer,dependencies] of Object.entries(consumers))it(`${consumer} keeps the shared implementation`,()=>{
    const source=read(consumer);
    const imports=[...source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(match=>match[1]);
    for(const dependency of dependencies)expect(imports,`Reuse ${dependency}; add options there instead of copying its implementation.`).toContain(dependency);
  });
  it('keeps monitor sections in the shared composition',()=>{
    for (const path of ['components/gemeinde/GemeindeMonitor.tsx','components/landkreis/LandkreisMonitor.tsx']) {
      expect(read(path)).not.toMatch(/className="sc-widget-grid"|<h3>Anlagenbestand|<h3>Strom und Wert/);
    }
  });
  it('keeps menu rendering and video encoding out of individual widgets',()=>{
    const violations= ['components/gemeinde','components/landkreis','components/charts'].flatMap(files).filter(path=>
      /\brole\s*=\s*["']menu(?:item)?["']|new\s+MediaRecorder\b/.test(read(path))
    );
    expect(violations,'Use ExportableWidgetFrame and its shared actions.').toEqual([]);
  });
});
