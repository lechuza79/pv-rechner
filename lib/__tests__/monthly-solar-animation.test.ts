import {describe,expect,it} from 'vitest';
import {solarAnimationFrame} from '../monthly-solar-animation';

describe('solar day video timeline',()=>{
 it('draws intermediate curve frames rather than jumping whole days',()=>{
  expect(solarAnimationFrame([10,30],0).progress).toBe(0);
  const middle=solarAnimationFrame([10,30],300);
  expect(middle.progress).toBeGreaterThan(0);
  expect(middle.progress).toBeLessThan(1);
  expect(solarAnimationFrame([10,30],600).progress).toBe(1);
 });
 it('keeps the previous number at a day boundary and counts in both directions',()=>{
  expect(solarAnimationFrame([10,30,5],650).value).toBe(10);
  expect(solarAnimationFrame([10,30,5],950).value).toBeGreaterThan(10);
  expect(solarAnimationFrame([10,30,5],950).value).toBeLessThan(30);
  expect(solarAnimationFrame([10,30,5],1250).value).toBe(30);
  expect(solarAnimationFrame([10,30,5],1600).value).toBeLessThan(30);
  expect(solarAnimationFrame([10,30,5],1900).value).toBe(5);
 });
});
