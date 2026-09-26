import test from 'node:test';
import assert from 'node:assert/strict';
import {createSunOptics} from '../../public/hero-system/source/sun-optics.js';

test('unchanged optics do not mutate the DOM; weather and position still update',()=>{
 const original=globalThis.document;
 let writes=0;
 const style=()=>new Proxy({setProperty(key,value){this[key]=value;}},{set(target,key,value){writes++;target[key]=value;return true;}});
 const ghost={style:style()},layer={style:style(),setAttribute(){},querySelector(){return ghost;},remove(){}};
 const root={dataset:{},style:style()};
 globalThis.document={createElement(){return layer;}};
 try{
  const sun=createSunOptics({append(){}},root);
  const state={phase:'day',solarElevation:30,cloud:0,rain:0,sunX:20,sunY:30};
  sun.update(state,'flare');const first=writes;
  assert.ok(Number(layer.style.opacity)>0);
  sun.update({...state},'flare');assert.equal(writes,first);
  sun.update({...state,rain:1},'flare');assert.equal(layer.style.opacity,'0');
  sun.update({...state,sunX:80},'flare');assert.equal(ghost.style.left,'30.5%');
  sun.update(state,'natural');assert.equal(layer.style.opacity,'0');
 }finally{globalThis.document=original;}
});
