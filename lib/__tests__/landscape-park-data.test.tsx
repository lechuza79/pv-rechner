import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import LocationMicroCard from '../../components/landkreis/LocationMicroCard';
import type {MicrochartData} from '../microchart-data';
import nidda from '../../public/geo/nidda-preview/solar-register.json';
const at='2026-10-05T12:00:00Z';
const data:MicrochartData={place:'Test',at,until:'2026-10-05T22:00:00Z',modelRun:at,solar:[{time:at,value:4000}],solarPerKw:[{time:at,value:.4}],solarCapacityKw:10000,wind:null,conditions:null};
const render=(capacity:number|null,d:MicrochartData=data)=>renderToStaticMarkup(<LocationMicroCard name="Park" kind="solar" capacityKw={capacity} weather={null} microcharts={d}/>);
describe('park solar data binding',()=>{
 it('scales the actual Nidda register capacity, not the municipality total',()=>{
  expect(nidda.capacityKw).toBe(nidda.registerUnit.capacityKw);
  expect(nidda.registerUnit.status).toBe('active');
  const html=render(nidda.capacityKw);
  expect(html).toContain('40,2');expect(html).toContain('kW');expect(html).not.toContain('nicht verfügbar');
 });
 it('keeps real weather as percent when capacity is unresolved, without inventing kW',()=>{
  const html=render(null);expect(html).toContain('Modellierte Auslastung');expect(html).toContain('40');expect(html).toContain('%');
  expect(html).toContain('Anlagenleistung noch nicht zugeordnet');expect(html).not.toContain('kW');expect(html).not.toContain('Solardaten');
 });
 it('does not create weather when it is absent and preserves genuine nighttime zero',()=>{
  expect(render(null,{...data,solar:null,solarPerKw:null})).toContain('nicht verfügbar');
  const html=render(nidda.capacityKw,{...data,solarPerKw:[{time:at,value:0}]});
  expect(html).toContain('>0 <small>kW');expect(html).not.toContain('nicht verfügbar');
 });
});
