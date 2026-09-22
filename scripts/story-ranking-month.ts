/** Project complete central monthly observations into the local design gallery. */
import {loadEnvConfig} from '@next/env';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {appendRankingMonth} from '../lib/story-ranking-month';
import type {DiscoveryReport} from '../lib/story-discovery';
async function main(){
 loadEnvConfig(process.cwd());
 const {loadRankingMonth}=await import('../lib/story-ranking-month-server');
 const reports=JSON.parse(readFileSync('lib/story-discovery-reports.json','utf8')) as DiscoveryReport[];
 const ids=process.argv.find(arg=>arg.startsWith('--cities='))?.slice(9).split(',')??reports.map(report=>report.regionId);
 const bundled=existsSync('lib/story-ranking-month-data.json')?JSON.parse(readFileSync('lib/story-ranking-month-data.json','utf8')):{};
 for(const id of ids){
  const edition=await loadRankingMonth(id);if(!edition)throw new Error(`No complete ranking observation for ${id}`);
  const {current,previous}=edition;bundled[id]=edition;
  const root=`scripts/.cache/story-ranking-month/${current.month}`;mkdirSync(root,{recursive:true});writeFileSync(`${root}/${id}.json`,JSON.stringify(current));
  const report=reports.find(report=>report.regionId===id);if(report)appendRankingMonth(report,current,previous);
  const cachePath=`scripts/.cache/story-discovery/${id}.json`;
  if(existsSync(cachePath)){const cached=JSON.parse(readFileSync(cachePath,'utf8'));appendRankingMonth(cached,current,previous);writeFileSync(cachePath,JSON.stringify(cached));}
  console.log(`${report?.name??id}: ${current.ranks.length} ranks, source ${current.observedAt}, ${previous?'previous month available':'initial monthly baseline'}`);
 }
 writeFileSync('lib/story-ranking-month-data.json',JSON.stringify(bundled));writeFileSync('lib/story-discovery-reports.json','[\n'+reports.map(report=>JSON.stringify(report)).join(',\n')+'\n]\n');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
