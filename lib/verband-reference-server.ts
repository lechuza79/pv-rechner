import 'server-only';
import {cache} from 'react';
import {releasedAssociations,selectAssociationMembers,associationPath,type AssociationSlug} from './verband-reference';
import {getRegionById,getChildren,getAncestors,atlasPathForRegionId,type AtlasRegion} from './atlas';
import {getRankingDataForPage} from './atlas-ranking-server';
import {getMastrDataAsOf} from './mastr-data';
import {loadDistrictContent,type DistrictContent} from './district-monitor-server';

export const readAssociationReference=cache(async(slug:AssociationSlug='bad-breisig')=>{
  return releasedAssociations().find(group=>group.slug===slug)??null;
});

export async function associationBreadcrumb(ags:string,districtPath:string) {
  const association=releasedAssociations().find(group=>group.members.includes(ags));
  return association?.members.includes(ags)?{name:association.name,href:associationPath(districtPath,association.slug)}:null;
}

/** Uses the shared published package; never reads member packages during rendering. */
export const loadAssociationReference=cache(async(slug:AssociationSlug='bad-breisig')=>{
  const association=await readAssociationReference(slug);
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
  const content:Promise<DistrictContent>=loadDistrictContent(association.id,association.members,stand);
  void content.catch(()=>{});
  return {association,region,district,towns,ranking:{regions,cells:ranking.cells.filter(row=>ids.has(row.region_id))},stand,ancestors,districtPath,
    basePath:associationPath(districtPath,association.slug),content};
});
