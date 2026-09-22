import {describe,it,expect} from 'vitest';
import {yieldPeriods,appendYieldStories,type YieldInput} from '../story-yield-discovery';
import type {DiscoveryReport} from '../story-discovery';
const hours:YieldInput['hours']=[];
for(let t=Date.UTC(2019,11,31);t<=Date.UTC(2026,0,1);t+=3600000)hours.push({time:new Date(t).toISOString(),temperature:20,radiation:100});
const input:YieldInput={regionId:'test',name:'Test',model:'era5',startYear:2020,endYear:2025,hours,requests:[{url:'https://open-meteo.com',retrievedAt:'2026-09-14T00:00:00Z'}]};
const report=():DiscoveryReport=>({version:'test',regionId:'test',name:'Test',sourceDate:'2026-09-10',source:'register',candidates:[],checks:[],warnings:[],scannedRows:0,merged:0});
describe('consistent growth-adjusted weather periods',{timeout:60000},()=>{
 it('keeps leap days, DST durations and only complete ISO weeks',()=>{const p=yieldPeriods(input);expect(p.day).toHaveLength(2192);expect(p.month).toHaveLength(72);expect(p.day.find(d=>d.key==='2024-03-31')!.value/p.day.find(d=>d.key==='2024-03-30')!.value).toBeCloseTo(23/24);expect(p.day.find(d=>d.key==='2024-10-27')!.value/p.day.find(d=>d.key==='2024-10-26')!.value).toBeCloseTo(25/24);expect(p.week.every(w=>w.days===7)).toBe(true);expect(p.week.some(w=>w.key==='2020-W01')).toBe(false);expect(p.week.some(w=>w.key==='2020-W53')).toBe(true);});
 it('rejects missing, duplicate and null hours rather than changing a record',()=>{const middle=1000;expect(()=>yieldPeriods({...input,hours:hours.filter((_,i)=>i!==middle)})).toThrow('Incomplete');expect(()=>yieldPeriods({...input,hours:[...hours,hours[middle]]})).toThrow('Duplicate');expect(()=>yieldPeriods({...input,hours:hours.map((h,i)=>i===middle?{...h,radiation:null}:h)})).toThrow('Invalid');});
 it('keeps genuine tied winners',()=>{const r=report();appendYieldStories(r,input);const days=r.candidates.filter(c=>c.eventKey.includes('-day-'));expect(days.length).toBe(6);expect(days.every(c=>c.title.includes('geteilter'))).toBe(true);});
 it('retains zero-yield comparison periods',()=>{const p=yieldPeriods({...input,hours:hours.map(h=>({...h,radiation:0}))});expect(p.month).toHaveLength(72);expect(p.month.every(m=>m.value===0)).toBe(true);});
 it('suppresses weak leap-day comparison and isolates geography',()=>{const peak={...input,hours:hours.map(h=>({...h,radiation:h.time.startsWith('2020-02-29')?900:100}))};const r=report();appendYieldStories(r,peak);const day=r.candidates.find(c=>c.eventKey.includes('-day-'))!;expect(day.title).toContain('29. Feb. 2020');expect(day.evidence.some(e=>e.unit==='%')).toBe(false);expect(day.provenance?.[0].label).toContain('ERA5');expect(()=>appendYieldStories({...report(),regionId:'other'},input)).toThrow('location');});
});
