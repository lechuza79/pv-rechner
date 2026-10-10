import {afterEach,expect,it,vi} from 'vitest';
import {heightWindPoints,heightWindAt,loadPreviewHeightWind} from '../preview-height-wind';
const data={hourly_units:{wind_speed_80m:'m/s',wind_direction_80m:'°',wind_speed_120m:'m/s',wind_direction_120m:'°'},hourly:{time:['2026-10-03T06:00','2026-10-03T07:00'],wind_speed_80m:[4,4],wind_direction_80m:[350,350],wind_speed_120m:[6,6],wind_direction_120m:[10,10]}};
afterEach(()=>vi.unstubAllEnvs());
it('interpolates actual height vectors across north instead of averaging angles',()=>{
 const points=heightWindPoints(data)!;const wind=heightWindAt(points,Date.parse('2026-10-03T06:30Z'))!;
 expect(wind.speedMs).toBeCloseTo(4.93,2);expect(wind.directionDeg).toBeLessThan(5);
 expect(wind.validAt).toBe('2026-10-03T06:30:00.000Z');
});
it('refuses wrong units, missing height levels and missing hours',()=>{
 expect(heightWindPoints({...data,hourly_units:{...data.hourly_units,wind_speed_80m:'km/h'}})).toBeNull();
 expect(heightWindPoints({...data,hourly:{...data.hourly,wind_speed_120m:[null,null]}})).toBeNull();
 expect(heightWindAt([{time:'2026-10-03T06:00Z',u:1,v:1},{time:'2026-10-03T08:00Z',u:1,v:1}],Date.parse('2026-10-03T07:00Z'))).toBeNull();
});
it('never invokes the free hosted preview fallback in production',async()=>{
 vi.stubEnv('NODE_ENV','production');const fetchMock=vi.spyOn(globalThis,'fetch');
 expect(await loadPreviewHeightWind('66849')).toBeNull();expect(fetchMock).not.toHaveBeenCalled();fetchMock.mockRestore();
});
