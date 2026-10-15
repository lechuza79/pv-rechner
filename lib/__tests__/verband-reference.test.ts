import {afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {associationFromGv100,associationPath,selectAssociationMembers} from '../verband-reference';
import {districtsFromRegister} from '../district-package';
import {districtGeometry} from '../district-geometry';

const source=readFileSync(new URL('../../docs/quellen/verbandsgemeinde-bad-breisig/GV100AD-2026-08-31.txt',import.meta.url),'utf8');
const reference=associationFromGv100(source);
afterEach(()=>vi.unstubAllEnvs());

describe('official Bad Breisig association reference',()=>{
 it('uses the four official members, not all towns with the same county prefix',()=>{
  expect(reference.members).toEqual(['07131006','07131014','07131025','07131081']);
  expect(reference.name).toBe('Verbandsgemeinde Bad Breisig');
  expect(reference.asOf).toBe('2026-08-31');
  const rows=[...reference.members,'07131007'].map(region_id=>({region_id,parent_region_id:'07131'}));
  expect(selectAssociationMembers(rows,reference.members,'07131').map(row=>row.region_id)).toEqual(reference.members);
 });
 it('refuses missing, duplicate or foreign register members',()=>{
  const rows=reference.members.map(region_id=>({region_id,parent_region_id:'07131'}));
  expect(()=>selectAssociationMembers(rows.slice(1),reference.members,'07131')).toThrow();
  expect(()=>selectAssociationMembers([...rows,rows[0]],reference.members,'07131')).toThrow();
  expect(()=>selectAssociationMembers(rows.map((row,i)=>i?row:{...row,parent_region_id:'07132'}),reference.members,'07131')).toThrow();
 });
 it('refuses duplicate source records, unresolved associations and mixed dates',()=>{
  const member=source.split('\n').find(line=>line.startsWith('60'))!;
  expect(()=>associationFromGv100(source+member+'\n')).toThrow();
  expect(()=>associationFromGv100(source.split('\n').filter(line=>!line.startsWith('50')).join('\n'))).toThrow();
  expect(()=>associationFromGv100(source.replace('5020260831','5020260731'))).toThrow();
 });
 it('adds its own URL without nesting or moving town URLs',()=>{
  const district='/solar-atlas/rheinland-pfalz/ahrweiler';
  expect(associationPath(district)).toBe(district+'/verbandsgemeinden/bad-breisig');
 });
 it('projects exactly the official member boundaries and refuses absent ones',async()=>{
  expect((await districtGeometry(reference.districtId,reference.members)).map(shape=>shape.id).sort()).toEqual(reference.members);
  await expect(districtGeometry(reference.districtId,[...reference.members,'07131999'])).rejects.toThrow('Association boundary missing');
 });
});


describe('official Weilerbach association reference',()=>{
 it('keeps all eight official members separate from Bad Breisig',async()=>{
  const text=readFileSync(new URL('../../docs/quellen/verbandsgemeinde-weilerbach/GV100AD-2026-08-31.txt',import.meta.url),'utf8');
  const group=associationFromGv100(text,'weilerbach');
  expect(group.name).toBe('Verbandsgemeinde Weilerbach');
  expect(group.districtId).toBe('07335');
  expect(group.members).toEqual(['07335005','07335006','07335019','07335024','07335040','07335043','07335049','07335501']);
  expect(group.members.some(id=>reference.members.includes(id))).toBe(false);
  expect((await districtGeometry(group.districtId,group.members)).map(shape=>shape.id).sort()).toEqual(group.members);
  expect(associationPath('/solar-atlas/rheinland-pfalz/landkreis-kaiserslautern',group.slug)).toBe('/solar-atlas/rheinland-pfalz/landkreis-kaiserslautern/verbandsgemeinden/weilerbach');
 });
});

it('never includes foreign districts in the German package publisher',()=>{
 const row=(region_id:string,level:string,parent_region_id:string|null)=>({region_id,name:region_id,level,parent_region_id,bezeichnung:null});
 expect(districtsFromRegister([row('chb01','landkreis','chk01'),row('chg01','gemeinde','chb01'),row('chg02','gemeinde','chb01')])).toEqual([]);
});
