import {describe,it,expect} from 'vitest';
import {deflateSync,strToU8} from 'fflate';
import {encodeDashboardConfiguration} from '../widget-dashboard-codec';
import {decodeDashboardConfiguration} from '../widget-dashboard-codec.server';
import {widgetVariantFromQuery,widgetPresentationContract} from '../widget-appearance';
import {allWidgets} from '../widget-registry';
import {GALLERY_HIDDEN,curatedGalleryEntries} from '../widget-gallery';
import {dashboardConstraint,dashboardLeaves,parseDashboardConfiguration,type DashboardConfiguration} from '../widget-dashboard';
import {resolveComposition,type CompositionAllocation} from '../widget-composition';
const entries=curatedGalleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'});
const configuration=():DashboardConfiguration=>({version:1,sections:[{id:'all',title:'All widgets',root:{id:'root',label:'Grid',direction:'grid',columns:3,children:entries.map(entry=>({id:entry.id,label:entry.title,widgetId:entry.id}))}}],sources:Object.fromEntries(entries.map(entry=>[entry.id,entry.variants[0].src]))});
const leaves=(node:CompositionAllocation):CompositionAllocation[]=>node.children?node.children.flatMap(leaves):[node];
describe('portable dashboard configurations',()=>{
 it('keeps a complete catalog embed below common request limits without losing selections',()=>{
  const original=configuration();
  const encoded=encodeDashboardConfiguration(original);
  expect(encoded.length).toBeLessThan(4000);
  expect(decodeDashboardConfiguration(encoded)).toEqual(original);
  expect(decodeDashboardConfiguration(JSON.stringify(original))).toEqual(original);
 });
 it('rejects malformed, oversized and excessively expanded embed payloads',()=>{
  expect(()=>decodeDashboardConfiguration('z1.invalid!')).toThrow();
  expect(()=>decodeDashboardConfiguration('z1.'+'a'.repeat(8001))).toThrow();
  const bomb=Buffer.from(deflateSync(strToU8(' '.repeat(100000)))).toString('base64url');
  expect(()=>decodeDashboardConfiguration('z1.'+bomb)).toThrow();
 });
 it('covers every active chart and every existing presentation with a reconstructible source',()=>{
  for(const widget of allWidgets().filter(widget=>widget.kind==='chart'&&!GALLERY_HIDDEN[widget.id])){
   const entry=entries.find(entry=>entry.id===widget.id);expect(entry,widget.id).toBeDefined();
   for(const variant of entry!.variants){
    for(const src of [variant.src,variant.compactSrc,variant.heroSrc].filter((src):src is string=>!!src)){
     const presentation=widgetVariantFromQuery(widget.id,new URL(src,'https://solar-check.io').searchParams);
     expect(widgetPresentationContract(widget.id,presentation),src).toBeDefined();
     expect(()=>parseDashboardConfiguration(JSON.stringify({version:1,sections:[{id:'check',title:'Variant',root:{id:'instance',label:widget.title,widgetId:widget.id,presentation}}],sources:{instance:src}})),src).not.toThrow();
    }
   }
  }
 });
 it('round-trips the entire curated catalog and preserves each instance',()=>{
  const config=parseDashboardConfiguration(JSON.stringify(configuration()));
  expect(dashboardLeaves(config.sections[0].root)).toHaveLength(entries.length);
 });
 it('fits every catalog item into one to three columns from actual constraints',()=>{
  const item=dashboardConstraint(configuration().sections[0].root);
  for(const width of [320,375,557,768,1152,1600]){
   const result=resolveComposition(item,width,783);
   const allocated=leaves(result);
   expect(allocated).toHaveLength(entries.length);
   expect(new Set(allocated.map(node=>node.id)).size).toBe(entries.length);
   expect(allocated.every(node=>node.width>=240&&node.width<=width)).toBe(true);
   const walk=(node:CompositionAllocation)=>{if(node.direction==='row')expect(node.children!.reduce((sum,child)=>sum+child.width,24*(node.children!.length-1))).toBeCloseTo(node.width);node.children?.forEach(walk);};walk(result);
  }
 });
 it('rejects duplicate IDs, foreign sources, mismatched variants and excessive nesting before loading',()=>{
  const duplicate=configuration();duplicate.sections[0].root={id:'root',label:'Duplicate',direction:'row',children:[{id:'x',label:'One',widgetId:'stromhandel'},{id:'x',label:'Two',widgetId:'stromhandel'}]};duplicate.sources.x='/embed/stromhandel';
  expect(()=>parseDashboardConfiguration(JSON.stringify(duplicate))).toThrow();
  const foreign=configuration();foreign.sources[entries[0].id]='https://example.com/embed/'+entries[0].id;expect(()=>parseDashboardConfiguration(JSON.stringify(foreign))).toThrow();
  const variant=configuration();variant.sources.stromhandel='/embed/stromhandel?presentation=compact';expect(()=>parseDashboardConfiguration(JSON.stringify(variant))).toThrow('presentation');
  const deep=configuration();for(let i=0;i<7;i++)deep.sections[0].root={id:'nested'+i,label:'Nested',direction:'column',children:[deep.sections[0].root]};expect(()=>parseDashboardConfiguration(JSON.stringify(deep))).toThrow();
 });
});
