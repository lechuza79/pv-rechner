import {describe,it,expect} from 'vitest';
import {CAPACITY_YEARS,CAPACITY_RENEWABLES,CAPACITY_NUCLEAR,CAPACITY_MILESTONES} from '../world-capacity-race';
import {ZUBAU_BY_COUNTRY,YEARS_ZUBAU} from '../country-comparison';
import {milestoneRaceTimeline,racePositionAt} from '../race-timeline';
describe('Capacity race',()=>{
 it('uses the static annual net additions including dismantling, without accumulation',()=>{
  const world=ZUBAU_BY_COUNTRY.find(row=>row.code==='WELT')!;
  expect(CAPACITY_YEARS).toEqual(YEARS_ZUBAU);
  expect([...CAPACITY_RENEWABLES]).toEqual(world.windsolar);
  expect([...CAPACITY_NUCLEAR]).toEqual(world.nuclear);
  expect(CAPACITY_RENEWABLES.at(-1)).toBe(669.8);
  expect(CAPACITY_NUCLEAR[2]).toBe(-7.5);
  for(const event of CAPACITY_MILESTONES)expect(event.jahr).toBe(CAPACITY_YEARS[event.tag]);
 });
 it('spends more time near milestones and closes slowly with exact seeking',()=>{
  const clock=milestoneRaceTimeline(15,[0,8,15]);
  expect(clock[9]-clock[8]).toBeGreaterThan(clock[5]-clock[4]);
  expect(clock[15]-clock[14]).toBeGreaterThan(clock[2]-clock[1]);
  for(let i=0;i<15;i++){
   expect(clock[i+1]).toBeGreaterThan(clock[i]);
   expect(racePositionAt(clock,clock[i])).toBe(i);
  }
  expect(racePositionAt(clock,clock[15])).toBe(15);
 });
});
