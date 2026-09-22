/** Refresh only bundled examples from the same prepared results used by the API. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {appendMonthlySolar,appendAnnualEnergy} from '../lib/story-monthly-candidate';
import type {DiscoveryReport} from '../lib/story-discovery';
const path='lib/story-discovery-reports.json';
const reports=JSON.parse(readFileSync(path,'utf8')) as DiscoveryReport[];
for(let index=0;index<reports.length;index++){
 let report=reports[index];
 const refreshed=`scripts/.cache/story-discovery/${report.regionId}.json`;
 if(existsSync(refreshed))report=reports[index]=JSON.parse(readFileSync(refreshed,'utf8')); 
 const file=`scripts/.cache/story-prepared/${report.sourceDate}/${report.regionId}.json`;
 if(!existsSync(file))continue;
 report.prepared=JSON.parse(readFileSync(file,'utf8'));
 report.candidates=report.candidates.filter(c=>!['Solar-Monatsrecap','Energie-Jahresprofil','Stromwert-Monatsrecap','Einspeisevergütung-Monatsrecap'].includes(c.family));
 appendMonthlySolar(report);appendAnnualEnergy(report);
}
writeFileSync(path,JSON.stringify(reports));
