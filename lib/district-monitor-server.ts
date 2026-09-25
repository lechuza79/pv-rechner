import 'server-only';
import {unstable_cache} from 'next/cache';
import {ladeGemeindePaket} from './gemeinde-paket-server';
import {aggregateDistrictMonitor,type DistrictMonitorPacket} from './district-monitor';
import {aggregateDistrictEnergy} from './district-energy';
import type {GemeindePaket} from './gemeinde-paket';
import {paketFuer} from '../components/gemeinde/paket-teile';
import {selectDistrictStories} from './district-stories';
import type {StoryConcept} from './story-konzepte';
import {ATLAS_DATEN_TAG} from './atlas-revalidate-routen';

/** Read each municipality once for both streamed sections; cache only their compact output. */
export const loadDistrictContent=unstable_cache(async(ids:string[],town:string)=>{
  const stories:StoryConcept[][]=new Array(ids.length);
  const sites:{ags:string;kwp:number}[]=[];
  const packets:((DistrictMonitorPacket & Pick<GemeindePaket,'monitorPeriods'>)|null)[]=new Array(ids.length);
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(8,ids.length)},async()=>{
    while(cursor<ids.length){
      const index=cursor++;
      const packet=await ladeGemeindePaket(ids[index]);
      stories[index]=packet ? paketFuer("geschichten",packet).stories as StoryConcept[] : [];
      if(packet?.register)sites.push({ags:packet.ags,kwp:packet.register.own.sums.alle.kwp});
      packets[index]=packet?{ags:packet.ags,registerStand:packet.registerStand,monitorHistory:packet.monitorHistory,monitorPeriods:packet.monitorPeriods}:null;
    }
  }));
  const monitor={...aggregateDistrictMonitor(ids,packets,packets[0]?.registerStand??''),energy:aggregateDistrictEnergy(ids,packets,town),sites:sites.length===ids.length&&packets.every(p=>p?.registerStand===packets[0]?.registerStand)?sites:null};
  return {monitor,stories:selectDistrictStories(stories)};
},['district-content-v1'],{revalidate:86400,tags:[ATLAS_DATEN_TAG]});

/** The daily power endpoint consumes the same cached district projection. */
export async function loadDistrictMonitor(ids:string[],town:string){
  return (await loadDistrictContent(ids,town)).monitor;
}

export type DistrictContent = Awaited<ReturnType<typeof loadDistrictContent>>;
