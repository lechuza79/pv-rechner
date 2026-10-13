import {NextRequest,NextResponse} from 'next/server';
import {unstable_cache} from 'next/cache';
import {fetchCrossBorderFlows,fetchPublicPower} from '../../../../lib/energy-api';
import {latestPhysicalFlows} from '../../../../lib/physical-flows';
import {BORDER_COUNTRIES,calculateImportMix,calculateTradeMix} from '../../../../lib/import-mix';
import {rateLimit} from '../../../../lib/rate-limit';
const countryMix=unstable_cache(async(code:string,start:string,end:string)=>fetchPublicPower(code,start,end,10000,0),['import-supplier-mix-v1'],{revalidate:900});
const load=unstable_cache(async()=>{
 const end=new Date(),start=new Date(end.getTime()-48*3600000);
 const flows=await fetchCrossBorderFlows('de',start.toISOString(),end.toISOString());
 const latest=latestPhysicalFlows(flows);
 if(!latest)throw new Error('No complete border timestamp');
 const row=flows.find(point=>point.ts===latest.ts)!;
 const suppliers=Object.keys(BORDER_COUNTRIES).filter(name=>typeof row.data[name]==='number'&&(row.data[name] as number)>0);
 const from=new Date(Date.parse(latest.ts)-3600000).toISOString();
 const results=await Promise.allSettled([...suppliers.map(name=>countryMix(BORDER_COUNTRIES[name],from,latest.ts)),countryMix('de',from,latest.ts)]);
 const mixes:Record<string,Record<string,number|string|null>|undefined>={};
 results.forEach((result,index)=>{if(index<suppliers.length&&result.status==='fulfilled')mixes[suppliers[index]]=result.value.find(point=>Date.parse(point.ts)===Date.parse(latest.ts))?.data;});
 const domestic=results[suppliers.length];
 const generation=domestic.status==='fulfilled'?domestic.value.find(point=>Date.parse(point.ts)===Date.parse(latest.ts))?.data:undefined;
 return {snapshot:calculateTradeMix(calculateImportMix(latest.ts,row.data,mixes),latest.exportGw,generation),retrievedAt:new Date().toISOString()};
},['german-trade-mix-v2'],{revalidate:900});
export async function GET(req:NextRequest){
 const limited=rateLimit(req,'import-mix');if(limited)return limited;
 try{return NextResponse.json(await load());}catch{return NextResponse.json({snapshot:null,error:'Importmix derzeit nicht verfügbar.'},{status:503});}
}
