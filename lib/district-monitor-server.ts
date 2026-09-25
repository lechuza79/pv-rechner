import 'server-only';
import {unstable_cache} from 'next/cache';
import {ladeGemeindePaket} from './gemeinde-paket-server';
import {aggregateDistrictMonitor,type DistrictMonitorPacket} from './district-monitor';
import {aggregateDistrictEnergy} from './district-energy';
import type {GemeindePaket} from './gemeinde-paket';
import {ATLAS_DATEN_TAG} from './atlas-revalidate-routen';

/** Cache the compact aggregate; limit cold-cache storage requests to four. */
export const loadDistrictMonitor=unstable_cache(async(ids:string[],town:string)=>{
  const sites:{ags:string;kwp:number}[]=[];
  const packets:((DistrictMonitorPacket & Pick<GemeindePaket,'monitorPeriods'>)|null)[]=new Array(ids.length);
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,ids.length)},async()=>{
    while(cursor<ids.length){
      const index=cursor++;
      const packet=await ladeGemeindePaket(ids[index]);
      if(packet?.register)sites.push({ags:packet.ags,kwp:packet.register.own.sums.alle.kwp});
      packets[index]=packet?{ags:packet.ags,registerStand:packet.registerStand,monitorHistory:packet.monitorHistory,monitorPeriods:packet.monitorPeriods}:null;
    }
  }));
  return {...aggregateDistrictMonitor(ids,packets,packets[0]?.registerStand??''),energy:aggregateDistrictEnergy(ids,packets,town),sites:sites.length===ids.length&&packets.every(p=>p?.registerStand===packets[0]?.registerStand)?sites:null};
},['district-monitor-v5'],{revalidate:86400,tags:[ATLAS_DATEN_TAG]});
