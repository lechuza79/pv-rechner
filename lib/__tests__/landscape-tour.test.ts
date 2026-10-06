import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {municipalityTour,preparedLandscapeTour,type PreparedLandscapeTour} from '../landscape-tour';
import {terrainHeight} from '../wind-terrain';
import {regionProjection} from '../region-perspektive';
import {insidePolygon,polygons} from '../region-perspektive';
import {safeWindSignAnchor,WORLD_UNITS_PER_PIXEL} from '../../components/landkreis/location-sign';
import {resolveWindTurbineModel} from '../wind-turbine-models';
const read=(name:string)=>JSON.parse(readFileSync(`public/geo/${name}`,'utf8'));
const feature=read('wind-boundaries/05774040.geo.json');
const terrain={...read('wind-terrain/05774040.json'),context:read('wind-context/05774040.json')};
const rows=read('wuennenberg-preview/register.json').turbines;
const source=read('wuennenberg-preview/buildings.json').buildings;
const tour=municipalityTour(feature,terrain,rows,source);
describe('municipal hero data',()=>{
 it('uses actual municipality data and retains every selected wind turbine',()=>{
  expect(tour.municipality).toBe('05774040');expect(tour.name).toBe('Bad Wünnenberg');
  expect(tour.turbines.map(t=>t.id).sort()).toEqual(rows.map((t:{mastr_nr:string})=>t.mastr_nr).sort());
  expect(tour.buildings).toHaveLength(source.length);expect(tour.buildings.length).toBeGreaterThan(0);
  expect(tour.stops.map(s=>s.kind)).toEqual(['town','wind']);
 });
 it('preserves registered dimensions and puts buildings on the identical geographic scale',()=>{
  const p=regionProjection([feature]),row=rows.find((r:{nabenhoehe_m:number;rotor_m:number})=>r.nabenhoehe_m>0&&r.rotor_m>0);
  const turbine=tour.turbines.find(t=>t.id===row.mastr_nr)!;
  expect(turbine.hub).toBeCloseTo(row.nabenhoehe_m*p.unitsPerMetre);
  expect(turbine.rotor).toBeCloseTo(row.rotor_m*p.unitsPerMetre);
  const [lon,lat,h]=source[0].surfaces[0].points[0],point=tour.buildings[0].surfaces[0].points[0];
  expect([point[0],point[2]]).toEqual(p.groundPoint([lon,lat]));
  expect(point[1]).toBeCloseTo((h-tour.terrain.reference)*p.unitsPerMetre);
 });
 it('uses supplied place identity, not hardcoded Nidda or Bad Wünnenberg labels',()=>{
  const renamed={...feature,properties:{...feature.properties,id:'test',name:'Testort'}};
  const renamedTerrain={...terrain,context:{...terrain.context,places:terrain.context.places.map((p:{name:string})=>({...p,name:p.name==='Bad Wünnenberg'?'Testort':p.name}))}};
  const result=municipalityTour(renamed,renamedTerrain,rows,source);
  expect(result.name).toBe('Testort');expect(result.stops[0].name).toBe('Testort');
  expect(result.stops[1].name).toContain('Testort');
 });
});

