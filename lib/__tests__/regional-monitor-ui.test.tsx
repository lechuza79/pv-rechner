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

// Optional read-only integration check using the data team's local packages.
const fixtureDir=process.env.REGIONAL_UI_FIXTURES;
describe.skipIf(!fixtureDir)('prepared regional examples',()=>{
  it.each(['15','de'])('renders shared energy/value widgets for %s',id=>{
    const pkg=JSON.parse(readFileSync(join(fixtureDir!,`region-${id}.json`),'utf8'));
    const html=renderToStaticMarkup(<LandkreisMonitor {...props} name={pkg.name} regionId={id} monitor={pkg.content.monitor}/>);
    for(const title of ['Solarerzeugung im Tagesverlauf','Jahresverlauf','Wert des Solarstroms','Einspeisevergütung'])expect(html).toContain(title);
    expect(html).toContain('Solarleistung heute');
    expect(html).not.toContain('aller Gemeinden');
    if(id==='de')expect(html).toContain('5 von 20');
  },30000);
});
