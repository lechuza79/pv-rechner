'use client';
import {useState} from 'react';
import type {DistrictEnergy} from '../../lib/district-energy';
import {WidgetFrame} from '../dashboard/WidgetFrame';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {WIDGETS} from '../../lib/widget-registry';
import {formatStoryDate} from '../../lib/story-format';
import {WidgetSetting} from '../dashboard/WidgetSetting';
import {MonitorMonthlySolarChart} from '../gemeinde/MonitorMonthlySolarChart';
import {MonitorAnnualEnergyChart} from '../gemeinde/MonitorAnnualEnergyChart';
import {ApprovedStoryVisual} from '../social/ApprovedStoryVisual';
import chart from '../social/StoryConceptLab.module.css';
import {dashboardDate} from '../../lib/dashboard/format';

function ValueWidget({data,feedIn=false}:{data:DistrictEnergy;feedIn?:boolean}) {
 const rows=data.monthly.filter(row=>row.value);
 const [month,setMonth]=useState(rows[0]?.month);
 const selected=rows.find(row=>row.month===month)??rows[0];
 if(!selected?.value)return null;
 const title=feedIn?'Einspeisevergütung':'Wert des Solarstroms';
 return <WidgetFrame title={title} kind="number" className={chart.visualTheme} data-story-scheme="dark" settingsPlacement="below-title" settings={<WidgetSetting label="Monat der Berechnung" hideLabel stepper value={selected.month} onChange={setMonth} options={rows.map(row=>({value:row.month,label:new Date(row.month+'-15T12:00:00').toLocaleDateString('de-DE',{month:'long',year:'numeric'})}))}/>} help={<><p>Summe aller Gemeinden für vollständig berechenbare Monate. Wetter und Inbetriebnahmen des gewählten Monats, bewertet mit den gespeicherten Preis- und örtlichen Eigenverbrauchsannahmen{data.valuationAssumptionDate?` vom ${dashboardDate(data.valuationAssumptionDate)}`:''}. Modellwerte, keine tatsächlichen Einnahmen.</p><p>Bei {selected.value.approximateTariffCount.toLocaleString('de-DE')} Anlagen ist die Vergütung angenähert; bei {selected.value.unknownModeCount.toLocaleString('de-DE')} ist die Betriebsart unbekannt. Gewerblicher Eigenverbrauch ist bei {selected.value.commercialSelfUseUnknownCount.toLocaleString('de-DE')} Anlagen nicht bestimmbar.</p></>}>
  <div className="monitor-widget-body"><ApprovedStoryVisual bild={{art:'kennzahl',stil:'hell',aussage:title,gemessen:'Modellrechnung',quelle:'Summe der Gemeindeberechnungen',serien:[{label:feedIn?'Einspeisevergütung':'Stromwert',wert:feedIn?selected.value.feedInEuro:selected.value.euro,einheit:'€'}]}}/></div>
 </WidgetFrame>;
}
export default function DistrictEnergyWidgets({data,name,regionId}:{data:DistrictEnergy|null;name:string;regionId:string}) {
 if(!data)return <p role="status">Die Erzeugungsdaten aller Gemeinden sind derzeit nicht vollständig verfügbar.</p>;
 const help=<p>Summe aller Gemeinden. Die Auswahl enthält nur vollständige gemeinsame Wetterzeiträume. Modellierte Erzeugung, keine Messung. Jahresprofile verwenden den zum Jahresende rekonstruierten heutigen Anlagenbestand; stillgelegte Anlagen fehlen.</p>;
 return <>
  {data.monthly.length>0?<WidgetFrame title="Solarerzeugung im Tagesverlauf" kind="radial" className={chart.visualTheme} data-story-scheme="dark" help={help}><div className="monitor-widget-body"><MonitorMonthlySolarChart data={data.monthly[0].solar} datasets={data.monthly.map(row=>row.solar)}/></div></WidgetFrame>:<p role="status">Für die Solarerzeugung liegt noch kein vollständiger gemeinsamer Monat vor.</p>}
  {data.annual.length>0?<ExportableWidgetFrame title={data.annual.some(y=>y.windKw>0)?'Solar- und Windpotenzial im Jahresverlauf':'Solarpotenzial im Jahresverlauf'} kind="radial" className={chart.visualTheme} data-story-scheme="dark" help={help} widget={WIDGETS.gemeindeEnergieJahr} place={name} stand={formatStoryDate(data.annual[0].sourceDate)} filename={`solar-check-energy-year-${regionId}`}><div className="monitor-widget-body"><MonitorAnnualEnergyChart data={data.annual[0]} datasets={data.annual}/></div></ExportableWidgetFrame>:<p role="status">Für das Jahresprofil liegt noch kein vollständiges gemeinsames Wetterjahr vor.</p>}
  <ValueWidget data={data}/><ValueWidget data={data} feedIn/>
  {!data.monthly.some(row=>row.value)&&<p role="status">Stromwert und Einspeisevergütung sind noch nicht für alle Gemeinden auf gemeinsamer Grundlage berechenbar.</p>}
 </>;
}
