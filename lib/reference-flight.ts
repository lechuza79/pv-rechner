import * as THREE from 'three';

// Match OrbitControls' signed angular speed, in radians per second.
export const REFERENCE_ORBIT_SPEED=-2*Math.PI/60*.35;
const up=new THREE.Vector3(0,1,0);
function arrive(t:number,duration:number,position:THREE.Vector3,orientation:THREE.Quaternion,goal:THREE.Vector3){
  const blend=THREE.MathUtils.smootherstep(t,.78,1);
  const q=THREE.MathUtils.clamp((t-.78)/.22,0,1);
  // Integral of smoothstep: zero initial acceleration, full orbit speed at arrival.
  const angle=REFERENCE_ORBIT_SPEED*duration/1000*.22*(q*q*q-.5*q*q*q*q);
  position.sub(goal).applyAxisAngle(up,angle).add(goal);
  orientation.premultiply(new THREE.Quaternion().setFromAxisAngle(up,angle));
  const facing=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,goal,up));
  orientation.slerp(facing,blend);
  return {position,orientation,targetDistance:position.distanceTo(goal)};
}

/** Unknown outer ground has no height; camera clearance uses measured samples only. */
function measuredFlightAltitude(points:THREE.Vector3[],ground:(x:number,z:number)=>number){
 const heights=points.map(p=>ground(p.x,p.z)).filter(Number.isFinite);
 if(!heights.length)throw new Error('No measured terrain for flight clearance');
 return Math.max(...heights)+10;
}

/** Authored Nidda-to-park shot. Repeatable independently of the current orbit. */
export function referenceFlight(town:THREE.Vector3,goal:THREE.Vector3,ground:(x:number,z:number)=>number){
  const forward=goal.clone().sub(town).setY(0).normalize();
  const side=new THREE.Vector3(-forward.z,0,forward.x);
  const start=town.clone().addScaledVector(forward,-65).addScaledVector(side,-12);
  const end=goal.clone().addScaledVector(forward,-55).addScaledVector(side,25);
  const arrival=goal.clone().sub(end).setY(0).normalize();
  const length=start.distanceTo(end);
  const curve=new THREE.CubicBezierCurve3(start,start.clone().addScaledVector(forward,length*.32),end.clone().addScaledVector(arrival,-length*.28),end);
  if(!Number.isFinite(town.y)||!Number.isFinite(goal.y))throw new Error('Missing terrain at flight destination');
  const altitude=measuredFlightAltitude([...curve.getPoints(256),town,goal],ground);
  for(const point of [curve.v0,curve.v1,curve.v2,curve.v3])point.y=altitude;
  curve.arcLengthDivisions=2048;curve.updateArcLengths();
  const tangent=(u:number)=>{
    const v=curve.getUtoTmapping(u,0);
    return curve.v1.clone().sub(curve.v0).multiplyScalar((1-v)**2).addScaledVector(curve.v2.clone().sub(curve.v1),2*(1-v)*v).addScaledVector(curve.v3.clone().sub(curve.v2),v*v).normalize();
  };
  const duration=8000,up=new THREE.Vector3(0,1,0),matrix=new THREE.Matrix4();
  const endPitch=Math.atan2(goal.y-altitude,Math.hypot(goal.x-end.x,goal.z-end.z));
  return {curve,duration,sample(t:number){
    const u=THREE.MathUtils.smootherstep(t,0,1),position=curve.getPointAt(u);
    const ahead=tangent(u);
    const pitch=THREE.MathUtils.lerp(-.06,endPitch,THREE.MathUtils.smootherstep(u,.78,1));
    const before=tangent(Math.max(0,u-.035)),after=tangent(Math.min(1,u+.035));
    const turn=Math.atan2(before.z*after.x-before.x*after.z,before.x*after.x+before.z*after.z);
    const bank=THREE.MathUtils.clamp(turn*2,-.22,.22)*THREE.MathUtils.smootherstep(t,0,.15)*(1-THREE.MathUtils.smootherstep(t,.8,1));
    ahead.multiplyScalar(Math.cos(pitch));ahead.y=Math.sin(pitch);
    const orientation=new THREE.Quaternion().setFromRotationMatrix(matrix.lookAt(position,position.clone().add(ahead),up));
    orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),bank));
    return arrive(t,duration,position,orientation,goal);
  }};
}

/** Leave the current orbit through the park, then bend toward the next stop. */
export function parkDeparture(start:THREE.Vector3,initial:THREE.Quaternion,park:THREE.Vector3,goal:THREE.Vector3,ground:(x:number,z:number)=>number){
  const heading=park.clone().sub(start).setY(0).normalize();
  const pass=park.clone().addScaledVector(heading,18).setY(start.y);
  const bearing=goal.clone().sub(pass).setY(0).normalize();
  const end=goal.clone().addScaledVector(bearing,-55).setY(start.y);
  const distance=pass.distanceTo(end);
  const side=new THREE.Vector3(-heading.z,0,heading.x);
  if(side.dot(bearing)<0)side.negate();

  const curve=new THREE.CurvePath<THREE.Vector3>();
  curve.add(new THREE.LineCurve3(start.clone(),pass));
  // A destination behind the park needs room for a forward-moving turn.
  if(heading.dot(bearing)<0){
    const radius=Math.max(45,distance*.28);
    const bend=pass.clone().addScaledVector(heading,radius).addScaledVector(side,radius);
    curve.add(new THREE.CubicBezierCurve3(pass,pass.clone().addScaledVector(heading,radius*.55),bend.clone().addScaledVector(side,-radius*.55),bend));
    curve.add(new THREE.CubicBezierCurve3(bend,bend.clone().addScaledVector(side,radius*1.5),end.clone().addScaledVector(bearing,-distance*.28),end));
  }else{
    curve.add(new THREE.CubicBezierCurve3(pass,pass.clone().addScaledVector(heading,distance*.22),end.clone().addScaledVector(bearing,-distance*.28),end));
  }
  curve.arcLengthDivisions=2048;curve.updateArcLengths();
  if(!Number.isFinite(start.y)||!Number.isFinite(park.y)||!Number.isFinite(goal.y))throw new Error('Missing terrain or camera pose at flight destination');
  const altitude=Math.max(start.y,measuredFlightAltitude([...curve.getPoints(256),park,goal],ground));
  const duration=9000;
  return {curve,duration,sample(t:number){
    const u=THREE.MathUtils.smootherstep(t,0,1);
    const position=curve.getPointAt(u);
    position.y=THREE.MathUtils.lerp(start.y,altitude,THREE.MathUtils.smootherstep(t,0,.3));
    const tangent=(s:number)=>curve.getPointAt(Math.min(1,s+.025)).sub(curve.getPointAt(Math.max(0,s-.025))).setY(0).normalize();
    const ahead=tangent(u),before=tangent(Math.max(0,u-.025)),after=tangent(Math.min(1,u+.025));
    const turn=Math.atan2(before.z*after.x-before.x*after.z,before.dot(after));
    const bank=THREE.MathUtils.clamp(turn*1.5,-.2,.2)*(1-THREE.MathUtils.smootherstep(t,.78,1));
    const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,position.clone().add(ahead),up));
    orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),bank));
    orientation.slerp(initial,1-THREE.MathUtils.smootherstep(t,0,.18));
    return arrive(t,duration,position,orientation,goal);
  }};
}
