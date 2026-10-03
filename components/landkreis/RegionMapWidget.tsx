"use client";
import type {ComponentProps} from 'react';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {WIDGETS} from '../../lib/widget-registry';
import {DataSourceNote} from '../PoweredBy';
import {DATA_SOURCES} from '../../lib/data-sources';
import {dashboardDate} from '../../lib/dashboard/format';
import RegionKarte from './RegionKarte';
import styles from './landkreis.module.css';
import foundation from '../social/atlas-foundations.module.css';
import '../dashboard/dashboard.css';

/** The regional hero renderer in a reusable, container-sized widget. */
export default function RegionMapWidget({name,stand,selectedPlace,showSource=true,regionId,...map}:Pick<ComponentProps<typeof RegionKarte>,'shapes'|'metrics'> & {name:string;stand:string;regionId:string;selectedPlace?:string;showSource?:boolean}) {
  const params={ags:regionId,...(selectedPlace?{selected:selectedPlace}:{})};
  return <ExportableWidgetFrame widget={WIDGETS.regionalMap} place={name} stand={stand} filename={`regional-map-${regionId}`} shareParams={params} einbetten={{params,height:520}} title={`Energie im regionalen Vergleich · ${name}`} kind="time-series" className={`sc-dashboard ${foundation.foundation} ${styles.mapWidget}`} data-story-scheme="dark"
    help="Vergleichen Sie Solarleistung, Anlagenzahl und Speicherkapazität. Die Säulen werden für jede Kennzahl gemeinsam skaliert. Fehlende Werte bleiben ohne Säule."
    >
    <RegionKarte {...map} presentation="widget" selectedPlace={selectedPlace}/>
    {showSource&&<div className={styles.mapWidgetSource}><p>Stand: {dashboardDate(stand)}</p><DataSourceNote source={[DATA_SOURCES.mastr,DATA_SOURCES.bkg]}/></div>}
  </ExportableWidgetFrame>;
}
