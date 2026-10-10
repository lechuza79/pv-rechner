import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {projectLocationSign,SIGN_STEM_PIXELS,safeWindSignAnchor,WORLD_UNITS_PER_PIXEL,signInFrontOfCamera,locationSignShadow} from '../../components/landkreis/location-sign';

describe('upright scene sign',()=>{
 it('masks the panel and thin stem separately, leaving the surrounding scenery untouched',()=>{
  const camera=new THREE.PerspectiveCamera(42,1440/900,.1,4000);
  camera.position.set(35,45,100);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const sign=projectLocationSign(camera,new THREE.Vector3(0,8,0),250,160,1440,900,0);
  expect(sign.occlusionPath.split('M ')).toHaveLength(3);
  expect(sign.occlusionPath.match(/Z/g)).toHaveLength(2);
 });

 it('projects the HTML corners through the same camera, including roll and hero framing',()=>{
  const camera=new THREE.PerspectiveCamera(42,1440/900,.1,4000);
  camera.position.set(35,45,100);camera.lookAt(0,0,0);camera.rotateZ(.12);
  camera.setViewOffset(1440,900,-200,90,1440,900);camera.updateMatrixWorld();
  const anchor=new THREE.Vector3(0,8,0),width=250,height=160;
  const sign=projectLocationSign(camera,anchor,width,height,1440,900);
  const right=new THREE.Vector3(sign.normal.z,0,-sign.normal.x);
  const matrix=new THREE.Matrix4().fromArray(sign.matrix);
  for(const [x,y] of [[0,0],[width,0],[width,height],[0,height],[width/2,height+SIGN_STEM_PIXELS]]){
   const actual=new THREE.Vector4(x,y,0,1).applyMatrix4(matrix);
   const world=anchor.clone().addScaledVector(right,(x-width/2)*12/220);
   world.y+=(height+SIGN_STEM_PIXELS-y)*12/220;
   const expected=world.project(camera);
   expect(actual.x/actual.w).toBeCloseTo((expected.x+1)*720,8);
   expect(actual.y/actual.w).toBeCloseTo((1-expected.y)*450,8);
  }
  expect(sign.normal.y).toBe(0);
 });
 it('connects a card lifted above roofs to the actual terrain in the same perspective plane',()=>{
  const camera=new THREE.PerspectiveCamera(42,1440/900,.1,4000);
  camera.position.set(35,45,100);camera.lookAt(0,0,0);camera.rotateZ(.12);camera.updateMatrixWorld();
  const anchor=new THREE.Vector3(10,12,4),ground=3,width=250,height=160;
  const sign=projectLocationSign(camera,anchor,width,height,1440,900,ground);
  const actual=new THREE.Vector4(width/2,height+sign.stemPixels,0,1).applyMatrix4(new THREE.Matrix4().fromArray(sign.matrix));
  const expected=new THREE.Vector3(anchor.x,ground,anchor.z).project(camera);
  expect(actual.x/actual.w).toBeCloseTo((expected.x+1)*720,8);
  expect(actual.y/actual.w).toBeCloseTo((1-expected.y)*450,8);
  expect(sign.stemPixels).toBeGreaterThan(SIGN_STEM_PIXELS);
  expect(sign.transform).toBe(projectLocationSign(camera,anchor,width,height,1440,900).transform);
 });
 it('compensates the real perspective magnification of nearby chart strokes',()=>{
  const camera=new THREE.PerspectiveCamera(42,1440/900,.1,4000),anchor=new THREE.Vector3();
  const scaleAt=(distance:number)=>{camera.position.set(0,10,distance);camera.lookAt(anchor);camera.updateMatrixWorld();return projectLocationSign(camera,anchor,250,240,1440,900).strokeScale;};
  const far=scaleAt(150),near=scaleAt(30);
  expect(near).toBeGreaterThan(far);expect(far).toBe(1);
  const center=anchor.clone().setY((240/2+SIGN_STEM_PIXELS)*WORLD_UNITS_PER_PIXEL);
  const project=(p:THREE.Vector3)=>{const v=p.clone().project(camera);return new THREE.Vector2((v.x+1)*720,(1-v.y)*450);};
  const screen=project(center);
  const horizontal=project(center.clone().add(new THREE.Vector3(WORLD_UNITS_PER_PIXEL,0,0))).distanceTo(screen);
  const vertical=project(center.clone().add(new THREE.Vector3(0,-WORLD_UNITS_PER_PIXEL,0))).distanceTo(screen);
  expect(near).toBeCloseTo(Math.max(1,horizontal,vertical),8);
 });
 it('foreshortens an upright sign from above instead of keeping it screen-flat',()=>{
  const camera=new THREE.PerspectiveCamera(42,1,.1,4000);
  camera.position.set(0,100,100);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const matrix=new THREE.Matrix4().fromArray(projectLocationSign(camera,new THREE.Vector3(),250,160,800,800).matrix);
  const point=(x:number,y:number)=>{const v=new THREE.Vector4(x,y,0,1).applyMatrix4(matrix);return new THREE.Vector2(v.x/v.w,v.y/v.w);};
  expect(point(0,0).distanceTo(point(250,0))).toBeGreaterThan(point(0,160).distanceTo(point(250,160)));
 });
});

