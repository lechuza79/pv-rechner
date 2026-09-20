import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const context={};runInNewContext(read('public/homepage-study/hero-contrast.js'),context);
const {choose,sample,over}=context.SolarHeroContrast;
const template=read('app/_neon/startseite.html');
const gradients=Object.fromEntries(['day','overcast','dawn','dusk','night'].map(name=>{
 const gradient=template.match(new RegExp('\\.sky-'+name+'\\{[^}]*background:([^;}]+)'))[1];
 return [name,gradient.replace(/#([\da-f]{6})/gi,(_,hex)=>'rgb('+hex.match(/../g).map(x=>parseInt(x,16)).join(', ')+')')];
}));
test('every flat brightness has a readable foreground without changing the background',()=>{
 for(let i=0;i<=255;i++)assert.ok(choose([[i,i,i]]).ratio>=4.5);
});
test('real CSS gradient stops, filters and alpha composition',()=>{
 assert.deepEqual(Array.from(sample('linear-gradient(rgb(0, 0, 0) 0%, rgb(200, 100, 50) 100%)',.5)),[100,50,25,1]);
 assert.deepEqual(Array.from(over([200,200,200],[0,0,0,1],.5)),[100,100,100]);
 for(const gradient of Object.values(gradients))assert.ok(sample(gradient,.5));
});
test('all existing sky palettes at all brightness levels choose their strongest readable ink',()=>{
 let checked=0;
 for(const gradient of Object.values(gradients))for(let brightness=0;brightness<=100;brightness++)for(let y=0;y<=100;y++){
  const bg=sample(gradient,y/100).slice(0,3).map(v=>v*brightness/100);
  assert.ok(choose([bg]).ratio>=4.5);checked++;
 }
 console.log(`${checked} sky/brightness/position combinations checked`);
});
test('unsafe previous colors never survive hysteresis; safe colors do not chatter',()=>{
 assert.equal(choose([[230,230,230]],'light').tone,'dark');
 assert.equal(choose([[15,15,15]],'dark').tone,'light');
 assert.equal(choose([[240,240,240]],'dark').tone,'dark');
});
test('host has no backing surface and mobile/legacy colors cannot override region decisions',()=>{
 const css=read('public/homepage-study/homepage.css'),js=read('public/homepage-study/interactions.js');
 assert.doesNotMatch(css,/sc-hero-backing|sc-hero-contrast\{/);
 assert.doesNotMatch(js,/createElement\('canvas'\)|sc-hero-contrast/);
 assert.match(js,/getComputedStyle\(node\)/);
 assert.match(css,/\.hero-actions\[data-hero-tone\] \.secondary-cta\{color:var\(--sc-region-ink\)!important/);
});
