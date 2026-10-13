import {describe,it,expect} from 'vitest';
import {associationDirectory,districtAssociations,directoryAssociation,searchAssociations,associationDirectoryPath} from '../verband-directory';
import {associationSlug} from '../verband-directory-path';
import {subsetNavigationEnergy} from '../region-navigation-energy';
import {releasedAssociations} from '../verband-reference';

describe('official association directory',()=>{
 it('contains unique associations and assigns every municipality exactly once',()=>{
   expect(associationDirectory).toHaveLength(148);
   const members=associationDirectory.flatMap(g=>g.members);
   expect(members).toHaveLength(2377);
   expect(new Set(members).size).toBe(members.length);
   expect(new Set(associationDirectory.map(g=>g.id)).size).toBe(148);
   for(const group of associationDirectory){
     expect(group.id).toMatch(/^\d{9}$/);
     expect(group.members.every(id=>id.startsWith(group.districtId))).toBe(true);
   }
 });
 it('matches the independently bundled sources of the released pages',()=>{
   for(const reference of releasedAssociations())expect(directoryAssociation(reference.id)?.members.slice().sort()).toEqual(reference.members);
 });
 it('groups all 50 Kaiserslautern municipalities into six associations',()=>{
   const groups=districtAssociations('07335');
   expect(groups).toHaveLength(6);
   expect(groups.flatMap(g=>g.members)).toHaveLength(50);
   expect(groups.find(g=>g.name==='Weilerbach')?.members).toHaveLength(8);
   expect(districtAssociations('09679')).toEqual([]);
 });
 it('finds named associations independently of accents and designation',()=>{
   expect(searchAssociations('bruchmuhlbach')[0]?.name).toBe('Bruchmühlbach-Miesau');
   expect(searchAssociations('Verbandsgemeinde Weilerbach')[0]?.id).toBe('073355009');
   expect(searchAssociations('w')).toEqual([]);
   expect(directoryAssociation('073355999')).toBeUndefined();
 });
 it('links directly to the association overview without changing municipal URLs',()=>{
   expect(associationDirectoryPath('/solar-atlas/rheinland-pfalz/landkreis-kaiserslautern','Weilerbach')).toBe('/solar-atlas/rheinland-pfalz/landkreis-kaiserslautern/verbandsgemeinden/weilerbach');
 });
 it('has unique URL segments within every district and preserves released paths',()=>{
   const keys=associationDirectory.map(g=>`${g.districtId}/${associationSlug(g.name)}`);
   expect(new Set(keys).size).toBe(keys.length);
   for(const group of releasedAssociations())expect(associationSlug(directoryAssociation(group.id)!.name)).toBe(group.slug);
 });
 it('subsets energy without leaking other district members or accepting missing ones',()=>{
   const source={month:'2026-09',totalMwh:30,values:[{regionId:'a',mwh:10},{regionId:'b',mwh:20}]};
   expect(subsetNavigationEnergy(source,['b'])).toEqual({...source,totalMwh:20,values:[source.values[1]]});
   expect(subsetNavigationEnergy(source,['c'])).toBeNull();
   expect(subsetNavigationEnergy(source,['b','b'])).toBeNull();
 });
});
