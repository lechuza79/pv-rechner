import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import LandkreisMonitor from '../../components/landkreis/LandkreisMonitor';
import type {DistrictContent} from '../district-monitor-server';

const props={cells:[{region_id:"15",segment:"privat_dach",year:2026,count:15,kwp:100,kwh:0}],stand:'2026-09-10',population:1000,populationStand:'2026-06-30',regionId:'15',name:'Sachsen-Anhalt'};
const ready:DistrictContent['monitor']={status:'ready',registerStand:props.stand,sites:null,energy:null,history:{method:'active-register-by-commissioning-date',observations:[{end:'2026-08-31',solarCount:15,solarKwp:100,solarAdditions:2,batteryCount:3,batteryKwh:20,solarCounts:{},solarMix:[]}]}};
it('enables the shared live widget on regional pages',()=>{
  const html=renderToStaticMarkup(<LandkreisMonitor {...props} monitor={ready}/>);
  expect(html).toContain('Letzte 12 Monate');
  expect(html).toContain('Solarleistung heute');
  expect(renderToStaticMarkup(<LandkreisMonitor {...props} regionId="09679" livePower monitor={ready}/>)).toContain('Solarleistung heute');
});
it('keeps register snapshots when the prepared history is unavailable',()=>{
  const html=renderToStaticMarkup(<LandkreisMonitor {...props} monitor={{status:'unavailable',reason:'not-prepared',energy:null}}/>);
  expect(html).not.toContain('Letzte 12 Monate');
  expect(html).toContain('Solarleistung heute');
  expect(html).toContain('Bestand und Entwicklung');
});

it('gives regional stock cards independent compact slots without stretching to the viewport',()=>{
  const cells=[
    {...props.cells[0],count:3000,kwp:12000},
    {...props.cells[0],segment:'steckersolar',count:1001,kwp:600},
    {...props.cells[0],segment:'freiflaeche',count:30,kwp:20000},
  ];
  const html=renderToStaticMarkup(<LandkreisMonitor {...props} regionId="12063" cells={cells}/>);
  const stock=html.slice(html.indexOf('<section aria-label="Anlagenbestand"')).split('</section>')[0];
  expect(stock.match(/data-widget-host="dashboard"/g)).toHaveLength(4);
  for(const id of ['solar-mix','stock-privat_dach','stock-steckersolar','stock-freiflaeche']) {
    expect(stock).toContain(`data-composition-item="${id}"`);
  }
  expect(html).toContain('data-widget-density="compact"');
  expect(html).not.toContain('data-widget-layout="allocated"');
  // Regional totals use the same readable cell budget as municipal monitors.
  expect(stock).toContain('1001 von 4031 Anlagen. Ein Rechteck steht für 100 Anlagen.');
  for(const label of ['Gebäudeanlagen','Balkonkraftwerke','Freiflächenanlagen']) expect(stock).toContain(label);
});

// Optional read-only integration check using the data team's local packages.
const fixtureDir=process.env.REGIONAL_UI_FIXTURES;
describe.skipIf(!fixtureDir)('prepared regional examples',()=>{
  it.each(['15','de'])('renders shared energy/value widgets for %s',id=>{
    const pkg=JSON.parse(readFileSync(join(fixtureDir!,`region-${id}.json`),'utf8'));
    const html=renderToStaticMarkup(<LandkreisMonitor {...props} name={pkg.name} regionId={id} monitor={pkg.content.monitor}/>);
    for(const title of ['Solarerzeugung im Tagesverlauf','Jahresverlauf','Wert des Solarstroms','Einspeisevergütung'])expect(html).toContain(title);
    expect(html).toContain('Solarleistung heute');
    expect(html).not.toContain('aller Gemeinden');
    // Partial month coverage belongs to the value widgets' help, not above the section.
    expect(html.replaceAll('<!-- -->','')).not.toMatch(/von \d+ Monaten vollständig berechenbar/);
  },30000);
});
