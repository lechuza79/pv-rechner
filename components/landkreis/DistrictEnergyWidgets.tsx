'use client';
import type {MonitorEnergyWidgets} from '../dashboard/EnergyMonitor';
import {useState} from 'react';
import type {DistrictEnergy} from '../../lib/district-energy';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {WIDGETS} from '../../lib/widget-registry';
import {formatStoryDate} from '../../lib/story-format';
import {WidgetSetting} from '../dashboard/WidgetSetting';
import {MonitorMonthlySolarChart} from '../gemeinde/MonitorMonthlySolarChart';
import {MonitorAnnualEnergyChart} from '../gemeinde/MonitorAnnualEnergyChart';
import {ApprovedStoryVisual} from '../social/ApprovedStoryVisual';
import chart from '../social/StoryConceptLab.module.css';
import {ortPhrase} from '../../lib/atlas-orte';
import {dashboardDate} from '../../lib/dashboard/format';

/** Months without a value in every part are left out, not summed short. The
 *  value widgets' help says so, because the selector alone does not show what
 *  is missing — a page-wide notice read as if the shown month were affected. */
export function valueCoverageNote(data:DistrictEnergy):string|null {
 const valued=data.monthly.filter(row=>row.value).length;
 if(!valued||valued===data.monthly.length)return null;
 return `Auswählbar sind ${valued} von ${data.monthly.length} Monaten mit Wetterdaten. Für die übrigen fehlt in mindestens einem Teilgebiet der Wert; ohne dieses Teilgebiet wäre die Summe zu niedrig.`;
}
function ValueWidget({data,name,regionId,feedIn=false}:{data:DistrictEnergy;name:string;regionId:string;feedIn?:boolean}) {
 const rows=data.monthly.filter(row=>row.value);
 const [month,setMonth]=useState(rows[0]?.month);
 const selected=rows.find(row=>row.month===month)??rows[0];
 if(!selected?.value)return null;
 const title=feedIn?'Einspeisevergütung':'Wert des Solarstroms';
 const coverage=valueCoverageNote(data);
 return <ExportableWidgetFrame widget={feedIn?WIDGETS.regionalFeedInValue:WIDGETS.regionalElectricityValue} place={name} stand={formatStoryDate(selected.solar.sourceDate)} filename={`solar-check-${feedIn?"feed-in":"electricity-value"}-${regionId}`} stateLabel={new Date(selected.month+"-15T12:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"})} title={title} kind="number" className={chart.visualTheme} data-story-scheme="dark" settingsPlacement="below-title" settings={<WidgetSetting label="Monat der Berechnung" hideLabel stepper value={selected.month} onChange={setMonth} options={rows.map(row=>({value:row.month,label:new Date(row.month+'-15T12:00:00').toLocaleDateString('de-DE',{month:'long',year:'numeric'})}))}/>} help={<><p>Summe aller Teilgebiete für vollständig berechenbare Monate. Wetter und Inbetriebnahmen des gewählten Monats, bewertet mit den gespeicherten Preis- und örtlichen Eigenverbrauchsannahmen{data.valuationAssumptionDate?` vom ${dashboardDate(data.valuationAssumptionDate)}`:''}. Modellwerte, keine tatsächlichen Einnahmen.</p>{" "}{coverage&&<><p>{coverage}</p>{" "}</>}<p>Bei {selected.value.approximateTariffCount.toLocaleString('de-DE')} Anlagen ist die Vergütung angenähert; bei {selected.value.unknownModeCount.toLocaleString('de-DE')} ist die Betriebsart unbekannt. Gewerblicher Eigenverbrauch ist bei {selected.value.commercialSelfUseUnknownCount.toLocaleString('de-DE')} Anlagen nicht bestimmbar.</p></>}>
  <div className="monitor-widget-body"><ApprovedStoryVisual bild={{art:'kennzahl',stil:'hell',aussage:title,gemessen:'Modellrechnung',quelle:'Summe der Gemeindeberechnungen',serien:[{label:feedIn?'Einspeisevergütung':'Stromwert',wert:feedIn?selected.value.feedInEuro:selected.value.euro,einheit:'€'}]}}/></div>
 </ExportableWidgetFrame>;
}
export function RegionalMonthlySolarWidget({data,name,regionId}:{data:DistrictEnergy;name:string;regionId:string}) {
 const [month,setMonth]=useState(data.monthly[0].solar.month);
 return <ExportableWidgetFrame animated videoParams={{widget:"gemeinde-solar-monat",ags:regionId,period:month}} videoPeriod={formatStoryDate(month)} title={`Solarerzeugung im Tagesverlauf ${ortPhrase({name})}`} exportNote={null} helpExportNote={false} kind="radial" className={chart.visualTheme} data-story-scheme="dark" help={<p>Modellierte Erzeugung aller Teilgebiete, keine Messung.</p>} widget={WIDGETS.gemeindeSolarMonat} place={name} stand={formatStoryDate(data.monthly[0].solar.sourceDate)} filename={`solar-check-radial-${regionId}`}><div className="monitor-widget-body"><MonitorMonthlySolarChart data={data.monthly[0].solar} datasets={data.monthly.map(row=>row.solar)} onPeriodChange={setMonth}/></div></ExportableWidgetFrame>;
}
export function districtEnergyWidgets({data,name,regionId}:{data:DistrictEnergy|null;name:string;regionId:string}): {energy?: MonitorEnergyWidgets; energyNotice?: React.ReactNode} {
 if(!data)return {energyNotice:<p role="status">Die Erzeugungsdaten aller Teilgebiete sind derzeit nicht vollständig verfügbar.</p>};
 const help=<p>Summe aller Teilgebiete. Die Auswahl enthält nur vollständige gemeinsame Wetterzeiträume. Modellierte Erzeugung, keine Messung. Jahresprofile verwenden den zum Jahresende rekonstruierten heutigen Anlagenbestand; stillgelegte Anlagen fehlen.</p>;
 return {energy: {
   "electricity-value": <ValueWidget data={data} name={name} regionId={regionId}/>,
   "feed-in-value": <ValueWidget data={data} name={name} regionId={regionId} feedIn/>,
   radial: data.monthly.length>0?<RegionalMonthlySolarWidget data={data} name={name} regionId={regionId}/>:<p role="status">Für die Solarerzeugung liegt noch kein vollständiger gemeinsamer Monat vor.</p>,
   "energy-year": data.annual.length>0?<ExportableWidgetFrame title={data.annual.some(y=>y.windKw>0)?'Solar- und Windpotenzial im Jahresverlauf':'Solarpotenzial im Jahresverlauf'} kind="radial" className={chart.visualTheme} data-story-scheme="dark" help={help} widget={WIDGETS.gemeindeEnergieJahr} place={name} stand={formatStoryDate(data.annual[0].sourceDate)} filename={`solar-check-energy-year-${regionId}`}><div className="monitor-widget-body"><MonitorAnnualEnergyChart data={data.annual[0]} datasets={data.annual}/></div></ExportableWidgetFrame>:<p role="status">Für das Jahresprofil liegt noch kein vollständiges gemeinsames Wetterjahr vor.</p>,
 }, energyNotice: <>
  {!data.monthly.some(row=>row.value)&&<p role="status">Stromwert und Einspeisevergütung sind noch nicht für alle Teilgebiete auf gemeinsamer Grundlage berechenbar.</p>}
 </>};
}
