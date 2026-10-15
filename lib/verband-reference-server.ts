import 'server-only';
import {cache} from 'react';
import {isDistrictMember} from './district-package';
import {districtAssociations,associationDirectory,associationDirectoryDate} from './verband-directory';
import {associationSlug} from './verband-directory-path';
import {subsetNavigationEnergy} from './region-navigation-energy';
import {releasedAssociations,selectAssociationMembers,associationPath,type AssociationSlug} from './verband-reference';
import {getRegionById,getChildren,getAncestors,atlasPathForRegionId,type AtlasRegion} from './atlas';
import {getRankingDataForPage} from './atlas-ranking-server';
import {getMastrDataAsOf} from './mastr-data';
import {loadDistrictContent,type DistrictContent} from './district-monitor-server';

export const readAssociationReference=cache(async(slug:AssociationSlug='bad-breisig')=>{
  return releasedAssociations().find(group=>group.slug===slug)??null;
});

export async function associationBreadcrumb(ags:string,districtPath:string) {
  const group=associationDirectory.find(group=>group.members.includes(ags));
  const association=group?{...group,name:`Verbandsgemeinde ${group.name}`,slug:associationSlug(group.name)}:null;
  return association?.members.includes(ags)?{name:association.name,href:associationPath(districtPath,association.slug)}:null;
}

/** Uses the shared published package; never reads member packages during rendering. */
export const loadAssociationReference=cache(async(slug:string='bad-breisig',districtId?:string)=>{
  const group=districtId?districtAssociations(districtId).find(group=>associationSlug(group.name)===slug):null;
  const association=group?{...group,name:`Verbandsgemeinde ${group.name}`,slug,asOf:associationDirectoryDate}:releasedAssociations().find(group=>group.slug===slug);
  if(!association)return null;
  const district=await getRegionById(association.districtId);
  if(!district || district.level!=='landkreis')throw new Error('Association district unavailable');
  const childrenPromise=getChildren(district);
  const [children,ranking,stand,ancestors,districtPath]=await Promise.all([
    childrenPromise,getRankingDataForPage(district,childrenPromise),getMastrDataAsOf(),getAncestors(district),atlasPathForRegionId(district.region_id),
  ]);
  if(!districtPath||!stand)throw new Error('Association reference source metadata unavailable');
  const towns=selectAssociationMembers(children,association.members,district.region_id);
  const ids=new Set(association.members);
  const regions=ranking.regions.filter(row=>ids.has(row.region_id));
  if(regions.length!==ids.size || new Set(regions.map(row=>row.region_id)).size!==ids.size)throw new Error('Association ranking membership incomplete');
  const dates=new Set(towns.map(town=>town.population_as_of));
  const region:Omit<AtlasRegion,'level'> & {level:'verbandsgemeinde'}={
    region_id:association.id,level:'verbandsgemeinde',name:association.name,bezeichnung:'Verbandsgemeinde',slug:association.slug,
    parent_region_id:district.region_id,
    population:dates.size===1&&towns.every(town=>town.population!==null)?towns.reduce((sum,town)=>sum+town.population!,0):null,
    population_as_of:dates.size===1?towns[0].population_as_of:null,
    area_km2:towns.every(town=>town.area_km2!==null)?towns.reduce((sum,town)=>sum+town.area_km2!,0):null,
  };
  const overviewOnly=!releasedAssociations().some(group=>group.id===association.id);
  // The district package already contains all child totals. Do not fetch member packages.
  const content:Promise<DistrictContent>=overviewOnly
    ? loadDistrictContent(district.region_id,children.filter(child=>isDistrictMember(child,district.region_id)).map(child=>child.region_id),stand).then(parent=>({
        ...parent,stories:[],monitor:{status:'unavailable' as const,reason:'not-prepared' as const,energy:null,sites:null},
        childEnergy:subsetNavigationEnergy(parent.childEnergy,association.members),
      }))
    : loadDistrictContent(association.id,association.members,stand);
  void content.catch(()=>{});
  return {association,overviewOnly,region,district,towns,ranking:{regions,cells:ranking.cells.filter(row=>ids.has(row.region_id))},stand,ancestors,districtPath,
    basePath:associationPath(districtPath,association.slug),content};
});
