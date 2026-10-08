import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it} from 'vitest';

it('optimizes only opted-in local raster layers before insertion and preserves the shared original',async()=>{
 let ElementClass:any;
 const window:any={};
 class Element {
  token=0;isConnected=true;small=false;
  shadowRoot:any;
  attachShadow(){this.shadowRoot={innerHTML:'',querySelector:()=>({style:{}}),querySelectorAll:()=>[]};}
  hasAttribute(name:string){return name==='thumbnail'&&this.small;}
  getAttribute(name:string){return name==='motif'?'house':null;}
  dispatchEvent(){}
 }
 runInNewContext(readFileSync('public/illustrations-motion/solar-illustrations.js','utf8'),{
  window,HTMLElement:Element,URL,document:{currentScript:{src:'https://solar-check.io/illustrations-motion/solar-illustrations.js'},querySelector:()=>null},
  customElements:{define:(_:string,ctor:any)=>{ElementClass=ctor;}},addEventListener:()=>{},requestAnimationFrame:()=>1,CustomEvent:class {},
 });
 const source='<svg><image href="/illustrations-motion/assets/test.png"/><image href="/other.png"/></svg>';
 window.SolarCheckIllustrations.register('house',source);
 const small=new ElementClass();small.small=true;small.settings=()=>{};await small.render();
 expect(small.shadowRoot.innerHTML).toContain('/_next/image?url=%2Fillustrations-motion%2Fassets%2Ftest.png&amp;w=384&amp;q=75');
 expect(small.shadowRoot.innerHTML).not.toContain('href="/illustrations-motion/assets/test.png"');
 expect(small.shadowRoot.innerHTML).toContain('href="/other.png"');
 const full=new ElementClass();full.settings=()=>{};await full.render();
 expect(full.shadowRoot.innerHTML).toContain(source);
 expect(full.shadowRoot.innerHTML).not.toContain('/_next/image?');
});
