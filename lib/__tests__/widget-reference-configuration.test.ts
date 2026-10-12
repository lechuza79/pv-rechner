import {it,expect} from 'vitest';
import {layoutExamples,type ExampleNode} from '../../app/(site)/widget-galerie/layout-referenz/examples';
import {curatedGalleryEntries} from '../widget-gallery';
import {parseDashboardConfiguration,type DashboardNode} from '../widget-dashboard';
const node=(v:ExampleNode):DashboardNode=>v.children?{id:v.area,label:v.label,direction:v.direction??'row',children:v.children.map(node)}:{id:v.area,label:v.label,widgetId:v.widgetId!,presentation:v.compact?'compact':'full'};
it('accepts the real layout reference as a saveable configuration',()=>{
 const entries=curatedGalleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'});
 const leaves=(nodes:ExampleNode[]):ExampleNode[]=>nodes.flatMap(n=>n.children?leaves(n.children):[n]);
 const sections=layoutExamples.flatMap(e=>[{id:e.id,title:e.title,root:{id:e.id,label:e.title,direction:e.direction??'row',children:e.nodes.map(node)}},...(e.contentNodes?[{id:e.id+'-content',title:'Content',root:{id:e.id+'-content',label:'Content',direction:'column',children:e.contentNodes.map(node)}}]:[])]);
 const sources=Object.fromEntries(layoutExamples.flatMap(e=>leaves([...e.nodes,...(e.contentNodes??[])]).map(n=>{const v=entries.find(e=>e.id===n.widgetId)!.variants[0];const url=new URL(n.compact?v.compactSrc!:v.src,'https://solar-check.io');for(const [k,v] of Object.entries(n.params??{}))url.searchParams.set(k,v);if(n.period)url.searchParams.set('period',n.period);return[n.area,url.pathname+url.search];})));
 expect(()=>parseDashboardConfiguration(JSON.stringify({version:1,sections,sources}))).not.toThrow();
});
