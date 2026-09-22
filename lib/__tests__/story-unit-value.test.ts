import {describe,it,expect} from 'vitest';
import {unitTariff,unitMonthValue,type ValuationUnit} from '../story-unit-value';
const unit:ValuationUnit={id:'one',day:'2020-06-10',kwp:8,status:'35',art:'853',usage:'713',feedInMode:'689',storage:'0'};
function weather(month:string){
 const start=Date.parse(month+'-01T00:00:00Z')-86400000,end=Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),1)+86400000;
 const time=[];for(let t=start;t<end;t+=3600000)time.push(new Date(t).toISOString().slice(0,16));
 return {hourly:{time,shortwave_radiation:time.map(()=>500),temperature_2m:time.map(()=>20)}};
}
describe('individual monthly valuation',()=>{
 it('uses commissioning month instead of a mid-year surrogate',()=>{
  expect(unitTariff({...unit,day:'2012-05-01'},'2026-08-31').ct).not.toBe(unitTariff({...unit,day:'2012-11-01'},'2026-08-31').ct);
 });
 it('weights actual sizes, not an average plant',()=>{
  const small=unitTariff({...unit,kwp:2},'2026-08-31').ct,large=unitTariff({...unit,kwp:38},'2026-08-31').ct;
  expect((2*small+38*large)/40).not.toBeCloseTo(unitTariff({...unit,kwp:20},'2026-08-31').ct,4);
 });
 it('recognizes declared full feed-in and adds no self-consumption savings',()=>{
  const result=unitMonthValue([{...unit,day:'2023-01-01',feedInMode:'688'}],weather('2026-08'),'2026-08',.3);
  expect(result.rows[0].selfUse).toBe(0);expect(result.euro).toBe(result.feedInEuro);
  expect(unitTariff({...unit,day:'2023-01-01',feedInMode:'688'},'2026-08-31').ct).toBeGreaterThan(unitTariff({...unit,day:'2023-01-01'},'2026-08-31').ct);
 });
 it('does not assign pre-commissioning generation and excludes future units',()=>{
  const result=unitMonthValue([{...unit,day:'2026-08-16'},{...unit,id:'future',day:'2026-09-01'}],weather('2026-08'),'2026-08',.3);
  const full=unitMonthValue([unit],weather('2026-08'),'2026-08',.3);
  expect(result.unitCount).toBe(1);expect(result.totalMwh/full.totalMwh).toBeCloseTo(15/31);
 });
 it('evaluates expiry at the story month, not the runtime clock',()=>{
  expect(unitTariff({...unit,day:'2006-01-01'},'2026-12-31').eligible).toBe(true);
  expect(unitTariff({...unit,day:'2006-01-01'},'2027-01-01').eligible).toBe(false);
 });
 it('keeps all 23/25-hour DST intervals and rejects a missing hour',()=>{
  const spring=unitMonthValue([unit],weather('2026-03'),'2026-03',.3),fall=unitMonthValue([unit],weather('2026-10'),'2026-10',.3);
  expect(fall.totalMwh/spring.totalMwh).toBeCloseTo(745/743);
  const broken=weather('2026-08');broken.hourly.shortwave_radiation[50]=NaN;
  expect(()=>unitMonthValue([unit],broken,'2026-08',.3)).toThrow();
 });
});
