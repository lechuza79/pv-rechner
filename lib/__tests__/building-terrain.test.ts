import {expect,it} from 'vitest';
import {buildingTerrainSurface} from '../building-terrain';
import {terrainHeight,type SceneTerrain} from '../wind-terrain';
import {landscapeAttribution,landscapePlaces} from '../landscape-places';

const terrain=(width:number,height:number):SceneTerrain=>({id:'grid',width,height,elevations:Array.from({length:width*height},(_,i)=>100+Math.sin(i%width)*4+Math.cos(Math.floor(i/width))*3),minimum:93,maximum:107,groundBounds:[0,0,width-1,height-1],unitsPerMetre:1,reference:100});
it('limits distant geometry while keeping source cells and heights at detailed objects',()=>{
 const source=terrain(601,501),result=buildingTerrainSurface(source,[[280,220,320,260],[290,230,330,270]],1);
 expect(result.elevations).toBe(source.elevations);
 expect(result.patches).toHaveLength(1);
 expect(result.groundSurface!.vertices.length).toBeLessThan(45_000);
 expect(result.groundSurface!.indices.length/3).toBeLessThan(90_000);
 for(const [x,z] of [[300.3,240.2],[295.8,238.7],[400.4,400.1]])expect(terrainHeight(result,x,z)).toBeCloseTo(terrainHeight(source,x,z),10);
 const detail=result.patches![0];
 expect(detail.groundSurface!.vertices.some(([x,z])=>x===300&&z===240)).toBe(true);
 const {vertices,indices}=result.groundSurface!;
 let area=0;
 for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(j=>vertices[j]);area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]))/2;}
 expect(area).toBeCloseTo(600*500,6);
},10_000);
it('keeps small-scene geometry unchanged and includes the final grid edges',()=>{
 const source=terrain(12,10),result=buildingTerrainSurface(source,[],2);
 expect(result.groundSurface!.vertices).toHaveLength(7*6);
 expect(result.groundSurface!.vertices.at(-1)).toEqual([11,9]);
 expect(result.patches).toBeUndefined();
});
it('credits the district to the same actual state source as Kaiserslautern city',()=>{
 expect(landscapePlaces['07335']).toBe('Landkreis Kaiserslautern');
 expect(landscapeAttribution('07335')).toBe('GeoBasis-DE / LVermGeoRP2026 | dl-de/by-2-0');
});

it('omits missing terrain and coarse cells spanning an interior missing sample',()=>{
 const source=terrain(1001,500);source.elevations[10*source.width+10]=Number.NaN;
 const result=buildingTerrainSurface(source,[],1);
 for(const [x,z] of result.groundSurface!.vertices)expect(Number.isFinite(terrainHeight(result,x,z))).toBe(true);
 const {vertices,indices}=result.groundSurface!;
 for(let i=0;i<indices.length;i+=3){const points=indices.slice(i,i+3).map(j=>vertices[j]);const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);expect(Math.min(...xs)<10&&Math.max(...xs)>10&&Math.min(...zs)<10&&Math.max(...zs)>10).toBe(false);}
 expect(Number.isNaN(terrainHeight(result,10,10))).toBe(true);
},30000); // 500k-sample terrain: seconds under parallel load, 5 s default timed out

it('keeps an exact measured boundary value beside an unknown neighbour',()=>{
 const source=terrain(3,3);source.elevations[0]=Number.NaN;
 expect(terrainHeight(source,1,0)).toBeCloseTo(source.elevations[1]-source.reference);
 expect(Number.isNaN(terrainHeight(source,.2,.2))).toBe(true);
});