describe('reusable prepared municipality tours',()=>{
 for(const id of ['09679147','07312000','06632009','03458009']){
  const source=read(`landscape-tours/${id}/scene.json`) as PreparedLandscapeTour;
  const result=preparedLandscapeTour(source),register=read(`landscape-tours/${id}/register.json`);
  it(`${source.name}: uses one geographic and vertical scale for buildings, terrain and registered turbines`,()=>{
   expect(result.name).toBe(source.name);expect(result.shapes[0].id).toBe(id);
   expect(result.terrain.display).toBe('contours');expect(result.terrain.reference).toBe(source.origin[2]);
   expect(result.terrain.elevations).toHaveLength(source.terrain.width*source.terrain.height);
   expect(result.terrain.elevations.every(h=>Number.isFinite(h)&&h!==-9999)).toBe(true);
   expect(result.turbines.map(t=>t.id).sort()).toEqual(register.turbines.map((t:{mastr_nr:string})=>t.mastr_nr).sort());
   const scale=result.terrain.unitsPerMetre,[w,n,e,s]=source.terrain.groundBounds;
   const point=source.buildings[0].surfaces[0].points[0],projected=result.buildings[0].surfaces[0].points[0];
   expect(projected[0]).toBeCloseTo((point[0]-(w+e)/2)*scale);expect(projected[1]).toBeCloseTo(point[1]*scale);expect(projected[2]).toBeCloseTo((point[2]-(n+s)/2)*scale);
   for(const turbine of result.turbines){
    const row=register.turbines.find((r:{mastr_nr:string})=>r.mastr_nr===turbine.id);
    expect(insidePolygon([row.lon,row.lat],polygons(register.feature)[0])).toBe(true);
    expect(turbine.hub).toBeCloseTo(row.nabenhoehe_m*scale);expect(turbine.rotor).toBeCloseTo(row.rotor_m*scale);
    expect(resolveWindTurbineModel(row.hersteller,row.typ).id).not.toBe('generic-three-blade');
   }
   for(const stop of source.stops){expect(stop.x).toBeGreaterThan(w);expect(stop.x).toBeLessThan(e);expect(stop.z).toBeGreaterThan(n);expect(stop.z).toBeLessThan(s);}
   const town=source.stops[0],sign=result.stops[0];
   expect(sign.labelElevation).toBeCloseTo(terrainHeight(result.terrain,sign.labelX!,sign.labelZ!)+4*scale);
   expect(Math.hypot(sign.labelX!-sign.x,sign.labelZ!-sign.z)/scale).toBeLessThanOrEqual(80.001);
   expect(sign.zoom).toBe(16);
   expect(result.stops[0].x).toBeCloseTo((town.x-(w+e)/2)*scale);expect(result.stops[0].z).toBeCloseTo((town.z-(n+s)/2)*scale);
  });
 }
 it('clears every real Hatten and Heringen rotor without moving stops or turbines',()=>{
  for(const id of ['03458009','06632009']){
   const result=preparedLandscapeTour(read(`landscape-tours/${id}/scene.json`));
   for(const stop of result.stops.filter(p=>p.kind==='wind')){
    const anchor=safeWindSignAnchor(stop,result.turbines,250,result.terrain.unitsPerMetre);
    for(const t of result.turbines)if(t.rotor!==null)expect(Math.hypot(anchor.x-t.x,anchor.z-t.z)).toBeGreaterThanOrEqual(t.rotor*.6+250*WORLD_UNITS_PER_PIXEL/2+10*result.terrain.unitsPerMetre-1e-8);
   }
  }
 });
 it('keeps factual destinations distinct from municipality-wide capacity',()=>{
  const hoechberg=read('landscape-tours/09679147/scene.json'),kl=read('landscape-tours/07312000/scene.json'),heringen=read('landscape-tours/06632009/scene.json');
  expect(hoechberg.stops.map((s:{kind:string})=>s.kind)).toEqual(['town']);
  expect(kl.stops.map((s:{kind:string})=>s.kind)).toEqual(['town','solar']);expect(kl.stops[1].capacityKw).toBe(7109.89);
  expect(preparedLandscapeTour(kl).stops[1].capacityKw).toBe(7109.89);
  const solarRegister=read('landscape-tours/07312000/solar-register.json');
  expect(kl.stops[1].unitIds.sort()).toEqual(solarRegister.units.map((u:{id:string})=>u.id).sort());
  expect(kl.stops[1].capacityKw).toBeCloseTo(solarRegister.units.reduce((sum:number,u:{capacityKw:number})=>sum+u.capacityKw,0));
  expect(heringen.turbines).toHaveLength(17);
  expect(heringen.solar).toHaveLength(2);expect(heringen.stops.filter((s:{kind:string})=>s.kind==='solar').every((s:{capacityKw:number|null})=>s.capacityKw===null)).toBe(true);
  expect(heringen.stops.filter((s:{kind:string})=>s.kind==='wind').flatMap((s:{unitIds:string[]})=>s.unitIds).sort()).toEqual(heringen.turbines.map((t:{id:string})=>t.id).sort());
  expect(read('landscape-tours/06632009/provenance.json').boundarySource).toContain('ALKIS');
 });
 it('rejects missing terrain and an incompatible height reference instead of inventing data',()=>{
  const data=read('landscape-tours/09679147/scene.json');
  expect(()=>preparedLandscapeTour({...data,terrain:{...data.terrain,elevations:[]}})).toThrow('Incomplete terrain');
  expect(()=>preparedLandscapeTour({...data,heightReference:'ellipsoid'})).toThrow('Unsupported building reference');
 });
 it('uses the precise Hatten boundary and keeps every spatially selected unit in a flight destination',()=>{
  const data=read('landscape-tours/03458009/scene.json'),register=read('landscape-tours/03458009/register.json'),audit=read('landscape-tours/03458009/provenance.json');
  expect(data.turbines).toHaveLength(14);expect(register.boundarySource).toContain('ALKIS');
  expect(data.stops[0].name).toBe('Hatten');expect(audit.townSourceName).toBe('Kirchhatten');
  expect(data.stops.filter((s:{kind:string})=>s.kind==='wind').flatMap((s:{unitIds:string[]})=>s.unitIds).sort()).toEqual(data.turbines.map((t:{id:string})=>t.id).sort());
  expect(data.solar).toEqual([]);expect(register.stock.freiflaeche_kwp).toBeGreaterThan(0);
 });
});

 // Parses the 36 MB Würzburg district scene: ~3.6 s alone, so the 5 s default flakes under load.
 it('starts a district centrally without replacing its real town or assigning park capacity to the district',()=>{
  const data=read('landscape-tours/09679/scene.json'),result=preparedLandscapeTour(data);
  expect(result.stops[0]).toMatchObject({id:'district',overview:true,name:'Landkreis Würzburg',kind:'town'});
  expect(result.stops[0].capacityKw).toBeUndefined();
  expect(result.stops[1].id).toBe(data.stops[0].id);
  expect(result.stops).toHaveLength(data.stops.length+1);
  expect(Number.isFinite(terrainHeight(result.terrain,result.stops[0].x,result.stops[0].z))).toBe(true);
 },20000);
