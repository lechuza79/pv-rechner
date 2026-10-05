import {existsSync,readFileSync} from "node:fs";
import {preparedLandscapeTour} from "../landscape-tour";
import {terrainHeight} from "../wind-terrain";
import {expect,it} from 'vitest';
import * as THREE from 'three';
import {referenceFlight,parkDeparture,REFERENCE_ORBIT_SPEED} from '../reference-flight';

it('repeats one forward route at constant world altitude without loops or a turn in place',()=>{
 const town=new THREE.Vector3(0,0,0),goal=new THREE.Vector3(300,8,70);
 const ground=(x:number,z:number)=>5+3*Math.sin(x/40)+2*Math.cos(z/20);
 const route=referenceFlight(town,goal,ground),repeat=referenceFlight(town,goal,ground);
 const travel=goal.clone().sub(town).setY(0).normalize();
 let previous=route.sample(0),maxAngle=0,maxBank=0;
 for(let i=1;i<=480;i++){
  const t=i/480,pose=route.sample(t),movement=pose.position.clone().sub(previous.position);
  expect(pose.position.y).toBeCloseTo(previous.position.y,10);
  expect(pose.position.y-ground(pose.position.x,pose.position.z)).toBeGreaterThan(9.9);
  if(t<=.78)expect(movement.dot(travel)).toBeGreaterThan(0);
  expect(pose.position.distanceTo(repeat.sample(t).position)).toBe(0);
  const heading=new THREE.Vector3(0,0,-1).applyQuaternion(pose.orientation).setY(0).normalize();
  const u=THREE.MathUtils.smootherstep(t,0,1);
  const derivative=route.curve.getPointAt(Math.min(1,u+.000001)).sub(route.curve.getPointAt(Math.max(0,u-.000001))).normalize();
  if(t<=.78)expect(heading.angleTo(derivative)).toBeLessThan(.00001);
  maxAngle=Math.max(maxAngle,pose.orientation.angleTo(previous.orientation));
  maxBank=Math.max(maxBank,Math.abs(new THREE.Vector3(1,0,0).applyQuaternion(pose.orientation).y));
  previous=pose;
 }
 expect(maxAngle).toBeLessThan(.02);
 expect(maxBank).toBeGreaterThan(.01);
 expect(maxBank).toBeLessThan(.23);
 expect(route.curve.getLength()).toBeLessThan(route.curve.v0.distanceTo(route.curve.v3)*1.1);
 const end=route.sample(1),nose=new THREE.Vector3(0,0,-1).applyQuaternion(end.orientation);
 expect(nose.angleTo(goal.clone().sub(end.position))).toBeLessThan(1e-6);
});


it('enters the orbit before arrival and matches its terminal velocity',()=>{
 const goal=new THREE.Vector3(300,8,70),route=referenceFlight(new THREE.Vector3(),goal,()=>0);
 const end=route.sample(1),before=route.sample(1-.0001);
 const velocity=end.position.clone().sub(before.position).divideScalar(route.duration/1000*.0001);
 const expected=new THREE.Vector3(0,1,0).cross(end.position.clone().sub(goal)).multiplyScalar(REFERENCE_ORBIT_SPEED);
 expect(velocity.distanceTo(expected)).toBeLessThan(.001);
 expect(route.sample(.95).position.distanceTo(end.position)).toBeGreaterThan(.3);
});

it('departs from the visible pose, crosses the park and arrives without orientation jumps',()=>{
 const park=new THREE.Vector3(0,4,0),goal=new THREE.Vector3(220,3,110);
 for(const angle of [0,1,2,3,4,5]){
  const start=new THREE.Vector3(55,20,25).applyAxisAngle(new THREE.Vector3(0,1,0),angle);
  const initial=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(start,park,new THREE.Vector3(0,1,0)));
  const route=parkDeparture(start,initial,park,goal,()=>0);
  expect(route.sample(0).position.distanceTo(start)).toBeLessThan(1e-8);
  expect(route.sample(0).orientation.angleTo(initial)).toBeLessThan(1e-6);
  let near=Infinity,previous=route.sample(0);
  for(let i=1;i<=540;i++){
   const pose=route.sample(i/540);
   near=Math.min(near,Math.hypot(pose.position.x-park.x,pose.position.z-park.z));
   expect(pose.orientation.angleTo(previous.orientation),`angle=${angle}, sample=${i}`).toBeLessThan(.08);
   expect(pose.position.y).toBeCloseTo(start.y,8);
   previous=pose;
  }
  expect(near).toBeLessThan(1);
  const end=route.sample(1);
  expect(new THREE.Vector3(0,0,-1).applyQuaternion(end.orientation).angleTo(goal.clone().sub(end.position))).toBeLessThan(1e-6);
 }
});


it('ignores unknown outer ground without inventing zero heights and fails without measured ground',()=>{
 const town=new THREE.Vector3(0,100,0),goal=new THREE.Vector3(300,110,0);
 const ground=(x:number)=>x<0?Number.NaN:110;
 const route=referenceFlight(town,goal,ground);
 for(const t of [0,.5,1])expect(route.sample(t).position.toArray().every(Number.isFinite)).toBe(true);
 expect(route.sample(0).position.y).toBe(120);
 expect(()=>referenceFlight(town,goal,()=>Number.NaN)).toThrow('No measured terrain');
});


it.skipIf(!existsSync('public/geo/landscape-tours/09679/scene.json'))('keeps every actual Wuerzburg tour destination and camera pose finite',()=>{
 const raw=JSON.parse(readFileSync('public/geo/landscape-tours/09679/scene.json','utf8'));
 const tour=preparedLandscapeTour(raw);expect(tour.stops).toHaveLength(raw.stops.length+1);
 let unknown=0;
 const ground=(x:number,z:number)=>{const height=terrainHeight(tour.terrain,x,z);if(!Number.isFinite(height))unknown++;return height;};
 const target=(index:number)=>{const stop=tour.stops[index];return new THREE.Vector3(stop.x,ground(stop.x,stop.z),stop.z);};
 const town=target(0);let current=target(1),route:ReturnType<typeof referenceFlight>|ReturnType<typeof parkDeparture>=referenceFlight(town,current,ground);
 const verify=(flight:typeof route)=>{
  for(let i=0;i<=32;i++){
   const pose=flight.sample(i/32);
   expect(pose.position.toArray().every(Number.isFinite)).toBe(true);
   expect(pose.orientation.toArray().every(Number.isFinite)).toBe(true);
   expect(Number.isFinite(pose.targetDistance)).toBe(true);
  }
 };
 verify(route);let pose=route.sample(1);
 for(let index=2;index<=tour.stops.length;index++){
  const next=target(index%tour.stops.length);
  route=parkDeparture(pose.position,pose.orientation,current,next,ground);verify(route);
  pose=route.sample(1);current=next;
 }
 expect(unknown).toBeGreaterThan(0);
},20_000);
