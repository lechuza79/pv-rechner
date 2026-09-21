import {compareRanks,comparisonText} from './rank-comparison.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';

// Read the owning session's canonical templates and all their dependencies.
// This local adapter selects Höchberg without changing production routing/auth.
export async function prepareStories(sourceRoot:string){
const sourceImport=(file:string)=>import(pathToFileURL(path.join(sourceRoot,file)).href);
const [{buildStoryPool},{conceptFromFinding},{storyVisualTemplate},{tokens}]=await Promise.all([
 sourceImport('lib/story-pool.ts'),sourceImport('lib/story-finding-concept.ts'),
 sourceImport('lib/story-approved-visual.ts'),sourceImport('lib/theme.ts')
]);
const reports=JSON.parse(readFileSync(path.join(sourceRoot,'lib/story-discovery-reports.json'),'utf8'));
const report=reports.find(item=>item.regionId==='09679147')!;
const seen=new Set<string>();
// Selection copied unchanged from the source story-preview page.
const stories=buildStoryPool(report as any).topics.flatMap(topic=>topic.observations.map((_,index)=>conceptFromFinding(report as any,topic,index))).sort((a,b)=>Number(b.kind==='yield'&&(b.yieldSeries?.length??0)>24)-Number(a.kind==='yield'&&(a.yieldSeries?.length??0)>24)).filter(story=>{const type=storyVisualTemplate(story);if(!type||seen.has(type))return false;seen.add(type);return true;});
// Enrich rank stories with separate month/year comparisons from retained editions.
const snapshots=JSON.parse(readFileSync(path.join(sourceRoot,'lib/story-ranking-month-data.json'),'utf8'))[report.regionId];
const history=[snapshots?.previous,snapshots?.previousYear,...(snapshots?.history??[])].filter(Boolean);
const rankRows=snapshots?compareRanks(snapshots.current,history):[];
const comparisonsByKey=new Map(rankRows.map(row=>[row.key,row]));
for(const story of stories){
 if(!story.rankSummary)continue;
 story.rankComparisons=story.rankSummary.map(row=>comparisonsByKey.get(row.key)).filter(Boolean);
 story.rankComparisonCopy=story.rankComparisons.flatMap(row=>['month','year'].map(kind=>{
  const text=comparisonText(row,kind);return text?`${row.label} · ${row.scope}: ${text}`:null;
 }).filter(Boolean));
}
// Editorial thumbnail-label experiment; generation is not enabled yet.
const thumbLabels=JSON.parse(readFileSync(new URL('./story-thumb-labels.json',import.meta.url),'utf8'));
writeFileSync(new URL('./stories.json',import.meta.url),JSON.stringify({stories:stories.map(story=>({...story,thumbLabel:thumbLabels[story.id]})),name:report.name}));
console.log(`${stories.length} existing stories for ${report.name}`);

mkdirSync(new URL('./build/',import.meta.url),{recursive:true});
const layout=readFileSync(path.join(sourceRoot,'app/(embed)/layout.tsx'),'utf8');
const template=layout.match(/const baseStyles = `([\s\S]*?)`;/)![1];
const vars=(prefix:string)=>Object.entries(tokens).filter(([key])=>key.startsWith(prefix)).map(([key,value])=>`${key}:${value};`).join('\n');
const css=new Function('tokens','energyVars','fontSizeVars','return `'+template+'`;')(tokens,vars('--color-energy'),vars('--font-size'));
writeFileSync(new URL('./build/base.css',import.meta.url),css);

}
