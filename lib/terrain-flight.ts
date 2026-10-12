import * as THREE from 'three';

const up=new THREE.Vector3(0,1,0);
const horizontal=(v:THREE.Vector3)=>v.setY(0).normalize();

/** Fly forwards along a continuous route; banking follows its curvature. */
export function terrainFlight(path:THREE.Curve<THREE.Vector3>,ground:(x:number,z:number)=>number,goal:THREE.Vector3,startRotation:THREE.Quaternion,park:boolean){
  const start=path.getPointAt(0),end=path.getPointAt(1);
  const forward=horizontal(new THREE.Vector3(0,0,-1).applyQuaternion(startRotation));
  const arrival=horizontal(goal.clone().sub(end));
  const points:THREE.Vector3[]=[];
  // Circular turns plus straight travel bound the turning radius, including
  // destinations behind the camera. The camera never reverses or yaws in place.
  const radius=Math.max(30,Math.min(65,start.distanceTo(goal)*.15));
  const tau=Math.PI*2,wrap=(a:number)=>(a%tau+tau)%tau;
  const segment=(a:THREE.Vector3,b:THREE.Vector3,from:THREE.Vector3,to:THREE.Vector3)=>{
    const theta=Math.atan2(b.z-a.z,b.x-a.x),d=Math.hypot(b.x-a.x,b.z-a.z)/radius;
    const alpha=wrap(Math.atan2(from.z,from.x)-theta),beta=wrap(Math.atan2(to.z,to.x)-theta);
    const sa=Math.sin(alpha),sb=Math.sin(beta),ca=Math.cos(alpha),cb=Math.cos(beta),cab=Math.cos(alpha-beta);
    const candidates:{turns:number[];lengths:number[]}[]=[];
    const add=(turns:number[],p2:number,angle:(p:number)=>number,t:(v:number)=>number,q:(v:number)=>number)=>{
      if(p2<0)return;
      const p=Math.sqrt(p2),v=angle(p);
      candidates.push({turns,lengths:[wrap(t(v)),p,wrap(q(v))]});
    };
    add([1,0,1],2+d*d-2*cab+2*d*(sa-sb),()=>Math.atan2(cb-ca,d+sa-sb),v=>v-alpha,v=>beta-v);
    add([-1,0,-1],2+d*d-2*cab+2*d*(sb-sa),()=>Math.atan2(ca-cb,d-sa+sb),v=>alpha-v,v=>v-beta);
    add([1,0,-1],-2+d*d+2*cab+2*d*(sa+sb),p=>Math.atan2(-ca-cb,d+sa+sb)-Math.atan2(-2,p),v=>v-alpha,v=>v-beta);
    add([-1,0,1],-2+d*d+2*cab-2*d*(sa+sb),p=>Math.atan2(ca+cb,d-sa-sb)-Math.atan2(2,p),v=>alpha-v,v=>beta-v);
    const best=candidates.sort((a,b)=>a.lengths.reduce((s,n)=>s+n,0)-b.lengths.reduce((s,n)=>s+n,0))[0];
    let x=a.x,z=a.z,heading=Math.atan2(from.z,from.x);
    if(!points.length)points.push(a.clone());
    for(let j=0;j<3;j++){
      const length=best.lengths[j]*radius,steps=Math.max(1,Math.ceil(length/.7)),ds=length/steps,turn=best.turns[j];
      for(let i=0;i<steps;i++){
        const angle=heading+turn*ds/radius;
        if(turn){x+=radius/turn*(Math.sin(angle)-Math.sin(heading));z+=radius/turn*(Math.cos(heading)-Math.cos(angle));}
        else{x+=ds*Math.cos(heading);z+=ds*Math.sin(heading);}
        heading=angle;points.push(new THREE.Vector3(x,a.y,z));
      }
    }
    points[points.length-1].copy(b);
  };
  if(park){
    const through=horizontal(goal.clone().sub(start));
    const exit=goal.clone().addScaledVector(through,16);
    segment(start,exit,forward,through);
    segment(exit,end,through,arrival);
  }else segment(start,end,forward,arrival);
  points.forEach(p=>{p.y=0;});
  const horizontalRoute=new THREE.CatmullRomCurve3(points,false,'centripetal');
  horizontalRoute.arcLengthDivisions=4096;horizontalRoute.updateArcLengths();
  const count=512,smooth=THREE.MathUtils.smootherstep;
  const routePoints=Array.from({length:count+1},(_,i)=>horizontalRoute.getPointAt(i/count));
  const measured=routePoints.map(p=>ground(p.x,p.z)).filter(Number.isFinite);
  if(!measured.length)throw new Error('No measured terrain for flight clearance');
  const cruise=Math.max(start.y,end.y,...measured.map(height=>height+7));
  routePoints.forEach((p,i)=>{
    const u=i/count;
    p.y=u<.18?THREE.MathUtils.lerp(start.y,cruise,smooth(u,0,.18)):u>.82?THREE.MathUtils.lerp(cruise,end.y,smooth(u,.82,1)):cruise;
  });
  const curve=new THREE.CatmullRomCurve3(routePoints,false,'centripetal');
  curve.arcLengthDivisions=4096;curve.updateArcLengths();
  const heading=(u:number)=>{
    const direction=horizontal(curve.getPointAt(Math.min(1,u+.002)).sub(curve.getPointAt(Math.max(0,u-.002))));
    if(u<.005)direction.lerp(forward,1-smooth(u,0,.005));
    if(u>.995)direction.lerp(arrival,smooth(u,.995,1));
    return direction.normalize();
  };
  const startPitch=Math.asin(new THREE.Vector3(0,0,-1).applyQuaternion(startRotation).y);
  const endPitch=Math.atan2(goal.y-end.y,Math.hypot(goal.x-end.x,goal.z-end.z));
  const matrix=new THREE.Matrix4();
  return {curve,sample(t:number){
    const u=smooth(t,0,1),position=curve.getPointAt(u),ahead=heading(u);
    // Pitch can settle on the destination; horizontal heading ALWAYS follows motion.
    const pitch=THREE.MathUtils.lerp(startPitch,0,smooth(t,0,.18))*(1-smooth(u,.82,1))+endPitch*smooth(u,.82,1);
    ahead.multiplyScalar(Math.cos(pitch));ahead.y=Math.sin(pitch);
    const orientation=new THREE.Quaternion().setFromRotationMatrix(matrix.lookAt(position,position.clone().add(ahead),up));
    const before=heading(Math.max(0,u-.03)),after=heading(Math.min(1,u+.03));
    const turn=Math.atan2(before.z*after.x-before.x*after.z,before.x*after.x+before.z*after.z);
    const bank=THREE.MathUtils.clamp(turn*1.1,-.3,.3)*smooth(t,0,.15)*(1-smooth(u,.86,1));
    orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),bank));
    return {position,orientation,targetDistance:position.distanceTo(goal)};
  }};
}
