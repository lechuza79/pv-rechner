import {describe,it,expect} from 'vitest';
import {formatRaceValue,raceValueUnit} from '../race-value-format';
describe('racing capacity labels',()=>{
 it('does not display early positive capacities as zero MWp',()=>{
  expect(formatRaceValue(3,'kwp')).toBe('0,003');
  expect(formatRaceValue(21,'kwp')).toBe('0,021');
  expect(formatRaceValue(.2,'kwp')).toBe('<0,001');
  expect(formatRaceValue(0,'kwp')).toBe('0');
 });
 it('keeps larger values compact and plant counts integral',()=>{
  expect(formatRaceValue(20900,'kwp')).toBe('20,9');
  expect(formatRaceValue(1234,'kwp')).toBe('1,23');
  expect(formatRaceValue(2.7,'count')).toBe('3');
 });
});

it('switches every town together at the shared frame threshold',()=>{
 const values=[1000,21,3];
 expect(raceValueUnit('kwp',999)).toBe('kWp');
 expect(formatRaceValue(21,'kwp',999)).toBe('21');
 expect(values.map(()=>raceValueUnit('kwp',1000))).toEqual(['MWp','MWp','MWp']);
 expect(values.map(value=>formatRaceValue(value,'kwp',1000))).toEqual(['1','0,021','0,003']);
});
