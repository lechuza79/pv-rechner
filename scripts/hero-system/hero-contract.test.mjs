import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=file=>readFile(new URL('../../'+file,import.meta.url),'utf8');
test('rendering choices belong to each instance, not page query parameters',async()=>{
 for(const name of ['unified-renderer','panel-study','foreground-branch','panel-water']){
  assert.doesNotMatch(await read(`public/hero-system/source/${name}.js`),/location.search|document.querySelector/);
 }
});

test('scroll settling retries a scene boot interrupted before the second frame',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=await read('public/hero-system/source/hero-stage.js');
 const listener=source.split('\n').find(line=>line.includes("listen(window,'scroll'"));
 let onScroll,settle,boots=0,wakes=0;
 const context={window:{},stage:{getBoundingClientRect:()=>({top:0,height:500}),style:{setProperty(){}}},paused:false,media:{matches:false},scrolling:false,scrollTimer:0,
  listen(_target,_event,handler){onScroll=handler;},stop(){},clearTimeout(){},setTimeout(callback){settle=callback;return 1;},
  scheduleBoot(){assert.equal(context.scrolling,false);boots++;},wake(){wakes++;}};
 runInNewContext(listener,context);
 onScroll();assert.equal(context.scrolling,true);assert.equal(boots,0);
 settle();assert.equal(context.scrolling,false);assert.equal(boots,1);assert.equal(wakes,1);
});
