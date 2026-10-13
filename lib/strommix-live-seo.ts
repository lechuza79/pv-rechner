import type {GenerationData} from './energy';
import {jetztAusReihe} from './strommix-now';
import {generationWithoutStorage} from './strommix-radar';
import {energieQuelle} from './energy-ersatzstand';
import {BASE_URL,pageMetadata} from './seo';

export const STROMMIX_LIVE_PATH='/strommix-deutschland';
export const STROMMIX_LIVE_TITLE='Strommix Deutschland live: aktuelle Stromerzeugung';
/** Metadata and share image describe exactly the initial hero snapshot. */
export function strommixLiveSeo(data?:GenerationData,modifiedAt?:string){
 const current=jetztAusReihe(generationWithoutStorage(data?.data??[]));
 const source=energieQuelle(data??{});
 const params=new URLSearchParams({view:'strommix-live',v:'4'});
 let description='Aktueller Strommix Deutschlands: erneuerbare Energien, Wind, Solar, Kohle und Gas. Stromerzeugung im Tagesverlauf und Jahresvergleich mit Datenstand.';
 if(current&&Number.isFinite(Date.parse(current.ts))){
  params.set('share',String(current.eeSharePct));params.set('gw',String(current.totalMw/1000));params.set('ts',current.ts);params.set('source',data?.fallback==='smard'?'smard':'energy-charts');
  const stand=new Date(current.ts).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'});
  description=`Strommix Deutschland: ${current.eeSharePct.toLocaleString('de-DE',{maximumFractionDigits:1})} % Erneuerbare im zuletzt gemeldeten Mix (${stand} Uhr). Stromerzeugung live und im Verlauf.`;
 }
 const image=BASE_URL+'/api/og?'+params;
 return {
  metadata:{...pageMetadata({path:STROMMIX_LIVE_PATH,title:STROMMIX_LIVE_TITLE,description,ogImage:image,keywords:['Strommix Deutschland live','Strommix aktuell','Stromerzeugung Deutschland aktuell']}),robots:{index:true,follow:true}},
  jsonLd:{'@context':'https://schema.org','@type':'WebPage','@id':BASE_URL+STROMMIX_LIVE_PATH+'#webpage',url:BASE_URL+STROMMIX_LIVE_PATH,name:STROMMIX_LIVE_TITLE,description,inLanguage:'de-DE',...(modifiedAt?{dateModified:modifiedAt}:{}),citation:source.url,primaryImageOfPage:{'@type':'ImageObject',url:image,width:1200,height:630}},
  // Exclude retrieval timestamps: a repeated fetch is not changed content.
  content:current?{version:'strommix-live-v1',data:data?.data,source:data?.source,fallback:data?.fallback??null}:null,
 };
}
