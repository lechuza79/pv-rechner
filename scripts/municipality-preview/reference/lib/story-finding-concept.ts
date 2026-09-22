import {radialDataForCity} from './story-radial-data';
import {readableComparison} from './story-related';
import {formatStoryValue,formatStoryDate} from './story-format';
import type { Candidate, DiscoveryReport } from './story-discovery';
import type { StoryTopic } from './story-pool';
import type { StoryConcept } from './story-konzepte';

/** Build comparable-period copy from the same values used by the chart. */
function yieldSummary(claim: Candidate): string {
  const peak=claim.evidence[0];
  const mean=claim.evidence.find(v=>v.label.startsWith('Mittel'));
  const delta=claim.evidence.find(v=>v.unit==='%');
  const peers=(claim.yieldSeries??[]).filter(v=>v.period.slice(5)===claim.period.slice(5));
  const others=peers.filter(v=>v.period!==claim.period).sort((a,b)=>b.value-a.value);
  const second=others[0];
  const month=formatStoryDate(claim.period).replace(/\d{4}/g,'').trim();
  if(!mean||!delta)return `${formatStoryDate(claim.period)} erreicht den höchsten Modellwert im Vergleichszeitraum. Für alle Jahre rechnen wir mit derselben Anlagengröße.`;
  const runner=second?` Auch ${formatStoryDate(second.period)} war stark: nur ${((1-second.value/peak.value)*100).toLocaleString('de-DE',{maximumFractionDigits:1})} % weniger.`:'';
  return `${formatStoryDate(claim.period)} brachte im Modell rund ${Math.round(delta.value)} % mehr Solarertrag als ${claim.period.length===7?`die anderen ${month}-Monate`:'dieselbe Kalenderperiode in den anderen Jahren'} im Durchschnitt.${runner} Das Referenzmodell zeigt, wie ertragreich das örtliche Wetter für Solarenergie war – unabhängig davon, wie viele Anlagen damals installiert waren.`;
}

