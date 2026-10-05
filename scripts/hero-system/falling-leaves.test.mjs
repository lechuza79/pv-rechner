import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const upstream=JSON.parse(await readFile(new URL('./upstream.json',import.meta.url),'utf8')).source;
const {build}=createRequire(upstream+'/package.json')('esbuild');
const result=await build({stdin:{contents:`export * as THREE from 'three';export {createFallingLeaves} from './falling-leaves.js';export {prepareSeasonalLeaves} from './seasonal-leaves.js';export {createForegroundLeafFall} from './foreground-leaf-fall.js';`,resolveDir:path.resolve('public/hero-system/source')},bundle:true,write:false,platform:'node',format:'esm',nodePaths:[upstream+'/node_modules']});
const {THREE,createFallingLeaves,prepareSeasonalLeaves,createForegroundLeafFall}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

function setup(){
  const scene=new THREE.Scene(), tree=new THREE.Group();
  tree.options={leaves:{billboard:'single'}};
  tree.leavesMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshPhongMaterial());
  tree.leavesMesh.geometry.translate(0,20,0);tree.add(tree.leavesMesh);
  const field=createFallingLeaves(scene,[tree]),mesh=scene.children[0];
  return {field,mesh,scene};
}
const autumn={foliage:{color:.8,loss:.5}},winter={foliage:{color:1,loss:1}};
function positions(mesh){const result=[];for(let i=0;i<mesh.count;i++){const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);result.push(new THREE.Vector3().setFromMatrixPosition(matrix));}return result;}

test('leaves descend from crowns and wind reverses their horizontal travel',()=>{
  const left=setup(),right=setup();
  for(let n=0;n<=100;n++){left.field.update(n/30,autumn,-1);right.field.update(n/30,autumn,1);}
  const a=positions(left.mesh),b=positions(right.mesh);
  assert.ok(a.length>5);assert.equal(a.length,b.length);
  assert.ok(a[0].x<-5&&b[0].x>5,'wind must visibly displace the leaf');
  assert.ok(a[0].y<18&&a[0].y>0,'leaves must fall from the crown');
  left.field.dispose();right.field.dispose();assert.equal(left.scene.children.length,0);
});

test('pause freezes all leaves; winter clears them; mobile pool stays bounded',()=>{
  const {field,mesh}=setup();
  for(let n=0;n<1800;n++)field.update(n/30,autumn,4,true);
  assert.ok(mesh.count>0&&mesh.count<=40);
  const before=Array.from(mesh.instanceMatrix.array);
  field.update(1799/30,autumn,4,true);
  assert.deepEqual(Array.from(mesh.instanceMatrix.array),before);
  field.update(60,winter,4,true);assert.equal(mesh.count,0);
  field.dispose();
});

test('crossed leaf cards share one shedding date and new renderers keep the material hook',()=>{
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshPhongMaterial());
  mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(48),3));
  let originalCalled=false;mesh.material.onBeforeCompile=()=>{originalCalled=true;};
  const controller=prepareSeasonalLeaves(mesh,8),seeds=mesh.geometry.getAttribute('seasonSeed').array;
  assert.equal(new Set(seeds.slice(0,8)).size,1);assert.notEqual(seeds[0],seeds[8]);
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};
  mesh.material.onBeforeCompile(shader);
  assert.equal(originalCalled,true);
  controller.update(winter);assert.equal(mesh.visible,false);
  controller.update(autumn);assert.equal(mesh.visible,true);
  assert.equal(mesh.material.emissive.getHex(),0,'unlit tree leaves must not glow in autumn');
  assert.equal(shader.uniforms.foliageLoss.value,.5);
  mesh.geometry.dispose();mesh.material.dispose();
});


test('near leaves are visible in early October, pause exactly and clear in winter',()=>{
  const camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.z=5;camera.lookAt(0,0,0);
  const field=createForegroundLeafFall(camera),state={foliage:{color:.23,loss:.007},windMotion:1,phase:'day',daylight:1};
  for(let n=0;n<180;n++)field.update(n/30,state,375);
  const visible=field.scene.children.filter(m=>m.isMesh&&m.visible);
  assert.ok(visible.length>0&&visible.length<=8);
  const before=visible.map(m=>[...m.position.toArray(),...m.rotation.toArray()]);
  field.update(179/30,state,375);
  assert.deepEqual(visible.map(m=>[...m.position.toArray(),...m.rotation.toArray()]),before);
  field.update(6,{...state,foliage:{color:1,loss:1}},375);
  assert.equal(field.scene.children.filter(m=>m.isMesh&&m.visible).length,0);
  field.dispose();assert.equal(field.scene.children.length,0);
});


test('nearby leaves enter from the upwind side below the sky in both wind directions',()=>{
  for(const wind of [-.8,.8]){
    const camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.z=5;camera.lookAt(0,0,0);
    const field=createForegroundLeafFall(camera),state={foliage:{color:.7,loss:.4},windMotion:wind,phase:'day',daylight:1};
    field.update(0,state,1280);field.update(1/30,state,1280);
    const first=field.scene.children.find(m=>m.isMesh&&m.visible);assert.ok(first);
    const entry=first.position.clone().project(camera);
    assert.ok(Math.sign(wind)*entry.x<-.95,'entry must be on the upwind edge');
    assert.ok(entry.y<0,'entry must be below the open sky');
    for(let n=2;n<900;n++){
      field.update(n/30,state,1280);
      for(const leaf of field.scene.children.filter(m=>m.isMesh&&m.visible)){
        assert.ok(leaf.position.clone().project(camera).y<0,'no leaf may rain down from above');
      }
    }
    field.dispose();
  }
});

test('detachment hides both crossed cards exactly once and resets on a date change',()=>{
 const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshPhongMaterial());
 mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(48),3));
 const foliage=prepareSeasonalLeaves(mesh,8);foliage.update({foliage:{color:.5,loss:0}});
 assert.equal(foliage.detach(0,0),true);assert.equal(foliage.detach(0,0),false);
 assert.deepEqual(Array.from(mesh.geometry.getAttribute('leafDetached').array.slice(0,8)),Array(8).fill(1));
 foliage.update({foliage:{color:.6,loss:0}});assert.equal(foliage.detach(0,0),true);
 mesh.geometry.dispose();mesh.material.dispose();
});
test('branch release preserves its world pose, then separates from the stem',()=>{
 const camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.z=5;camera.lookAt(0,0,0);
 const field=createForegroundLeafFall(camera),parent=new THREE.Group(),source=new THREE.Mesh(new THREE.PlaneGeometry(.1,.1),new THREE.MeshBasicMaterial());
 parent.position.set(.1,-.1,0);parent.add(source);parent.updateMatrixWorld(true);
 const start=source.getWorldPosition(new THREE.Vector3());assert.equal(field.release(source,1),true);
 const released=field.branchScene.children.find(m=>m.isMesh);assert.ok(released.position.distanceTo(start)<1e-9);
 const state={foliage:{color:.5,loss:.1},windMotion:1,phase:'day',daylight:1};
 for(let n=0;n<20;n++)field.update(n/30,state,1000);
 assert.ok(released.position.distanceTo(start)>.01);assert.equal(source.position.length(),0);
 field.dispose();source.geometry.dispose();source.material.dispose();
});
