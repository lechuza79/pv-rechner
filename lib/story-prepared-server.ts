import 'server-only';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {DiscoveryReport} from './story-discovery';
import {appendMonthlySolar,appendAnnualEnergy} from './story-monthly-candidate';
import type {PreparedStoryData} from './story-prepared-data';
/** Serving never triggers expensive weather preparation or substitutes missing values. */
export async function attachPreparedStories(report:DiscoveryReport){
 try{
  const data=JSON.parse(await readFile(join(process.cwd(),'scripts/.cache/story-prepared',report.sourceDate,report.regionId+'.json'),'utf8')) as PreparedStoryData;
  if(data.sourceDate!==report.sourceDate)throw Error('Source edition mismatch');
  report.prepared=data;
  report.candidates=report.candidates.filter(c=>!['Solar-Monatsrecap','Energie-Jahresprofil','Stromwert-Monatsrecap','Einspeisevergütung-Monatsrecap'].includes(c.family));
  appendMonthlySolar(report);appendAnnualEnergy(report);
  for(const item of data.availability)report.checks.push({family:item.topic,status:item.status==='ready'?'found':'missing',reason:item.reason});
 }catch(error){
  if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
 }
 return report;
}
