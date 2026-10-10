import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {referenceWindFactor} from '../wind-reference-model';
import {rotorSpeed,usableWind,windYaw,type WindConditions} from '../wind-animation';
import {addWindLayer} from '../../components/landkreis/wind-layer';
const now=Date.parse('2026-09-27T14:00:00Z');
const wind:WindConditions={speedMs:6,directionDeg:0,validAt:new Date(now).toISOString(),modelRun:new Date(now-3600000).toISOString(),postcode:'33181'};
describe('weather-driven wind models',()=>{
  it('faces north, east, south and west into meteorological wind',()=>{
    for(const [deg,x,z] of [[0,0,-1],[90,1,0],[180,0,1],[270,-1,0]]){
      const axis=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),windYaw(deg));
      expect(axis.x).toBeCloseTo(x);expect(axis.z).toBeCloseTo(z);
    }
  });
  it('stops on calm or invalid input and preserves slower speeds for large rotors',()=>{
    expect(rotorSpeed(0,100)).toBe(0);expect(rotorSpeed(NaN,100)).toBe(0);
    expect(rotorSpeed(6,120)).toBeLessThan(rotorSpeed(6,60));
    expect(rotorSpeed(8,120)).toBeGreaterThan(rotorSpeed(4,120));
    expect(rotorSpeed(20,20)).toBeLessThanOrEqual(1.8);
    expect(rotorSpeed(80,20)).toBe(0);
  });
  it('keeps the animation and power model in the same operating envelope',()=>{
    for(const speed of [0,.5,1.8,2.5,3,3.1,6,12,24.9,25,30]){
      expect(rotorSpeed(speed,112)>0).toBe(referenceWindFactor(speed)>0);
    }
    const layer=addWindLayer(new THREE.Scene(),[{id:'a',x:0,z:0,hub:14,rotor:11.2,rotorMetres:112}],0,new THREE.Color('white'),()=>0,1,{...wind,speedMs:1.8});
    const before=layer.meshes[2].instanceMatrix.array.slice();layer.tick(2);
    expect(layer.meshes[2].instanceMatrix.array).toEqual(before);expect(layer.isMoving()).toBe(false);
    layer.setWind({...wind,speedMs:6});expect(layer.isMoving()).toBe(true);layer.tick(2);
    expect(layer.meshes[2].instanceMatrix.array).not.toEqual(before);layer.dispose();
  });
  it('rejects missing, old and invalid weather instead of inventing movement',()=>{
    expect(usableWind(wind,now)).toBe(true);
    expect(usableWind(null,now)).toBe(false);
    expect(usableWind({...wind,modelRun:null},now)).toBe(false);
    expect(usableWind({...wind,modelRun:null,source:'open-meteo'},now)).toBe(true);
    expect(usableWind({...wind,modelRun:null,source:'open-meteo'},now+16*60000)).toBe(false);
    expect(usableWind(wind,now+16*60000)).toBe(false);
    expect(usableWind({...wind,modelRun:new Date(now-13*3600000).toISOString()},now)).toBe(false);
    expect(usableWind({...wind,directionDeg:NaN},now)).toBe(false);
  });
  it('turns the actual nacelle and rotor geometry, pauses when unavailable, and keeps speed independent of display scale',()=>{
    const layer=addWindLayer(new THREE.Scene(),[{id:'a',x:10,z:20,hub:30,rotor:20,rotorMetres:100}],26,new THREE.Color('white'));
    expect(layer.meshes.every(mesh=>mesh.castShadow&&mesh.receiveShadow)).toBe(true);
    const matrix=new THREE.Matrix4();
    const still=layer.meshes[2].instanceMatrix.array.slice();layer.tick(1);
    expect(layer.meshes[2].instanceMatrix.array).toEqual(still);
    layer.setWind({...wind,directionDeg:90});
    layer.meshes[1].getMatrixAt(0,matrix);
    const axis=new THREE.Vector3(0,0,1).transformDirection(matrix);
    expect(axis.x).toBeCloseTo(1);expect(axis.z).toBeCloseTo(0);
    const rotation=()=>{layer.meshes[2].getMatrixAt(0,matrix);return new THREE.Vector3(0,1,0).transformDirection(matrix);};
    const before=rotation();layer.tick(1);const first=before.angleTo(rotation());
    layer.setScale(5);const enlarged=rotation();layer.tick(1);
    expect(enlarged.angleTo(rotation())).toBeCloseTo(first,5);
    expect(first).toBeCloseTo(rotorSpeed(6,100),5);
    layer.setWind(null);const paused=rotation();layer.tick(1);expect(rotation().distanceTo(paused)).toBeLessThan(1e-6);
    expect(layer.meshes[2].geometry.getAttribute('position').count).toBeGreaterThan(50);
    layer.meshes[2].geometry.computeBoundingBox();
    expect(layer.meshes[2].geometry.boundingBox!.max.z-layer.meshes[2].geometry.boundingBox!.min.z).toBeGreaterThan(0);
    // Blade normals must point out of the airfoil, otherwise pale surfaces
    // are lit from the inside and appear dirty/dark despite white material.
    const positions=layer.meshes[2].geometry.getAttribute('position'),normals=layer.meshes[2].geometry.getAttribute('normal');
    const centre=new THREE.Vector3();
    for(let i=30;i<40;i++)centre.add(new THREE.Vector3().fromBufferAttribute(positions,i));
    centre.divideScalar(10);
    for(let i=30;i<40;i++)expect(new THREE.Vector3().fromBufferAttribute(positions,i).sub(centre).dot(new THREE.Vector3().fromBufferAttribute(normals,i))).toBeGreaterThan(0);
    layer.dispose();
  });
});
