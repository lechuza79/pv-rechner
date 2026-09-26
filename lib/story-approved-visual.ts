import type {StoryConcept} from './story-konzepte';
import type {PostBild} from './social-posts';
import {BILDFORMEN,TEMPLATES} from './social-bildformen';
import type {WidgetKind} from './dashboard/model';
import {WIDGETS} from './widget-registry';

/** Reuse approved forms only when the original form rules accept the data. */
export function approvedStoryVisual(story:StoryConcept):PostBild|null {
  if(story.additionsSeries){const d=story.additionsSeries;return {art:'verlauf',stil:'hell',aussage:story.title,gemessen:'Vorläufige Registerdaten',quelle:story.sourceCaption??'',achse:d.months.map((_,i)=>i),axisLabels:d.months.map(m=>new Intl.DateTimeFormat('de-DE',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(m+'-15T12:00:00Z'))),serien:[{label:'Anlagen',wert:d.counts[11],einheit:'Anlagen',verlauf:d.counts},{label:'Leistung (kWp)',wert:d.kwp[11],einheit:'kWp',verlauf:d.kwp}]};}
  if(['Stromwert-Monatsrecap','Einspeisevergütung-Monatsrecap'].includes(story.label)&&story.values.length===1&&story.values[0].value>=0){
    return {art:'kennzahl',stil:'hell',aussage:story.title,gemessen:'Modellrechnung',quelle:story.sourceCaption??'',serien:[{label:story.label==='Stromwert-Monatsrecap'?'Stromwert':'Einspeisevergütung',wert:story.values[0].value,einheit:'€'}]};
  }
  if(story.kind==='donut'){
    const total=story.values.reduce((sum,v)=>sum+v.value,0);
    const bild:PostBild={art:'anteilsdonut',stil:'hell',aussage:story.title,gemessen:story.comparisonLabel??story.teaser,quelle:story.sourceCaption??'Marktstammdatenregister · eigene Auswertung',ganzes:total,gesamtAnzeige:total.toLocaleString('de-DE',{maximumFractionDigits:1})+' '+story.unit,serien:story.values.map(v=>({label:v.label,wert:v.value,einheit:v.unit??story.unit}))};
    return total>0&&BILDFORMEN.find(form=>form.art===bild.art)?.passt(bild)?bild:null;
  }
  if(story.kind==='radial'||story.kind==='yield'||story.values.length!==2)return null;
  const units=new Set(story.values.map(v=>v.unit??story.unit));
  if(units.size!==1||story.values.some(v=>!Number.isFinite(v.value)||v.value<0))return null;
  const shares=story.label==='Anzahl und Leistung'&&story.values.every(v=>v.unit==='%'&&v.value<=100);
  if(shares&&!story.countComparison)return null;
  if(!shares&&!['Jahresveränderung','Vorjahreszeitraum','Größenvergleich','Speicher-Jahresveränderung'].includes(story.label))return null;
  // Historical records need a time series, not a pair chosen solely by array length.
  if(['Jahresveränderung','Speicher-Jahresveränderung'].includes(story.label)&&story.period!==String(Number(story.sourceDate?.slice(0,4))-1))return null;
  // A zero baseline or zero current value needs an event/time-series treatment.
  if(!shares&&story.values.some(value=>value.value===0))return null;
  const art=shares?'donut':'saeule';
  const template=TEMPLATES.find(t=>t.art===art&&t.stil==='hell');
  if(!template)return null;
  const bild:PostBild={countComparison:story.countComparison,art,stil:template.stil,aussage:story.title,gemessen:story.comparisonLabel??story.teaser,quelle:story.sourceCaption??'Marktstammdatenregister · eigene Auswertung',ganzes:shares?100:undefined,serien:story.values.map((v,index)=>({label:v.label,wert:v.value,einheit:v.unit??story.unit,stellen:Number.isInteger(v.value)?0:1,hervorgehoben:index===1}))};
  return BILDFORMEN.find(form=>form.art===art)?.passt(bild)?bild:null;
}

