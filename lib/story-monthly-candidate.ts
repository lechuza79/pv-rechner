import {storyWeatherAttribution} from './story-weather-attribution';
import unitValues from './story-unit-value-data.json';
import feedInSnapshots from './story-month-feed-in-data.json';
import {formatStoryDate} from './story-format';
import valueSnapshots from './story-month-value-data.json';
import {radialDataForCity} from './story-radial-data';
import type {DiscoveryReport} from './story-discovery';
export function appendMonthlySolar(report:DiscoveryReport){
 appendMonthlyValue(report);
 appendMonthlyFeedIn(report);
 const monthly=(report.prepared ?? radialDataForCity(report.regionId))?.monthly;
 if(!monthly||monthly.totalMwh<=0||report.sourceDate!==monthly.sourceDate)return;
 const id=`${report.regionId}-solar-month-${monthly.month}`;
 if(report.candidates.some(c=>c.id===id))return;
 report.candidates.push({id,family:'Solar-Monatsrecap',title:`So verlief der Solar-${new Intl.DateTimeFormat('de-DE',{month:'long',timeZone:'UTC'}).format(new Date(monthly.month+'-15T12:00:00Z'))} in ${report.name}`,status:'ready',priority:90,period:monthly.month,eventKey:'solar-month-'+monthly.month,comparison:`${monthly.days.length} Tagesverläufe auf einer 24-Stunden-Uhr, Ortszeit Europe/Berlin. Bei der Zeitumstellung wird die Anzeige zusammengeführt; der Ertrag berücksichtigt die tatsächlichen 23 oder 25 Stunden.`,evidence:[{label:'Monatsertrag',value:monthly.totalMwh,unit:'MWh'}],reason:'Aktueller Monatsrückblick aus vollständigen stündlichen Wetterdaten und registerbasiertem Anlagenbestand.',limitations:['Modellrechnung mit örtlicher Einstrahlung und Temperatur. Keine gemessene Erzeugung. Aktuell registrierte PV-Anlagen ab dem Tag nach gemeldeter Inbetriebnahme; später stillgelegte Anlagen fehlen. Individuelle Ausrichtung, Verschattung und Betriebsunterbrechungen sind nicht abgebildet.'],related:[],visual:'Radialer Tagesverlauf',provenance:[{...storyWeatherAttribution(monthly.sourceUrl),date:monthly.retrievedAt.slice(0,10)}]});
}

export function appendAnnualEnergy(report:DiscoveryReport){
 const annual=(report.prepared ?? radialDataForCity(report.regionId))?.annual;
 if(!annual||report.sourceDate!==annual.sourceDate||!annual.days.some(day=>day.solarMwh>0||day.windMwh>0))return;
 const id=`${report.regionId}-energy-year-${annual.year}`;
 if(report.candidates.some(c=>c.id===id))return;
 report.candidates.push({id,family:'Energie-Jahresprofil',title:`Solar und Wind: ${report.name} im Energiejahr ${annual.year}`,status:'ready',priority:92,period:String(annual.year),eventKey:'energy-year-'+annual.year,comparison:`${annual.days.length} Tageswerte aus ${(annual.days.length*24).toLocaleString('de-DE')} Wetterstunden; Solar und Wind gestapelt, Tage nach UTC.`,evidence:[{label:'Solar-Referenzertrag',value:annual.days.reduce((s,d)=>s+d.solarMwh,0),unit:'MWh'},{label:'Wind-Referenzertrag',value:annual.days.reduce((s,d)=>s+d.windMwh,0),unit:'MWh'}],reason:'Zusätzlicher interaktiver Jahresentwurf für eine Gemeinde mit Solar- und Windbestand.',limitations:['Referenzmodell, keine gemessene Erzeugung und keine Rekonstruktion des tatsächlichen Energiejahres. Fester registrierter Vorjahresbestand; PV aus heute aktiven Anlagen mit Inbetriebnahme bis Ende des dargestellten Jahres, Wind aus dem gespeicherten Vorjahresbestand.','Wind: vereinfachte Referenzkurve auf 100 Metern, Anlauf 3 m/s, Nennleistung 12 m/s, Abschaltung ab 25 m/s. Keine Zuordnung zu örtlichen Turbinentypen, Nabenhöhen, Abschaltungen oder Parkverlusten; noch keine belastbare kommunale Wind-Ertragsprognose.','Solar: bestehendes Einstrahlungs- und Temperaturmodell ohne individuelle Ausrichtung oder Verschattung.'],related:[],visual:'Radiales Jahresprofil',provenance:[{...storyWeatherAttribution(annual.sourceUrl),date:annual.retrievedAt.slice(0,10)}]});
}