describe('geographic sign placement and lifecycle',()=>{
 it('clears clustered rotor sweeps for every panel bearing while preserving the flight destination',()=>{
  const origin={x:0,z:0},turbines=[{x:0,z:0,rotor:12},{x:13,z:0,rotor:14},{x:-10,z:7,rotor:10}];
  const anchor=safeWindSignAnchor(origin,turbines,250,.1);
  expect(origin).toEqual({x:0,z:0});
  for(let bearing=0;bearing<360;bearing+=5)for(const edge of [-1,1]){
   const p={x:anchor.x+edge*Math.cos(bearing*Math.PI/180)*250*WORLD_UNITS_PER_PIXEL/2,z:anchor.z+edge*Math.sin(bearing*Math.PI/180)*250*WORLD_UNITS_PER_PIXEL/2};
   for(const t of turbines)expect(Math.hypot(p.x-t.x,p.z-t.z)).toBeGreaterThanOrEqual(t.rotor*.6+1-1e-8);
  }
 });
 it('retains offscreen cards until they pass behind the camera',()=>{
  const camera=new THREE.PerspectiveCamera(42,1,.1,4000);camera.lookAt(0,0,-1);camera.updateMatrixWorld();
  const offscreen=new THREE.Vector3(500,0,-10);
  expect(offscreen.clone().project(camera).x).toBeGreaterThan(1);
  expect(signInFrontOfCamera(camera,offscreen)).toBe(true);
  expect(signInFrontOfCamera(camera,new THREE.Vector3(0,0,10))).toBe(false);
 });
 it('casts a shadow from the exact upright HTML plane and removes it behind the camera',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(20,30,100);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const shadow=locationSignShadow(scene),anchor=new THREE.Vector3(0,8,0);
  shadow.update(camera,anchor,250,160);
  expect(shadow.mesh.castShadow).toBe(true);expect(shadow.mesh.visible).toBe(true);
  const normal=new THREE.Vector3(0,0,1).applyQuaternion(shadow.mesh.quaternion);
  expect(normal.y).toBeCloseTo(0);
  expect(shadow.mesh.position.y).toBeCloseTo(anchor.y+(160/2+SIGN_STEM_PIXELS)*WORLD_UNITS_PER_PIXEL);
  expect(shadow.mesh.scale.x).toBeCloseTo(250*WORLD_UNITS_PER_PIXEL);
  shadow.update(camera,new THREE.Vector3(20,30,200),250,160);expect(shadow.mesh.visible).toBe(false);
  shadow.dispose();expect(scene.children).toHaveLength(0);
 });
});
