'use client';
import {useMemo} from 'react';
import type {GemeindePaket} from '../../lib/gemeinde-paket';
import {regionalSolarWeatherSource} from '../../lib/dashboard/regional-solar-weather';
import {monitorKpiGroups} from '../../lib/dashboard/monitor-kpis';
import {CurrentPower} from '../charts/CurrentPowerWidget';
import {RegionalMonthlySolarWidget} from '../landkreis/RegionalMonthlySolarWidget';
import {KpiOverview} from '../dashboard/KpiOverview';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {WIDGETS} from '../../lib/widget-registry';
import '../dashboard/dashboard.css';

/** Small embed adapter: reuse the monitor's renderers without loading the whole monitor. */
export default function RegionalSingleWidget({kind,data}:{kind:'power'|'month'|'stats';data:Pick<GemeindePaket,'ags'|'name'|'registerStand'|'monitorPeriods'|'monitorHistory'|'einwohnerStand'> & {register:Pick<NonNullable<GemeindePaket['register']>,'own'|'chartMix'>|null}}) {
 const weather=useMemo(()=>regionalSolarWeatherSource(data.ags),[data.ags]);
 const months=data.monitorPeriods?.monthly??[];
 if(kind==='stats'){
  if(!data.monitorHistory?.observations.length)return <p role="status">Für den Bestandsvergleich fehlen noch Daten.</p>;
  const groups=monitorKpiGroups({history:data.monitorHistory,population:data.register?.own.population??0,registerStand:data.registerStand,populationStand:data.einwohnerStand});
  return <KpiOverview groups={groups} stichtag={data.registerStand}/>;
 }
 if(kind==='month'){
  if(!months.length)return <p role="status">Für den Monatsverlauf fehlen noch vollständige Wetterdaten.</p>;
  return <RegionalMonthlySolarWidget data={{monthly:months}} name={data.name} regionId={data.ags}/>;
 }
 const mix=data.register?.chartMix as {values?:{value:number}[]}|undefined;
 const installedKwp=mix?.values?.reduce((sum,row)=>sum+row.value,0)??0;
 return <ExportableWidgetFrame widget={WIDGETS.regionalCurrentPower} title="Solarleistung heute" kind="radial" place={data.name} stand={data.registerStand} exportUnit="MW" filename={`solar-check-current-${data.ags}`} help={<p>Aus dem Wetter am Standort und der installierten Solarleistung simuliert. Keine gemessene Einspeisung.</p>}>
  <CurrentPower installedKwp={installedKwp} weatherSource={weather} frameless/>
 </ExportableWidgetFrame>;
}
