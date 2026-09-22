import {redirect} from 'next/navigation';
import {isAdminSession} from '../../../../lib/admin-guard';
import reports from '../../../../lib/story-discovery-reports.json';
import type {DiscoveryReport} from '../../../../lib/story-discovery';
import {buildStoryPool} from '../../../../lib/story-pool';
import {conceptFromFinding} from '../../../../lib/story-finding-concept';
import {storyVisualTemplate} from '../../../../lib/story-approved-visual';
import MunicipalStoryPreview from '../../../../components/social/MunicipalStoryPreview';
export const dynamic='force-dynamic';
export const metadata={title:'Story-Vorschau',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{city?:string;theme?:string}>}){
 if(!await isAdminSession())redirect('/login');
 const {city='09679147',theme='light'}=await searchParams;
 const report=reports.find(item=>item.regionId===city) as DiscoveryReport|undefined;
 if(!report)return <p>Keine Story-Daten für diesen Ort vorhanden.</p>;
 const seen=new Set<string>();
 const stories=buildStoryPool(report).topics.flatMap(topic=>topic.observations.map((_,index)=>conceptFromFinding(report,topic,index))).sort((a,b)=>Number(b.kind==='yield'&&(b.yieldSeries?.length??0)>24)-Number(a.kind==='yield'&&(a.yieldSeries?.length??0)>24)).filter(story=>{const type=storyVisualTemplate(story);if(!type||seen.has(type))return false;seen.add(type);return true;});
 return <MunicipalStoryPreview stories={stories} name={report.name} surfaceScheme={theme==='dark'?'dark':'light'} embedded/>;
}
