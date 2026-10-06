/** Reuse the homepage package's card markup without maintaining a second template. */
import React from 'react';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import sections from '../lib/startseite-sektionen.json';
import ToolTeaser from './ToolTeaser';
import {BEV_TEASER_COPY} from '../lib/bev-teaser';

export default function HomepageToolCards({theme='light',audience='household',compact=false}:{theme?:'light'|'dark';audience?:'household'|'municipal';compact?:boolean}) {
 if(compact){
  const tools=[...sections.werkzeuge,{kennung:'06 / ELEKTROAUTO-CHECK',hinweis:'Demnächst',titel:BEV_TEASER_COPY.titel,text:BEV_TEASER_COPY.text,links:[{text:'Mehr erfahren',href:'/elektroauto-check'}]}];
  const labels=['Photovoltaik','Balkonkraftwerk','Wärmepumpe','Fördercheck','Angebotscheck','Elektroauto-Check'];
  const descriptions=['Passende Solaranlagen finden und konkrete Planungen durchrechnen.','Ertrag und Kosten für den eigenen Balkon vergleichen.','Anschaffung und laufende Heizkosten verständlich vergleichen.','Zuschüsse für Solaranlagen am eigenen Wohnort entdecken.','Preis, Anlagengröße und Annahmen eines Angebots einordnen.','Prüfen, wie ein Elektroauto zum eigenen Alltag passt.'];
  const motifs=['house','balcony-modern','heatpump-modern','funding-check','offer-check','bev'];
  return <div className="homepage-tool-teasers" data-theme={theme}>{tools.map((tool,index)=><ToolTeaser key={tool.kennung} title={labels[index]} description={audience==='municipal'?descriptions[index]:tool.text} motif={motifs[index]} upcoming={!!tool.hinweis} href={tool.hinweis?(index===4?'/angebot-pruefen':'/elektroauto-check'):tool.links[0].href}/>)}</div>;
 }
 const source=readFileSync(path.join(process.cwd(),'public/dynamic-hero/dist/test.js'),'utf8');
 const cards=source.match(/<article class="hs-tool">[\s\S]*?<\/article>/g)?.slice(0,3);
 if(cards?.length!==3)throw new Error('Homepage tool-card template changed');
 let markup=cards.join('').replace(/\\x([0-9a-f]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))).replace(/\\u([0-9a-f]{4})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))).replaceAll('${ie}','').replaceAll('${ae}','').replaceAll('data-deferred-src=','src=');
 if(audience==='municipal') {
  const copy=[['Dein Dach kann mehr.','Solarenergie für die Dächer Ihrer Kommune.'],['Finde die passende Anlage oder rechne deine konkrete Planung durch.','Helfen Sie Ihren Bürgerinnen und Bürgern, eine passende Solaranlage zu finden und konkrete Planungen durchzurechnen.'],['Kleine Fläche. Eigener Strom.','Solarstrom auch ohne eigenes Dach.'],['Was bringt dein Balkon – und welches Set lohnt sich für dich?','Geben Sie Haushalten mit Balkon einen einfachen Einstieg: Ertrag, Kosten und passende Anlagengröße selbst vergleichen.'],['Wie heizt du morgen?','Orientierung beim Heizungstausch.'],['Vergleiche Anschaffung und laufende Heizkosten mit deiner bisherigen Heizung.','Unterstützen Sie Ihre Bürgerinnen und Bürger dabei, Anschaffung und Heizkosten einer Wärmepumpe mit der bisherigen Heizung zu vergleichen.']];
  for(const [from,to] of copy)markup=markup.replace(from,to);
 }
 markup=markup.replace(/<img([^>]*?)alt="([^"]+)"([^>]*?)>/g,(image,_before,label)=>{
  const motif=image.includes('house-v20')?'house':image.includes('balcony-modern')?'balcony-modern':'heatpump-modern';
  return `<solar-illustration motif="${motif}" label="${label}" circle class="is-ready"></solar-illustration>`;
 });
 if(markup.includes('${'))throw new Error('Unresolved homepage tool-card template');
 return <div className="homepage-study hs-tools homepage-tool-cards" data-theme={theme}><div className="hs-toolgrid hs-five-tools hs-six-tools" dangerouslySetInnerHTML={{__html:markup}}/></div>;
}
