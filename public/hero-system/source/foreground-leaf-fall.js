import {leafRelease} from './wind-motion.js';
import {createLeafMotion,advanceLeaf,NEAR_METRES_PER_UNIT} from './leaf-physics.js';
import * as THREE from 'three';
import {foliageState} from './seasonal-foliage.js';
import {createLeafGeometry,treeSpecies} from './tree-species.js';
export function pointAtDepth(camera,x,y,depth,target=new THREE.Vector3()) {
 camera.updateMatrixWorld();target.set(x,y,.5).unproject(camera).sub(camera.position);
 const forward=new THREE.Vector3();camera.getWorldDirection(forward);
 return target.multiplyScalar(depth/target.dot(forward)).add(camera.position);
}
export function createForegroundLeafFall(camera){
 const scene=new THREE.Scene(),branchScene=new THREE.Scene();
 const light=new THREE.HemisphereLight(0xf6eee0,0x66543b,2.4);scene.add(light);branchScene.add(light.clone());
 const particles=[],pool=[];let seed=216,last=null,next=0;
 const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
 const geometries=['linden','maple'].map(createLeafGeometry);
 const materials=['linden','maple'].map(kind=>new THREE.MeshStandardMaterial({color:treeSpecies[kind].gold,side:THREE.DoubleSide,roughness:.85}));
 for(let i=0;i<16;i++){const m=new THREE.Mesh(geometries[i%2],materials[i%2]);m.visible=false;scene.add(m);pool.push(m);}
 const right=new THREE.Vector3(),up=new THREE.Vector3(),forward=new THREE.Vector3(),projected=new THREE.Vector3();
 function clear(){for(const p of particles)if(p.mesh)branchScene.remove(p.mesh);particles.length=0;pool.forEach(m=>m.visible=false);next=0;}
 return {scene,branchScene,clear,
  release(source,wind){
   if(particles.filter(p=>p.mesh).length>=4)return false;
   source.updateWorldMatrix(true,false);const mesh=source.clone();source.matrixWorld.decompose(mesh.position,mesh.quaternion,mesh.scale);branchScene.add(mesh);
   particles.push({position:mesh.position.clone(),motion:createLeafMotion(random()*100,wind,false),age:0,size:mesh.scale.x,mesh,rotation:mesh.rotation.clone()});return true;
  },
  update(time,state,width){
   const dt=last===null?0:Math.min(.1,Math.max(0,time-last));last=time;
   const {color,loss}=foliageState(state),wind=state.windMotion??(state.wind||0)*(state.direction??1),limit=width<700?5:9;
   camera.updateMatrixWorld();right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);camera.getWorldDirection(forward);
   if(color<=0||loss>=1)clear();
   else if(dt>0&&time>=next){
    const activity=Math.max(color*.8,4*loss*(1-loss))*(1-loss*.7),release=leafRelease(time,state);
    // One leaf per opportunity, with a random minimum gap; never catch up in batches.
    next=time+.22+random()*.65;
    if(release>.1&&random()<Math.min(.9,activity*release*.5)&&particles.filter(p=>!p.mesh).length<limit){
     const side=wind<0?1:-1;
     particles.push({position:pointAtDepth(camera,side*(Math.abs(wind)<.05?.97:1.05),-.15-random()*.55,1.4+random()*2.8),
      motion:createLeafMotion(random()*100,wind),age:0,size:(.07+random()*.06)/NEAR_METRES_PER_UNIT});
    }
   }
   for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.age+=dt;const d=advanceLeaf(p.motion,time,dt,wind);
    p.position.addScaledVector(right,d[0]/NEAR_METRES_PER_UNIT).addScaledVector(up,d[1]/NEAR_METRES_PER_UNIT).addScaledVector(forward,d[2]/NEAR_METRES_PER_UNIT);
    projected.copy(p.position).project(camera);
    if(p.age>15||Math.abs(projected.x)>1.6||projected.y< -1.4||projected.y>1.2){if(p.mesh)branchScene.remove(p.mesh);particles.splice(i,1);continue;}
    if(p.mesh){p.mesh.position.copy(p.position);p.mesh.rotation.set(p.rotation.x+p.motion.spin*.5,p.rotation.y+p.motion.spin,p.rotation.z+Math.sin(p.age*2+p.motion.seed)-Math.sin(p.motion.seed));}
   }
   const loose=particles.filter(p=>!p.mesh);
   pool.forEach((m,i)=>{const p=loose[i];m.visible=Boolean(p);if(!p)return;m.position.copy(p.position);m.rotation.set(p.motion.spin*.7,p.motion.spin,Math.sin(p.age*2+p.motion.seed));m.scale.setScalar(p.size*Math.min(1,p.age*12));});
   light.intensity=state.phase==='night'?.12:1+state.daylight*1.4;branchScene.children[0].intensity=light.intensity;
  },
  dispose(){clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.clear();branchScene.clear();}
 };
}
