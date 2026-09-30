import { WIDGETS, type WidgetDef } from './widget-registry';
import { SECTIONS } from './widget-gallery-sections';

export type GalleryPlace = {ags:string;name:string;districtId:string|null;districtName:string|null;stateId:string;stateName:string};
export type GalleryVariant = {label:string;src:string;height:number};
export type GalleryEntry = {id:string;title:string;group:'regional'|'energy'|'cost';variants:GalleryVariant[];placeLabel?:string};
const singles = new Set(['gemeinde-ranking','regional-current-power','regional-annual-growth','regional-composition','gemeinde-anlagenraster','regional-electricity-value','regional-feed-in-value','gemeinde-energie-jahr','gemeinde-solar-monat']);
const order = ['gemeinde-ranking','regional-annual-growth','gemeinde-solar-monat','regional-race','regional-composition','gemeinde-anlagenraster','gemeinde-energie-jahr','regional-electricity-value','regional-feed-in-value','regional-current-power'];
/** Compose existing renderers and variants; no independent chart or entitlement definitions. */
export function galleryEntries(place:GalleryPlace):GalleryEntry[] {
  return (Object.values(WIDGETS) as WidgetDef[]).filter(w=>w.id!=='rechner').map(w=>{
    const group = /gemeinde|regional|region-/.test(w.id)?'regional':/kosten|heiz|gruengas|rechner|simulation|foerder/.test(w.id)?'cost':'energy';
    let placeLabel:string|undefined;
    let variants:GalleryVariant[]=[];
    if(singles.has(w.id)) {placeLabel=place.name;variants=[{label:place.name,src:`/embed/galerie/${w.id}?ags=${place.ags}`,height:540}];}
    else if(w.id==='solar-trend-monat') variants=[{label:'Monatsvergleich',src:'/embed/galerie/solar-trend-monat',height:500}];
    else if(w.id==='regional-race') {
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
