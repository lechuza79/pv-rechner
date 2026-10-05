import {it,expect} from "vitest";
import {windDay} from "../wind-day";
import type {IconD2Shard} from "../icon-d2";
const start=Date.parse('2026-10-01T00:00:00Z');
function fixture():IconD2Shard{return {version:1,model:'dwd_icon_d2',runInit:new Date(start).toISOString(),generatedAt:new Date(start).toISOString(),firstHour:new Date(start).toISOString(),hours:26,variables:['wind_u_component_10m','wind_v_component_10m'],scale:{wind_u_component_10m:10,wind_v_component_10m:10} as IconD2Shard['scale'],points:{'63667':{cell:[50,9],elevation:120,values:[Array(26).fill(30),Array(26).fill(40)]}}};}
it('uses the vector magnitude in m/s for the full requested day',()=>{
 const day=windDay(fixture(),'63667',[start,start+24*3600000]);
 expect(day).toHaveLength(24);expect(day?.every(p=>p.value===5)).toBe(true);
});
it('does not draw through missing hours or substitute an unknown place',()=>{
 const data=fixture();data.points['63667'].values[0][12]=null;
 expect(windDay(data,'63667',[start,start+24*3600000])).toBeNull();
 expect(windDay(fixture(),'00000',[start,start+24*3600000])).toBeNull();
});
it('preserves real zero wind and 25-hour daylight-saving days',()=>{
 const data=fixture();data.points['63667'].values.forEach(row=>row.fill(0));
 const day=windDay(data,'63667',[start,start+25*3600000]);
 expect(day).toHaveLength(25);expect(day?.every(p=>p.value===0)).toBe(true);
});
