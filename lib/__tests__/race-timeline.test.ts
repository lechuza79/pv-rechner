import {describe,it,expect} from 'vitest';
import {raceTimeline,racePositionAt} from '../race-timeline';
import {WORLD_ELECTRICITY_YEARS,WORLD_WIND_SOLAR,WORLD_NUCLEAR,WORLD_ELECTRICITY_MILESTONES,WORLD_ELECTRICITY_SOURCE} from '../world-electricity-race';

describe('Shared race clock',()=>{
 it('keeps daily and annual observations exact when seeking or exporting',()=>{
  for(const length of [25,7305]){
   const clock=raceTimeline(length,{ruhigeTage:2,msJeTagStart:1200,msJeTagEnde:200});
   expect(racePositionAt(clock,-1)).toBe(0);
   expect(racePositionAt(clock,Infinity)).toBe(length);
   for(let index=0;index<length;index++){
    expect(clock[index+1]).toBeGreaterThan(clock[index]);
    expect(racePositionAt(clock,clock[index])).toBe(index);
    expect(racePositionAt(clock,(clock[index]+clock[index+1])/2)).toBeCloseTo(index+.5);
   }
  }
 });
 it('accelerates while preserving the slow opening',()=>{
  const clock=raceTimeline(25,{ruhigeTage:3,msJeTagStart:1400,msJeTagEnde:500});
  expect(clock[3]).toBe(4200);
  expect(clock[25]-clock[24]).toBeLessThan(clock[4]-clock[3]);
 });
});
describe('Worldwide annual generation',()=>{
 it('contains complete aligned annual observations, not daily or cumulative data',()=>{
  expect(WORLD_ELECTRICITY_YEARS).toEqual(Array.from({length:26},(_,i)=>2000+i));
  expect(WORLD_WIND_SOLAR).toHaveLength(26);
  expect(WORLD_NUCLEAR).toHaveLength(26);
  expect(WORLD_ELECTRICITY_SOURCE.unit).toBe('TWh');
  expect(WORLD_WIND_SOLAR[25]).toBeCloseTo(5484.583);
  expect(WORLD_NUCLEAR[25]).toBeCloseTo(2809.351);
  expect(WORLD_NUCLEAR[12]).toBeLessThan(WORLD_NUCLEAR[11]);
 });
 it('places each milestone at an actual observation and the first crossing in 2021',()=>{
  for(const event of WORLD_ELECTRICITY_MILESTONES)expect(event.jahr).toBe(WORLD_ELECTRICITY_YEARS[event.tag]);
  const crossing=WORLD_ELECTRICITY_MILESTONES.find(event=>event.label.includes('überholen'))!;
  expect(crossing.jahr).toBe(2021);
  expect(WORLD_WIND_SOLAR[crossing.tag]).toBeGreaterThan(WORLD_NUCLEAR[crossing.tag]);
  expect(WORLD_WIND_SOLAR[crossing.tag-1]).toBeLessThan(WORLD_NUCLEAR[crossing.tag-1]);
 });
});
