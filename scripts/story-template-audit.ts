import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import type {DiscoveryReport} from '../lib/story-discovery';
import {buildStoryPool} from '../lib/story-pool';
import {conceptFromFinding} from '../lib/story-finding-concept';
import {storyVisualTemplate} from '../lib/story-approved-visual';
import {appendAnnualEnergy,appendMonthlySolar} from '../lib/story-monthly-candidate';

async function main(){
 const root=join(process.cwd(),'scripts/.cache/story-discovery');
 const cities=JSON.parse(await readFile(join(root,'index.json'),'utf8')) as {regionId:string;name:string}[];
 const totals:Record<string,number>={},unmapped:Record<string,number>={};
 const result=[];const errors:string[]=[];
 for(const city of cities){
  try{
   const report=JSON.parse(await readFile(join(root,city.regionId+'.json'),'utf8')) as DiscoveryReport;
   appendMonthlySolar(report);appendAnnualEnergy(report);
   const templates:Record<string,number>={};let pending=0;
   for(const topic of buildStoryPool(report).topics)for(let index=0;index<topic.observations.length;index++){
    const story=conceptFromFinding(report,topic,index),template=storyVisualTemplate(story);
    if(template==='donut')throw Error('Unexpected automatic double donut');
    if(template){totals[template]=(totals[template]??0)+1;templates[template]=(templates[template]??0)+1;}
    else{pending++;unmapped[story.label]=(unmapped[story.label]??0)+1;}
   }
   result.push({...city,templates,pending});
  }catch(error){errors.push(`${city.name}: ${String(error)}`);}
 }
 await mkdir('scripts/.cache/story-templates',{recursive:true});
 await writeFile('scripts/.cache/story-templates/audit.json',JSON.stringify({cities:result.length,totals,unmapped,errors,results:result},null,2));
 console.log(JSON.stringify({cities:result.length,withTemplates:result.filter(r=>Object.keys(r.templates).length).length,totals,unmapped,errors},null,2));
 if(errors.length)process.exitCode=1;
}
void main();
