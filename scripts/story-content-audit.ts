import valueSnapshots from '../lib/story-month-value-data.json';
import {readFile,writeFile} from 'node:fs/promises';
import {radialDataForCity} from '../lib/story-radial-data';
const root='scripts/.cache/story-discovery';
async function main(){
 const cities=JSON.parse(await readFile(`${root}/index.json`,'utf8'));
 const results:Array<{regionId:string;slots:Record<string,boolean>}>=[];
 for(const city of cities){
  const report=JSON.parse(await readFile(`${root}/${city.regionId}.json`,'utf8'));
  const families=new Set(report.candidates.filter((c:any)=>c.status==='ready').map((c:any)=>c.family));
  let prepared:any;try{prepared=JSON.parse(await readFile(`scripts/.cache/story-prepared/${report.sourceDate}/${city.regionId}.json`,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const radial=prepared??radialDataForCity(city.regionId);
  results.push({...city,slots:{
   structure:families.has('Bestandsprofil')||families.has('Anzahl und Leistung'),
   monthlyAdditions: families.has('Zubau-Monatsrecap'),
   ytdAdditions:families.has('Vorjahreszeitraum'),
   monthlyGeneration:!!radial?.monthly,
   annualGeneration:!!radial?.annual,
   historicalYield:families.has('Ertragsspitze als Modell'),
   cachedRanking:families.has('Rang-Monatsupdate'),
   funding:families.has('Förderbestand'),
   storage:families.has('Speicherbestand'),
   monthlyElectricityValue:prepared?Object.keys(prepared.values??{}).length>0:Object.hasOwn(valueSnapshots,city.regionId),
   monthlyFeedIn:prepared?Object.keys(prepared.values??{}).length>0:Object.hasOwn(valueSnapshots,city.regionId),
  }});
 }
 const totals=Object.fromEntries(Object.keys(results[0].slots).map(key=>[key,results.filter(r=>r.slots[key]).length]));
 await writeFile('scripts/.cache/story-templates/content-audit.json',JSON.stringify({cities:results.length,totals,notes:['Ranking snapshots can additionally load on request.','Funding availability counts source-backed cached entries, not current eligibility.'],results},null,2));
 console.log(JSON.stringify({cities:results.length,totals},null,2));
}
void main();
