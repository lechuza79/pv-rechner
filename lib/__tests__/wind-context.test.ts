import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {projectWindContext,waterEdgeOpacity,type WindContext} from '../wind-context';
import {addWindContext} from '../../components/landkreis/wind-context';
const feature=JSON.parse(readFileSync('public/geo/wind-boundaries/05774040.geo.json','utf8'));
it('projects official context with the shared map projection and restricts labels to this municipality',()=>{
 const raw=JSON.parse(readFileSync('public/geo/wind-context/05774040.json','utf8')) as WindContext;
 const data=projectWindContext(feature,raw);
 expect(data.areas.filter(a=>a.kind==='settlement').length).toBeGreaterThan(5);
 expect(data.areas.filter(a=>a.kind==='water').length).toBeGreaterThan(10);
 expect(data.streams.length).toBeGreaterThan(100);
 expect(data.places.map(p=>p.name)).toContain('Bad Wünnenberg');
 expect(data.places.map(p=>p.name)).not.toContain('Marsberg');
 expect(data.waterContinuation?.distance).toBeGreaterThan(0);
 expect(data.streams.flat().some(p=>waterEdgeOpacity(p,data.waterContinuation)<.9)).toBe(true);
});
it('fades actual water beyond the irregular edge without moving its coordinates',()=>{
 const outline:[number,number][][]=[[[0,0],[100,0],[100,100],[0,100],[0,0]]];
 const continuation={outline:[outline],distance:50};
 expect(waterEdgeOpacity([50,50],continuation)).toBe(1);
 expect(waterEdgeOpacity([100,50],continuation)).toBe(1);
 expect(waterEdgeOpacity([125,50],continuation)).toBeCloseTo(.5);
 expect(waterEdgeOpacity([150,50],continuation)).toBe(0);
});
it('drapes merged geometry on uneven terrain, preserves holes and disposes both meshes',()=>{
 const scene=new THREE.Scene();const square:[number,number][]= [[0,0],[100,0],[100,100],[0,100],[0,0]],hole:[number,number][]=[[40,40],[60,40],[60,60],[40,60],[40,40]];
 const ground=(x:number,z:number)=>x*.1+z*.2;
 const layer=addWindContext(scene,{unitsPerMetre:1,areas:[{kind:'settlement',rings:[square,hole]}],streams:[[[0,120],[100,120]]],places:[]},ground,new THREE.Color('gray'),new THREE.Color('blue'));
 expect(scene.children).toHaveLength(2);
 for(const mesh of layer.meshes){
  const p=mesh.geometry.getAttribute('position');expect(p.count).toBeGreaterThan(0);
  for(let i=0;i<p.count;i++)expect(p.getY(i)).toBeGreaterThanOrEqual(ground(p.getX(i),p.getZ(i))-.00001);
 }
 const p=layer.meshes[0].geometry.getAttribute('position');
 for(let i=0;i<p.count;i+=3){const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;expect(x>40&&x<60&&z>40&&z<60).toBe(false);}
 layer.dispose();expect(scene.children).toHaveLength(0);
});
