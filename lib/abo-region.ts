import 'server-only';
import { ATLAS_CITIES, isCityPublished, slugify } from './atlas-cities';
import {getFundingPrograms} from './funding-data';
import {getRegionById,atlasPathForRegionId} from './atlas';
import {RELEASED_ASSOCIATIONS,associationPath,type AssociationSlug} from './verband-reference';
import {readAssociationReference} from './verband-reference-server';
import type { AboTechnik } from './abo-technik';

/** Subscription identity is independent of update scheduling and aggregation. */
export async function aboRegion(regionId:string): Promise<{name: string; districtId?: string; slug?: string | null} | null> {
  if (regionId.startsWith('funding:program:')) {
    const program = (await getFundingPrograms()).find(p => p.id === regionId.slice('funding:program:'.length));
    return program ? { name: program.name } : null;
  }
  if (regionId.startsWith('funding:region:')) {
    const region = await aboRegion(regionId.slice('funding:region:'.length));
    return region ? { name: `Förderung · ${region.name}` } : null;
  }
  if (!/^\d{9}$/.test(regionId)) return getRegionById(regionId);
  const slug=(Object.keys(RELEASED_ASSOCIATIONS) as AssociationSlug[]).find(key=>RELEASED_ASSOCIATIONS[key]===regionId);
  return slug?readAssociationReference(slug):null;
}

export async function aboRegionPath(regionId:string, techniken?: AboTechnik[]):Promise<string|null> {
  if (regionId === "de") return await aboRegion(regionId) ? "/solar-atlas" : null;
  if (regionId.startsWith('funding:')) {
    if (!await aboRegion(regionId)) return null;
    if (techniken?.length === 1 && techniken[0] === 'balkon') return '/balkonkraftwerk/foerderung';
    if (regionId.startsWith('funding:region:')) {
      const id = regionId.slice('funding:region:'.length);
      const city = ATLAS_CITIES.find(city => city.ags === id && isCityPublished(city));
      if (city) return `/photovoltaik-foerderung/${slugify(city.bundesland)}/${city.slug}`;
    }
    return regionId.startsWith('funding:program:') ? `/photovoltaik-foerderung#programm-${regionId.slice('funding:program:'.length)}` : '/photovoltaik-foerderung';
  }
  if (!/^\d{9}$/.test(regionId)) return atlasPathForRegionId(regionId);
  const region=await aboRegion(regionId);
  if (!region?.districtId || !region.slug) return null;
  const parent=await atlasPathForRegionId(region.districtId);
  return parent?associationPath(parent,region.slug):null;
}
