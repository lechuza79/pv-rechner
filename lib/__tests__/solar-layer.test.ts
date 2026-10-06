import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {expect,it} from 'vitest';
import {projectBuildingPreview,type BuildingPreview} from '../building-scene';
import {addSolarLayer} from '../../components/landkreis/solar-layer';
import {insidePolygon,polygons} from '../region-perspektive';
const data:BuildingPreview=JSON.parse(readFileSync('public/geo/nidda-preview/solar.json','utf8'));
it('keeps the three verified row footprints inside Nidda and uses the building metre scale',()=>{
 const boundary=JSON.parse(readFileSync('public/geo/gemeinden/06440.geo.json','utf8')).features.find((f:{properties:{id:string}})=>f.properties.id==='06440016');
 const fields=data.solar as (NonNullable<BuildingPreview['solar']>[number]&{wgs84:[number,number][]})[];
 expect(fields).toHaveLength(3);expect(data.buildings).toHaveLength(27);
 for(const field of fields)for(const p of field.wgs84)expect(polygons(boundary).some(poly=>insidePolygon(p,poly))).toBe(true);
 const projected=projectBuildingPreview(data,.5,[100,200]);
 fields.forEach((field,i)=>field.ring.forEach(([x,z],j)=>expect(projected.solar![i].ring[j]).toEqual([(x-100)*.5,(z-200)*.5])));
});
it('draws only the measured polygon footprint on the ground without invented module subdivisions',()=>{
 const scene=new THREE.Scene(),ground=(x:number,z:number)=>x*.1+z*.2;
 const layer=addSolarLayer(scene,[{id:'row',ring:[[0,0],[40,0],[40,7],[0,7]]}],ground,1,new THREE.Color('blue'));
 const p=layer.mesh.geometry.getAttribute('position');let area=0;
 for(let i=0;i<p.count;i++){
   expect(p.getX(i)).toBeGreaterThanOrEqual(0);expect(p.getX(i)).toBeLessThanOrEqual(40);
   expect(p.getZ(i)).toBeGreaterThanOrEqual(0);expect(p.getZ(i)).toBeLessThanOrEqual(7);
   expect(p.getY(i)).toBeCloseTo(ground(p.getX(i),p.getZ(i))+.15,5);
 }
 for(let i=0;i<p.count;i+=3)area+=Math.abs((p.getX(i+1)-p.getX(i))*(p.getZ(i+2)-p.getZ(i))-(p.getX(i+2)-p.getX(i))*(p.getZ(i+1)-p.getZ(i)))/2;
 expect(area).toBeCloseTo(280);layer.dispose();expect(scene.children).toHaveLength(0);
});

it('fits south-facing roof modules inside the surveyed rows at a uniform metre scale',async()=>{
 const {solarPanelPositions}=await import('../../components/landkreis/solar-layer');
 const a=solarPanelPositions(data.solar!,1),b=solarPanelPositions(data.solar!.map(f=>({...f,ring:f.ring.map(([x,z])=>[x*.1,z*.1] as [number,number])})),.1);
 expect(a.length).toBeGreaterThan(30);expect(b.length).toBe(a.length);
 a.forEach(([x,z],i)=>{expect(b[i][0]).toBeCloseTo(x*.1,6);expect(b[i][1]).toBeCloseTo(z*.1,6);expect(data.solar!.some(f=>[[-.88,-.57],[.88,-.57],[.88,.57],[-.88,.57]].every(([dx,dz])=>insidePolygon([x+dx,z+dz],[f.ring])))).toBe(true);});
 const normal=new THREE.Vector3(0,1,0).applyAxisAngle(new THREE.Vector3(1,0,0),25*Math.PI/180);
 expect(normal.x).toBe(0);expect(normal.z).toBeGreaterThan(0); // South is +Z.
});


it('uses distant footprints and restores near modules with a stable transition band',async()=>{
 const {solarDetailVisible}=await import('../../components/landkreis/solar-layer');
 const camera=new THREE.PerspectiveCamera(42,1,.1,10000),sphere=new THREE.Sphere(new THREE.Vector3(),10);
 camera.position.set(0,0,3000);
 expect(solarDetailVisible(camera,sphere,1,720,true)).toBe(false);
 camera.position.z=100;
 expect(solarDetailVisible(camera,sphere,1,720,false)).toBe(true);
 camera.position.z=950;
 expect(solarDetailVisible(camera,sphere,1,720,false)).toBe(false);
 expect(solarDetailVisible(camera,sphere,1,720,true)).toBe(true);
 camera.position.multiplyScalar(.1);sphere.radius*=.1;
 expect(solarDetailVisible(camera,sphere,.1,720,true)).toBe(true);
});
