import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import LayoutReference from '../../app/(site)/widget-galerie/layout-referenz/reference';
import {describe,it,expect} from 'vitest';
import {layoutExamples,exampleWidgetIds,type ExampleNode} from '../../app/(site)/widget-galerie/layout-referenz/examples';
import {curatedGalleryEntries} from '../widget-gallery';
const entries=curatedGalleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetterau',stateId:'06',stateName:'Hessen'});
describe('Exploratory widget compositions',()=>{
 it('references only available widgets and real compact variants',()=>{
  function check(nodes:ExampleNode[]){for(const node of nodes){if(node.children){check(node.children);continue;}if(!node.widgetId)continue;const entry=entries.find(item=>item.id===node.widgetId);expect(entry,node.widgetId).toBeDefined();if(node.compact)expect(entry?.variants[0].compactSrc).toBeTruthy();}}
  for(const example of layoutExamples)check(example.nodes);
 });
 it('collects nested dependencies once for server loading',()=>{
  const ids=exampleWidgetIds(layoutExamples.flatMap(example=>[...example.nodes,...(example.contentNodes??[])]));
  expect(ids.filter(id=>id==='stromhandel')).toHaveLength(1);
  expect(ids).toContain('regional-current-power');
 });
});

it('renders an incomplete catalog without crashing the whole reference page',()=>{
 const html=renderToStaticMarkup(createElement(LayoutReference,{entries:[],views:{},queries:{},snapshots:{},sources:{}}));
 expect(html).toContain('Widget gerade nicht verfügbar');
 expect(html).toContain('Widget-Raster ausprobieren');
});