/** Editorial snapshots use frozen valuation assumptions, not a live tariff. */
function appendMonthlyValue(report:DiscoveryReport){
 const snapshots=JSON.parse(JSON.stringify(valueSnapshots)) as Record<string,Record<string,{euro:number;month:string;sourceDate:string;valuationDate:string;totalMwh:number;weatherUrl?:string}>>;
 for(const [id,months] of Object.entries(unitValues)){snapshots[id]??={};for(const [month,data] of Object.entries(months))snapshots[id][month]={...data,euro:data.euro} as typeof snapshots[string][string];}
 for(const value of Object.values(report.prepared ? report.prepared.values??{} : snapshots[report.regionId]??{})){
  const id=`${report.regionId}-electricity-value-${value.month}`;
  if(report.candidates.some(c=>c.id===id))continue;
  const period=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value.month+'-15T12:00:00Z'));
  report.candidates.push({id,family:'Stromwert-Monatsrecap',title:`So viel war der Solarstrom im ${period} wert`,status:'ready',priority:89,period:value.month,eventKey:'electricity-value-'+value.month,comparison:'Modellrechnung · ersparter Netzbezug und Einspeisung',evidence:[{label:'Modellierter Stromwert',value:value.euro,unit:'€'}],reason:'Monatliche Bewertung mit den bestehenden Atlas-Annahmen, als unveränderter Berechnungsstand gespeichert.',limitations:[...unitValuationNotes(report,value.month),`Wetterbasierter Monatsertrag; keine gemessene Erzeugung oder ausgezahlten Erlöse. Bewertung mit dem registrierten Anlagenmix und den Atlas-Preisannahmen vom ${formatStoryDate(value.valuationDate)}, nicht mit rekonstruierten historischen Strompreisen. Die Eigenverbrauchsanteile sind Jahresannahmen, keine Simulation des Eigenverbrauchs dieses Monats.`,'Jede registrierte Einheit wird mit ihrer tatsächlichen Leistung und ihrem Inbetriebnahmedatum berechnet. Gemeldete Voll- und Teileinspeisung werden unterschieden. Gewerblicher Eigenverbrauch ist mangels Verbrauchsdaten nicht bewertet. Für große Dächer außerhalb der hinterlegten Tarifstufen und Freiflächen bleiben Vergütungssätze Näherungen; heute stillgelegte Anlagen fehlen.'],related:[],visual:'Einzelkennzahl',provenance:[{...storyWeatherAttribution(report.prepared?.monthly?.sourceUrl),date:value.sourceDate},{label:'MaStR · Atlas-Stromwertmodell',date:value.valuationDate,url:'/methodik'}]});
 }
}

