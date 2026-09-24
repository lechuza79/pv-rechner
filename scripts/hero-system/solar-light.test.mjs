import test from 'node:test';
import assert from 'node:assert/strict';
import {solarLight} from '../../public/hero-system/source/solar-light.js';
test('civil dawn increases continuously and has no direct sun below horizon',()=>{
 let previous=-1;
 for(const elevation of [-6,-5.99,-5,-3,-.01,0,1,6,12,29]){
  const light=solarLight({phase:elevation<12?'dawn':'day',solarElevation:elevation,daylight:(elevation+6)/35});
  assert.ok(light.daylight>=previous);previous=light.daylight;
  if(elevation<=0)assert.equal(light.sun,0);
  if(elevation<-5)assert.ok(light.sky<.15);
 }
 assert.equal(solarLight({phase:'dawn',daylight:0}).sun,0);
});
