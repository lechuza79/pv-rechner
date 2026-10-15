import {getStrommixYtd} from '../../../../lib/strommix-ytd';
import {nuclearEnergyPreviewData} from '../../../../lib/nuclear-preview-server';
import Preview from './Preview';
export const metadata={title:'Atomsection · Hero-Vorschauen',robots:{index:false,follow:false}};
export default async function Page(){
 const now=new Date();
 const [ytd,nuclear]=await Promise.all([getStrommixYtd(now).catch(()=>null),nuclearEnergyPreviewData(now).catch(()=>null)]);
 return <main style={{maxWidth:1100,margin:'40px auto',padding:24}}><h1>Atomsection · Chart-Vorschauen</h1><Preview ytd={ytd} nuclear={nuclear} asOf={now.toISOString()}/>
 {[
  ['atom-anteil','Atomstrom-Anteil','/embed/strommix-anteil?onsite=1'],
  ['atom-import','Atomstrom-Import','/embed/atomstrom-tage?variant=full&metric=energy&onsite=1'],
  ['stromhandel','Zukauf und Verkauf','/embed/stromhandel?onsite=1'],
 ].map(([id,title,src])=><section id={id} key={id} style={{paddingTop:48,scrollMarginTop:24}}><h2>{title}</h2><iframe title={title} src={src} style={{width:'100%',height:760,border:0}}/></section>)}
 </main>;
}
