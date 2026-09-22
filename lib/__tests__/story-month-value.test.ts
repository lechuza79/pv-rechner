import {describe,it,expect,vi} from 'vitest';
import {monthlyElectricityValue,type ValueCell} from '../story-month-value';
import {stromwertCtFuerSegment} from '../atlas-impact';
const cell:ValueCell={region_id:'07211000',segment:'freiflaeche',year:2020,count:1,kwp:100,kwh:0};
describe('monthly reference electricity valuation',()=>{
 it('converts MWh and cents to euros once',()=>{
  expect(monthlyElectricityValue(cell.region_id,1,[cell]).euro).toBeCloseTo(10*stromwertCtFuerSegment('freiflaeche',2020,100,null));
 });
 it('excludes expired tariffs from remuneration, while retaining their electricity value',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
  try{const result=monthlyElectricityValue(cell.region_id,1,[{...cell,year:2000}]);expect(result.feedInEuro).toBe(0);expect(result.euro).toBeGreaterThan(0);}finally{vi.useRealTimers();}
 });
 it('deducts private self-use and gives balcony systems no remuneration',()=>{
  const result=monthlyElectricityValue(cell.region_id,1,[{...cell,segment:'privat_dach',kwp:8},{...cell,segment:'steckersolar',kwp:.8}]);
  expect(result.feedIn[0].exportShare).toBeGreaterThan(0);expect(result.feedIn[0].exportShare).toBeLessThan(1);
  expect(result.feedIn[1].euro).toBe(0);expect(result.feedInEuro).toBeLessThan(result.euro);
  expect(result.feedIn.reduce((sum,row)=>sum+row.euro,0)).toBe(result.feedInEuro);
 });
 it('keeps unsupported stock explicit instead of omitting it',()=>{
  expect(()=>monthlyElectricityValue(cell.region_id,1,[cell,{...cell,segment:'sonstige'}])).toThrow();
 });
 it('rejects another municipality and missing generation',()=>{
  expect(()=>monthlyElectricityValue('01002000',1,[cell])).toThrow();
  expect(()=>monthlyElectricityValue(cell.region_id,NaN,[cell])).toThrow();
 });
 it('scales with monthly generation without inventing a change in tariffs',()=>{
  expect(monthlyElectricityValue(cell.region_id,2,[cell]).euro).toBeCloseTo(2*monthlyElectricityValue(cell.region_id,1,[cell]).euro);
 });
});
