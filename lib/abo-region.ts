import 'server-only';
import {getRegionById,atlasPathForRegionId} from './atlas';
import {RELEASED_ASSOCIATIONS,associationPath,type AssociationSlug} from './verband-reference';
import {readAssociationReference} from './verband-reference-server';

/** Subscription identity is independent of update scheduling and aggregation. */
export async function aboRegion(regionId:string) {
  if (!/^\d{9}$/.test(regionId)) return getRegionById(regionId);
  const slug=(Object.keys(RELEASED_ASSOCIATIONS) as AssociationSlug[]).find(key=>RELEASED_ASSOCIATIONS[key]===regionId);
  return slug?readAssociationReference(slug):null;
}

export async function aboRegionPath(regionId:string):Promise<string|null> {
  if (!/^\d{9}$/.test(regionId)) return atlasPathForRegionId(regionId);
  const region=await aboRegion(regionId);
  if (!region || !('districtId' in region)) return null;
  const parent=await atlasPathForRegionId(region.districtId);
  return parent?associationPath(parent,region.slug):null;
}
