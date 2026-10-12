import {describe,it,expect} from 'vitest';
import {gridExtent,gridSpan,resolveComposition,COMPOSITION_GAP,type CompositionAllocation} from '../widget-composition';
import {layoutExamples,exampleCompositionItem} from '../../app/(site)/widget-galerie/layout-referenz/examples';
function inspect(node:CompositionAllocation){
 if(!node.children)return;
 const children=node.children;
 const gaps=COMPOSITION_GAP*(children.length-1);
 expect(new Set(children.map(child=>child.id)).size).toBe(children.length);
 if(node.direction==='row')expect(children.reduce((n,child)=>n+child.width,gaps)).toBeCloseTo(node.width);
 else for(const child of children)expect(child.width).toBe(node.width);
 if(node.height!==undefined){
  const occupied=node.direction==='column'?children.reduce((n,c)=>n+c.height!,gaps):Math.max(...children.map(c=>c.height!));
  expect(occupied).toBeCloseTo(node.height);
 }else expect(children.some(child=>child.height===undefined)).toBe(true);
 for(const child of children){expect(child.width).toBeGreaterThanOrEqual(240);inspect(child);}
}
describe('actual dashboard example constraints',()=>{
 it('retains whole grid units for existing consumers',()=>{
  for(const height of [180,320,440,490,560,700]){const n=gridSpan(height);expect(gridExtent(n)).toBeGreaterThanOrEqual(height);if(n>1)expect(gridExtent(n-1)).toBeLessThan(height);}
 });
 it('fits every nested group without overflow or missing children across host widths',()=>{
  for(let width=320;width<=1600;width+=8)for(const example of layoutExamples){
   const result=resolveComposition({id:example.id,kind:'group',direction:example.direction??'row',children:example.nodes.map(exampleCompositionItem)},width,800);
   inspect(result);
   const ids=(node:CompositionAllocation):string[]=>node.children?node.children.flatMap(ids):[node.id];
   expect(new Set(ids(result)).size).toBe(ids(result).length);
  }
 });
 it('keeps the complete KPI group intrinsic and separate from the allocated map row',()=>{
  const regional=layoutExamples.find(example=>example.id==='regional')!;
  expect(regional.contentNodes?.map(node=>node.widgetId)).toEqual(['regional-basic-stats']);
  const stats=resolveComposition(exampleCompositionItem(regional.contentNodes![0]),320,800);
  expect(stats.height).toBeUndefined();
 });
});

it('stacks oversized minima inside a narrow host without crashing during resize',()=>{
 const root={id:'narrow',kind:'group' as const,direction:'row' as const,children:[
  {id:'a',kind:'chart' as const,minWidth:320,minHeight:440,sizing:'allocated' as const},
  {id:'b',kind:'chart' as const,minWidth:360,minHeight:280,sizing:'content' as const},
 ]};
 for(const width of [280,319.5,320]){
  const result=resolveComposition(root,width,800);
  expect(result.direction).toBe('column');
  expect(result.children?.map(child=>child.width)).toEqual([width,width]);
 }
});
