import {describe,it,expect} from 'vitest';
import {aggregateDistrictMonitor,type DistrictMonitorPacket} from '../district-monitor';
import {monitorKpiGroups} from '../dashboard/monitor-kpis';
import {kpiWindow} from '../dashboard/model';
const packet=(ags:string):DistrictMonitorPacket=>({ags,registerStand:'2026-09-09',monitorHistory:{method:'active-register-by-commissioning-date',observations:Array.from({length:25},(_,i)=>({end:new Date(Date.UTC(2026,8-i,0)).toISOString().slice(0,10),solarCount:100-i,solarKwp:1000-i*10,solarAdditions:20, batteryCount:50-i,batteryKwh:500-i*5,solarCounts:{},solarMix:[]}))}});
describe('district monitor',()=>{
 it('adds every town exactly once and compares the same calendar months',()=>{
  const result=aggregateDistrictMonitor(['a','b'],[packet('b'),packet('a')],'2026-09-09');
  expect(result.status).toBe('ready');if(result.status!=='ready')return;
  expect(result.history.observations[0]).toMatchObject({solarCount:200,solarKwp:2000,batteryCount:100,batteryKwh:1000,end:'2026-08-31'});
  const groups=monitorKpiGroups({history:result.history,population:1000,registerStand:'2026-09-09',populationStand:'2025-12-31'});
  expect(kpiWindow(groups[0].items[0],12).comparison).toMatchObject({status:'available',delta:24});
  expect(kpiWindow(groups[0].items[0],1).comparison).toMatchObject({status:'available',delta:2});
  expect(groups[0].items.find(k=>k.id==='solar-per-resident')?.current.value).toBe(2000);
 });
 it('never presents missing, duplicate, mixed-edition or incomplete history as totals',()=>{
  expect(aggregateDistrictMonitor(['a','b'],[packet('a'),null],'2026-09-09').status).toBe('unavailable');
  expect(aggregateDistrictMonitor(['a','b'],[packet('a'),packet('a')],'2026-09-09').status).toBe('unavailable');
  const old=packet('b');old.registerStand='2026-08-09';
  expect(aggregateDistrictMonitor(['a','b'],[packet('a'),old],'2026-09-09').status).toBe('unavailable');
  const gap=packet('b');gap.monitorHistory!.observations.splice(12,1);
  expect(aggregateDistrictMonitor(['a','b'],[packet('a'),gap],'2026-09-09').status).toBe('unavailable');
 });
 it('omits per-resident figures without population and accepts genuine zeros',()=>{
  const p=packet('a');p.monitorHistory!.observations.forEach(o=>{o.batteryCount=0;o.batteryKwh=0;});
  const r=aggregateDistrictMonitor(['a'],[p],'2026-09-09');expect(r.status).toBe('ready');if(r.status!=='ready')return;
  const g=monitorKpiGroups({history:r.history,population:0,registerStand:p.registerStand,populationStand:null});
  expect(g[0].items.some(k=>k.id==='solar-per-resident')).toBe(false);expect(g[1].items[0].current.value).toBe(0);
 });
});