/**
 * One catalog of visual templates: gallery choices, readiness, and the monitor
 * role (widget title + layout kind) for templates that appear as monitor widgets.
 * `widget` names the widget-registry entry (identity, sources, share target) and
 * marks templates migrated to the shared export pipeline; the rest still carry
 * the story reader's legacy credit line until they are migrated.
 */
export type StoryVisualTemplate={id:string;name:string;monitor?:{title?:string;kind:WidgetKind};widget?:keyof typeof WIDGETS;
 /** Only stories whose data really stems from the registry entry's sources use its footer; others keep the legacy credit. */
 exportProvenance?:(story:StoryConcept)=>boolean};
export const STORY_VISUAL_TEMPLATES:StoryVisualTemplate[]=[
 {id:'verlauf',name:'Monatlicher Zubau · Verlauf',monitor:{title:'Zubau pro Monat',kind:'time-series'}},
 {id:'electricity-value',name:'Kennzahl · Stromwert',monitor:{title:'Wert des Solarstroms',kind:'number'}},
 {id:'feed-in-value',name:'Kennzahl · Einspeisevergütung',monitor:{title:'Einspeisevergütung',kind:'number'}},
 // Monitor title derives from the selected category (see monitorWidgetRole).
 {id:'anlagenraster',name:'Anlagenraster + Leistungsanteil',monitor:{kind:'composition'},widget:'gemeindeAnlagenraster'},
 {id:'saeule',name:'Säulen'},
 {id:'umriss',name:'Gefüllte Umrisse'},
 {id:'anteilsdonut',name:'Anteilsdonut',monitor:{title:'Installierte Solarleistung nach Anlagentyp',kind:'donut'}},
 {id:'yield',name:'Ertragsvergleich'},
 {id:'energy-year',name:'Solar + Wind · Jahresprofil',monitor:{title:'Solar- und Windpotenzial im Jahresverlauf',kind:'radial'},widget:'gemeindeEnergieJahr',
  // Older packages name the free Open-Meteo archive; the registry entry claims our ERA5 archive.
  exportProvenance:story=>Boolean(story.energyYear?.sourceUrl?.startsWith('era5-archive:'))},
 {id:'radial',name:'Solar-Monatsrecap',monitor:{title:'Solarerzeugung im Tagesverlauf',kind:'radial'},widget:'gemeindeSolarMonat',
  exportProvenance:story=>Boolean(story.solarMonth?.sourceUrl?.startsWith('era5-archive:'))},
 {id:'rank-month',name:'Monatliche Rangübersicht'},
];
export function storyVisualTemplateDef(id:string|null|undefined):StoryVisualTemplate|undefined{return id?STORY_VISUAL_TEMPLATES.find(t=>t.id===id):undefined;}
/** Monitor widget title and layout kind, read from the template catalog. */
export function monitorWidgetRole(template:string,story:{countComparison?:{label:string}}):{title:string;kind:WidgetKind}{
 const def=storyVisualTemplateDef(template)?.monitor;
 const title=def?.title??(story.countComparison?.label?story.countComparison.label+': Anteil an Anzahl und Leistung':'Anlagenbestand');
 return {title,kind:def?.kind??'number'};
}
export function storyVisualTemplate(story:StoryConcept):string|null {
 if(story.label==='Stromwert-Monatsrecap'&&approvedStoryVisual(story))return 'electricity-value';
 if(story.label==='Einspeisevergütung-Monatsrecap'&&approvedStoryVisual(story))return 'feed-in-value';
 if(story.energyYear)return 'energy-year';
 if(story.kind==='rank'&&story.rankSummary?.length)return 'rank-month';
 if(story.kind==='radial'&&story.solarMonth)return 'radial';
 if(story.countComparison&&approvedStoryVisual(story))return 'anlagenraster';
 return story.kind==='yield'&&Boolean(story.yieldSeries?.length)?'yield':approvedStoryVisual(story)?.art??null;
}
