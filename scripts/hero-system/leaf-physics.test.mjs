import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../../public/hero-system/source/leaf-physics.js',import.meta.url),'utf8');
const {windMetresPerSecond,createLeafMotion,advanceLeaf}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const run=(seed,fps,wind)=>{const p=createLeafMotion(seed,wind),position=[0,0,0];for(let i=0;i<fps*2;i++){const d=advanceLeaf(p,i/fps,1/fps,wind);d.forEach((v,j)=>position[j]+=v);}return position;};
test('wind units are correct and turbulent flight is stable across frame rates',()=>{
 assert.equal(windMetresPerSecond(36/15),10);
 const a=run(2,30,80/15),b=run(2,60,80/15);
 assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<.3);
 assert.ok(a[0]>10,'storm transport covers metres, not an arbitrary pixel distance');
});
test('different leaves have distinct three-dimensional paths',()=>{
 const a=run(2,30,80/15),b=run(7,30,80/15);
 assert.ok(Math.abs(a[0]-b[0])>1);assert.ok(Math.abs(a[1]-b[1])>.1);assert.ok(Math.abs(a[2]-b[2])>.1);
});