/** The preview consumes the actual finding, never a separate hand-picked city set. */
export function conceptFromFinding(report: DiscoveryReport, topic: StoryTopic, observation = 0): StoryConcept {
  const radial=radialDataForCity(report.regionId);
  const annualEnergy=radial?.annual,monthlySolar=radial?.monthly;
  const rawClaim = topic.observations[observation] ?? topic.observations[0];
  const claim = {...rawClaim, comparison:readableComparison(rawClaim.comparison)};
  const values = claim.evidence.filter(e => Number.isFinite(e.value));
  const units = new Set(values.map(e => e.unit));
  const comparableFamilies = new Set(['Jahresveränderung','Jahreshöchstwert','Monatsspitze','Lokale Monatsspitze','Vorjahreszeitraum','Größenvergleich','Anlagengrößen','Speicher-Jahresveränderung','Tagesspitze','Wochenspitze']);
  const comparable = comparableFamilies.has(claim.family) && units.size === 1 && values.length > 1 && values.every(e => e.value >= 0);
  const figures = values.map(e => `${e.label}: ${formatStoryValue(e.value)} ${e.unit}`).join(' · ');
  const source = claim.provenance?.length ? claim.provenance.map(p=>`${p.label} · Stand ${p.date}`).join(' · ') : claim.family === 'Wohnstruktur' ? `Zensus · Stichtag ${claim.period}` : claim.family === 'Förderänderung' ? claim.reason : `Marktstammdatenregister · Stand ${report.sourceDate}`;
  const limitations = [...new Set(claim.limitations)];
  const yieldStory=claim.family==='Ertragsspitze als Modell';
  const shares=claim.family==='Anzahl und Leistung'&&values.length===2;
  const subject=claim.title.split(':')[0];
  const shareTitle=shares?`${values[0].value.toLocaleString('de-DE',{maximumFractionDigits:1})} % der Anlagen, ${Math.round(values[1].value)} % der Solarleistung`:null;
  const shareCopy=shares?`${subject} machen in ${report.name} ${values[0].value.toLocaleString('de-DE',{maximumFractionDigits:1})} % aller Solaranlagen aus. Ihr Anteil an der installierten Leistung liegt bei rund ${Math.round(values[1].value)} %. Verglichen werden die Anzahl der Anlagen und ihre Leistung – nicht die erzeugte Strommenge.`:null;
  const solarCoverage=report.coverage?.filter(row=>['gebaeude','steckersolar','freiflaeche','sonstige'].includes(row.topic));
  const segment=claim.eventKey.replace(/^structure-/, '');
  const selectedCoverage=solarCoverage?.find(row=>row.topic===segment);
  const totalCount=solarCoverage?.reduce((sum,row)=>sum+row.count,0)??0;
  // Counts must support the percentage claim; never infer absolute counts from rounded shares.
  const countComparison=shares&&selectedCoverage&&Number.isInteger(totalCount)&&totalCount>0&&Number.isInteger(selectedCoverage.count)&&selectedCoverage.count>=0&&selectedCoverage.count<=totalCount&&Math.abs(selectedCoverage.count/totalCount*100-values[0].value)<=0.051?{total:totalCount,selected:selectedCoverage.count,label:subject}:undefined;
  const periodCopy=claim.family==='Vorjahreszeitraum' && values.length===2
    ? `${claim.comparison}: In ${report.name} gingen laut aktuellem Register ${formatStoryValue(values[1].value)} ${subject} in Betrieb – ${formatStoryValue(Math.abs(values[1].value-values[0].value))} ${values[1].value>=values[0].value?'mehr':'weniger'} als im Vorjahreszeitraum (${formatStoryValue(values[0].value)}). Die Zahlen sind vorläufig: Nachmeldungen und Korrekturen können sie noch verändern. Der laufende Monat ist nicht enthalten.`
    : undefined;
  return {
    energyYear:claim.family==='Energie-Jahresprofil'&&String(annualEnergy?.year)===claim.period?annualEnergy:undefined,
    solarMonth:claim.family==='Solar-Monatsrecap'&&monthlySolar?.month===claim.period?monthlySolar:undefined,
    countComparison,
    rankSummary:claim.rankSummary,
    id: claim.id, label: claim.family, town: report.name,
    kind: ['Rang-Monatsupdate','Aktueller Rang','Aufsteiger','Absteiger','Rang gehalten','Rangänderung'].includes(claim.family)?'rank':['Solar-Monatsrecap','Energie-Jahresprofil'].includes(claim.family)?'radial':yieldStory ? 'yield' : claim.family==='Bestandsprofil' && units.size===1 && values.length>1 && values.every(e=>e.value>=0) ? 'donut' : comparable ? 'bars' : 'facts', title: shareTitle?`${subject}: ${shareTitle}`:claim.title,
    yieldSeries:claim.yieldSeries,
    teaser: claim.family==='Energie-Jahresprofil'?'Wie ergänzen sich Sonne und Wind übers Jahr? Gelb zeigt Solar, die helle äußere Schicht Wind. Die Wetterdaten von 2025 treffen hier auf einen festen Anlagenbestand Ende 2025. Der Windanteil ist eine vereinfachte Referenzrechnung, keine gemessene Erzeugung.':claim.family==='Solar-Monatsrecap'&&monthlySolar?`Rund ${(monthlySolar.totalMwh/1000).toLocaleString('de-DE',{maximumFractionDigits:1})} GWh Solarstrom im ${formatStoryDate(monthlySolar.month)}: So viel ergibt das Wettermodell für den registrierten PV-Bestand in ${report.name}. Am ${formatStoryDate(monthlySolar.peakDay)} war der Tagesertrag am höchsten. Als Größenvergleich entspricht die Monatssumme dem durchschnittlichen Monatsverbrauch von rund ${Math.round(monthlySolar.totalMwh*1000/(3500/12)/1000)*1000} Haushalten – angenommen sind 3.500 kWh pro Haushalt und Jahr, keine zeitgleiche Vollversorgung.`:periodCopy??shareCopy??(yieldStory?yieldSummary(claim):formatStoryDate(claim.comparison)), period: formatStoryDate(claim.period),
    evidence: `${claim.provenance?.length ? source : report.source}. ${claim.reason}`,
    sourceCaption: yieldStory?'Open-Meteo · ERA5':formatStoryDate(source), sourceDate: claim.provenance?.[0]?.date ?? (claim.family === 'Wohnstruktur' ? claim.period : report.sourceDate),
    sources: claim.provenance?.filter(p=>p.url).map(p=>({label:yieldStory?'Open-Meteo · ERA5':`${p.label} · Stand ${formatStoryDate(p.date)}`,url:p.url!})),
    values, unit: comparable ? values[0].unit : '',
    comparisonLabel: shareCopy??formatStoryDate(claim.comparison),
    marginalia:claim.family==='Solar-Monatsrecap'?limitations:yieldStory?['Wetterbasierter Referenzertrag je kWp · keine Berechnung des örtlichen Anlagenbestands',formatStoryDate(claim.comparison),...limitations]:undefined,
    copy: (yieldStory||claim.family==='Solar-Monatsrecap')?[]:[...(claim.details??[]).map(d=>({heading:d.label,text:d.text})),...(limitations.length && claim.family!=='Vorjahreszeitraum' ? [{heading:'Einordnung',text:limitations.join(' ')}] : [])],
    social: `${report.name}: ${claim.title}\n\n${figures}\n\n${claim.comparison}${limitations.length ? '\n\n'+limitations.join(' ') : ''}\n\n${source}`,
    widget: 'Der aktuelle Datenstand gehört zur Gemeindeseite; dieser Beitrag hält den ausgewählten Befund fest.',
    widgetCta: '',
    seo: 'Der belegte Ortsbezug und der benannte Vergleich bilden die Grundlage. Die redaktionelle Ausarbeitung erfolgt am gemeinsamen Storymuster.',
    beforeRelease: `${claim.provenance?.length ? source : `Datenlauf ${report.sourceDate}`}. ${claim.reason}`,
  };
}
