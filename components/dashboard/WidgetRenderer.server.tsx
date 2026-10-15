import 'server-only';
import type {ReactNode} from 'react';
import {cache} from 'react';
import {allWidgets} from '../../lib/widget-registry';
// Compatibility adapters resolve existing route components. Identity, metadata,
// data preparation, chart rendering and exports remain in their existing owners.
const routes = {
  '/embed/pumpspeicher': () => import('../../app/(embed)/embed/pumpspeicher/page'),
  '/embed/physischer-stromhandel': () => import('../../app/(embed)/embed/physischer-stromhandel/page'),
  '/embed/state-electricity-map': () => import('../../app/(embed)/embed/state-electricity-map/page'),

  '/embed/atomstrom-jahr': () => import('../../app/(embed)/embed/atomstrom-jahr/page'),
  '/embed/landschaft-karte': () => import('../../app/(embed)/embed/landschaft-karte/page'),
  '/embed/kommunen-landschaft': () => import('../../app/(embed)/embed/kommunen-landschaft/page'),
  '/embed/gemeinde-meldung': () => import('../../app/(embed)/embed/gemeinde-meldung/page'),
  '/embed/pv-kostenrennen': () => import('../../app/(embed)/embed/pv-kostenrennen/page'),
  '/embed/heizkostenrennen': () => import('../../app/(embed)/embed/heizkostenrennen/page'),
  '/embed/gruengas-heizkosten': () => import('../../app/(embed)/embed/gruengas-heizkosten/page'),
  '/embed/strommix-radar': () => import('../../app/(embed)/embed/strommix-radar/page'),
  '/embed/strommix': () => import('../../app/(embed)/embed/strommix/page'),
  '/embed/strommix-anteil': () => import('../../app/(embed)/embed/strommix-anteil/page'),
  '/embed/atomstrom-tage': () => import('../../app/(embed)/embed/atomstrom-tage/page'),
  '/embed/stromhandel': () => import('../../app/(embed)/embed/stromhandel/page'),
  '/embed/laender-strommixrennen': () => import('../../app/(embed)/embed/laender-strommixrennen/page'),
  '/embed/laender-strommix-pro-kopf': () => import('../../app/(embed)/embed/laender-strommix-pro-kopf/page'),
  '/embed/welt-zubaurennen': () => import('../../app/(embed)/embed/welt-zubaurennen/page'),
  '/embed/welt-stromrennen': () => import('../../app/(embed)/embed/welt-stromrennen/page'),
  '/embed/zubau-erneuerbare-atom': () => import('../../app/(embed)/embed/zubau-erneuerbare-atom/page'),
  '/embed/einspeiseverguetung-verlauf': () => import('../../app/(embed)/embed/einspeiseverguetung-verlauf/page'),
  '/embed/pv-zubau-deutschland': () => import('../../app/(embed)/embed/pv-zubau-deutschland/page'),
  '/embed/erzeugung': () => import('../../app/(embed)/embed/erzeugung/page'),
  '/embed/erzeugung-mini': () => import('../../app/(embed)/embed/erzeugung-mini/page'),
  '/embed/ee-ampel': () => import('../../app/(embed)/embed/ee-ampel/page'),
  '/embed/karte': () => import('../../app/(embed)/embed/karte/page'),
  '/embed/anlagenbestand-deutschland': () => import('../../app/(embed)/embed/anlagenbestand-deutschland/page'),
  '/embed/micro-solar': () => import('../../app/(embed)/embed/micro-solar/page'),
  '/embed/micro-wind': () => import('../../app/(embed)/embed/micro-wind/page'),
  '/embed/regional-map': () => import('../../app/(embed)/embed/regional-map/page'),
};
export const renderWidgetSource = cache(async (src:string):Promise<ReactNode> => {
 const url=new URL(src,'https://solar-check.io');
 if(url.origin!=='https://solar-check.io')throw new Error('Unsupported widget host');
 const query=Object.fromEntries(url.searchParams);
 if(url.pathname.startsWith('/embed/galerie/')){
  const widget=url.pathname.split('/').at(-1)!;
  if(!allWidgets().some(entry=>entry.id===widget))throw new Error('Unknown widget');
  const {default:Page}=await import('../../app/(embed)/embed/galerie/[widget]/page');
  return Page({params:Promise.resolve({widget}),searchParams:Promise.resolve(query)});
 }
 const municipalityRoutes={
  'gemeinde-solar':()=>import('../../app/(embed)/embed/gemeinde-solar/[ags]/page'),
  'gemeinde-erneuerbare':()=>import('../../app/(embed)/embed/gemeinde-erneuerbare/[ags]/page'),
  'gemeinde-solarleistung':()=>import('../../app/(embed)/embed/gemeinde-solarleistung/[ags]/page'),
 };
 const stateRoutes={
  'region-anlagentyp':()=>import('../../app/(embed)/embed/region-anlagentyp/[bl]/page'),
  'region-solarleistung':()=>import('../../app/(embed)/embed/region-solarleistung/[bl]/page'),
 };
 const municipality=municipalityRoutes[url.pathname.slice('/embed/'.length) as keyof typeof municipalityRoutes];
 if(municipality){const {default:Page}=await municipality();return Page({params:Promise.resolve({ags:query.ags??'06440016'})});}
 const state=stateRoutes[url.pathname.slice('/embed/'.length) as keyof typeof stateRoutes];
 if(state){const {default:Page}=await state();return Page({params:Promise.resolve({bl:query.bl??'06'})});}
 if(url.pathname==='/embed/kennzahl'){
  const {default:Page}=await import('../../app/(embed)/embed/kennzahl/[metric]/[traeger]/page');
  return Page({params:Promise.resolve({metric:query.metric??'leistung',traeger:query.traeger??'gesamt'})});
 }
 const race=url.pathname.match(/^\/embed\/regional-race\/(de|\d{2}|\d{5})$/);
 if(race){
  const {default:Page}=await import('../../app/(embed)/embed/regional-race/[region]/page');
  return Page({params:Promise.resolve({region:race[1]}),searchParams:Promise.resolve(query)});
 }
 const load=routes[url.pathname as keyof typeof routes];
 if(!load)throw new Error(`Unsupported widget route: ${url.pathname}`);
 const {default:Page}=await load();
 return Page({searchParams:Promise.resolve(query)});
});
