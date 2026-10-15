import {describe,it,expect} from 'vitest';
import {raceCurveValue} from '../race-curve';
describe('Race curve',()=>{
 it('passes through observations without overshoot, including negative turning points',()=>{
 const values=Float64Array.from([48,70,76,69,88,240,235,479,669]);
 for(let i=0;i<values.length;i++)expect(raceCurveValue(values,i)).toBeCloseTo(values[i]);
 for(const data of [values,Float64Array.from([1.7,4.7,-7.5,-2,7.9])]){
  for(let i=0;i<data.length-1;i++)for(let part=0;part<=100;part++){
   const value=raceCurveValue(data,i+part/100);
   expect(value).toBeGreaterThanOrEqual(Math.min(data[i],data[i+1])-1e-8);
   expect(value).toBeLessThanOrEqual(Math.max(data[i],data[i+1])+1e-8);
  }
 }
 });
});
