import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const upstream='/Users/eule/.codex/.chatgpt-projects/g-p-68cb08f24e0c8191aa1050b084bc0b5e/output/solar-hero-handoff/dynamic-hero';
const {build}=createRequire(upstream+'/package.json')('esbuild');
test('Cooperative tree generation preserves every geometry attribute and yields',async()=>{
 const result=await build({stdin:{contents:`export {Tree} from './node_modules/@dgreenheck/ez-tree/src/lib/tree.js';export {createTreeAsync} from './tree-async.js';export {default as preset} from './node_modules/@dgreenheck/ez-tree/src/lib/presets/ash_small.json';`,resolveDir:path.resolve('public/hero-system/source')},bundle:true,write:false,platform:'node',format:'esm',nodePaths:[upstream+'/node_modules'],plugins:[{name:'upstream-package',setup(b){b.onResolve({filter:/^\.\/node_modules\//},args=>({path:path.join(upstream,args.path)}));}},{name:'test-textures',setup(b){b.onResolve({filter:/^\.\/textures$/},()=>({path:'textures',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const getLeafTexture=()=>null;export const getBarkTexture=()=>null;'}));}}]});
 const {Tree,createTreeAsync,preset}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 for(let i=0;i<4;i++){
  const p=structuredClone(preset);p.seed=26867+i*91;p.bark.textured=false;p.leaves.count=26;p.leaves.size=3.1;p.branch.sections={0:8,1:7,2:5,3:3};p.branch.segments={0:6,1:4,2:3,3:3};
  const original=new Tree();original.loadFromJson(p);
  let ticks=0;const timer=setInterval(()=>ticks++,0);const actual=await createTreeAsync(p);clearInterval(timer);assert.ok(ticks>=3);
  for(const mesh of ['branchesMesh','leavesMesh']){
   const a=actual[mesh].geometry,b=original[mesh].geometry;
   assert.deepEqual(a.index.array,b.index.array);
   assert.deepEqual(Object.keys(a.attributes),Object.keys(b.attributes));
   for(const key of Object.keys(a.attributes))assert.deepEqual(a.attributes[key].array,b.attributes[key].array);
   a.dispose();b.dispose();actual[mesh].material.dispose();original[mesh].material.dispose();
  }
 }
});
