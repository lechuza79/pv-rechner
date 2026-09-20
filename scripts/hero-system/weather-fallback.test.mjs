import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../../public/dynamic-hero/dist/test.js',import.meta.url),'utf8');
const stateStart=source.indexOf('function V(){let o=u==="live"');
const state=source.slice(stateStart,source.indexOf('function te(){',stateStart));
const requestStart=source.indexOf('async function ne(){let s=i("postcode")');
const request=source.slice(requestStart,source.indexOf('i("test-3d-loss")',requestStart));
function context(){return {u:'live',h:null,l:null,d:{plz:'79098',lat:48,lon:7.8},a:{dataset:{}},E:'sun',P:1.5,z:8,U:null,x:null,i:()=>({value:'97204'}),_:()=>new Date(),Ze:(_date,_location,weather)=>weather,te(){},ee(){},Y(){},L:0,W:null,AbortController,clearTimeout(){},setTimeout:()=>1,scPostcodes:async()=>({'97204':[49.78,9.88]}),fetch:async()=>{throw Error('offline');}};}
test('missing weather never becomes measured sunshine; real cloud coverage passes through',()=>{
 const c=context();runInNewContext(state,c);c.V();assert.equal(c.U.cloud,100);assert.equal(c.a.dataset.weatherAvailable,'false');
 c.h={cloud:96};c.V();assert.equal(c.U.cloud,96);assert.equal(c.a.dataset.weatherAvailable,'true');
});
test('failed weather still uses the selected location and schedules recovery',async()=>{
 const c=context(),delays=[];c.setTimeout=(_fn,ms)=>{delays.push(ms);return 1;};
 runInNewContext(state+request,c);await c.ne();
 assert.equal(c.d.plz,'97204');assert.equal(c.d.lat,49.78);assert.equal(c.d.lon,9.88);assert.equal(c.U.cloud,100);assert.ok(delays.includes(30000));
});
test('refresh preserves recent weather only for the same location',async()=>{
 const c=context();c.d={plz:'97204',lat:49.78,lon:9.88};c.h={cloud:96,asOf:Date.now()};
 runInNewContext(state+request,c);await c.ne();assert.equal(c.U.cloud,96);
 c.d.plz='79098';await c.ne();assert.equal(c.h,null);assert.equal(c.U.cloud,100);
});
