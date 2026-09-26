"use client";
import DistrictEnergyWidgets from './DistrictEnergyWidgets';
import type {DistrictEnergy} from '../../lib/district-energy';
import {KpiOverview} from "../dashboard/KpiOverview";
import {monitorKpiGroups} from "../../lib/dashboard/monitor-kpis";
import type {DistrictMonitorResult} from "../../lib/district-monitor";
import {useMemo} from 'react';
import {CurrentPower} from "../charts/CurrentPowerWidget";
import {AnnualGrowth} from "../charts/AnnualGrowthWidget";
import {MonitorCompositionChart} from "../charts/CompositionChart";
import {ShareDonut} from "../charts/ShareDonut";
import {ExportableWidgetFrame} from "../dashboard/ExportableWidgetFrame";
import {WIDGETS} from "../../lib/widget-registry";
import styles from "./landkreis.module.css";
import foundation from "../social/atlas-foundations.module.css";
import {SEGMENT_OWNER, type ChildYearRow} from "../../lib/atlas";
import {dashboardDate} from "../../lib/dashboard/format";
import {ortPhrase} from "../../lib/atlas-orte";

/**
 * Regional register totals, using the municipality monitor's existing widgets.
 * Districts pass their prepared package (`monitor`): monthly KPI history, live
 * power and energy widgets. Bundesland and Deutschland have no package yet and
 * show only the widgets computed from the register cells (growth, category
 * donut, composition); the package-based parts are not rendered at all.
 */
export default function LandkreisMonitor({cells,stand,monitor,population,populationStand,regionId,name}:{regionId:string;name:string;cells:ChildYearRow[];stand:string;monitor?:DistrictMonitorResult & {energy:DistrictEnergy|null};population:number|null;populationStand:string|null}) {
  const weatherSource=useMemo(()=>({load:async()=>{const response=await fetch(`/api/landkreis/solartag?ags=${encodeURIComponent(regionId)}`);if(!response.ok)throw new Error('District weather unavailable');return response.json();}}),[regionId]);
  const solar=cells.filter(row=>SEGMENT_OWNER[row.segment]!=null&&!row.segment.startsWith("batterie"));
  const years=[...new Set(solar.map(row=>row.year))].sort((a,b)=>a-b).map(year=>({year,count:solar.filter(row=>row.year===year).reduce((sum,row)=>sum+row.count,0)}));
  const groups=[
    {label:"Gebäudeanlagen",segments:["privat_dach","gewerbe_dach"]},
    {label:"Balkonkraftwerke",segments:["steckersolar"]},
    {label:"Freiflächenanlagen",segments:["freiflaeche"]},
  ].map(group=>({...group,value:solar.filter(row=>group.segments.includes(row.segment)).reduce((sum,row)=>sum+row.kwp,0),count:solar.filter(row=>group.segments.includes(row.segment)).reduce((sum,row)=>sum+row.count,0)}));
  const total=groups.reduce((sum,row)=>sum+row.count,0),power=groups.reduce((sum,row)=>sum+row.value,0);
  return <div className={`${foundation.foundation} ${styles.districtMonitor} municipal-data sc-dashboard`} data-story-scheme="dark">
    {!monitor?null:monitor.status==='ready'?<KpiOverview groups={monitorKpiGroups({history:monitor.history,population:population??0,registerStand:monitor.registerStand,populationStand})} help={<><p>Vollständige Summe aller Gemeinden im Landkreis bis zum {dashboardDate(monitor.history.observations[0].end)}. Registerstand: {dashboardDate(monitor.registerStand)}. Gezählt werden heute erfasste Anlagen nach Inbetriebnahmedatum; stillgelegte Anlagen fehlen, Nachmeldungen können frühere Werte verändern.</p>{populationStand&&<p>Die Leistung je Einwohner bezieht sich durchgehend auf die Einwohnerzahl vom {dashboardDate(populationStand)}.</p>}</>}/>:<p role="status">Für Bestand und Entwicklung liegt derzeit keine vollständige, einheitliche Monatshistorie aller Gemeinden vor.</p>}
    <div className="sc-widget-grid">
      {monitor&&<ExportableWidgetFrame widget={WIDGETS.regionalCurrentPower} place={name} stand={dashboardDate(stand)} filename={`solar-check-current-${regionId}`} data-story-scheme="dark" title="Solarleistung heute" kind="radial" help={<p>Aus dem DWD-Wettermodell für die einzelnen Gemeinden simuliert und mit ihrer installierten Solarleistung gewichtet. Nur eine vollständige Kurve aller Gemeinden wird angezeigt. Keine gemessene Einspeisung.</p>}><CurrentPower installedKwp={power} weatherSource={weatherSource} frameless/></ExportableWidgetFrame>}
      <AnnualGrowth years={years} stand={stand} name={name} regionId={regionId}/>
      {monitor&&<DistrictEnergyWidgets data={monitor.energy} name={name} regionId={regionId}/>}
      <ExportableWidgetFrame widget={WIDGETS.regionalComposition} place={name} stand={dashboardDate(stand)} filename={`solar-check-categories-${regionId}`} data-story-scheme="dark" title="Installierte Solarleistung nach Anlagentyp" kind="donut" help={<p>Summe der heute {monitor?"im Landkreis":ortPhrase({name})} erfassten Solaranlagen. Batteriespeicher zählen nicht zur Solarleistung. Registerstand: {dashboardDate(stand)}.</p>}><ShareDonut values={groups}/></ExportableWidgetFrame>
      {groups.map(group=><ExportableWidgetFrame key={group.label} title={group.label} kind="composition" data-story-scheme="dark" widget={WIDGETS.gemeindeAnlagenraster} place={name} stand={dashboardDate(stand)} filename={`solar-check-anlagenraster-${regionId}`}><div className="monitor-widget-body"><MonitorCompositionChart story={{countComparison:{total,selected:group.count,label:group.label},values:[{label:group.label,value:group.count},{label:"Anteil an der Solarleistung",value:power?group.value/power*100:0}]}}/></div></ExportableWidgetFrame>)}
    </div>
  </div>;
}
