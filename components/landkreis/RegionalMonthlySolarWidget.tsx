'use client';
import {useState} from 'react';
import type {DistrictEnergy} from '../../lib/district-energy';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {WIDGETS} from '../../lib/widget-registry';
import {formatStoryDate} from '../../lib/story-format';
import {MonitorMonthlySolarChart} from '../gemeinde/MonitorMonthlySolarChart';
import chart from '../social/StoryConceptLab.module.css';
import {ortPhrase} from '../../lib/atlas-orte';
export function RegionalMonthlySolarWidget({data,name,regionId,videoSupported=true}:{data:Pick<DistrictEnergy,"monthly">;name:string;regionId:string;videoSupported?:boolean}) {
 const [month,setMonth]=useState(data.monthly[0].solar.month);
 return <ExportableWidgetFrame data-monthly-profile animated videoParams={videoSupported?{widget:"gemeinde-solar-monat",ags:regionId,period:month}:undefined} videoPeriod={formatStoryDate(month)} title={`Solarerzeugung im Tagesverlauf ${ortPhrase({name})}`} exportNote={null} helpExportNote={false} kind="radial" className={chart.visualTheme} data-story-scheme="dark" help={<p>Modellierte Erzeugung aus Wetter und Anlagenbestand, keine Messung.</p>} widget={WIDGETS.gemeindeSolarMonat} place={name} stand={formatStoryDate((data.monthly.find(row=>row.month===month)??data.monthly[0]).solar.sourceDate)} filename={`solar-check-radial-${regionId}`}><div className="monitor-widget-body"><MonitorMonthlySolarChart data={data.monthly[0].solar} datasets={data.monthly.map(row=>row.solar)} onPeriodChange={setMonth}/></div></ExportableWidgetFrame>;
}
