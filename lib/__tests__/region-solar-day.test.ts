import {describe,expect,it} from 'vitest';
import {mergeDays,regionDay,regionToday,REGION_IDS,REGION_SOLAR_DAY_VERSION,type RegionSolarDayFile} from '../region-solar-day';
import {gemeindeWetterpunkt} from '../atlas-geo';
import type {IconD2Shard} from '../icon-d2';

// A synthetic shard: every postcode sees the same flat radiation, so a town's
// curve differs only by the radiation value we give its postcode.
const DAY:[number,number]=[Date.parse('2026-06-20T22:00:00Z'),Date.parse('2026-06-21T22:00:00Z')];
function shard(ghiByPlz:Record<string,number>):IconD2Shard{
 const first=DAY[0]-3*3600000,hours=30;
 const vars=['direct_radiation','diffuse_radiation','temperature_2m','cloud_cover_high'] as const;
 return {version:1,model:'dwd_icon_d2',runInit:'2026-06-20T21:00:00Z',generatedAt:'',firstHour:new Date(first).toISOString(),hours,variables:[...vars] as never,scale:{direct_radiation:1,diffuse_radiation:1,temperature_2m:1,cloud_cover_high:1} as never,
  points:Object.fromEntries(Object.entries(ghiByPlz).map(([plz,g])=>[plz,{cell:[50,10],elevation:0,values:[Array(hours).fill(g),Array(hours).fill(0),Array(hours).fill(20),Array(hours).fill(0)]}]))};
}
const geo=(entries:[string,string][])=>new Map(entries.map(([ags,plz])=>[ags,{plz,lat:50,lon:10}]));
const states=(o:Record<string,{ags:string;kwp:number}[]>)=>Object.fromEntries(REGION_IDS.slice(0,16).map(id=>[id,o[id]??[{ags:id+'001001',kwp:1}]]));
const allGeo=(extra:[string,string][]=[])=>geo([...REGION_IDS.slice(0,16).map(id=>[id+'001001','10115'] as [string,string]),...extra]);

describe('Land and Germany live curve',()=>{
 const s=shard({'10115':400,'20095':800});
 it('weights towns by installed kWp, and Germany equals the weighted Länder',()=>{
  const d=regionDay(states({'15':[{ags:'15001001',kwp:1},{ags:'15002001',kwp:3}]}),allGeo([['15001001','10115'],['15002001','20095']]),()=>s,DAY,'run');
  expect(d['15'].status).toBe('ready');expect(d.de.status).toBe('ready');
  if(d['15'].status!=='ready'||d.de.status!=='ready')return;
  const lo=regionDay(states({'15':[{ags:'15001001',kwp:1}]}),allGeo([['15001001','10115']]),()=>s,DAY,'run')['15'];
  const hi=regionDay(states({'15':[{ags:'15002001',kwp:3}]}),allGeo([['15002001','20095']]),()=>s,DAY,'run')['15'];
  if(lo.status!=='ready'||hi.status!=='ready')throw new Error('setup');
  const noon=48;
  expect(d['15'].points[noon].powerPct).toBeCloseTo((lo.points[noon].powerPct+3*hi.points[noon].powerPct)/4,9);
  expect(d['15'].installedKwp).toBe(4);expect(d['15'].points).toHaveLength(96);
  const land=REGION_IDS.slice(0,16).map(id=>d[id]) as {installedKwp:number;points:{powerPct:number}[]}[];
  expect(d.de.points[noon].powerPct).toBeCloseTo(land.reduce((t,x)=>t+x.installedKwp*x.points[noon].powerPct,0)/land.reduce((t,x)=>t+x.installedKwp,0),9);
  expect(d.de.installedKwp).toBe(19);
 });
 it('one town without location or weather makes its Land unavailable, and Germany with it — never a smaller total',()=>{
  const noGeo=regionDay(states({'15':[{ags:'15001001',kwp:1},{ags:'15009009',kwp:1}]}),allGeo([['15001001','10115']]),()=>s,DAY,'run');
  expect(noGeo['15']).toMatchObject({status:'unavailable',reason:'no-location',detail:'15009009'});
  expect(noGeo.de).toMatchObject({status:'unavailable',reason:'incomplete-states',detail:'15'});
  const noWeather=regionDay(states({'15':[{ags:'15001001',kwp:1}]}),allGeo([['15001001','99999']]),k=>k==='99'?null:s,DAY,'run');
  expect(noWeather['15']).toMatchObject({status:'unavailable',reason:'no-weather'});
  expect(regionDay({...states({}),'03':null},allGeo(),()=>s,DAY,'run')['03']).toMatchObject({reason:'no-sites'});
 });
 it('a snapshot that does not cover the whole German day is not ready',()=>{
  const short={...s,hours:10};
  expect(regionDay(states({}),allGeo(),()=>short,DAY,'run')['01'].status).toBe('unavailable');
 });
 it('serves only today; keeps an earlier ready curve of the same day, drops old days',()=>{
  const ready=regionDay(states({}),allGeo(),()=>s,DAY,'run1');
  const prev:RegionSolarDayFile={version:REGION_SOLAR_DAY_VERSION,generatedAt:'',runInit:'run1',snapshotFirstHour:'',generation:null,days:{'2026-06-20':ready,'2026-06-21':ready}};
  const gap=regionDay(states({}),allGeo(),()=>null,DAY,'run2');
  const merged=mergeDays(prev,{'2026-06-21':gap},['2026-06-21','2026-06-22']);
  expect(Object.keys(merged)).toEqual(['2026-06-21','2026-06-22']);
  expect(merged['2026-06-21'].de).toMatchObject({status:'ready',runInit:'run1'});
  expect(merged['2026-06-22'].de.status).toBe('unavailable');
  const file={...prev,days:merged};
  expect(regionToday(file,'de','2026-06-21')).toMatchObject({ok:true,runInit:'run1',day:'2026-06-21'});
  expect(regionToday(file,'de','2026-06-20')).toEqual({ok:false,reason:'not-today'});
  expect(regionToday(file,'de','2026-06-22')).toEqual({ok:false,reason:'no-weather'});
  expect(regionToday(null,'de','2026-06-21')).toEqual({ok:false,reason:'no-file'});
 });
});

describe('weather point of a municipality',()=>{
 it('own postcode where there is one, else boundary centre or predecessor key',async()=>{
  expect((await gemeindeWetterpunkt('11000000'))?.quelle).toBe('plz');
  const dorf=await gemeindeWetterpunkt('07131079');
  expect(dorf?.quelle).toBe('grenze');
  expect(dorf!.lat).toBeGreaterThan(50.3);expect(dorf!.lat).toBeLessThan(50.7);
  expect((await gemeindeWetterpunkt('06415000'))?.quelle).toBe('vorgaenger');
  expect(await gemeindeWetterpunkt('99999999')).toBeNull();
 });
});
