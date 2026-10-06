import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {regionalKpiGroups} from '../dashboard/regional-kpis';
import {KpiOverview, changeDigits} from '../../components/dashboard/KpiOverview';
import {ShareDonut} from '../../components/charts/ShareDonut';
import {monitorKpiGroups} from '../dashboard/monitor-kpis';

it('keeps solar, storage and current-year additions separate without invented monthly changes',()=>{
  const cells=[
    {region_id:'15',segment:'privat_dach',year:2025,count:10,kwp:100,kwh:0},
    {region_id:'15',segment:'steckersolar',year:2026,count:3,kwp:2,kwh:0},
    {region_id:'15',segment:'batterie_privat',year:2026,count:2,kwp:5,kwh:20},
    {region_id:'15',segment:'sonstige',year:2026,count:99,kwp:999,kwh:999},
  ];
  const groups=regionalKpiGroups(cells,'2026-09-09',1000);
  const items=Object.fromEntries(groups.flatMap(group=>group.items.map(item=>[item.id,item.current.value])));
  expect(items).toMatchObject({'solar-count':13,'solar-per-resident':102,'solar-additions':3,'battery-count':2});
  const html=renderToStaticMarkup(<KpiOverview snapshot groups={groups}/>);
  expect(html).toContain('Neue Anlagen 2026 bisher');
  expect(html).not.toContain('Letzte 12 Monate');
  expect(html).not.toContain('sc-kpi-trend');
  expect(html).not.toContain('Kein vergleichbarer Datenstand');
  expect(regionalKpiGroups(cells,'2026-09-09',null)[0].items.some(item=>item.id==='solar-per-resident')).toBe(false);
});

it('shows the KPI date visibly, because the region monitor stands at month end, not at the register date',()=>{
  // Live on 28.09.2026: the KPI block showed totals as of 31 Aug while the rest
  // of the page carried the register date 9 Sep; the date sat only behind the
  // help button, so two different totals read as a contradiction.
  const groups=regionalKpiGroups([{region_id:'15',segment:'privat_dach',year:2025,count:10,kwp:100,kwh:0}],'2026-09-09',1000);
  const html=renderToStaticMarkup(<KpiOverview snapshot stichtag="2026-08-31" groups={groups}/>);
  expect(html).toContain('Stand <time dateTime="2026-08-31">31. Aug. 2026</time>');
  const source=readFileSync(join(process.cwd(),'components/landkreis/LandkreisMonitor.tsx'),'utf8');
  const uses=source.match(/<KpiOverview\s/g)??[];
  const dated=source.match(/<KpiOverview\s+(?:snapshot\s+)?stichtag=\{/g)??[];
  expect(uses.length).toBe(2);
  expect(dated.length).toBe(uses.length);
});

it('gives a change the decimals of its main value and the unit of its size (Deutschland: GWp, not "+4.411,76 MWp")',()=>{
  const obs=(i:number)=>({
    end:new Date(Date.UTC(2026,7-i+1,0)).toISOString().slice(0,10),
    solarCounts:{},solarMix:[],solarCount:5_000_000-i*1000,
    solarKwp:129_189_770-i*367_647,solarAdditions:0,batteryCount:2_000_000,batteryKwh:33_482_100,
  });
  const history={method:'test',observations:Array.from({length:13},(_,i)=>obs(i))};
  const groups=monitorKpiGroups({history,population:84_000_000,registerStand:'2026-09-09',populationStand:null});
  const power=groups[0].items.find(item=>item.id==='solar-power')!;
  const capacity=groups[1].items.find(item=>item.id==='battery-capacity')!;
  expect(power.unit).toBe('GWp');
  expect(capacity.unit).toBe('GWh');
  const html=renderToStaticMarkup(<KpiOverview groups={groups}/>);
  expect(html).toContain('33,5<small>GWh</small>');
  expect(html).toContain('+4,4 GWp');
  expect(html).not.toMatch(/\d,\d\d GWp/);
  expect(html).not.toContain('MWp');
});

it('adds decimals to a change only where rounding would make it 0',()=>{
  expect(changeDigits(4.41176,1)).toBe(1);
  expect(changeDigits(0.03,1)).toBe(2);
  expect(changeDigits(0.0004,1)).toBe(3);
  expect(changeDigits(0,1)).toBe(1);
  expect(changeDigits(-12,0)).toBe(0);
});

it('formats the donut with the shared PV formatter: one unit ladder, and screen readers hear the same unit',()=>{
  const html=renderToStaticMarkup(<ShareDonut values={[
    {label:'Gebäudeanlagen',value:80_000_000},
    {label:'Balkonkraftwerke',value:1_200_000},
    {label:'Freiflächenanlagen',value:47_989_770},
  ]}/>);
  expect(html).toContain('<strong>129,2</strong><span>GWp</span>');
  expect(html).toContain('<strong>1,2</strong><small>GWp</small>');
  expect(html).toContain('aria-label="Gebäudeanlagen: 80 GWp"');
  expect(html).not.toContain('MWp');
  expect(html).not.toMatch(/\bkWp\b/);
});
