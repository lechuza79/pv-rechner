import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Reuse the owner's complete report adapter, including prepared-data availability.
export function prepareCharts(sourceRoot:string){
 execFileSync(process.execPath,['--conditions=react-server','--import','tsx','-e',`
  const fs=require('node:fs');
  const {attachPreparedStories}=require(process.argv[2]+'/lib/story-prepared-server.ts');
  const {municipalChartsFromReport}=require(process.argv[2]+'/lib/municipal-chart-catalog.ts');
  attachPreparedStories(JSON.parse(fs.readFileSync('scripts/.cache/story-discovery/09679147.json','utf8')))
   .then(report=>fs.writeFileSync(process.argv[1],JSON.stringify(municipalChartsFromReport(report))))
   .catch(error=>{console.error(error);process.exitCode=1;});
 `,fileURLToPath(new URL('./charts.json',import.meta.url)),sourceRoot],{cwd:fileURLToPath(new URL('../../',import.meta.url)),stdio:'pipe'});
}
