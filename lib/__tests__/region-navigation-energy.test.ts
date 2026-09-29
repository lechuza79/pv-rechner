import {energieMwhTeile,anteilProzentTeile} from '../atlas-format';
import {describe,expect,it} from 'vitest';
import {aggregateDistrictEnergy,type EnergyPacket} from '../district-energy';
import {regionNavigationEnergy,checkedNavigationEnergy} from '../region-navigation-energy';
const packet=(ags:string,mwh:number):EnergyPacket=>({ags,registerStand:'2026-09-10',monitorHistory:null,monitorPeriods:{weatherPoint:{latitude:50,longitude:10},valuationAssumptionDate:null,privateSelfConsumption:.3,annual:[],monthly:[{month:'2026-08',value:null,solar:{town:ags,month:'2026-08',sourceDate:'2026-09-10',sourceUrl:'test',retrievedAt:'2026-09-10',totalMwh:mwh*31,peakDay:'2026-08-01',peakMw:mwh,days:Array.from({length:31},(_,i)=>({date:`2026-08-${String(i+1).padStart(2,'0')}`,mwh,mw:Array(24).fill(mwh/24)}))}}]}});
describe('navigation energy coverage',()=>{
 it('uses shared units and does not round tiny positive values to zero',()=>{
  expect(energieMwhTeile(0)).toEqual({value:'0',unit:'MWh'});
  expect(energieMwhTeile(.01)).toEqual({value:'< 0,1',unit:'MWh'});
  expect(anteilProzentTeile(.0001,1)).toEqual({value:'< 0,1',unit:'%'});
  expect(anteilProzentTeile(.094,1)).toEqual({value:'9,4',unit:'%'});
 });
 it('uses the same full month and denominator as the parent',()=>{
  const packets=[packet('a',1),packet('b',3)];
  const data=regionNavigationEnergy(['a','b'],packets,aggregateDistrictEnergy(['a','b'],packets,'Parent'));
  expect(data).toEqual({month:'2026-08',totalMwh:124,values:[{regionId:'a',mwh:31},{regionId:'b',mwh:93}]});
  expect(checkedNavigationEnergy(data,['b','a'])).toEqual(data);
 });
 it('never creates smaller totals for missing or incomplete children',()=>{
  const a=packet('a',1),b=packet('b',3);b.monitorPeriods!.monthly[0].solar.days.pop();
  expect(regionNavigationEnergy(['a','b'],[a,b],aggregateDistrictEnergy(['a','b'],[a,b],'Parent'))).toBeNull();
  expect(regionNavigationEnergy(['a','b'],[a,null],aggregateDistrictEnergy(['a','b'],[a,null],'Parent'))).toBeNull();
 });
 it('preserves confirmed empty towns as zero without treating absent towns as zero',()=>{
  const a=packet('a',1),energy=aggregateDistrictEnergy(['a'],[a],'Parent');
  expect(regionNavigationEnergy(['a','empty'],[a,null],energy,new Set(['empty']))?.values[1].mwh).toBe(0);
  expect(regionNavigationEnergy(['a','empty'],[a,null],energy)).toBeNull();
 });
 it('rejects malformed, incomplete, duplicate and inconsistent stored summaries',()=>{
  const data={month:'2026-08',totalMwh:10,values:[{regionId:'a',mwh:10}]};
  expect(checkedNavigationEnergy(data,['a','b'])).toBeNull();
  expect(checkedNavigationEnergy({...data,totalMwh:20},['a'])).toBeNull();
  expect(checkedNavigationEnergy({...data,values:[{regionId:'a',mwh:-1}]},['a'])).toBeNull();
  expect(checkedNavigationEnergy({...data,values:[...data.values,...data.values]},['a','b'])).toBeNull();
 });
 it('permits omitted plant-free administrative areas but never omits energy',()=>{
  const data={month:'2026-08',totalMwh:10,values:[{regionId:'a',mwh:10},{regionId:'empty',mwh:0}]};
  expect(checkedNavigationEnergy(data,['a'])).toEqual(data);
  data.values[1].mwh=1;data.totalMwh=11;expect(checkedNavigationEnergy(data,['a'])).toBeNull();
 });
 it('does not label the current register month as complete',()=>{
  const a=packet('a',1);a.registerStand='2026-08-20';a.monitorPeriods!.monthly[0].solar.sourceDate=a.registerStand;
  expect(regionNavigationEnergy(['a'],[a],aggregateDistrictEnergy(['a'],[a],'Parent'))).toBeNull();
 });
});
