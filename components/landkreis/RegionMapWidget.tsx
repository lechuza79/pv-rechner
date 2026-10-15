"use client";
import {useCallback, useState, type ComponentProps} from 'react';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {DataSourceNote} from '../PoweredBy';
import {dashboardDate} from '../../lib/dashboard/format';
import {WIDGETS} from '../../lib/widget-registry';
import RegionKarte from './RegionKarte';
import styles from './landkreis.module.css';
import foundation from '../social/atlas-foundations.module.css';
import '../dashboard/dashboard.css';

/** The regional hero renderer in a reusable, container-sized widget. */
export default function RegionMapWidget({name,stand,selectedPlace,showSource=false,regionId,...map}:Pick<ComponentProps<typeof RegionKarte>,'shapes'|'metrics'> & {name:string;stand:string;regionId:string;selectedPlace?:string;showSource?:boolean}) {
  const [metricLabel,setMetricLabel]=useState(map.metrics[0]?.label);
  const [metricUnit,setMetricUnit]=useState(map.metrics[0]?.values.find(value=>value.value!==null)?.formatted.unit);
  const updateMetric=useCallback((label:string,unit:string)=>{setMetricLabel(label);setMetricUnit(unit);},[]);
  const params={ags:regionId,...(selectedPlace?{selected:selectedPlace}:{})};
  return <ExportableWidgetFrame widget={WIDGETS.regionalMap} sourceVisible={showSource} exportDescription={metricLabel} exportUnit={metricUnit} place={name} stand={stand} filename={`regional-map-${regionId}`} shareParams={params} einbetten={{params,height:520}} title={`Energie im regionalen Vergleich · ${name}`} kind="time-series" className={`sc-dashboard ${foundation.foundation} ${styles.mapWidget}`} data-story-scheme="dark"
    help={<><p>Vergleichen Sie Solarleistung, Anlagenzahl und Speicherkapazität. Die Säulen werden für jede Kennzahl gemeinsam skaliert. Fehlende Werte bleiben ohne Säule.</p><p>Stand: {dashboardDate(stand)}</p><DataSourceNote source={WIDGETS.regionalMap.sources}/></>}
    >
    <RegionKarte {...map} onMetricChange={updateMetric} presentation="widget" selectedPlace={selectedPlace}/>
  </ExportableWidgetFrame>;
}
