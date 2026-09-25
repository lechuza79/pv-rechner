import test from 'node:test';
import assert from 'node:assert/strict';
import {createFramePacer} from '../../public/hero-system/source/frame-pacer.js';

test('keeps 30fps despite irregular display callbacks',()=>{
 for(const hz of [60,90,120,144]){
  const pace=createFramePacer();let count=0;
  for(let i=0;i<hz*10;i++)if(pace.shouldDraw(i*1000/hz+(i%3)*1.2))count++;
  assert.ok(Math.abs(count-300)<=1,`${hz}Hz: ${count} frames`);
 }
});
test('does not replay missed frames after a stall',()=>{
 const pace=createFramePacer();pace.shouldDraw(0);
 assert.equal(pace.shouldDraw(5000),true);
 assert.equal(pace.shouldDraw(5001),false);
 pace.reset();assert.equal(pace.shouldDraw(5002),true);
});
test('forced weather/contrast draw does not shift the animation cadence',()=>{
 const pace=createFramePacer();pace.shouldDraw(0);
 assert.equal(pace.shouldDraw(12,true),true);
 assert.equal(pace.shouldDraw(34),true);
 assert.equal(pace.shouldDraw(40),false);
});
