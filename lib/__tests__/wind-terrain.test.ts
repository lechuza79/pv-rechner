import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { projectWindTerrain,terrainHeight,type WindTerrain } from "../wind-terrain";
import { regionProjection } from "../region-perspektive";
it("uses finite official elevations and the same horizontal and vertical metre scale",()=>{
  const terrain=JSON.parse(readFileSync('public/geo/wind-terrain/05774040.json','utf8')) as WindTerrain;
  const feature=JSON.parse(readFileSync('public/geo/wind-boundaries/05774040.geo.json','utf8'));
  const projected=projectWindTerrain(feature,terrain),projection=regionProjection([feature]);
  expect(terrain.elevations).toHaveLength(terrain.width*terrain.height);
  expect(terrain.elevations.every(v=>Number.isFinite(v)&&v>100&&v<600)).toBe(true);
  for(const [i,j] of [[0,0],[96,96],[192,192]]){
    const [w,n,e,s]=projected.groundBounds;
    const actual=terrainHeight(projected,w+(e-w)*i/192,n+(s-n)*j/192);
    expect(actual/projection.unitsPerMetre+projected.reference).toBeCloseTo(terrain.elevations[j*193+i],5);
  }
  const center=projection.groundPoint([(terrain.bounds[0]+terrain.bounds[2])/2,(terrain.bounds[1]+terrain.bounds[3])/2]);
  expect(terrainHeight(projected,...center)).toBeCloseTo(terrainHeight(projected,(projected.groundBounds[0]+projected.groundBounds[2])/2,(projected.groundBounds[1]+projected.groundBounds[3])/2));
});

it("builds actual raised geometry without a map image and disposes it",async()=>{
  const THREE=await import('three');
  const {addWindTerrain}=await import('../../components/landkreis/wind-terrain');
  const {projectRegions}=await import('../region-perspektive');
  const terrain=JSON.parse(readFileSync('public/geo/wind-terrain/05774040.json','utf8')) as WindTerrain;
  const feature=JSON.parse(readFileSync('public/geo/wind-boundaries/05774040.geo.json','utf8'));
  const scene=new THREE.Scene(),projected=projectWindTerrain(feature,terrain);
  const layer=addWindTerrain(scene,projected,projectRegions([feature]),26,new THREE.Color('green'));
  const geometry=layer.mesh.geometry,position=geometry.getAttribute('position');
  expect(position.count).toBe(terrain.surface!.vertices.length);
  const heights=Array.from({length:position.count},(_,i)=>position.getY(i));
  expect((Math.max(...heights)-Math.min(...heights))/projected.unitsPerMetre).toBeGreaterThan(250);
  for(let i=0;i<position.count;i++)expect(position.getY(i)).toBeCloseTo(26+terrainHeight(projected,position.getX(i),position.getZ(i)),3);
  expect(layer.mesh.material.map).toBeNull();
  const sides=layer.body.geometry.getAttribute("position");
  const sideHeights=Array.from({length:sides.count},(_,i)=>sides.getY(i));
  expect(Math.min(...sideHeights)).toBe(0);
  expect(Math.max(...sideHeights)).toBeGreaterThan(26);
  expect(sides.count).toBeGreaterThan(6);
  expect(layer.body.name).toBe("wind-terrain-thickness");
  layer.dispose();expect(scene.children).toHaveLength(0);
});

it("clips the terrain to the same official boundary used for turbine selection",()=>{
 const terrain=JSON.parse(readFileSync("public/geo/wind-terrain/05774040.json","utf8"));
 expect(terrain.boundarySha256).toBe(createHash("sha256").update(readFileSync("public/geo/wind-boundaries/05774040.geo.json")).digest("hex"));
});
