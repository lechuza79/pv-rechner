import {describe,it,expect} from 'vitest';
import {aggregateDistrictEnergy} from '../district-energy';
import {districtSolarCurve} from '../district-solar-curve';
import type {GemeindePaket} from '../gemeinde-paket';
const packet=(ags:string):Pick<GemeindePaket,'ags'|'registerStand'|'monitorPeriods'>=>({ags,registerStand:'2026-09-10',monitorPeriods:{valuationAssumptionDate:'2026-09-10',privateSelfConsumption:0.3,weatherPoint:{latitude:50,longitude:10},monthly:[{month:'2026-02',solar:{month:'2026-02',days:Array.from({length:28},(_,i)=>({date:`2026-02-${String(i+1).padStart(2,'0')}`,mw:Array(24).fill(1),mwh:24})),totalMwh:672,peakDay:'2026-02-01',peakMw:1,sourceDate:'2026-09-10',retrievedAt:'2026-09-10',sourceUrl:'https://example.com'},value:{euro:100,feedInEuro:60,totalMwh:672,unitCount:2,approximateTariffCount:1,unknownModeCount:0,commercialSelfUseUnknownCount:0}}],annual:[]}});
describe('district energy coverage',()=>{
 it('sums aligned hours, energy and valuation without averaging towns',()=>{const r=aggregateDistrictEnergy(['a','b'],[packet('b'),packet('a')],'Landkreis')!;expect(r.monthly[0].solar.totalMwh).toBe(1344);expect(r.monthly[0].solar.days[0].mw[12]).toBe(2);expect(r.monthly[0].value?.euro).toBe(200);});
 it('rejects missing towns, mixed editions, incomplete and duplicate periods',()=>{expect(aggregateDistrictEnergy(['a','b'],[packet('a'),null],'K')).toBeNull();const b=packet('b');b.registerStand='old';expect(aggregateDistrictEnergy(['a','b'],[packet('a'),b],'K')).toBeNull();b.registerStand='2026-09-10';b.monitorPeriods!.monthly[0].solar.days.pop();expect(aggregateDistrictEnergy(['a','b'],[packet('a'),b],'K')!.monthly).toEqual([]);const c=packet('b');c.monitorPeriods!.monthly.push(c.monitorPeriods!.monthly[0]);expect(aggregateDistrictEnergy(['a','b'],[packet('a'),c],'K')!.monthly).toEqual([]);});
 it('retains generation but suppresses money with differing assumptions or missing value',()=>{const b=packet('b');b.monitorPeriods!.valuationAssumptionDate='2026-08-01';const r=aggregateDistrictEnergy(['a','b'],[packet('a'),b],'K')!;expect(r.monthly).toHaveLength(1);expect(r.monthly[0].value).toBeNull();});
 it('preserves locally calculated self-consumption assumptions when adding money',()=>{const b=packet('b');b.monitorPeriods!.privateSelfConsumption=0.4;expect(aggregateDistrictEnergy(['a','b'],[packet('a'),b],'K')!.monthly[0].value?.euro).toBe(200);});
 it('adds a full leap year and excludes years with a missing day',()=>{
  const a=packet('a'),b=packet('b');
  const year={town:'Town',year:2024,solarKwp:100,windKw:200,sourceDate:'2026-09-10',retrievedAt:'2026-09-10',sourceUrl:'https://example.com',days:Array.from({length:366},(_,i)=>({date:new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10),solarMwh:1,windMwh:2}))};
  a.monitorPeriods!.annual=[structuredClone(year)];b.monitorPeriods!.annual=[structuredClone(year)];
  const result=aggregateDistrictEnergy(['a','b'],[a,b],'K')!;
  expect(result.annual[0].days).toHaveLength(366);expect(result.annual[0].days[59]).toEqual({date:'2024-02-29',solarMwh:2,windMwh:4});
  b.monitorPeriods!.annual[0].days.pop();expect(aggregateDistrictEnergy(['a','b'],[a,b],'K')!.annual).toEqual([]);
 });
 it('weights current curves by capacity and rejects incomplete or shifted weather',()=>{const points=[{time:'2026-09-25T12:00:00Z',powerPct:20}];expect(districtSolarCurve([{kwp:100,points},{kwp:300,points:[{...points[0],powerPct:60}]}])![0].powerPct).toBe(50);expect(districtSolarCurve([{kwp:100,points},{kwp:300,points:null}])).toBeNull();expect(districtSolarCurve([{kwp:100,points},{kwp:300,points:[{...points[0],time:'other'}]}])).toBeNull();});
});
