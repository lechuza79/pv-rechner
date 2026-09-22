/** National losslessness and source coverage audit of the local projection. */
import {readFileSync,writeFileSync} from 'node:fs';
import {buildStoryPool} from '../lib/story-pool';
import {conceptFromFinding} from '../lib/story-finding-concept';
import type {DiscoveryReport} from '../lib/story-discovery';
const root='scripts/.cache/story-discovery';
const index=JSON.parse(readFileSync(`${root}/index.json`,'utf8')) as {regionId:string;name:string}[];
let topics=0,observations=0,withoutObservations=0,rankings=0;
const examples:Record<string,unknown>={};
for(const entry of index){const report=JSON.parse(readFileSync(`${root}/${entry.regionId}.json`,'utf8')) as DiscoveryReport;if(report.checks.filter(check=>check.family.startsWith('Originalmuster:')).length!==13)throw new Error('Incomplete original pattern coverage: '+entry.regionId);const pool=buildStoryPool(report);for(const topic of pool.topics)for(let i=0;i<topic.observations.length;i++){const concept=conceptFromFinding(report,topic,i);const claim=topic.observations[i];if(concept.title!==claim.title||concept.values.length!==claim.evidence.length)throw new Error('Preview lost evidence: '+claim.id);}const ids=pool.topics.flatMap(t=>t.observations.map(c=>c.id));if(ids.length!==pool.observationCount||new Set(ids).size!==ids.length)throw new Error('Lost or duplicated observations: '+entry.regionId);if(pool.topics.some(t=>!t.categories.length||!t.timeAspects.length))throw new Error('Missing classification');if(pool.unmappedFamilies.length)throw new Error('Unmapped families: '+pool.unmappedFamilies.join(','));if(report.ranking)rankings++;topics+=pool.topics.length;observations+=ids.length;if(!ids.length)withoutObservations++;if(['Trier','Nidda'].includes(entry.name))examples[entry.name]={topics:pool.topics.length,observations:ids.length,categories:[...new Set(pool.topics.flatMap(t=>t.categories))],coverage:report.coverage};}
const result={places:index.length,topics,observations,withoutObservations,rankings,examples};writeFileSync('scripts/.cache/story-pool-audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
