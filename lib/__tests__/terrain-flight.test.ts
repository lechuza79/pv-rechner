import {expect,it} from 'vitest';
import * as THREE from 'three';
import {terrainFlight} from '../terrain-flight';

it('travels at continuous speed over uneven ground and turns without a heading jump',()=>{
  const ground=(x:number)=>4+3*Math.sin(x/13);
  const goal=new THREE.Vector3(170,ground(170),0);
  const path=new THREE.CatmullRomCurve3([new THREE.Vector3(0,24,0),new THREE.Vector3(110,12,0),new THREE.Vector3(170,12,0),new THREE.Vector3(210,20,0)]);
  const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(path.getPoint(0),goal,new THREE.Vector3(0,1,0)));
  const flight=terrainFlight(path,ground,goal,rotation,true);
  let previous=flight.sample(0),speed=0,maxAcceleration=0,maxTurn=0;
  for(let i=1;i<=600;i++){
    const pose=flight.sample(i/600),nextSpeed=pose.position.distanceTo(previous.position);
    expect(pose.position.y-ground(pose.position.x)).toBeGreaterThan(5);
    maxAcceleration=Math.max(maxAcceleration,Math.abs(nextSpeed-speed));
    maxTurn=Math.max(maxTurn,previous.orientation.angleTo(pose.orientation));
    previous=pose;speed=nextSpeed;
  }
  expect(maxAcceleration).toBeLessThan(.02);
  expect(maxTurn).toBeLessThan(.08);
  const end=flight.sample(1),forward=new THREE.Vector3(0,0,-1).applyQuaternion(end.orientation);
  expect(forward.angleTo(goal.clone().sub(end.position))).toBeLessThan(1e-6);
  expect(flight.sample(0).position.distanceTo(path.getPoint(0))).toBeLessThan(1e-6);
  expect(flight.sample(0).orientation.angleTo(rotation)).toBeLessThan(1e-6);
  // Ease in from rest and return upright for orbiting.
  expect(flight.sample(.001).position.distanceTo(flight.sample(0).position)).toBeLessThan(.0001);
  const right=new THREE.Vector3(1,0,0).applyQuaternion(end.orientation);
  expect(right.y).toBeCloseTo(0,6);
  const cruise=flight.sample(.5).position.y;
  for(const t of [.35,.4,.5,.6,.65])expect(flight.sample(t).position.y).toBeCloseTo(cruise,5);
});

it.each([0,Math.PI/2])('takes off forwards and banks into a change of heading (%s)',yaw=>{
 const start=new THREE.Vector3(0,20,0),goal=new THREE.Vector3(200,0,0);
 const path=new THREE.LineCurve3(start,new THREE.Vector3(180,20,0));
 const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
 const flight=terrainFlight(path,()=>0,goal,rotation,false);
 const departure=flight.sample(.02).position.clone().sub(start).normalize();
 expect(departure.dot(new THREE.Vector3(0,0,-1).applyQuaternion(rotation))).toBeGreaterThan(.99);
 let bank=0,turn=0,previous=flight.sample(0);
 for(let i=1;i<=600;i++){
  const pose=flight.sample(i/600);
  bank=Math.max(bank,Math.abs(new THREE.Vector3(1,0,0).applyQuaternion(pose.orientation).y));
  turn=Math.max(turn,previous.orientation.angleTo(pose.orientation));previous=pose;
 }
 expect(bank).toBeGreaterThan(.05);
 expect(bank).toBeLessThan(.31);
 expect(turn).toBeLessThan(.08);
});

it.each(Array.from({length:8},(_,i)=>i*Math.PI/4))('keeps the nose aligned with forward travel through the arrival turn (%s)',yaw=>{
 const start=new THREE.Vector3(0,24,0),goal=new THREE.Vector3(170,0,0);
 const end=new THREE.Vector3(210,20,40);
 const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
 const flight=terrainFlight(new THREE.LineCurve3(start,end),()=>0,goal,q,true);
 let previous=flight.sample(.05),maxTurn=0;
 for(let i=31;i<=570;i++){
  const t=i/600,pose=flight.sample(t);
  const velocity=flight.sample(t+.0001).position.sub(flight.sample(t-.0001).position).setY(0).normalize();
  const nose=new THREE.Vector3(0,0,-1).applyQuaternion(pose.orientation).setY(0).normalize();
  expect(nose.angleTo(velocity)).toBeLessThan(.025);
  maxTurn=Math.max(maxTurn,previous.orientation.angleTo(pose.orientation));previous=pose;
 }
 expect(maxTurn).toBeLessThan(.065);
 expect(flight.sample(1).position.distanceTo(end)).toBeLessThan(1e-6);
});
