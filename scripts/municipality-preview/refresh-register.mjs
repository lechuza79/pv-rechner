import paths from './paths.cjs';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const sourceRoot=paths.storySourceRoot;
process.loadEnvFile(path.join(paths.repoRoot,'.env.local'));
const headers={apikey:process.env.SUPABASE_SERVICE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_KEY}`,'Content-Type':'application/json'};
async function read(route,body){const r=await fetch(new URL('/rest/v1/'+route,process.env.SUPABASE_URL),{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Register read failed '+r.status);return r.json();}
const before=(await read('mastr_meta?select=imported_at&id=eq.1'))[0]?.imported_at;if(!before)throw Error('No edition');
const [solar,storage,regions,series]=await Promise.all([
 read('rpc/mastr_children',{p_prefix:'09679',p_child_len:8,p_traeger:['solar'],p_year_recent:null,p_year_max:null}),
 read('mastr_gemeinde_award?select=region_id,batterie_privat_count,batterie_gewerbe_count,batterie_privat_kwh,batterie_gewerbe_kwh&region_id=like.09679*'),
 read('mastr_regions?select=region_id,name,slug,population,population_as_of&parent_region_id=eq.09679'),
 read('rpc/mastr_region_series',{p_prefix:'09679147',p_traeger:['solar']})
]);
const after=(await read('mastr_meta?select=imported_at&id=eq.1'))[0]?.imported_at;if(before!==after)throw Error('Edition changed');
if(regions.length!==55||solar.length>=1000||regions.filter(r=>r.population>0).some(r=>!storage.some(s=>s.region_id===r.region_id)))throw Error('Incomplete inhabited district');
const districtPeers=regions.filter(r=>r.population>0).map(r=>{const battery=storage.find(s=>s.region_id===r.region_id);if(!battery)throw Error('Missing storage');const rows=solar.filter(s=>s.region_id===r.region_id);const sums=Object.fromEntries(['alle','privat','gewerbe'].map(owner=>{const allowed=owner==='alle'?null:owner==='privat'?['privat_dach','steckersolar']:['gewerbe_dach','freiflaeche'];const cells=rows.filter(s=>!allowed||allowed.includes(s.segment));return [owner,{count:cells.reduce((n,s)=>n+Number(s.count),0),kwp:cells.reduce((n,s)=>n+Number(s.kwp),0),speicher:(owner!=='gewerbe'?Number(battery.batterie_privat_kwh):0)+(owner!=='privat'?Number(battery.batterie_gewerbe_kwh):0)}]}));return {...r,sums,batteryCount:Number(battery.batterie_privat_count)+Number(battery.batterie_gewerbe_count)};});
const data={source:'Marktstammdatenregister · current Atlas aggregate',retrieved:new Date().toISOString(),dataAsOf:before.slice(0,10),populationAsOf:regions[0].population_as_of,populationMin:5000,populationMaxExclusive:20000,peers:districtPeers.filter(r=>r.population>=5000&&r.population<20000),districtPeers};

const report=JSON.parse(readFileSync(path.join(paths.cacheRoot,'story-discovery/09679147.json'),'utf8'));
const stock=report.candidates.find(c=>c.family==='Speicherbestand');
const chartData=JSON.parse(readFileSync(new URL('./charts.json',import.meta.url),'utf8'));
const mix=chartData.charts.find(c=>c.template==='anteilsdonut').story;
const own=districtPeers.find(r=>r.region_id==='09679147');
const reportCount=report.coverage.filter(r=>r.topic!=='batterie').reduce((n,r)=>n+r.count,0);
const reportPower=mix.values.reduce((n,r)=>n+r.value,0);
if(own.sums.alle.count!==reportCount||Math.abs(own.sums.alle.kwp-reportPower)>.1||own.batteryCount!==stock.evidence.find(r=>r.unit==='Einheiten').value)throw Error('Own report and ranking stock differ; review before publishing');
for(const row of districtPeers){for(const metric of ['count','kwp','speicher']){if(!Number.isFinite(row.sums.alle[metric])||Math.abs(row.sums.alle[metric]-row.sums.privat[metric]-row.sums.gewerbe[metric])>.1)throw Error('Owner totals do not reconcile');}}
writeFileSync(new URL('../../public/atlas-design-preview/ranking-data.json',import.meta.url),JSON.stringify(data));

writeFileSync(new URL('../../public/atlas-design-preview/current-register.json',import.meta.url),JSON.stringify({sourceDate:report.sourceDate,register:own,rankingDate:data.dataAsOf,populationDate:data.populationAsOf,storage:stock.evidence,coverage:report.coverage,series,chartMix:mix}));
console.log(JSON.stringify({date:data.dataAsOf,peers:districtPeers.length,own:own.sums,storageCount:own.batteryCount,reportDate:report.sourceDate}));