function appendMonthlyFeedIn(report:DiscoveryReport){
 const snapshots=JSON.parse(JSON.stringify(feedInSnapshots)) as Record<string,Record<string,{euro:number;month:string;sourceDate:string;valuationDate:string}>>;
 for(const [id,months] of Object.entries(unitValues)){snapshots[id]??={};for(const [month,data] of Object.entries(months))snapshots[id][month]={...data,euro:data.feedInEuro} as typeof snapshots[string][string];}
 const prepared=report.prepared ? report.prepared.values??{} : undefined;
 for(const value of Object.values(prepared ? Object.fromEntries(Object.entries(prepared).map(([m,v])=>[m,{...v,euro:v.feedInEuro}])) : snapshots[report.regionId]??{})){
  if(value.euro<=0)continue;
  const id=`${report.regionId}-feed-in-value-${value.month}`;
  if(report.candidates.some(c=>c.id===id))continue;
  const period=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value.month+'-15T12:00:00Z'));
  report.candidates.push({id,family:'Einspeisevergütung-Monatsrecap',title:`Einspeisevergütung im ${period}`,status:'ready',priority:88,period:value.month,eventKey:'feed-in-value-'+value.month,comparison:'Modellrechnung · vergütete Einspeisung',evidence:[{label:'Modellierte Einspeisevergütung',value:value.euro,unit:'€'}],reason:'Separate Vergütungskennzahl aus derselben Monats- und Bewertungsgrundlage wie der Stromwert.',limitations:[...unitValuationNotes(report,value.month),`Referenzrechnung mit Wetterertrag des Monats und Registerstand vom ${formatStoryDate(value.sourceDate)}; keine gemessene Einspeisung oder Abrechnung. Berechnung je registrierter Einheit mit tatsächlicher Leistung, Inbetriebnahmedatum und gemeldeter Voll- oder Teileinspeisung. Erzeugung ab dem Folgetag der Inbetriebnahme; berücksichtigt sind heute aktive Einheiten.`,'Bei privaten Dächern wird der modellierte Eigenverbrauch abgezogen. Gemeldete Volleinspeiser werden ohne Eigenverbrauch gerechnet. Bei gewerblichen Teileinspeisern fehlt der Verbrauch; vollständige Einspeisung bleibt hier eine Obergrenzen-Annahme. Balkonkraftwerke werden ohne Vergütung gerechnet.','Börsenerlöse nach Förderende zählen nicht zur Einspeisevergütung. Freiflächen werden mit den bestehenden historischen Förder- bzw. Ausschreibungswerten bewertet. Für große Dächer außerhalb der hinterlegten Tarifstufen und Freiflächen bleiben die Sätze Näherungen. Heute stillgelegte Anlagen fehlen im rekonstruierten Monatsbestand.'],related:[],visual:'Einzelkennzahl',provenance:[{label:'MaStR · Atlas-Vergütungsmodell',date:value.valuationDate,url:'/methodik'},{label:'Historische Vergütungssätze',date:value.valuationDate,url:'/einspeiseverguetung-tabelle'}]});
 }
}

function unitValuationNotes(report:DiscoveryReport,month:string):string[]{
 const data=report.prepared?.values?.[month] ?? (unitValues as Record<string,Record<string,{unitCount:number;approximateTariffCount:number;unknownModeCount:number;commercialSelfUseUnknownCount:number;privateSelfConsumption:number}>>)[report.regionId]?.[month];
 if(!data)return [];
 return [`${data.unitCount.toLocaleString('de-DE')} ${data.unitCount===1?'Einzelanlage geht':'Einzelanlagen gehen'} in diesen Monat ein. Bei ${data.approximateTariffCount} ${data.approximateTariffCount===1?'Anlage ist':'Anlagen ist'} der Vergütungssatz eine Näherung. Bei ${data.unknownModeCount} ${data.unknownModeCount===1?'Anlage fehlt':'Anlagen fehlt'} die Einspeisungsart; hier wird Teileinspeisung angenommen.`, `Für private Teileinspeiser werden ${(data.privateSelfConsumption*100).toLocaleString('de-DE',{maximumFractionDigits:1})} % Eigenverbrauch als regionaler Jahreswert angesetzt. Bei ${data.commercialSelfUseUnknownCount} weiteren Dachanlagen ohne gemeldete Volleinspeisung fehlt ein Verbrauchsprofil; ihr Eigenverbrauch wird mit null angesetzt.`];
}
