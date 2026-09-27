throw new Error('Veralteter Wetterabruf gesperrt. Story-Vorbereitung auf aktuellem main mit ERA5-Archiv verwenden; siehe docs/codex-update-wetter-2026-09-19.md.');
/** Cache consistent historical weather inputs; no database or publication writes. */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
const arg=(n,d)=>process.argv.find(a=>a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')??d;
const cities=arg('cities','Trier,Nidda').split(',');
const start=Number(arg('start','2016')),end=Number(arg('end','2025'));
if(!Number.isInteger(start)||!Number.isInteger(end)||start>end||end>=new Date().getUTCFullYear())throw Error('Choose complete calendar years');
const regions=JSON.parse(readFileSync('scripts/.cache/story-inputs/regions.json','utf8')).filter(r=>cities.includes(r.name)||cities.includes(r.region_id));
if(regions.length!==cities.length)throw Error('Select unique municipalities by key');
const root='scripts/.cache/story-yield';mkdirSync(root,{recursive:true});
for(const r of regions){
 const hours=[]; const requests=[];
 const plz=JSON.parse(readFileSync('public/plz.json','utf8')),ags=JSON.parse(readFileSync('public/plz-ags.json','utf8'));
 const points=Object.entries(ags).filter(([code,places])=>plz[code]&&places.some(p=>p.ags===r.region_id)).map(([code])=>plz[code]);
 if(r.centroid_lat==null||r.centroid_lon==null){if(!points.length)throw Error('Missing coordinates: '+r.name);r.centroid_lat=points.reduce((s,p)=>s+p[0],0)/points.length;r.centroid_lon=points.reduce((s,p)=>s+p[1],0)/points.length;r.coordinateBasis='Mean of local postal-code coordinates';}

 for(let y=start;y<=end;y++){
  const file=`${root}/${r.region_id}-era5-${y}.json`;
  if(!existsSync(file)){
   const url=new URL('https://archive-api.open-meteo.com/v1/archive');
   for(const [k,v]of Object.entries({latitude:r.centroid_lat,longitude:r.centroid_lon,start_date:`${y-1}-12-31`,end_date:`${y}-12-31`,hourly:'temperature_2m,shortwave_radiation',models:'era5',timezone:'UTC'}))url.searchParams.set(k,String(v));
   const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error(`${r.name} ${y}: ${response.status} ${await response.text()}`);
   const data=await response.json();if(!data.hourly?.time?.length)throw Error('No hourly input');
   writeFileSync(file,JSON.stringify({url:String(url),retrievedAt:new Date().toISOString(),data}));
  }
  const cached=JSON.parse(readFileSync(file,'utf8'));requests.push({url:cached.url,retrievedAt:cached.retrievedAt});
  cached.data.hourly.time.forEach((time,i)=>hours.push({time:time+'Z',temperature:cached.data.hourly.temperature_2m[i],radiation:cached.data.hourly.shortwave_radiation[i]}));
  console.log(r.name,y,'cached');
 }
 const unique=[...new Map(hours.map(h=>[h.time,h])).values()].sort((a,b)=>a.time.localeCompare(b.time));
 writeFileSync(`${root}/${r.region_id}.json`,JSON.stringify({regionId:r.region_id,name:r.name,latitude:r.centroid_lat,longitude:r.centroid_lon,coordinateBasis:r.coordinateBasis??'Municipal centroid',model:'era5',startYear:start,endYear:end,requests,hours:unique}));
}
