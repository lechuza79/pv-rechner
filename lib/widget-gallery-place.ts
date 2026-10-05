import 'server-only';
import { getRegionById, getAncestors } from './atlas';
import type { GalleryPlace } from './widget-gallery';
export async function galleryPlace(ags:string):Promise<GalleryPlace|null> {
  if(!/^\d{8}$/.test(ags)) return null;
  const region=await getRegionById(ags);
  if(!region || region.level!=='gemeinde')return null;
  const ancestors=await getAncestors(region);
  const state=ancestors.find(r=>r.level==='bundesland');
  const district=ancestors.find(r=>r.level==='landkreis');
  if(!state)return null;
  return {ags,name:region.name,districtId:district?.region_id??null,districtName:district?.name??null,stateId:state.region_id,stateName:state.name};
}
