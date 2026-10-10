import {describe,it,expect} from 'vitest';
import {PARK_WIND_VARIABLES,parkWindDay,parkWindWindow,parkWindCell} from '../park-wind-snapshot';
import {ICON_D2_VARIABLES,type IconD2Shard} from '../icon-d2';
function fixture(now:Date):IconD2Shard{
 const window=parkWindWindow(now,now.getTime()/1000+3*86400);
 return {version:1,model:'dwd_icon_d2',runInit:now.toISOString(),generatedAt:now.toISOString(),firstHour:new Date(window.firstHour*3600000).toISOString(),hours:window.hours,variables:[...PARK_WIND_VARIABLES],scale:{...ICON_D2_VARIABLES},points:{'tour:stop':{cell:[50,10],elevation:200,values:PARK_WIND_VARIABLES.map((_,i)=>Array(window.hours).fill(i%2?40:30))}}};
}
describe('stored park wind',()=>{
 it.each([['2026-10-03T12:00:00Z',96],['2026-10-25T12:00:00Z',100],['2026-03-29T12:00:00Z',92]])('covers the complete Berlin day %s',(iso,count)=>{const now=new Date(iso),data=parkWindDay(fixture(now),'tour:stop',now);expect(data?.day).toHaveLength(count);expect(data?.current.speedMs).toBe(5);});
 it('refuses stale files and unknown park keys',()=>{const now=new Date('2026-10-03T12:00:00Z'),shard=fixture(now);expect(parkWindDay(shard,'other',now)).toBeNull();shard.runInit='2026-10-02T12:00:00Z';expect(parkWindDay(shard,'tour:stop',now)).toBeNull();});
 it('keeps missing hub-height fields unavailable',()=>{const now=new Date('2026-10-03T12:00:00Z'),shard=fixture(now);shard.points['tour:stop'].values[2][3]=null;expect(parkWindDay(shard,'tour:stop',now)).toBeNull();});
 it('keeps measured calm as zero',()=>{const now=new Date('2026-10-03T12:00:00Z'),shard=fixture(now);shard.points['tour:stop'].values.forEach(s=>s.fill(0));expect(parkWindDay(shard,'tour:stop',now)?.current.speedMs).toBe(0);});
 it('rejects incomplete required model coverage',()=>{const now=new Date('2026-10-03T21:00:00Z');expect(()=>parkWindWindow(now,now.getTime()/1000+5*3600)).toThrow();});
 it('does not clamp parks outside the model into an unrelated cell',()=>{expect(()=>parkWindCell(1,1)).toThrow();expect(parkWindCell(50.5,10)).toEqual(expect.objectContaining({row:expect.any(Number),column:expect.any(Number)}));});
});
