import type {Candidate,DiscoveryReport} from './story-discovery';
import type {StoryConcept} from './story-konzepte';
import {readableComparison} from './story-related';
import {formatStoryDate} from './story-format';
import {energyYearSummary} from './story-energy-year';
import {rankingHighlights,rankingHighlight} from './story-ranking-month';
const n=(value:number,digits=0)=>value.toLocaleString('de-DE',{maximumFractionDigits:digits});
const money=(value:number)=>value>=1e6?`${n(value/1e6,1)} Millionen Euro`:value>=1000?`${n(value/1000,1)} Tausend Euro`:`${n(value)} Euro`;
const valueCostNote='Die Schätzung ist kein Gewinn: Investitions- und Finanzierungskosten, Wartung, Versicherung, Messstellenbetrieb und gegebenenfalls Vermarktungsgebühren sind nicht abgezogen. Die Einspeisevergütung ist bereits im Stromwert enthalten; beide Kennzahlen dürfen nicht addiert werden.';
const pct=(value:number)=>value>0&&value<0.1?'unter 0,1':n(value,1);
/** Shared editorial copy: assertion, denominator/window, then data-dependent context.
 * Never infer private ownership, measured generation, or a ranking movement. */
export function storyCopy(report:DiscoveryReport,claim:Candidate,story:StoryConcept):string|null{
 const place=report.name,values=story.values,subject=claim.title.split(':')[0];
 if(claim.family==='Einspeisevergütung-Monatsrecap')return `Für ${formatStoryDate(claim.period)} ergibt die Referenzrechnung in ${place} rund ${money(values[0].value)} geschätzte Einspeisevergütung vor Anlagen- und Betriebskosten. Jede Anlage geht mit ihrer tatsächlichen Leistung, ihrem Inbetriebnahmedatum und der gemeldeten Voll- oder Teileinspeisung ein. Bei privaten Teileinspeisern wird der geschätzte Eigenverbrauch abgezogen. Bei gewerblichen Teileinspeisern fehlt der Verbrauch; die angenommene vollständige Einspeisung kann den Betrag überschätzen. Ersparter Strombezug und Börsenerlöse nach Förderende sind hier nicht enthalten. ${valueCostNote}`;
 if(claim.family==='Stromwert-Monatsrecap')return `Der Solarstrom in ${place} kommt für ${formatStoryDate(claim.period)} auf einen geschätzten Stromwert von rund ${money(values[0].value)} vor Anlagen- und Betriebskosten: durch ersparten Strombezug und bewertete Einspeisung. Die Rechnung verbindet den örtlichen Wetterertrag mit den Einzelanlagen und den Atlas-Annahmen für Eigenverbrauch und Vergütung. Sie zeigt einen modellierten wirtschaftlichen Gegenwert, keine gemessenen Einnahmen. Bewertet wird mit den beim Erstellen gespeicherten Preisannahmen. Beim Eigenverbrauch zählt nur der vermiedene Arbeitspreis einschließlich seiner verbrauchsabhängigen Netzentgelte; der feste Grundpreis wird nicht als Ersparnis angerechnet. ${valueCostNote}`;
 if(story.additionsSeries){const d=story.additionsSeries;return `Im ${formatStoryDate(claim.period)} sind in ${place} bislang ${n(d.counts[11])} neue Solaranlagen mit zusammen ${n(d.kwp[11],1)} kWp Modulleistung registriert. ${d.segments.map(s=>`${s.label}: ${n(s.count)} Anlagen mit ${n(s.kwp,1)} kWp`).join('; ')}${d.segments.length?'. ':''}Der Verlauf zeigt die letzten zwölf abgeschlossenen Monate; zwischen Anlagenzahl und Leistung lässt sich umschalten. Die Werte sind vorläufig: Nachmeldungen können den jüngsten Monat noch verändern. Gebäudeanlagen erlauben keine Aussage über privates Eigentum; eine große Registereinheit ist nicht automatisch ein eigenständiger Solarpark.`;}
 if(story.energyYear)return energyYearSummary(story.energyYear);
 if(story.solarMonth){
  const data=story.solarMonth,households=data.totalMwh*1000/(3500/12);
  return `Im ${formatStoryDate(data.month)} erzeugten die Solaranlagen in ${place} im Modell rund ${data.totalMwh>=1000?`${n(data.totalMwh/1000,1)} GWh`:`${n(data.totalMwh,1)} MWh`} Strom. Den höchsten Tagesertrag hatte der ${formatStoryDate(data.peakDay)}. Die Monatssumme entspricht rechnerisch dem durchschnittlichen Monatsverbrauch von rund ${n(households/1000>=1?Math.round(households/1000)*1000:households)} Haushalten bei 3.500 kWh Jahresverbrauch – nicht einer zeitgleichen Versorgung. Berücksichtigt sind die registrierten Gebäude-, Freiflächen- und Balkonanlagen im Stadtgebiet; Grundlage sind örtliche Wetterdaten, keine gemessenen Strommengen.`;
 }
 if(claim.family==='Bestandsprofil'&&values.length){
  const total=values.reduce((sum,v)=>sum+v.value,0),largest=[...values].sort((a,b)=>b.value-a.value)[0];
  if(total<=0)return null;
  const small=values.filter(v=>v.value>0&&v.value/total<.01);
  return `In ${place} sind laut Register insgesamt ${n(total,1)} kWp Solarleistung installiert. ${largest.label} stellen mit ${pct(largest.value/total*100)} % den größten Anteil. Der Ring zeigt die Verteilung der installierten Leistung auf alle erfassten Solaranlagentypen im Stadtgebiet, nicht ihre Stromerzeugung.${small.length?` ${small.map(v=>`${v.label}: ${pct(v.value/total*100)} %`).join('; ')} – diese kleinen Anteile sind im Ring entsprechend schmal.`:''} Stand: ${formatStoryDate(report.sourceDate)}.`;
 }
 if(claim.family==='Anzahl und Leistung'&&values.length===2){
  const counts=story.countComparison;
  const countShare=counts?counts.selected/counts.total*100:values[0].value;
  return `${counts?`${n(counts.selected)} von ${n(counts.total)} registrierten Solaranlagen in ${place} sind ${counts.label}`:`${subject} machen in ${place} ${pct(countShare)} % der registrierten Solaranlagen aus`}. Auf sie entfallen ${pct(values[1].value)} % der installierten Solarleistung.${counts?` Das Raster zeigt die Anlagenzahl (${pct(countShare)} %), der Ring den Leistungsanteil.`:''}${countShare>0&&countShare<1?' Der geringe Anteil an der Anlagenzahl ist im Raster deshalb nur als kleine Fläche sichtbar.':''} Bezugsgröße ist jeweils der gesamte aktive Solarbestand im Stadtgebiet am ${formatStoryDate(report.sourceDate)}; die erzeugte Strommenge wird hier nicht verglichen.`;
 }
 if(['Jahresveränderung','Vorjahreszeitraum','Speicher-Jahresveränderung','Größenvergleich'].includes(claim.family)&&values.length===2){
  const [before,after]=values,unit=after.unit??story.unit;
  if((before.unit??story.unit)!==unit)return null;
  const delta=after.value-before.value;
  const change=delta===0?'unverändert':`${n(Math.abs(delta),unit==='Anlagen'?0:1)} ${unit} ${delta>0?'mehr':'weniger'}`;
  const relative=before.value>0&&delta!==0?` (${n(Math.abs(delta/before.value)*100,1)} %)` : '';
  const quantity=unit==='Anlagen'?'Anlagenzahl':unit==='kWp'?'neu installierte Modulleistung':unit==='kWh'?'Speicherkapazität':`Wert in ${unit}`;
  return `${subject} in ${place}: Für ${formatStoryDate(after.label)} beträgt die ${quantity} ${n(after.value,unit==='Anlagen'?0:1)} ${unit}, gegenüber ${n(before.value,unit==='Anlagen'?0:1)} ${unit} für ${formatStoryDate(before.label)}. Das sind ${change}${relative}. ${readableComparison(claim.comparison)}.${claim.family==='Vorjahreszeitraum'?' Die Werte sind vorläufig und reichen bis zum letzten abgeschlossenen Monat; Nachmeldungen und Korrekturen können sie noch verändern.':claim.family==='Größenvergleich'?' Verglichen werden die benannten Gruppen mit derselben Einheit.':' Grundlage sind heute aktive Registereinheiten nach Inbetriebnahmejahr; inzwischen stillgelegte Anlagen fehlen.'}${unit==='kWp'?' Modulleistung beschreibt die Größe der Anlagen, nicht den erzeugten Strom.':''}`;
 }
 if(claim.family==='Rang-Monatsupdate'&&story.rankSummary?.length){
  const rows=rankingHighlights(story.rankSummary),lead=rows[0];if(!lead)return null;
  const state=rankingHighlight(lead);
  const first=lead.state==='initial';
  const changedLead=lead.state==='changed-basis';
  const changed=story.rankSummary.some(row=>row.state==='changed-basis');
  return `${place} liegt im ${formatStoryDate(claim.period)} bei „${lead.label}“ auf Rang ${n(lead.rank)} von ${n(lead.size)} Kommunen (${lead.scope})${first||changedLead?'':` – ${state}`}. ${rows.length>1?`Die Übersicht bündelt ${n(rows.length)} relevante Platzierungen in ihren jeweiligen Vergleichsgruppen. `:''}${first?'Dies ist der erste vergleichbare Monatsstand. Ab dem nächsten Monat zeigen wir, welche Plätze gehalten wurden und wo sich die Gemeinde verbessert oder verschlechtert hat.':changedLead?'Die Vergleichsgruppe hat sich geändert. Dieser Rang lässt sich deshalb nicht direkt mit dem Vormonat vergleichen.':'Die Veränderungen beziehen sich auf den vergleichbaren Vormonat.'}${changed?' Geänderte Vergleichsgruppen werden ohne Rangdifferenz ausgewiesen.':''} Alle Platzierungen und Filter stehen in der verlinkten Rangtabelle. Ränge können sich auch durch Entwicklungen in anderen Kommunen oder Registerkorrekturen ändern.`;
 }
 if(story.kind==='yield'&&story.yieldSeries?.length){
  const series=story.yieldSeries,peak=series.find(v=>v.period===claim.period);
  const peers=series.filter(v=>v.period.slice(5)===claim.period.slice(5)&&v.period!==claim.period);
  if(!peak||!peers.length)return null;
  const mean=peers.reduce((sum,v)=>sum+v.value,0)/peers.length;
  const delta=mean>0?(peak.value/mean-1)*100:0;
  const month=claim.period.length===7?new Intl.DateTimeFormat('de-DE',{month:'long',timeZone:'UTC'}).format(new Date(claim.period+'-15T12:00:00Z')):'';
  return `${formatStoryDate(claim.period)} erreicht im Wettermodell für ${place} ${n(peak.value,1)} kWh je kWp. Das sind ${n(Math.abs(delta),1)} % ${delta>=0?'mehr':'weniger'} als der Durchschnitt der ${n(peers.length)} anderen ${claim.period.length===7?month+'-Monate':'gleichen Kalenderperioden'} im dargestellten Vergleichszeitraum. Verglichen wird der modellierte Ertrag je kWp bei einheitlichen Anlagenannahmen; zusätzliche Anlagen verändern diesen Vergleich nicht. Es handelt sich nicht um die gemessene Stromerzeugung des damaligen Anlagenbestands.`;
 }
 return null;
}
