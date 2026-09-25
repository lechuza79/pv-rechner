import test from 'node:test';
import assert from 'node:assert/strict';
import {solarLight} from '../../public/hero-system/source/solar-light.js';
test('civil dawn increases continuously and has no direct sun below horizon',()=>{
 let previous=-1;
 for(const elevation of [-6,-5.99,-5,-3,-.01,0,1,6,12,29]){
  const light=solarLight({phase:elevation<12?'dawn':'day',solarElevation:elevation,daylight:(elevation+6)/35});
  assert.ok(light.daylight>=previous);previous=light.daylight;
  if(elevation<=0)assert.equal(light.sun,0);
  if(elevation===-6)assert.ok(light.sky>.4 && light.sky<.6);
  if(elevation===0)assert.ok(light.sky>.85);
 }
 assert.equal(solarLight({phase:'dawn',daylight:0}).sun,0);
});

import {sceneState,validateWeather} from '../../public/hero-system/source/scene-state.js';
test('reference mornings and evenings keep the sky brighter than the foreground',()=>{
 const location={lat:49.78,lon:9.88};
 for(const date of ['2026-09-25T07:20:00+02:00','2026-09-24T19:24:00+02:00','2026-09-24T19:40:00+02:00']){
  const state=sceneState(new Date(date),location,{cloud:10,code:0,wind:0,rain:0});
  const light=solarLight(state);
  assert.ok(light.sky>light.daylight+.35,date);
  assert.equal(state.fog,0);
 }
});
test('fog is explicit and cloud layers survive weather normalization',()=>{
 const current={temperature_2m:12,cloud_cover:50,cloud_cover_low:0,cloud_cover_mid:20,cloud_cover_high:80,wind_speed_10m:1,wind_direction_10m:90,weather_code:45,rain:0,showers:0,time:1790308800};
 const weather=validateWeather({current});
 const state=sceneState(new Date('2026-09-25T07:20:00+02:00'),{lat:49.78,lon:9.88},weather);
 assert.equal(state.fog,1);assert.equal(state.cloudLow,0);assert.equal(state.cloudMid,.2);assert.equal(state.cloudHigh,.8);
 delete current.cloud_cover_high;assert.equal(validateWeather({current}).cloudHigh,null);
});
test('twilight exposure is continuous across the night and day boundaries',()=>{
 for(const threshold of [-12,-6,0,3,10,12]){
  const a=solarLight({solarElevation:threshold-.001}),b=solarLight({solarElevation:threshold+.001});
  for(const key of ['sky','twilight','night'])assert.ok(Math.abs(a[key]-b[key])<.001,key);
 }
});

test('low overcast and fog suppress horizon colour without darkening the entire sky',()=>{
 const base={solarElevation:-2,daylight:.12,cloud:0,cloudLow:0,fog:0};
 const clear=solarLight(base),high=solarLight({...base,cloud:.8,cloudHigh:.8});
 const overcast=solarLight({...base,cloud:1,cloudLow:1});
 const fog=solarLight({...base,fog:1});
 assert.ok(high.twilight>overcast.twilight*3);
 assert.ok(overcast.twilight<clear.twilight*.15);
 assert.ok(fog.twilight<=clear.twilight*.11);
 assert.equal(clear.sky,overcast.sky);
 for(const elevation of [-18,15,40])assert.equal(solarLight({...base,solarElevation:elevation}).twilight,0);
});
