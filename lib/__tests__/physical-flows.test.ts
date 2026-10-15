import {describe,it,expect} from 'vitest';
import {latestPhysicalFlows,GERMAN_FLOW_BORDERS} from '../physical-flows';
const zero=Object.fromEntries(GERMAN_FLOW_BORDERS.map(k=>[k,0]));
describe('Physical German border flows',()=>{
 it('sums each direction and ignores the already aggregated net value',()=>{
  expect(latestPhysicalFlows([{ts:'2026-10-12T10:00:00Z',data:{...zero,france:3,poland:-2,net:1}}])).toEqual({ts:'2026-10-12T10:00:00Z',importGw:3,exportGw:2});
 });
 it('uses the latest complete point, never silently treats missing borders as zero',()=>{
  expect(latestPhysicalFlows([{ts:'2026-10-12T10:00:00Z',data:zero},{ts:'2026-10-12T11:00:00Z',data:{...zero,france:null}}])?.ts).toBe('2026-10-12T10:00:00Z');
  expect(latestPhysicalFlows([{ts:'2026-10-12T11:00:00Z',data:{france:1}}])).toBeNull();
 });
});
