import {describe,it,expect} from 'vitest';
import {resolveComposition,compositionRowWidth,type CompositionItem,type CompositionAllocation} from '../widget-composition';
const leaf=(id:string,minWidth:number,minHeight:number):Extract<CompositionItem,{kind:"chart"}>=>({id,kind:'chart',minWidth,minHeight,sizing:'allocated'});
const composition:CompositionItem={id:'group',kind:'group',direction:'row',children:[leaf('full',320,560),{id:'stack',kind:'group',direction:'column',children:[leaf('radial',280,320),leaf('bars',280,264)]}]};
function leaves(node:CompositionAllocation):CompositionAllocation[]{return node.children?node.children.flatMap(leaves):[node];}
describe('responsive composition allocations',()=>{
 it('derives the transition from child widths and gaps',()=>{
  expect(compositionRowWidth(composition)).toBe(624);
  expect(resolveComposition(composition,623,800).direction).toBe('column');
  expect(resolveComposition(composition,624,800).direction).toBe('row');
 });
 it.each([624,720,960,1280])('aligns the full chart and the complete nested stack at %ipx',width=>{
  const result=resolveComposition(composition,width,800);
  const [full,stack]=result.children!;
  expect(full.height).toBe(stack.height);
  expect(stack.height).toBe(stack.children!.reduce((sum,child)=>sum+child.height!,24));
  expect(full.width+stack.width+24).toBe(width);
  expect(full.height).toBe(608);
 });
 it.each([288,320,375,557])('reflows without scaling chart text or using outer ratios at %ipx',width=>{
  const result=resolveComposition(composition,width,800);
  expect(leaves(result).map(item=>item.width)).toEqual([width,width,width]);
  expect(leaves(result).map(item=>item.height)).toEqual([560,320,264]);
  expect(result.height).toBe(1192);
 });
 it.each([0,-1,NaN,Infinity])('rejects invalid host widths: %s',width=>{
  expect(()=>resolveComposition(composition,width,800)).toThrow(RangeError);
 });
 it('accounts for wrapped chart chrome before aligning adjacent groups',()=>{
  const item:CompositionItem={...leaf('full',320,560),heightBreakpoints:[{maxWidth:400,minHeight:640}]};
  expect(resolveComposition(item,350,800).height).toBe(640);
  expect(resolveComposition(item,500,800).height).toBe(560);
 });
 it('adapts preferred heights to the host budget while preserving renderer minima',()=>{
  const item:CompositionItem={...leaf('full',320,560),preferredHeight:{fraction:.72,max:680}};
  expect(resolveComposition(item,900,500).height).toBe(560);
  expect(resolveComposition(item,900,900).height).toBe(648);
  expect(resolveComposition(item,900,2000).height).toBe(680);
 });
 it('keeps content-driven KPI groups intrinsic, including their outer group',()=>{
  const root:CompositionItem={id:'root',kind:'group',direction:'row',children:[composition,{...leaf('stats',320,0),sizing:'content'}]};
  const result=resolveComposition(root,1200,800);
  expect(result.height).toBeUndefined();
  expect(result.children![1].height).toBeUndefined();
  expect(result.children![0].height).toBe(608);
 });
 it('gives surplus height to flexible children while preserving a fixed child',()=>{
  const node:CompositionItem={id:'stack',kind:'group',direction:'column',children:[{...leaf('radial',280,320),grow:0},leaf('bars',280,264)]};
  const result=resolveComposition(node,400,800,700);
  expect(result.children!.map(child=>child.height)).toEqual([320,356]);
 });
});
