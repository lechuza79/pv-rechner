import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../public/hero-system/source/wind-motion.js',import.meta.url),'utf8');
const {sampleWind,leafRelease,treeWindResponse}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('calm stays calm and reversing wind reverses motion across the speed range',()=>{
 for(const speed of [0,5,12,30,50,75,90])for(let t=0;t<40;t+=.1){
  const a=sampleWind(t,speed/15,1),b=sampleWind(t,speed/15,-1);
  assert.equal(a.wind,-b.wind);
  if(speed===0)assert.equal(a.wind,0);
  for(const value of Object.values(treeWindResponse(a.wind)))assert.ok(Number.isFinite(value));
 }
 assert.ok(treeWindResponse(12/15).trunk<.002);
 assert.ok(treeWindResponse(90/15).trunk>treeWindResponse(50/15).trunk*2);
 assert.ok(treeWindResponse(90/15).leaf<3,'flutter must saturate before storm motion folds leaves through their stems');
});
test('leaf release has long quiet gaps and strong gust bursts on the same clock',()=>{
 let quiet=0,burst=0;
 for(let t=0;t<110;t+=.1){const {pulse}=sampleWind(t,.8);const rate=leafRelease(t,{windPulse:pulse});if(rate<.05)quiet++;if(rate>4)burst++;}
 assert.ok(quiet>450,'at least 45 seconds without continuous leaf emission');
 assert.ok(burst>80,'several clear release bursts');
 assert.equal(leafRelease(7,{windPulse:1}),8.025,'manual gust must release leaves too');
});
