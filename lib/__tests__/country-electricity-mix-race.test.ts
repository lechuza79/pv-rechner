import {expect,it} from 'vitest';
import data from '../../data/country-electricity-mix-race.json';
import {RACING_WIDGET_IDS,galleryEntries} from '../widget-gallery';
it('keeps all ten countries and Germany in every annual frame, with a complete 100% mix',()=>{
 expect(data.countries).toHaveLength(10);
 for(const frame of data.history){
  expect(frame.rows.map(row=>row.id)).toEqual(data.countries.map(row=>row.id));
  expect(frame.rows.some(row=>row.id==='DEU')).toBe(true);
  for(const row of frame.rows){
   expect(row.segments.reduce((a,b)=>a+b,0)).toBeCloseTo(100,8);
   expect(row.segments.every(value=>Number.isFinite(value)&&value>=0)).toBe(true);
   expect(row.value).toBe(row.segments[0]);
  }
 }
});
it('preserves nuclear output before the German shutdown and zero generation afterwards',()=>{
 const nuclear=(year:number)=>data.history.find(frame=>frame.year===year)!.rows.find(row=>row.id==='DEU')!.segments[1];
 expect(nuclear(2022)).toBeGreaterThan(0);
 expect(nuclear(2023)).toBeGreaterThan(0);
 expect(nuclear(2024)).toBe(0);
});
it('exposes the same widget in the existing racing gallery',()=>{
 expect(RACING_WIDGET_IDS.has('laender-strommixrennen')).toBe(true);
 const entry=galleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'}).find(item=>item.id==='laender-strommixrennen');
 expect(entry?.variants[0].src).toBe('/embed/laender-strommixrennen');
 expect(galleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'}).filter(item=>item.id.startsWith('laender-strommix'))).toHaveLength(2);
});

import perCapita from '../../data/country-electricity-per-capita-race.json';
it('uses population and generation from the same year, retaining the full mix',()=>{
 expect(perCapita.history.map(frame=>frame.year)).toEqual(data.history.map(frame=>frame.year));
 for(const frame of perCapita.history){
  for(const row of frame.rows){
   expect(row.population).toBeGreaterThan(0);
   const total=row.segments.reduce((a,b)=>a+b,0);
   expect(total).toBeCloseTo(row.generationTWh*1e9/row.population,7);
   expect(row.value).toBe(row.segments[0]);
   const share=data.history.find(f=>f.year===frame.year)!.rows.find(r=>r.id===row.id)!;
   row.segments.forEach((segment,index)=>expect(segment/total*100).toBeCloseTo(share.segments[index],1));
  }
 }
 expect(RACING_WIDGET_IDS.has('laender-strommix-pro-kopf')).toBe(true);
});
