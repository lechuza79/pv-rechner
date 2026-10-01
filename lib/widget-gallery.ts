import { WIDGETS, type WidgetDef } from './widget-registry';
import { SECTIONS } from './widget-gallery-sections';

export type GalleryPlace = {ags:string;name:string;districtId:string|null;districtName:string|null;stateId:string;stateName:string};
export type GalleryVariant = {label:string;src:string;height:number};
export type GalleryEntry = {id:string;title:string;group:'comparison'|'regional'|'energy'|'cost';variants:GalleryVariant[];placeLabel?:string};
const singles = new Set(['gemeinde-ranking','regional-current-power','regional-annual-growth','regional-composition','gemeinde-anlagenraster','regional-electricity-value','regional-feed-in-value','gemeinde-energie-jahr','gemeinde-solar-monat']);
const order = ['regional-map','gemeinde-ranking','regional-annual-growth','gemeinde-solar-monat','regional-race','regional-composition','gemeinde-anlagenraster','gemeinde-energie-jahr','regional-electricity-value','regional-feed-in-value','regional-current-power'];
/** Gallery curation only: hidden entries remain registered and embeddable. */
export const GALLERY_HIDDEN: Readonly<Record<string, string>> = {
  'gemeinde-solar': 'Older municipal overview; use the current growth and composition widgets.',
  'gemeinde-erneuerbare': 'Older municipal overview; pending product review.',
  'gemeinde-solarleistung': 'Older version of regional-current-power.',
  'region-anlagentyp': 'Older state view of the composition chart.',
  'region-solarleistung': 'Older state view of the current-power chart.',
  'gemeinde-meldung': 'Editorial story rather than a standalone chart.',
  'kennzahl': 'Generic number tile; represented by specific current widgets.',
  'simulation': 'Full application rather than a gallery chart.',
  'foerder-check': 'Interactive questionnaire rather than a gallery chart.',
};
export const GALLERY_CATEGORIES = [
  {id:'comparison',label:'Orte vergleichen'},
  {id:'regional',label:'Energie vor Ort'},
  {id:'energy',label:'Deutschland'},
  {id:'cost',label:'Kosten vergleichen'},
] as const;
export function curatedGalleryEntries(place:GalleryPlace):GalleryEntry[] {
  return galleryEntries(place).filter(entry=>!GALLERY_HIDDEN[entry.id]);
}
/** Compose existing renderers and variants; no independent chart or entitlement definitions. */
export function galleryEntries(place:GalleryPlace):GalleryEntry[] {
  return (Object.values(WIDGETS) as WidgetDef[]).filter(w=>w.id!=='rechner').map(w=>{
    const group = ['regional-map','gemeinde-ranking','regional-race'].includes(w.id)?'comparison':/gemeinde|regional|region-/.test(w.id)?'regional':/kosten|heiz|gruengas|rechner|simulation|foerder/.test(w.id)?'cost':'energy';
    let placeLabel:string|undefined;
    let variants:GalleryVariant[]=[];
    if(singles.has(w.id)) {placeLabel=place.name;variants=[{label:place.name,src:`/embed/galerie/${w.id}?ags=${place.ags}`,height:540}];}
    else if(w.id==='solar-trend-monat') variants=[{label:'Monatsvergleich',src:'/embed/galerie/solar-trend-monat',height:500}];
    else if(w.id==='regional-map') {
      placeLabel=place.districtName??place.stateName;
      variants=[{label:placeLabel,src:`/embed/regional-map?ags=${place.districtId??place.stateId}&selected=${place.ags}`,height:650}];
    } else if(w.id==='regional-race') {
      const region=place.districtId ?? place.stateId;
      placeLabel=place.districtName ?? place.stateName;
      variants=[{label:placeLabel,src:`/embed/regional-race/${region}`,height:740}];
    } else if(w.id==='gemeinde-meldung') {placeLabel=place.name;variants=[{label:place.name,src:`/embed/gemeinde/${place.ags}/insights`,height:600}];}
    else {
      const section=SECTIONS.find(s=>s.id===w.id || s.variants.some(v=>v.src===`/embed/${w.id}`));
      variants=(section?.variants??[]).map(v=>{
        const params={...w.exampleParams,...v.params};
        if(params.ags) {params.ags=place.ags;placeLabel=place.name;}
        if(params.bl) {params.bl=place.stateId;placeLabel=place.stateName;}
        const query=new URLSearchParams(params).toString();
        return {label:placeLabel??v.label,src:v.src+(query?`?${query}`:''),height:v.height};
      });
    }
    return {id:w.id,title:w.title,group,variants,placeLabel} as GalleryEntry;
  }).sort((a,b)=>(order.indexOf(a.id)<0?100:order.indexOf(a.id))-(order.indexOf(b.id)<0?100:order.indexOf(b.id)));
}
