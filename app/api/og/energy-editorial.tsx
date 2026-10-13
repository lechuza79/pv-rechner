import type {ReactNode} from 'react';
import {tokens,fsPx} from '../../../lib/theme';

/** Shared with the Atomstrom card: approved logo, fonts and dark hero palette. */
export const energyOgPalette={background:'#08191c',text:'#e8eee9',secondary:'#a7bcbb',track:'#405b5e',accent:tokens['--color-brand']};
export async function loadEnergyOgBrand(){
 const [displayFont,bodyFont,logoSource]=await Promise.all([
  fetch(new URL('../../../public/fonts/atlas-montserrat-bold.ttf',import.meta.url)).then(r=>r.arrayBuffer()),
  fetch(new URL('./DM-Sans-Regular.ttf',import.meta.url)).then(r=>r.arrayBuffer()),
  fetch(new URL('../../../public/brand/logo-result.svg',import.meta.url)).then(r=>r.text()),
 ]);
 const palette=energyOgPalette;
 const colors:Record<string,string>={'--color-accent':palette.text,'--color-text-faint':palette.secondary,'--color-brand':palette.text,'--color-brand-deep':palette.secondary};
 const logo=`data:image/svg+xml;base64,${btoa(logoSource.replace(/var\((--[a-z-]+)\)/g,(_,name:string)=>colors[name]??palette.text))}`;
 return {logo,fonts:[{name:'AtlasConcept',data:displayFont,weight:700 as const,style:'normal' as const},{name:'DM Sans',data:bodyFont,weight:400 as const,style:'normal' as const}]};
}
export function EnergyOgFrame({logo,artwork,label,children,source}:{logo:string;artwork:ArrayBuffer;label:string;children:ReactNode;source:string}){
 const p=energyOgPalette;
 return <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',padding:'40px 52px',position:'relative',overflow:'hidden',background:p.background,color:p.text,fontFamily:'AtlasConcept'}}>
 <img src={artwork as unknown as string} width={730} height={730} style={{position:'absolute',right:-80,bottom:-140,opacity:.14}}/>
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:fsPx('--font-size-h2')}}><img src={logo} width={238} height={56}/><span>{label}</span></div>
 {children}
 <div style={{display:'flex',fontSize:fsPx('--font-size-editorial-body'),color:p.secondary,fontFamily:'DM Sans'}}>{source}</div>
 </div>;
}
