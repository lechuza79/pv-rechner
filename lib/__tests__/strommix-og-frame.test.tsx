import {describe,it,expect} from 'vitest';
import {Children,isValidElement,type ReactNode,type CSSProperties} from 'react';
import {EnergyOgFrame} from '../../app/api/og/energy-editorial';
describe('Strommix OG frame',()=>{
 it('resolves responsive typography to finite pixel sizes for the image renderer',()=>{
  const frame=EnergyOgFrame({logo:'data:image/svg+xml,<svg/>',artwork:new ArrayBuffer(0),label:'Strommix Deutschland live',children:null,source:'Energy-Charts'});
  const sizes:number[]=[];
  const visit=(node:ReactNode)=>Children.forEach(node,child=>{
   if(!isValidElement<{style?:CSSProperties;children?:ReactNode}>(child))return;
   const size=child.props.style?.fontSize;
   if(size!==undefined){expect(typeof size).toBe('number');expect(Number.isFinite(size)).toBe(true);sizes.push(Number(size));}
   visit(child.props.children);
  });
  visit(frame);expect(sizes.length).toBeGreaterThan(0);
 });
});
