import type {NewsletterRegion} from './newsletter-region';
import type {SubscriberLinks} from './newsletter-subscriber';
import type {NewsletterVariant} from './newsletter-metrics';
import {ortPhrase} from './atlas-orte';
import {pvLeistungTeile} from './atlas-format';
import {energieTeile} from './gemeinde-einheiten';
import {formatStoryDate} from './story-format';
const number=(n:number)=>n.toLocaleString('de-DE',{maximumFractionDigits:1});
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const energy=(n:number)=>{const p=energieTeile(n);return `${p.value} ${p.unit}`};
/** The two reviewed layouts share one regional factual contract. */
export function renderNewsletterMail(template:string,data:NewsletterRegion,variant:NewsletterVariant,image:string,links:SubscriberLinks){
 const monthLabel=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(data.month+'-15T12:00:00Z'));
 const power=pvLeistungTeile(data.addedKwp);if(power.unit==='kWp')power.value=number(data.addedKwp);
 const pv=`${power.value} ${power.unit}`,total=energy(data.solar.totalMwh),place=escape(ortPhrase({name:data.name}));
 const peak=data.solar.days.find(d=>d.date===data.solar.peakDay)!;
 const singular:Record<string,string>={'Gebäudeanlagen':'Gebäudeanlage','Balkonkraftwerke':'Balkonkraftwerk','Freiflächenanlagen':'Freiflächenanlage','Sonstige Solaranlagen':'sonstige Solaranlage'};
 const segments=data.segments.map(s=>`<strong>${number(s.count)}</strong> ${escape(s.count===1?singular[s.label]??s.label:s.label)}`).join(' und ');
 const stock=number(data.stock),count=number(data.added),noun=data.added===1?'neue Solaranlage':'neue Solaranlagen';
 const intro=variant==='kommunal'
 ? `Für ${monthLabel} ${data.added===1?'ist':'sind'} ${place} bislang <strong>${count}</strong> ${noun} mit zusammen <strong>${pv}</strong> Modulleistung registriert. ${segments?`Dazu ${data.added===1?'gehört':'gehören'} ${segments}. `:''}Zum Monatsende umfasst der erfasste Bestand <strong>${stock}</strong> Solaranlagen. Die neuen Anlagen sind darin bereits enthalten.`
 : `Im ${monthLabel} ${data.added===1?'ist':'sind'} ${place} bislang <strong>${count}</strong> ${noun} hinzugekommen${segments?`: ${segments}`:''}. Zusammen bringen sie <strong>${pv}</strong> zusätzliche Modulleistung mit. Damit stehen zum Monatsende <strong>${stock}</strong> Solaranlagen im Register.`;
 const energyText=`${variant==='kommunal'?'Für alle erfassten Solaranlagen zusammen ergibt die Wetterberechnung':'Wie viel Strom kam zusammen? Für die erfassten Solaranlagen ergibt die Wetterberechnung'} <strong>${total}</strong> Solarstrom im ${monthLabel}. Der ertragreichste Tag war der <strong>${formatStoryDate(peak.date)}</strong> mit <strong>${energy(peak.mwh)}</strong>. Die Strommengen sind modelliert, nicht gemessen.`;
 const fields:Record<string,string>={PREHEADER:escape(`${count} ${noun}, ${pv} Zubau und ${total} modellierter Solarstrom.`),COUNT:count,POWER_VALUE:power.value,POWER_UNIT:power.unit,STOCK:stock,INTRO:intro,ENERGY_TEXT:energyText,VIDEO_URL:escape(data.videoUrl),PAGE_URL:escape(data.pageUrl),SCOPE:escape(`${data.name} innerhalb der ${data.kind==='gemeinde'?'Gemeindegrenzen':data.kind==='landkreis'?'Kreisgrenzen':data.kind==='verband'?'Verbandsgrenzen':data.kind==='bundesland'?'Landesgrenzen':'Bundesgrenzen'}`),SOURCE_DATE:formatStoryDate(data.sourceDate),MONTH_LABEL:monthLabel,MONTH:data.month,ENERGY:total,DAYS:String(data.solar.days.length),NAME:escape(data.name),IMAGE:image,PREFERENCES_URL:escape(links.einstellungenUrl),UNSUBSCRIBE_URL:escape(links.abmeldeUrl),COMPARISON:data.kind==='gemeinde'?'den Nachbargemeinden':data.kind==='deutschland'?'den Bundesländern':data.kind==='bundesland'?'den Kreisen und kreisfreien Städten':'den Gemeinden im Gebiet'};
 const html=template.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{if(!(key in fields))throw Error('Unknown newsletter field '+key);return fields[key]});
 const text=html.replace(/<style[^>]*>[\s\S]*?<\/style>/g,'').replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,(_,href,label)=>label.replace(/<[^>]+>/g,'')+' '+href.replaceAll('&amp;','&')).replace(/<[^>]+>/g,' ').replaceAll('&amp;','&').replace(/\s+/g,' ').trim();
 return {betreff:`${data.name}: ${count} ${noun} im ${monthLabel}`,html,text};
}
