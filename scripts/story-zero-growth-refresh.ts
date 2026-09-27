import {readFileSync,writeFileSync} from 'node:fs';
import type {DiscoveryReport,SolarRow} from '../lib/story-discovery';
const root='scripts/.cache/story-discovery';
const cities=JSON.parse(readFileSync(root+'/index.json','utf8')) as {regionId:string;name:string;total:number}[];
const source=JSON.parse(readFileSync('scripts/.cache/bnetza/story-history-2026-09-10/full.json','utf8')) as {sourceDate:string;rows:SolarRow[]};
const annual=new Map<string,{count:number;kwp:number}>();
for(const row of source.rows){const key=[row.region_id,row.segment,row.month.slice(0,4)].join('|');const sum=annual.get(key)??{count:0,kwp:0};sum.count+=row.count;sum.kwp+=row.kwp;annual.set(key,sum);}
let removed=0,retained=0;
function update(report:DiscoveryReport){
 if(report.sourceDate!==source.sourceDate)throw Error('Source edition mismatch');
 report.candidates=report.candidates.filter(c=>{
  if(c.family!=='Jahresveränderung'||c.evidence.length!==2||c.evidence[1].value!==0)return true;
  const segment=c.eventKey.replace(/-\d{4}$/,'');const metric=c.evidence[1].unit==='Anlagen'?'count':'kwp';
  const year=Number(c.period);
  if(![1,2,3].every(offset=>(annual.get([report.regionId,segment,year-offset].join('|'))?.[metric]??0)>0)){removed++;return false;}
  retained++;c.title=c.title.split(':')[0]+`: ${year} erstmals seit drei Jahren kein Zubau`;
  c.reason='Kein Zubau nach drei aufeinanderfolgenden Jahren mit Zubau im aktiven Registerbestand.';
  c.visual='Mehrjähriger Verlauf mit Zubaupause';return true;
 });
}
for(const city of cities){const path=root+'/'+city.regionId+'.json';const report=JSON.parse(readFileSync(path,'utf8')) as DiscoveryReport;update(report);writeFileSync(path,JSON.stringify(report));city.total=report.candidates.length;}
writeFileSync(root+'/index.json',JSON.stringify(cities));
const bundled=JSON.parse(readFileSync('lib/story-discovery-reports.json','utf8')) as DiscoveryReport[];
for(const report of bundled)update(report);
writeFileSync('lib/story-discovery-reports.json',JSON.stringify(bundled));
console.log({cities:cities.length,removed,retained});
