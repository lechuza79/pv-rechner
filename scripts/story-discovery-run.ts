import {appendMonthlyAdditions} from '../lib/story-monthly-additions';
import {appendMonthlySolar} from '../lib/story-monthly-candidate';
/** Local replayable discovery. No database writes or publication side effects. */
import {appendYieldStories,type YieldInput} from '../lib/story-yield-discovery';
import {prepareOriginalPatterns} from './story-original-patterns';
import {candidateFingerprint} from '../lib/story-pool';
import {createHash} from 'node:crypto';
import {addEnergyStory} from '../lib/story-energy-discovery';
import {addHousingStory,type HousingRow} from '../lib/story-housing-discovery';
import {addFundingStories,type FundingRow,type FundingChange} from '../lib/story-funding-discovery';
import {appendRankingMonth} from '../lib/story-ranking-month';
import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync,openSync,closeSync,writeSync} from 'node:fs';
import {discoverStories,type SolarRow,type FundingContext} from '../lib/story-discovery';
import {addPeriodStories,type DetailSeries} from '../lib/story-period-discovery';
import {addStorageStories,type StorageRow} from '../lib/story-storage-discovery';
const arg=(name:string,fallback:string)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')??fallback;
const historyRoot=arg('history','scripts/.cache/bnetza/'+readdirSync('scripts/.cache/bnetza').filter(n=>/^story-history-\d{4}-\d{2}-\d{2}$/.test(n)).sort().at(-1));
const raw=JSON.parse(readFileSync(arg('input',historyRoot+'/full.json'),'utf8')) as {sourceDate:string;source:string;rows:SolarRow[]};
const regions=JSON.parse(readFileSync(arg('regions','scripts/.cache/story-inputs/regions.json'),'utf8')) as {region_id:string;name:string;population:number;population_as_of?:string}[];
const storage=JSON.parse(readFileSync(arg('storage',historyRoot+'/storage.json'),'utf8')) as {sourceDate:string;rows:StorageRow[]};
if(storage.sourceDate!==raw.sourceDate)throw new Error('Solar and storage source editions differ');
const storageGrouped=new Map<string,StorageRow[]>();for(const row of storage.rows){const rows=storageGrouped.get(row.region_id)??[];rows.push(row);storageGrouped.set(row.region_id,rows);}
const sizes=JSON.parse(readFileSync(arg('sizes',historyRoot+'/sizes.json'),'utf8')) as Record<string,{segment:string;count:number;minimum:number;maximum:number;mean:number}[]>;
const housing=new Map((JSON.parse(readFileSync(arg('housing','scripts/.cache/story-inputs/housing.json'),'utf8')) as HousingRow[]).map(r=>[r.region_id,r]));
const programmes=JSON.parse(readFileSync(arg('funding-programmes','scripts/.cache/story-inputs/funding-programmes.json'),'utf8')) as FundingRow[];
const changes=JSON.parse(readFileSync(arg('funding-history','scripts/.cache/story-inputs/funding-history.json'),'utf8')) as FundingChange[];
const inputKey=createHash('sha256').update(JSON.stringify([raw.source,raw.sourceDate,raw.rows,storage.rows,sizes,regions,programmes,changes,[...housing.values()]])).digest('hex').slice(0,16);
const grouped=new Map<string,SolarRow[]>();for(const r of raw.rows){const a=grouped.get(r.region_id)??[];a.push(r);grouped.set(r.region_id,a);}
const cutoff=Number(raw.sourceDate.slice(0,4))*12+Number(raw.sourceDate.slice(5,7))-4;
const latestYear=String(Math.min(Number(raw.sourceDate.slice(0,4))-1,Math.floor(cutoff/12)-1));
const annual=new Map([...grouped].map(([id,rs])=>[id,rs.filter(r=>r.month.startsWith(latestYear)).reduce((s,r)=>s+r.kwp,0)]));
const funding:Record<string,FundingContext[]>={
 '07211000':[{start:'2024-07',end:'2026-03',checkedAt:'2026-09-14',label:'Städtische Balkonförderung',url:'https://www.trier.de/leben-in-trier/klima-umwelt/klimaschutz/erneuerbare-energien/solarenergie/13861.Foerderung-von-Balkonsolaranlagen.html'}],
 '06440016':[{start:'2023-02',startLabel:'Fortsetzung der Förderung',label:'Fortsetzung mit aufgestocktem Budget, nicht erstmaliger Förderstart',url:'https://www.nidda.de/news/news-archiv/2023/1-quartal-2023/pv-foerderung/'}]
};
const addOriginalPatterns=prepareOriginalPatterns({regions,rows:raw.rows,sourceDate:raw.sourceDate,housing:[...housing.values()]});
const chosen=arg('cities','Trier,Nidda,Fürfeld,Höchberg,Berlin').split(',');
const reports=regions.filter(r=>chosen.includes('all')||chosen.includes(r.name)||chosen.includes(r.region_id)).map(r=>{
 const peers=regions.filter(p=>p.region_id!==r.region_id&&p.population_as_of===r.population_as_of&&p.population>0&&p.population>=r.population/2&&p.population<=r.population*2&&annual.has(p.region_id));
 const values=peers.map(p=>(annual.get(p.region_id)??0)*1000/p.population).sort((a,b)=>a-b);
 const report=discoverStories({name:r.name,regionId:r.region_id,sourceDate:raw.sourceDate,source:raw.source,completeExport:true,rows:grouped.get(r.region_id)??[],funding:funding[r.region_id],peer:{population:r.population,populationBasis:r.population_as_of&&peers.length>=20&&r.population>=500?`Einwohnerzahlen aus dem Gemeindeverzeichnis mit Gebietsstand ${r.population_as_of}, auch für die Vergleichsorte; kein historischer Einwohnerstand des Zubaujahres.`:undefined,median:values.length?(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2:0,n:peers.length,minPopulation:Math.ceil(r.population/2),maxPopulation:r.population*2}});
 report.inputKey=inputKey;
 const coverageRows=[...(grouped.get(r.region_id)??[]),...(storageGrouped.get(r.region_id)??[])];
 report.coverage=[...new Set(coverageRows.map(row=>row.segment))].map(topic=>{const rs=coverageRows.filter(row=>row.segment===topic).sort((a,b)=>a.month.localeCompare(b.month));return {topic,first:rs[0].month,last:rs.at(-1)!.month,count:rs.reduce((n,row)=>n+row.count,0)};});
 if(r.population_as_of&&peers.length>=20&&r.population>=500){const value=(annual.get(r.region_id)??0)*1000/r.population;report.ranking={sourceDate:raw.sourceDate,metric:'active-solar-commissioning-wp-per-resident-v1',period:latestYear,cohort:createHash('sha256').update(JSON.stringify([...peers,r].map(p=>[p.region_id,p.population,p.population_as_of]).sort())).digest('hex'),size:peers.length+1,rank:1+values.filter(v=>v>value).length,value,populationBasis:r.population_as_of};}
 addEnergyStory(report,grouped.get(r.region_id)??[]);
 addHousingStory(report,housing.get(r.region_id));
 addFundingStories(report,programmes,changes);
 addStorageStories(report,storageGrouped.get(r.region_id)??[]);
 for(const size of sizes[r.region_id]??[]){if(size.count<5)continue;const label=({gebaeude:'Gebäudeanlagen',steckersolar:'Balkonkraftwerke',freiflaeche:'Freiflächenanlagen',sonstige:'Sonstige Solaranlagen'} as Record<string,string>)[size.segment]??size.segment;report.candidates.push({id:`${r.region_id}-sizes-${size.segment}-${raw.sourceDate}`,family:'Anlagengrößen',title:`${label}: von der kleinsten bis zur größten Registereinheit`,status:'ready',priority:40,period:raw.sourceDate,comparison:`${size.count} aktive Einheiten dieser Anlagengruppe, Export ${raw.sourceDate}`,evidence:[{label:'Kleinste Einheit',value:size.minimum,unit:'kWp'},{label:'Durchschnitt',value:size.mean,unit:'kWp'},{label:'Größte Einheit',value:size.maximum,unit:'kWp'}],reason:'Direkt aus den Einzeleinheiten berechnet.',limitations:['Registereinheit ist nicht gleich Solarpark oder Gebäude; keine Projektzuordnung behauptet.'],related:[],visual:'Größenspanne',eventKey:`sizes-${size.segment}`});}
 if(sizes[r.region_id]?.length){const detail=JSON.parse(readFileSync(`${historyRoot}/cities/${r.region_id}.json`,'utf8')) as DetailSeries;addPeriodStories(report,detail);}
 const originalCoverage=addOriginalPatterns(report);
 for(const item of originalCoverage)if(!report.checks.some(c=>c.family===`Originalmuster: ${item.pattern}`))report.checks.push({family:`Originalmuster: ${item.pattern}`,status:item.status==='not-applicable'?'none':item.status,reason:item.reason});
 const yieldPath=`scripts/.cache/story-yield/${r.region_id}.json`;
 if(existsSync(yieldPath)){const weatherText=readFileSync(yieldPath,'utf8');appendYieldStories(report,JSON.parse(weatherText) as YieldInput);report.inputKey=createHash('sha256').update(inputKey+weatherText).digest('hex').slice(0,16);const archive=`scripts/.cache/story-yield/sources/${report.inputKey}`;mkdirSync(archive,{recursive:true});const archived=`${archive}/${r.region_id}.json`;if(existsSync(archived)){if(readFileSync(archived,'utf8')!==weatherText)throw Error('Weather source hash collision');}else writeFileSync(archived,weatherText,{flag:'wx'});}
 else report.checks.push({family:'Historische Referenzerträge',status:'missing',reason:'Historische örtliche Wetterdaten wurden für diesen Ort noch nicht abgerufen.'});
 appendMonthlyAdditions(report,grouped.get(r.region_id)??[],true);
 appendMonthlySolar(report);
 return report;
});
if(!reports.length)throw new Error('No matching municipalities');
if(process.argv.some(a=>a.startsWith('--directory='))){
 const dir=arg('directory','');mkdirSync(dir,{recursive:true});
 type IndexEntry={name:string;regionId:string;total:number};
 let previous:IndexEntry[]=[];
 if(!chosen.includes('all')){
  try{previous=JSON.parse(readFileSync(`${dir}/index.json`,'utf8')) as IndexEntry[];}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 }
 const provenance=`${dir}/sources/${raw.sourceDate}/${inputKey}`;mkdirSync(provenance,{recursive:true});writeFileSync(`${provenance}/regions.json`,JSON.stringify(regions));writeFileSync(`${provenance}/funding-programmes.json`,JSON.stringify(programmes));writeFileSync(`${provenance}/funding-history.json`,JSON.stringify(changes));writeFileSync(`${provenance}/housing.json`,JSON.stringify([...housing.values()]));
 const index=new Map(previous.map(entry=>[entry.regionId,entry]));
 for(const report of reports){
  // Preserve dated source runs before replacing the current local projection.
  let previous:typeof report|undefined;
  try{previous=JSON.parse(readFileSync(`${dir}/${report.regionId}.json`,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  if(previous?.version===report.version){
   if(previous.sourceDate<report.sourceDate||(previous.sourceDate===report.sourceDate&&previous.inputKey!==report.inputKey)){report.previousSourceDate=previous.sourceDate;report.previousCandidateIds=previous.candidates.map(c=>c.id);report.previousCandidateFingerprints=previous.candidates.map(candidateFingerprint);}
   else if(previous.sourceDate===report.sourceDate){report.previousSourceDate=previous.previousSourceDate;report.previousCandidateIds=previous.previousCandidateIds;report.previousCandidateFingerprints=previous.previousCandidateFingerprints;}
  }
  const monthlyPath='lib/story-ranking-month-data.json';
  if(existsSync(monthlyPath)){const saved=JSON.parse(readFileSync(monthlyPath,'utf8'))[report.regionId];if(saved)appendRankingMonth(report,saved.current,saved.previous);}
  const history=`${dir}/history/${report.version}/${report.sourceDate}/${report.inputKey}`;mkdirSync(history,{recursive:true});
  // Same-export reruns are reproducible projections, not new editorial news.
  writeFileSync(`${history}/${report.regionId}.json`,JSON.stringify(report));
  writeFileSync(`${dir}/${report.regionId}.json`,JSON.stringify(report));
  index.set(report.regionId,{name:report.name,regionId:report.regionId,total:report.candidates.length});
 }
 writeFileSync(`${dir}/index.json`,JSON.stringify([...index.values()]));
}
const output=openSync(arg('output',chosen.includes('all')?'scripts/.cache/story-discovery/all-reports.json':'lib/story-discovery-reports.json'),'w');
try{writeSync(output,'[\n');for(let i=0;i<reports.length;i++)writeSync(output,(i?',\n':'')+JSON.stringify(reports[i]));writeSync(output,'\n]\n');}finally{closeSync(output);}
console.log(reports.map(r=>({city:r.name,ready:r.candidates.filter(c=>c.status==='ready').length,review:r.candidates.filter(c=>c.status==='review').length,merged:r.merged,checks:r.checks.length})));
