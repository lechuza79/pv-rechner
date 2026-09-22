import {heuteInBerlin} from '../lib/zeit';
throw new Error('Veralteter Wetterabruf gesperrt. Story-Vorbereitung auf aktuellem main mit ERA5-Archiv verwenden; siehe docs/codex-update-wetter-2026-09-19.md.');
/** Resumable, local-only municipal story preparation. Never publishes or invents missing data. */
import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateStoryWeather} from '../lib/story-weather-validation';
import {boundaryWeatherPoint} from '../lib/story-weather-location';
import {solarMonth} from '../lib/story-monthly-solar';
import {energyYear} from '../lib/story-energy-year';
import {unitMonthValue,type ValuationUnit} from '../lib/story-unit-value';
import {eigenverbrauchAnteilRegion} from '../lib/atlas-impact';
import type {PreparedStoryData} from '../lib/story-prepared-data';
const arg=(key:string,fallback='')=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3)??fallback;
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const atomic=(path:string,data:unknown)=>{writeFileSync(path+'.tmp',JSON.stringify(data));renameSync(path+'.tmp',path);};
async function main(){
const base='scripts/.cache', index=read(base+'/story-discovery/index.json') as {regionId:string;name:string}[];
const requested=arg('cities','all').split(',');
const cities=requested.includes('all')?index:requested.map(id=>{const r=index.find(r=>r.regionId===id);if(!r)throw Error('Unknown municipality '+id);return r;});
const regions=new Map<string,any>(read(base+'/story-inputs/regions.json').map((r:any)=>[r.region_id,r]));
const plz=read('public/plz.json'),ags=read('public/plz-ags.json'),points=new Map<string,number[][]>();
for(const [code,places] of Object.entries(ags)){if(!plz[code])continue;for(const p of places as {ags:string}[]){const list=points.get(p.ags)??[];list.push(plz[code]);points.set(p.ags,list);}}
const stockPath=arg('stock');const stockDate=arg('stock-date');
if(!stockPath||!/^\d{4}-\d{2}-\d{2}$/.test(stockDate))throw Error('Explicit --stock and --stock-date required');
const stockRaw=read(stockPath),stocks=new Map<string,any>((Array.isArray(stockRaw)?stockRaw:stockRaw.stats).map((r:any)=>[r.regionId,r]));
const fetchEnabled=process.argv.includes('--fetch');let rateLimited=false;let limitReason='';
const weatherRoot=base+'/story-weather';mkdirSync(weatherRoot,{recursive:true});
async function weather(id:string,kind:'month'|'year',lat:number,lon:number,start:string,end:string){
 const hourly='temperature_2m,shortwave_radiation'+(kind==='year'?',wind_speed_100m':'');
 const url=new URL('https://archive-api.open-meteo.com/v1/archive');
 for(const [k,v] of Object.entries({latitude:lat,longitude:lon,start_date:start,end_date:end,hourly,models:'era5',timezone:'UTC',wind_speed_unit:'ms'}))url.searchParams.set(k,String(v));
 const path=weatherRoot+'/'+createHash('sha256').update(url.href).digest('hex')+'.json';
 if(existsSync(path))return read(path);
 // Reuse earlier raw inputs only when the requested complete period and variables agree.
 const legacy=base+'/story-radial/'+id+'-'+kind+'.json';
 if(existsSync(legacy)){const r=read(legacy),u=new URL(r.sourceUrl);if(u.searchParams.get('start_date')===start&&u.searchParams.get('end_date')===end&&(kind==='month'||u.searchParams.get('wind_speed_unit')==='ms'))return r;}
 const oldMonth=base+'/story-monthly-solar/'+id+'-'+end.slice(0,7)+'.json';
 if(kind==='month'&&existsSync(oldMonth)){const r=read(oldMonth);if(new URL(r.sourceUrl).searchParams.get('start_date')===start)return r;}
 if(!fetchEnabled||rateLimited)throw Error(rateLimited?'Wetterabruf wartet nach Anbieterlimit.':'Örtliche Wetterdaten noch nicht vorbereitet.');
 let response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 for(let retry=0;response.status===429&&retry<3;retry++){
  const reason=await response.text();console.log('Weather limit',reason);
  if(/daily|day limit|hourly|hour limit/i.test(reason)){rateLimited=true;limitReason=reason;throw Error('Wetteranbieter-Limit: '+reason);}
  console.log('Waiting 55 seconds before resuming cached preparation');
  await new Promise(resolve=>setTimeout(resolve,55000));
  response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 }
 if(response.status===429){rateLimited=true;limitReason='Persistent minute limit';throw Error('Wetteranbieter meldet anhaltendes Abruflimit; der Lauf ist wiederaufnehmbar.');}
 if(!response.ok)throw Error('Wetterabruf fehlgeschlagen: HTTP '+response.status);
 const result={sourceUrl:url.href,retrievedAt:new Date().toISOString(),weather:await response.json()};
 validateStoryWeather(result.weather,start,end,kind==='year');
 atomic(path,result);return result;
}
const counts={cities:0,monthly:0,annual:0,values:0};
async function prepareCity(city:typeof cities[number]){
 const report=read(base+'/story-discovery/'+city.regionId+'.json');
 const root=base+'/story-prepared/'+report.sourceDate;mkdirSync(root,{recursive:true});
 const path=root+'/'+city.regionId+'.json';
 const previous=existsSync(path)?read(path):null;
 const data:PreparedStoryData=previous?.sourceDate===report.sourceDate?previous:{sourceDate:report.sourceDate,availability:[],preparedAt:''};
 data.availability=[];
 const mark=(topic:string,ready:boolean,reason:string)=>data.availability.push({topic,status:ready?'ready':'missing',reason});
 const sourceYear=Number(report.sourceDate.slice(0,4)),sourceMonth=Number(report.sourceDate.slice(5,7));
 const month=new Date(Date.UTC(sourceYear,sourceMonth-2,15)).toISOString().slice(0,7),year=sourceYear-1;
 const start=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5))-1,0)).toISOString().slice(0,10);
 const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10);
 const r=regions.get(city.regionId),ps=points.get(city.regionId)??[];
 let boundary=null;const boundaryPath='public/geo/gemeinden/'+city.regionId.slice(0,5)+'.geo.json';
 if(existsSync(boundaryPath)){const feature=read(boundaryPath).features.find((f:any)=>f.properties.id===city.regionId);boundary=boundaryWeatherPoint(feature?.geometry?.coordinates);}
 const savedWeatherUrl=data.monthly?.sourceUrl??data.weatherSourceUrl;
 const savedUrl=savedWeatherUrl?new URL(savedWeatherUrl):null;
 const lat=(savedUrl?Number(savedUrl.searchParams.get('latitude')):undefined)??r?.centroid_lat??boundary?.latitude??(ps.length?ps.reduce((s,p)=>s+p[0],0)/ps.length:NaN);
 const lon=(savedUrl?Number(savedUrl.searchParams.get('longitude')):undefined)??r?.centroid_lon??boundary?.longitude??(ps.length?ps.reduce((s,p)=>s+p[1],0)/ps.length:NaN);
 const coordinateNote=savedUrl?'Wetterpunkt des gespeicherten Berechnungsstands':r?.centroid_lat!=null?'Gemeindemittelpunkt':boundary?'Mittelpunkt des umschließenden Gemeinderechtecks':'Mittelpunkt der örtlichen Postleitzahl-Koordinaten';
 let monthWeather:any;
 let detail:any;
 try{if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error('Keine örtliche Wetterkoordinate vorhanden.');const detailPath=base+'/bnetza/story-history-'+report.sourceDate+'/cities/'+city.regionId+'.json';if(existsSync(detailPath))detail=read(detailPath);else{const inventory=read(base+'/story-radial/'+city.regionId+'-value-units.json');if(inventory.sourceDate!==report.sourceDate||inventory.units.some((u:ValuationUnit)=>u.status==='35'&&u.kwp>0))throw Error('Örtliche Solar-Detaildaten fehlen.');detail={daily:[]};}monthWeather=await weather(city.regionId,'month',lat,lon,start,end);if(!data.monthly)data.monthly={...solarMonth(monthWeather.weather,detail.daily,month,report.sourceDate,monthWeather.retrievedAt??new Date().toISOString(),monthWeather.sourceUrl),town:city.name};mark('Solar-Monatsrecap',true,coordinateNote+' · vollständige Wetterstunden.');}
 catch(e){mark('Solar-Monatsrecap',!!data.monthly,(e as NodeJS.ErrnoException).code==='ENOENT'?'Benötigte örtliche Ausgangsdaten fehlen.':(e as Error).message);}
 try{
  if(!data.annual){const stock=stocks.get(city.regionId);if(!stock||!Number.isFinite(stock.windKwpLy)||stock.windKwpLy<0||Number(stockDate.slice(0,4))!==sourceYear)throw Error('Kein passender Wind-Vorjahresbestand vorhanden.');if(!detail||!Number.isFinite(lat)||!Number.isFinite(lon))throw Error('Örtlicher Anlagenbestand oder Wetterkoordinate fehlt.');
   const source=await weather(city.regionId,'year',lat,lon,`${year}-01-01`,`${year}-12-31`);
   const solarKwp=detail.daily.filter((d:any)=>d.day<`${year+1}-01-01`&&['gebaeude','freiflaeche','steckersolar','sonstige'].includes(d.segment)).reduce((s:number,d:any)=>s+d.kwp,0);
   data.annual=energyYear(source.weather,{town:city.name,year,solarKwp,windKw:stock.windKwpLy,sourceDate:report.sourceDate,retrievedAt:source.retrievedAt??new Date().toISOString(),sourceUrl:source.sourceUrl});
  }mark('Energie-Jahresprofil',true,coordinateNote+' · Windbestand vom '+stockDate+'.');
 }catch(e){mark('Energie-Jahresprofil',false,(e as NodeJS.ErrnoException).code==='ENOENT'?'Benötigte örtliche Ausgangsdaten fehlen.':(e as Error).message);}
 try{
  if(!data.values?.[month]){
   if(!monthWeather)throw Error('Vollständige Monats-Wetterdaten fehlen.');
   const source=read(base+'/story-radial/'+city.regionId+'-value-units.json');if(source.sourceDate!==report.sourceDate)throw Error('Anlagen- und Wettermodell verwenden unterschiedliche Registerstände.');
   const stock=stocks.get(city.regionId);if(!stock||!Number.isFinite(stock.batteriePrivatCount)||!Number.isFinite(stock.batteriePrivatKwh))throw Error('Örtliche Speichergrundlage für Eigenverbrauch fehlt.');
   const privateUnits=(source.units as ValuationUnit[]).filter(u=>u.status==='35'&&u.usage==='713'&&!['852','2961'].includes(u.art)&&u.kwp>0);
   const selfUse=eigenverbrauchAnteilRegion({dachCount:privateUnits.length,dachKwp:privateUnits.reduce((s,u)=>s+u.kwp,0),batterieCount:stock.batteriePrivatCount,batterieKwh:stock.batteriePrivatKwh},city.regionId);
   if(privateUnits.length&&selfUse===null)throw Error('Eigenverbrauch nicht berechenbar.');
   const {rows,...value}=unitMonthValue(source.units,monthWeather.weather,month,selfUse??0);
   if(data.monthly&&Math.abs(value.totalMwh-data.monthly.totalMwh)>Math.max(.001,data.monthly.totalMwh*.00001))throw Error('Ertrag der Einzelanlagen stimmt nicht mit dem Monatschart überein.');
   data.values??={};data.values[month]={...value,privateSelfConsumption:selfUse??0,sourceDate:source.sourceDate,valuationDate:heuteInBerlin(),month,model:'individual-register-unit-v2',assumptionSourceDate:stockDate};
   // Preserve per-unit calculation evidence locally; it is never shipped to the browser.
   const auditRoot=base+'/story-valuation/'+report.sourceDate;mkdirSync(auditRoot,{recursive:true});atomic(auditRoot+'/'+city.regionId+'-'+month+'.json',{...data.values[month],rows});
  }mark('Stromkennzahlen',true,'Einzelanlagen bewertet; Eigenverbrauch mit örtlichem Speicherbestand vom '+stockDate+'.');
 }catch(e){mark('Stromkennzahlen',false,(e as NodeJS.ErrnoException).code==='ENOENT'?'Benötigte örtliche Ausgangsdaten fehlen.':(e as Error).message);}
 data.preparedAt=new Date().toISOString();atomic(path,data);
 counts.cities++;if(data.monthly)counts.monthly++;if(data.annual)counts.annual++;if(data.values?.[month])counts.values++;
 if(counts.cities%25===0||cities.length<25)console.log(city.name,counts,rateLimited?'provider-limit':'');
}
let cursor=0;
await Promise.all(Array.from({length:3},async()=>{while(cursor<cities.length){const city=cities[cursor++];await prepareCity(city);}}));
const summary={...counts,rateLimited,limitReason,fetchEnabled,completedAt:new Date().toISOString()};atomic(base+'/story-prepared/latest-run.json',summary);console.log(summary);

}
const keepAlive=setInterval(()=>{},30000);
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearInterval(keepAlive));
