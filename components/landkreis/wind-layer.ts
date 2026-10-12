import * as THREE from "three";
import {turbineGeometry} from "../3d/wind-turbine-geometry";
import {resolveWindTurbineModel} from "../../lib/wind-turbine-models";
import type { SceneTurbine } from "../../lib/wind-map";
import {rotorSpeed,windYaw,type WindConditions} from "../../lib/wind-animation";

/** Instanced geometry batches share manufacturer silhouettes across the municipality. */
export function addWindLayer(scene: THREE.Scene, turbines: SceneTurbine[], groundY: number, color: THREE.Color, groundAt:(x:number,z:number)=>number=()=>groundY, initialScale=1, initialWind:WindConditions|null=null) {
  const sized=turbines.filter(t=>t.hub!==null&&t.rotor!==null);
  const unknown=turbines.filter(t=>t.hub===null||t.rotor===null);
  const material=new THREE.MeshStandardMaterial({color,roughness:.88,metalness:0});
  const bladeMaterial=material.clone();bladeMaterial.vertexColors=true;bladeMaterial.side=THREE.DoubleSide;
  const geometry=turbineGeometry();
  const markerGeometry=new THREE.RingGeometry(.65,1,16);markerGeometry.rotateX(-Math.PI/2);
  const towers=new THREE.InstancedMesh(geometry.tower,material,sized.length);
  const models=sized.map(t=>resolveWindTurbineModel(t.manufacturer,t.model));
  const shellGroups=Array.from(new Set(models.map(m=>m.shell??'rounded'))).map(shell=>{
    const indices=models.flatMap((m,i)=>(m.shell??'rounded')===shell?[i]:[]);
    const parts=turbineGeometry(shell);parts.tower.dispose();parts.blade.dispose();parts.hub.dispose();
    const mesh=new THREE.InstancedMesh(parts.nacelle,material,indices.length);
    mesh.userData.windIds=indices.map(i=>sized[i].id);mesh.userData.windModelIds=indices.map(i=>models[i].id);
    return {mesh,indices};
  });
  geometry.nacelle.dispose();
  const blades=new THREE.InstancedMesh(geometry.blade,bladeMaterial,sized.length*3);
  const markers=new THREE.InstancedMesh(markerGeometry,material,unknown.length);
  const hubs=new THREE.InstancedMesh(geometry.hub,material,sized.length);
  const meshes=[towers,...shellGroups.map(g=>g.mesh),blades,markers,hubs];
  const transform=new THREE.Object3D(),yawRotation=new THREE.Quaternion(),spin=new THREE.Quaternion();
  const yAxis=new THREE.Vector3(0,1,0),zAxis=new THREE.Vector3(0,0,1);
  const phases=sized.map((_,i)=>i*2.39996);
  const bases=sized.map(t=>groundAt(t.x,t.z));
  let scale=initialScale,conditions=initialWind;
  let yaw=conditions?windYaw(conditions.directionDeg):0;
  const put=(mesh:THREE.InstancedMesh,i:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,rotation?:THREE.Quaternion)=>{
    transform.position.set(x,y,z);transform.scale.set(sx,sy,sz);
    transform.quaternion.copy(rotation??new THREE.Quaternion());
    transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
  };
  const profiles=models.map(model=>model.proportions);
  for(const mesh of [towers,hubs])mesh.userData.windModelIds=models.map(model=>model.id);
  function place(){
    yawRotation.setFromAxisAngle(yAxis,yaw);
    sized.forEach((t,i)=>{
      const r=t.rotor!/2*scale,base=bases[i],hub=t.hub!*scale;
      const profile=profiles[i];
      put(towers,i,t.x,base+hub/2,t.z,r*profile.towerRadius,hub,r*profile.towerRadius);
      const group=shellGroups.find(g=>g.indices.includes(i))!;
      put(group.mesh,group.indices.indexOf(i),t.x-Math.sin(yaw)*r*profile.nacelleOffset,base+hub,t.z-Math.cos(yaw)*r*profile.nacelleOffset,r*profile.width,r*profile.height,r*profile.length,yawRotation);
      put(hubs,i,t.x+Math.sin(yaw)*r*profile.axis,base+hub,t.z+Math.cos(yaw)*r*profile.axis,r*profile.hub,r*profile.hub,r*profile.hubLength,yawRotation);
    });
    unknown.forEach((t,i)=>put(markers,i,t.x,groundAt(t.x,t.z)+.3,t.z,2,1,2));
    for(const mesh of [towers,...shellGroups.map(g=>g.mesh),markers,hubs])mesh.instanceMatrix.needsUpdate=true;
  }
  function tick(dt:number){
    sized.forEach((t,i)=>{
      const r=t.rotor!/2*scale;
      phases[i]+=dt*(conditions?rotorSpeed(conditions.speedMs,t.rotorMetres??0):0);
      for(let b=0;b<3;b++){
        spin.setFromAxisAngle(zAxis,phases[i]+b*2*Math.PI/3).premultiply(yawRotation);
        put(blades,i*3+b,t.x+Math.sin(yaw)*r*profiles[i].axis,bases[i]+t.hub!*scale,t.z+Math.cos(yaw)*r*profiles[i].axis,r,r,r,spin);
      }
    });
    blades.instanceMatrix.needsUpdate=true;
  }
  place();tick(0);
  towers.userData.windIds=sized.map(t=>t.id);
  hubs.userData.windIds=sized.map(t=>t.id);
  blades.userData.windIds=sized.flatMap(t=>[t.id,t.id,t.id]);markers.userData.windIds=unknown.map(t=>t.id);
  for(const mesh of meshes){mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}
  return {meshes,count:sized.length+unknown.length,tick,isMoving:()=>Boolean(conditions&&sized.some(t=>rotorSpeed(conditions!.speedMs,t.rotorMetres??0)>0)),
    setWind(value:WindConditions|null){conditions=value;if(value)yaw=windYaw(value.directionDeg);place();tick(0);},
    setScale(value:number){scale=value;place();tick(0);},
    highlight(id:string|null){
      const found=turbines.some(t=>t.id===id);
      for(const mesh of meshes){
        for(let i=0;i<mesh.count;i++)mesh.setColorAt(i,new THREE.Color().setScalar(!found||mesh.userData.windIds[i]===id?1:.45));
        if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      }
    },dispose(){
      for(const mesh of meshes){scene.remove(mesh);mesh.dispose();mesh.geometry.dispose();}
      material.dispose();bladeMaterial.dispose();
    }};
}
