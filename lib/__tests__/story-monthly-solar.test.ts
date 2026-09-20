import {describe,it,expect} from 'vitest';
import {solarMonth} from '../story-monthly-solar';
const time=Array.from({length:768},(_,i)=>new Date(Date.UTC(2026,6,31)+i*3600000).toISOString().slice(0,16));
const input={retrievedAt:'2026-09-16',sourceUrl:'https://example.org/weather',weather:{hourly:{time,shortwave_radiation:time.map(()=>100) as (number|null)[],temperature_2m:time.map(()=>20)}}};
const detail={daily:[{day:'2020-01-01',kwp:1000,segment:'gebaeude'}]};
const run=(weather=input.weather,rows=detail.daily)=>solarMonth(weather,rows,'2026-08','2026-09-10',input.retrievedAt,input.sourceUrl);
describe('monthly solar model',()=>{
 it('integrates 744 hourly intervals into 31 days',()=>{const r=run();expect(r.days).toHaveLength(31);expect(r.days.every(d=>d.mw.length===24)).toBe(true);expect(r.totalMwh).toBeCloseTo(r.days.flatMap(d=>d.mw).reduce((a,b)=>a+b,0),5);expect(r.days.find(d=>d.date===r.peakDay)?.mwh).toBe(Math.max(...r.days.map(d=>d.mwh)));});
 it('rejects missing radiation instead of inventing zero',()=>{const weather=structuredClone(input.weather);weather.hourly.shortwave_radiation[100]=null;expect(()=>run(weather)).toThrow('Missing weather');});
 it('ignores installations commissioned after the month',()=>{expect(run(input.weather,[...detail.daily,{day:'2026-09-01',kwp:1e9,segment:'gebaeude'}])).toEqual(run());});
});
describe('daylight-saving display projection',()=>{
 for(const [month,days,hours] of [['2026-03',31,743],['2026-10',31,745]] as const){
  it(`preserves actual energy in ${month}`,()=>{
   const start=Date.parse(month+'-01T00:00:00Z')-86400000;
   const time=Array.from({length:(days+2)*24},(_,i)=>new Date(start+i*3600000).toISOString().slice(0,16));
   const weather={hourly:{time,shortwave_radiation:time.map(()=>100),temperature_2m:time.map(()=>20)}};
   const r=solarMonth(weather,detail.daily,month,'2026-11-10',input.retrievedAt,input.sourceUrl);
   expect(r.days).toHaveLength(days);expect(r.days.every(d=>d.mw.length===24)).toBe(true);
   const hourly=r.days[0].mwh/24;expect(r.totalMwh).toBeCloseTo(hourly*hours,5);
   weather.hourly.time.splice(100,1);weather.hourly.shortwave_radiation.splice(100,1);weather.hourly.temperature_2m.splice(100,1);
   expect(()=>solarMonth(weather,detail.daily,month,'2026-11-10',input.retrievedAt,input.sourceUrl)).toThrow();
  });
 }
});
