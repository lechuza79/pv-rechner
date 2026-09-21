import type {StoryConcept} from './story-konzepte';
import type {PostBild} from './social-posts';
import {BILDFORMEN,TEMPLATES} from './social-bildformen';

/** Reuse approved forms only when the original form rules accept the data. */
export function approvedStoryVisual(story:StoryConcept):PostBild|null {
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

/** One catalog for gallery choices and readiness, including custom chart templates. */
export const STORY_VISUAL_TEMPLATES=[
 {id:'anlagenraster',name:'Anlagenraster + Leistungsanteil'},
 {id:'saeule',name:'Säulen'},
 {id:'umriss',name:'Gefüllte Umrisse'},
 {id:'anteilsdonut',name:'Anteilsdonut'},
 {id:'yield',name:'Ertragsvergleich'},
 {id:'energy-year',name:'Solar + Wind · Jahresprofil'},
 {id:'radial',name:'Solar-Monatsrecap'},
 {id:'rank-month',name:'Monatliche Rangübersicht'},
];
export function storyVisualTemplate(story:StoryConcept):string|null {
 if(story.energyYear)return 'energy-year';
 if(story.kind==='rank'&&story.rankSummary?.length)return 'rank-month';
 if(story.kind==='radial'&&story.solarMonth)return 'radial';
 if(story.countComparison&&approvedStoryVisual(story))return 'anlagenraster';
 return story.kind==='yield'&&Boolean(story.yieldSeries?.length)?'yield':approvedStoryVisual(story)?.art??null;
}
