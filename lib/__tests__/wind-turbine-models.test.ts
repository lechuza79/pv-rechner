import {describe,it,expect} from 'vitest';
import {resolveWindTurbineModel,WIND_TURBINE_MODELS} from '../wind-turbine-models';
import * as THREE from 'three';
import {addWindLayer} from '../../components/landkreis/wind-layer';
describe('shared turbine model library',()=>{
 it('resolves registered variants without confusing different manufacturers or types',()=>{
  expect(resolveWindTurbineModel('DeWind GmbH','D6/62-1000').id).toBe('dewind-d6');
  expect(resolveWindTurbineModel('DeWind GmbH','D4').id).toBe('dewind-d4');
  for(const [brand,type] of [['DeWind','D8'],['Other','D4'],['DeWind','D40'],['','D6'],['DeWind','']])expect(resolveWindTurbineModel(brand,type).id).toBe('generic-three-blade');
 expect(new Set(WIND_TURBINE_MODELS.map(m=>m.id)).size).toBe(WIND_TURBINE_MODELS.length);
 });
 it('resolves each actual Heringen manufacturer and distinguishes nacelle silhouettes',()=>{
  const cases=[['ENERCON GmbH','E-101','enercon-e101','egg'],['Vestas Deutschland GmbH','V126-3.45','vestas-v126','tapered'],['Nordex Energy GmbH','N149/5.7','nordex-n149','tapered'],['Südwind Borsig Energy GmbH','S 77','suedwind-s77','rounded'],['Suedwind','S77','suedwind-s77','rounded']];
  for(const [brand,type,id,shell] of cases){const model=resolveWindTurbineModel(brand,type);expect(model.id).toBe(id);expect(model.shell).toBe(shell);}
  for(const [brand,type] of [['Vestas','V1260'],['ENERCON','E-1010'],['Nordex','N1490'],['Other','E-101']])expect(resolveWindTurbineModel(brand,type).id).toBe('generic-three-blade');
 });
 it('batches mixed manufacturer models without changing registered dimensions or picking identities',()=>{
  const source=[['ENERCON','E-101',149,101],['Vestas','V126',149,126],['Südwind','S77',85,77],['Nordex','N149',164,149]] as const;
  const turbines=source.map(([manufacturer,model,hub,rotor],i)=>({id:String(i),manufacturer,model,hub,rotor,rotorMetres:rotor,x:i*200,z:0}));
  const layer=addWindLayer(new THREE.Scene(),turbines,10,new THREE.Color('white'));
  expect(layer.meshes).toHaveLength(7);
  const towers=layer.meshes[0],matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  turbines.forEach((t,i)=>{towers.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);expect(position.x).toBe(t.x);expect(position.y-scale.y/2).toBeCloseTo(10);expect(scale.y).toBeCloseTo(t.hub);});
  expect(layer.meshes.slice(1,4).flatMap(m=>m.userData.windIds).sort()).toEqual(turbines.map(t=>t.id).sort());
  layer.dispose();
 });
 it('resolves the registered Hatten variants without assigning a model by rotor size',()=>{
  const cases=[['ENERCON GmbH','E-53/S/72/3K/03','enercon-e53'],['ENERCON GmbH','E-66','enercon-e66'],['ENERCON GmbH','E66/18.70','enercon-e66'],['Vestas Deutschland GmbH','V-112','vestas-v112']];
  for(const [brand,type,id] of cases)expect(resolveWindTurbineModel(brand,type).id).toBe(id);
  for(const [brand,type] of [['Other','E-53'],['ENERCON','E-660'],['Vestas','V1120']])expect(resolveWindTurbineModel(brand,type).id).toBe('generic-three-blade');
 });
 it('keeps measured hub height and diameter independent of the visual model',()=>{
  for(const model of ['D4','D6','unknown']){
   const layer=addWindLayer(new THREE.Scene(),[{id:'t',manufacturer:'DeWind',model,x:3,z:5,hub:80,rotor:62,rotorMetres:62}],0,new THREE.Color('white'));
   const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
   layer.meshes[0].getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);
   expect(scale.y).toBeCloseTo(80);expect(position.y).toBeCloseTo(40);
   layer.meshes[2].getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);
   expect(scale.y).toBeCloseTo(31);expect(position.y).toBeCloseTo(80);
   layer.dispose();
  }
 });
});
