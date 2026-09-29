"use client";

import OnsiteSearch, {type OnsiteSearchItem} from "../OnsiteSearch";

async function loadRegions(query: string, signal: AbortSignal): Promise<OnsiteSearchItem[]> {
  const response = await fetch(`/api/atlas/search?q=${encodeURIComponent(query)}`, {signal});
  if (!response.ok) throw new Error("Region search failed");
  const data = await response.json() as {hits?: {region_id:string;name:string;label:string}[]};
  return (data.hits ?? []).map(hit=>({id:hit.region_id,label:hit.name,description:hit.label}));
}

/** Atlas adapter: shared search owns interaction; this adapter owns routing. */
export default function RegionSearch({onPick,align="right"}:{onPick?:(ags:string,name:string,kreisfrei:boolean)=>void;align?:"left"|"right"}) {
  return <OnsiteSearch align={align} ariaLabel="Region suchen" placeholder="Gemeinde, Kreis, Land …" loadItems={loadRegions}
    onPick={hit=>{
      if(onPick) onPick(hit.id,hit.label,/Kreisfreie Stadt|Stadtkreis/i.test(hit.description ?? ""));
      else window.location.href=`/api/atlas/goto?ags=${encodeURIComponent(hit.id)}`;
    }}/>;
}
