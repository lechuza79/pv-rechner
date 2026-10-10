import {unzipSync,strFromU8} from 'fflate';
import {parse} from 'csv-parse/sync';
import {TRADE_STEP,tradeDate,tradeMidnight,type TradeInterval} from './electricity-trade';
// Official SMARD market_data_configuration.json: commercial (not physical) DE borders.
export const SMARD_TRADE_MODULES=[22004722,22004724,22004404,22004409,22004545,22004546,22004548,22004550,22004551,22004552,22004405,22004547,22004403,22004406,22004407,22004408,22004410,22004412,22004549,22004553,22004998,22004712,8004169];
const clock=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function csvDate(ts:number){const [y,m,d]=tradeDate(ts).split('-');return `${d}.${m}.${y} ${clock.format(ts)}`;}
export function smardNumber(value:string|undefined):number|null{if(!value||!/^[-+]?\d[\d.]*,?\d*$/.test(value.trim()))return null;const number=Number(value.replaceAll('.','').replace(',','.'));return Number.isFinite(number)?number:null;}
/** CSV timestamps have no offset: resolve repeated autumn hours by occurrence in UTC order. */
export function decodeTradeArchive(bytes:Uint8Array,from:number,to:number):TradeInterval[]{
 const files=unzipSync(bytes),timestamps=new Map<string,number[]>();
 for(let t=from;t<to;t+=TRADE_STEP){const key=csvDate(t);timestamps.set(key,[...(timestamps.get(key)??[]),t]);}
 const points=new Map<number,TradeInterval>();
 let hasTrade=false;
 for(const [name,content] of Object.entries(files)){
  if(!name.endsWith('.csv'))continue;
  const rows=parse(strFromU8(content),{delimiter:';',bom:true,columns:true,skip_empty_lines:true}) as Record<string,string>[];
  if(!rows.length)continue;
  const columns=Object.keys(rows[0]);
  const imports=columns.filter(k=>k.includes('(Import) [MWh]'));
  const exports=columns.filter(k=>k.includes('(Export) [MWh]'));
  const price=columns.find(k=>k.includes('Deutschland/Luxemburg [€/MWh]'));
  if(imports.length&& (imports.length!==11||exports.length!==11))throw new Error('SMARD border coverage changed');
  if(imports.length)hasTrade=true;
  const occurrences=new Map<string,number>();
  for(const row of rows){
   const key=row['Datum von'],occurrence=occurrences.get(key)??0;occurrences.set(key,occurrence+1);
   const ts=timestamps.get(key)?.[occurrence];if(ts===undefined)continue;
   const point=points.get(ts)??{start:ts,importMwh:null,exportMwh:null,price:null};
   const sum=(keys:string[])=>{const values=keys.map(k=>smardNumber(row[k]));return values.some(v=>v===null)?null:values.reduce<number>((a,b)=>a+Math.abs(b!),0);};
   if(imports.length){point.importMwh=sum(imports);point.exportMwh=sum(exports);}
   if(price)point.price=smardNumber(row[price]);
   points.set(ts,point);
  }
 }
 if(!hasTrade)throw new Error('SMARD returned no commercial trade data');
 // A missing price file deliberately leaves the monetary values unavailable.
 return [...points.values()].sort((a,b)=>a.start-b.start);
}
const cache=new Map<string,{expires:number;promise:Promise<{intervals:TradeInterval[];retrievedAt:string}>}>();
export async function fetchSmardTrade(start:string,endExclusive:string){
 const key=`${start}/${endExclusive}`,existing=cache.get(key);if(existing&&existing.expires>Date.now())return existing.promise;
 const from=tradeMidnight(start),to=tradeMidnight(endExclusive);
 const promise=(async()=>{
  const response=await fetch('https://www.smard.de/nip-download-manager/nip/download/market-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_form:[{format:'CSV',moduleIds:SMARD_TRADE_MODULES,region:'DE',timestamp_from:from,timestamp_to:to-1,type:'discrete',language:'de',resolution:'quarterhour'}]}),signal:AbortSignal.timeout(55000),cache:'no-store'});
  if(!response.ok)throw new Error(`SMARD HTTP ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  return {intervals:decodeTradeArchive(bytes,from,to),retrievedAt:new Date().toISOString()};
 })();
 if(cache.size>24)cache.delete(cache.keys().next().value!);
 cache.set(key,{expires:Date.now()+3600000,promise});
 try{return await promise;}catch(error){cache.delete(key);throw error;}
}
