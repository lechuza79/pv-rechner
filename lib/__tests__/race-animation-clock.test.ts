import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it} from 'vitest';
const window:any={};
runInNewContext(readFileSync('public/gemeinde/landkreis-rennen.js','utf8'),{window});
it('preserves the browser timeline, including slowdowns around rank changes',()=>{
 const frames=[{values:new Map([['a',100],['b',20]])},{values:new Map([['a',110],['b',200]])}];
 const timeline=window.solarDistrictTimeline(frames,['a','b']);
 expect(timeline.duration).toBeGreaterThan(45000);
 expect(timeline.progress(0)).toBe(0);
 expect(timeline.progress(1)).toBe(1);
 expect(timeline.progress(2)).toBe(1);
 expect(timeline.progress(.5)).not.toBe(.5);
});
it('makes row motion independent of how long rendering takes',()=>{
 const move=window.solarRaceRowPosition;
 let state=move(null,0,0);
 state=move(state,44,100);
 expect(move(state,44,210).value).toBe(22);
 expect(move(state,44,320).value).toBe(44);
 expect(move(state,0,0).value).toBe(0);
});
