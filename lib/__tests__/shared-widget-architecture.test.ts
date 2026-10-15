import {describe, expect, it} from 'vitest';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const root = join(__dirname, '../..');
const read = (path:string) => readFileSync(join(root,path),'utf8');
// These dependencies are product contracts: changing a page must not fork an
// accepted drawing, interaction, source footer, or export pipeline.
const consumers: Record<string,string[]> = {
  "components/energy/StrommixRadarWidget.tsx":["../charts/RadarChart","../dashboard/ExportableWidgetFrame","../charts/ChartTimePlayback"],
  "app/(site)/strommix-deutschland/StrommixOverview.tsx":["../../../components/energy/StrommixRadarWidget"],
  "app/(site)/atomstrom-import/AtomstromPage.tsx":["../../../components/dashboard/EnergyMonitor","../../../components/DataSourcesSection","../../../components/MetricValue"],
  'components/FlowNav.tsx':['./calculator/usePageActionLayout','./Modal','./ActionButton'],
  'components/AffiliateActions.tsx':['./ActionButton'],
  'components/calculator/ResultActions.tsx':['../ActionButton'],
  'components/SecondaryButton.tsx':['./ActionButton'],
  'components/KlebenderKnopf.tsx':['./calculator/usePageActionLayout'],
  'components/StickyCta.tsx':['./calculator/usePageActionLayout'],
  'components/Toast.tsx':['./calculator/usePageActionLayout'],
  'components/social/StoryConceptLab.tsx':['../dashboard/MunicipalWidgetVisual'],
  'components/social/StoryIdeas.tsx':['../dashboard/MunicipalWidgetVisual'],
  'components/social/MunicipalChart.tsx':['../dashboard/MunicipalWidgetVisual'],
  'components/energy/FeedInTimelineEmbed.tsx':['../charts/FeedInTimelineWidget','../dashboard/WidgetReferenceData'],
  'components/charts/RaceChart.tsx':['../dashboard/ExportableWidgetFrame','../dashboard/WidgetPresentationContext','../../lib/chart-animation-export'],
  'components/energy/WorldElectricityRaceWidget.tsx':['../charts/RaceChart','../../lib/world-electricity-race'],
  'app/(site)/widget-galerie/WidgetGallery.tsx':['../../../components/dashboard/WidgetPreviewCard','../../../components/dashboard/WidgetConfigurationGroup','../../../components/SectionFilter','../../../components/OnsiteSearch'],
  'components/dashboard/WidgetPreviewCard.tsx':['../ControlPanel','../SelectField','./WidgetSettingsFlyout','../../lib/widget-appearance'],
  'components/dashboard/MicrochartEmbed.tsx':['../charts/WeatherMicroTile','../../lib/microchart-server','./WidgetPresentation'],
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
  'app/(embed)/embed/partner/[partner]/[...widget]/page.tsx':['../../../../../../components/gemeinde/GemeindeAnsicht','../../../../../../components/dashboard/WidgetPresentation','../../../../../../lib/municipal-widget-views'],
  'components/GlossaryTerm.tsx':['./InfoTooltip'],
  'components/InfoTooltipBindings.tsx':['./InfoTooltip'],
  'components/gemeinde/GemeindeMonitor.tsx':['../dashboard/EnergyMonitor','../dashboard/KpiOverview','../charts/AnnualGrowthWidget','../charts/CurrentPowerWidget','../charts/CompositionChart','../dashboard/ExportableWidgetFrame'],
  'components/landkreis/LandkreisMonitor.tsx':['../dashboard/EnergyMonitor','../dashboard/KpiOverview','../charts/AnnualGrowthWidget','../charts/CurrentPowerWidget','../charts/CompositionChart','../dashboard/ExportableWidgetFrame'],
  'components/landkreis/DistrictRaceWidget.tsx':['../dashboard/ExportableWidgetFrame'],
  'components/landkreis/DistrictEnergyWidgets.tsx':['../dashboard/ExportableWidgetFrame'],
  'components/gemeinde/MonitorMonthlySolarChart.tsx':['../charts/MonthlySolarRadial','../dashboard/WidgetSetting','../charts/RadialChartLayout'],
  'components/social/MonthlySolarChart.tsx':['../charts/MonthlySolarRadial'],
  'components/gemeinde/MonitorAnnualEnergyChart.tsx':['../charts/EnergyYearRadial','../dashboard/WidgetSetting'],
  'components/social/AnnualEnergyChart.tsx':['../charts/EnergyYearRadial'],
  'components/social/ApprovedStoryVisual.tsx':['../charts/CompositionChart'],
  'components/landkreis/LandkreisSeite.tsx':['./RegionKarte'],
  'components/StateElectricityMap.tsx':['./landkreis/RegionKarte','./dashboard/ExportableWidgetFrame','./Auswahl'],
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

// The state map must reuse established interaction and table presentation.
describe('state electricity component reuse',()=>{
 it('uses the shared selection and menu table rather than custom controls',()=>{
  const source=read('components/StateElectricityMap.tsx');
  expect(source).toContain('<Auswahl');
  expect(source).toContain('dataTable={dataTable}');
  expect(source).toContain('<ContentTable');
  expect(source).not.toMatch(/<details\b|<summary\b/);
 });
});

it('regional hourly mix reuses the central map, detail heading, frame and table',()=>{
 const source=read('components/RegionalHourlyMap.tsx');
 for(const dependency of ['./landkreis/RegionKarte','./charts/ChartDetailHeading','./dashboard/ExportableWidgetFrame','./ContentTable'])expect(source).toContain(dependency);
});
