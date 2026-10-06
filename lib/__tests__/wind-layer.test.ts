import { expect, it } from "vitest";
import * as THREE from "three";
import { addWindLayer } from "../../components/landkreis/wind-layer";

it("draws 194 individually scaled turbines with five shared meshes and cleans them up",()=>{
  const scene=new THREE.Scene();
  const data=Array.from({length:194},(_,i)=>({id:String(i),x:i*30,z:0,hub:i%2?140:70,rotor:i%2?140:60,rotorMetres:i%2?140:60}));
  const layer=addWindLayer(scene,data,26,new THREE.Color("white"));
  expect(scene.children).toHaveLength(5);
  expect(layer.meshes.map(m=>m.count)).toEqual([194,194,582,0,194]);
  const matrix=new THREE.Matrix4();
  for(const [i,expected] of [[0,70],[1,140]]){
    layer.meshes[0].getMatrixAt(i,matrix);
    const bounds=new THREE.Box3().setFromBufferAttribute(layer.meshes[0].geometry.getAttribute("position") as THREE.BufferAttribute).applyMatrix4(matrix);
    expect(bounds.min.y).toBeCloseTo(26);expect(bounds.max.y).toBeCloseTo(26+expected);
  }
  layer.setWind({speedMs:6,directionDeg:180,validAt:new Date().toISOString(),modelRun:new Date().toISOString(),postcode:"33181"});
  const before=layer.meshes[2].instanceMatrix.array.slice();layer.tick(.5);
  expect(layer.meshes[2].instanceMatrix.array).not.toEqual(before);
  // Every tip stays exactly half the registered diameter away from the hub.
  for(const i of [0,1]){
    layer.meshes[2].getMatrixAt(i*3,matrix);
    const tip=new THREE.Vector3(0,1,0).applyMatrix4(matrix);
    const hubMatrix=new THREE.Matrix4();layer.meshes.at(-1)!.getMatrixAt(i,hubMatrix);
    const hub=new THREE.Vector3().setFromMatrixPosition(hubMatrix);
    expect(tip.distanceTo(hub)).toBeCloseTo(data[i].rotor/2,4);
  }
  layer.dispose();expect(scene.children).toHaveLength(0);
});

it("enlarges all dimensions uniformly without moving the base off the terrain",()=>{
  const scene=new THREE.Scene();
  const data=[{id:"a",x:0,z:0,hub:70,rotor:60},{id:"b",x:30,z:0,hub:140,rotor:120}];
  const ground=(x:number)=>26+x;
  const layer=addWindLayer(scene,data,26,new THREE.Color("white"),ground,5);
  const matrix=new THREE.Matrix4();
  for(const scale of [5,1]){
    layer.setScale(scale);
    for(let i=0;i<2;i++){
      layer.meshes[0].getMatrixAt(i,matrix);
      const bounds=new THREE.Box3().setFromBufferAttribute(layer.meshes[0].geometry.getAttribute("position") as THREE.BufferAttribute).applyMatrix4(matrix);
      expect(bounds.min.y).toBeCloseTo(ground(data[i].x));
      expect(bounds.max.y-bounds.min.y).toBeCloseTo(data[i].hub*scale);
      layer.meshes[2].getMatrixAt(i*3,matrix);
      const tip=new THREE.Vector3(0,1,0).applyMatrix4(matrix);
      const hubMatrix=new THREE.Matrix4();layer.meshes.at(-1)!.getMatrixAt(i,hubMatrix);
    const hub=new THREE.Vector3().setFromMatrixPosition(hubMatrix);
      expect(tip.distanceTo(hub)).toBeCloseTo(data[i].rotor*scale/2,3);
    }
  }
  layer.dispose();
});
