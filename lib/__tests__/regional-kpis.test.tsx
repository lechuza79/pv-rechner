import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {regionalKpiGroups} from '../dashboard/regional-kpis';
import {KpiOverview} from '../../components/dashboard/KpiOverview';

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
