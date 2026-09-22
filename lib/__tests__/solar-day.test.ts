import { describe, expect, it } from 'vitest';
import { solarDay } from '../solar-day';
function fixture(start='2026-09-15T22:00:00Z', count=96) {
 return {time:Array.from({length:count},(_,i)=>Date.parse(start)/1000+i*900),shortwave_radiation_instant:Array(count).fill(500),temperature_2m:Array(count).fill(20),cloud_cover_high:Array(count).fill(0)};
}
describe('local weather day',()=>{
 it('uses weather radiation rather than a fixed sunny curve',()=>{const x=fixture();x.shortwave_radiation_instant[50]=50;const result=solarDay(x,49.78,9.88,new Date('2026-09-16T10:00Z'));expect(result.points).toHaveLength(96);expect(result.points[50].powerPct).toBeLessThan(result.points[49].powerPct);});
 it('rejects missing values instead of inventing zero output',()=>{const x=fixture();x.temperature_2m[50]=null as unknown as number;expect(()=>solarDay(x,49,9,new Date('2026-09-16T10:00Z'))).toThrow();});
 it('rejects yesterday and incomplete series',()=>{expect(()=>solarDay(fixture(),49,9,new Date('2026-09-17T10:00Z'))).toThrow();expect(()=>solarDay(fixture(undefined,70),49,9,new Date('2026-09-16T10:00Z'))).toThrow();});
 it('accepts the shorter DST day without manufacturing another hour',()=>{expect(solarDay(fixture('2026-03-28T23:00Z',92),49,9,new Date('2026-03-29T10:00Z')).points).toHaveLength(92);});
});
