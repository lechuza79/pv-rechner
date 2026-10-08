"use client";
import {districtEnergyWidgets} from './DistrictEnergyWidgets';
import type {DistrictEnergy} from '../../lib/district-energy';
import {KpiOverview} from "../dashboard/KpiOverview";
import {regionalKpiGroups} from "../../lib/dashboard/regional-kpis";
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
import {EnergyMonitor} from "../dashboard/EnergyMonitor";
import {SEGMENT_OWNER, type ChildYearRow} from "../../lib/atlas";
import {dashboardDate} from "../../lib/dashboard/format";
import {regionalSolarWeatherSource} from "../../lib/dashboard/regional-solar-weather";
import {ortPhrase} from "../../lib/atlas-orte";

/**
 * Regional register totals, using the municipality monitor's existing widgets.
 * All regional levels pass a prepared package for monthly KPI history and
 * energy widgets. Live power uses the prepared daily curve for the selected regional level. Missing
 * packages retain register snapshots, never fabricated monthly history.
 */
export default function LandkreisMonitor({cells,stand,monitor,population,populationStand,regionId,name,livePower=true,weatherEndpoint,videoSupported=true}:{regionId:string;name:string;livePower?:boolean;weatherEndpoint?:string;videoSupported?:boolean;cells:ChildYearRow[];stand:string;monitor?:DistrictMonitorResult & {energy:DistrictEnergy|null};population:number|null;populationStand:string|null}) {
  const weatherSource=useMemo(()=>regionalSolarWeatherSource(regionId,weatherEndpoint),[regionId,weatherEndpoint]);
  const solar=cells.filter(row=>SEGMENT_OWNER[row.segment]!=null&&!row.segment.startsWith("batterie"));
  const years=[...new Set(solar.map(row=>row.year))].sort((a,b)=>a-b).map(year=>({year,count:solar.filter(row=>row.year===year).reduce((sum,row)=>sum+row.count,0)}));
  const groups=[
    {label:"Gebäudeanlagen",segments:["privat_dach","gewerbe_dach"]},
    {label:"Balkonkraftwerke",segments:["steckersolar"]},
    {label:"Freiflächenanlagen",segments:["freiflaeche"]},
  ].map(group=>({...group,value:solar.filter(row=>group.segments.includes(row.segment)).reduce((sum,row)=>sum+row.kwp,0),count:solar.filter(row=>group.segments.includes(row.segment)).reduce((sum,row)=>sum+row.count,0)}));
  const total=groups.reduce((sum,row)=>sum+row.count,0),power=groups.reduce((sum,row)=>sum+row.value,0);
  return <EnergyMonitor
    className={styles.districtMonitor}
    kpis={(!monitor||monitor.status!=='ready')?<KpiOverview snapshot stichtag={stand} groups={regionalKpiGroups(cells,stand,population)} help={<p>Bestand im Marktstammdatenregister am {dashboardDate(stand)}. Eine vollständige Monatsreihe ist derzeit nicht verfügbar.</p>}/>:<KpiOverview stichtag={monitor.history.observations[0].end} groups={monitorKpiGroups({history:monitor.history,population:population??0,registerStand:monitor.registerStand,populationStand})} help={<><p>Vollständige Summe aller Teilgebiete bis zum {dashboardDate(monitor.history.observations[0].end)}. Registerstand: {dashboardDate(monitor.registerStand)}. Gezählt werden heute erfasste Anlagen nach Inbetriebnahmedatum; stillgelegte Anlagen fehlen, Nachmeldungen können frühere Werte verändern.</p>{populationStand&&<p>Die Leistung je Einwohner bezieht sich durchgehend auf die Einwohnerzahl vom {dashboardDate(populationStand)}.</p>}</>}/> }
    currentPower={livePower&&<ExportableWidgetFrame widget={WIDGETS.regionalCurrentPower} place={name} stand={dashboardDate(stand)} filename={`solar-check-current-${regionId}`} data-story-scheme="dark" title="Solarleistung heute" kind="radial" help={<p>Aus dem DWD-Wettermodell für die einzelnen Gemeinden simuliert und mit ihrer installierten Solarleistung gewichtet. Nur eine vollständige Kurve aller Gemeinden wird angezeigt. Keine gemessene Einspeisung.</p>}><CurrentPower installedKwp={power} weatherSource={weatherSource} frameless/></ExportableWidgetFrame>}
    growth={<AnnualGrowth years={years} stand={stand} name={name} regionId={regionId}/>}
    stock={<>      <ExportableWidgetFrame widget={WIDGETS.regionalComposition} place={name} stand={dashboardDate(stand)} filename={`solar-check-categories-${regionId}`} data-story-scheme="dark" title="Installierte Solarleistung nach Anlagentyp" kind="donut" help={<p>Summe der heute {ortPhrase({name})} erfassten Solaranlagen. Batteriespeicher zählen nicht zur Solarleistung. Registerstand: {dashboardDate(stand)}.</p>}><ShareDonut values={groups}/></ExportableWidgetFrame>
      {groups.map(group=><ExportableWidgetFrame key={group.label} title={group.label} kind="composition" data-story-scheme="dark" widget={WIDGETS.gemeindeAnlagenraster} place={name} stand={dashboardDate(stand)} filename={`solar-check-anlagenraster-${regionId}`}><div className="monitor-widget-body"><MonitorCompositionChart story={{countComparison:{total,selected:group.count,label:group.label},values:[{label:group.label,value:group.count},{label:"Anteil an der Solarleistung",value:power?group.value/power*100:0}]}}/></div></ExportableWidgetFrame>)}</>}
    {...(monitor?.status==='ready' ? districtEnergyWidgets({data:monitor.energy,name,regionId,videoSupported}) : {})}
  />;
}
