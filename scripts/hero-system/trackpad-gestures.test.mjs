import test from 'node:test';
import assert from 'node:assert/strict';
import {bindTrackpadGestures} from '../../public/shared-3d/trackpad-gestures.js';
function fixture(mode='trackpad'){
 const canvas=new EventTarget();canvas.clientHeight=400;const moves=[],zooms=[];let enabled=true;
 const dispose=bindTrackpadGestures(canvas,{pan:(x,y)=>moves.push([x,y]),zoom:f=>zooms.push(f),mode:()=>mode,enabled:()=>enabled});
 const emit=(type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{deltaX:0,deltaY:0,deltaMode:0,ctrlKey:false},props);canvas.dispatchEvent(e);return e;};
 return {moves,zooms,emit,dispose,disable(){enabled=false;}};
}
test('two-finger wheel pans while pinch zooms without panning or page zoom',()=>{
 const f=fixture();assert.equal(f.emit('wheel',{deltaX:12,deltaY:-8}).defaultPrevented,true);assert.deepEqual(f.moves,[[-12,8]]);
 assert.equal(f.emit('wheel',{deltaY:-4,ctrlKey:true}).defaultPrevented,true);assert.ok(f.zooms[0]<1);assert.equal(f.moves.length,1);
 f.emit('wheel',{deltaY:4,ctrlKey:true});assert.ok(Math.abs(f.zooms[0]*f.zooms[1]-1)<1e-12);
});
test('Safari cumulative pinch applies incremental zoom and suppresses duplicate wheel',()=>{
 const f=fixture();f.emit('gesturestart',{scale:1});f.emit('gesturechange',{scale:1.2});f.emit('wheel',{ctrlKey:true,deltaY:-4});f.emit('gesturechange',{scale:1.5});
 assert.equal(f.zooms.length,2);assert.ok(Math.abs(f.zooms[0]*f.zooms[1]-1/1.5)<1e-12);
 f.emit('gestureend');f.emit('wheel',{ctrlKey:true,deltaY:3});assert.equal(f.zooms.length,3);
});
test('map pinch-only and mouse modes preserve ordinary page or wheel handling',()=>{
 for(const mode of ['pinch-only','mouse']){const f=fixture(mode);assert.equal(f.emit('wheel',{deltaY:30}).defaultPrevented,false);assert.equal(f.moves.length,0);assert.equal(f.emit('wheel',{deltaY:-3,ctrlKey:true}).defaultPrevented,true);}
});
test('disabled controls and disposed listeners do not capture gestures',()=>{
 const f=fixture();f.disable();assert.equal(f.emit('wheel',{deltaY:3,ctrlKey:true}).defaultPrevented,false);assert.equal(f.zooms.length,0);
 const g=fixture();g.dispose();assert.equal(g.emit('wheel',{deltaX:2,deltaY:3}).defaultPrevented,false);assert.equal(g.moves.length,0);
});
