import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
const sharedRoot=path.join(process.env.SOLAR_SITE_ROOT ?? '/Users/eule/projects/pv-rechner','public');
const boot=await readFile(path.join(sharedRoot,'shared-nav/header-boot.js'),'utf8');
function run(load){
 const root={dataset:{},hasAttribute:()=>true};
 let deadline,delay,cancelled=false;
 vm.runInNewContext(boot,{document:{documentElement:root,readyState:'complete',fonts:{load}},setTimeout:(callback,ms)=>{deadline=callback;delay=ms;return 1;},clearTimeout:()=>{cancelled=true;}});
 return {root,deadline,delay,isCancelled:()=>cancelled};
}
test('shell stays hidden until both real font loads complete',async()=>{
 const pending=[];const state=run(()=>new Promise(resolve=>pending.push(resolve)));
 assert.equal(state.root.dataset.scFonts,'pending');
 pending[0]();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(state.root.dataset.scFonts,'pending');
 pending[1]();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(state.root.dataset.scFonts,'ready');assert.equal(state.isCancelled(),true);
});
test('failed and stalled fonts cannot leave the header invisible',async()=>{
 const failed=run(()=>Promise.reject(new Error('offline')));
 await new Promise(resolve=>setImmediate(resolve));assert.equal(failed.root.dataset.scFonts,'ready');
 const stalled=run(()=>new Promise(()=>{}));assert.equal(stalled.delay,1800);
 stalled.deadline();assert.equal(stalled.root.dataset.scFonts,'ready');
});
