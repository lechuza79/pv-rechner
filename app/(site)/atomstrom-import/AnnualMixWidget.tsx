"use client";
import {ShareDonut} from '../../../components/charts/ShareDonut';
import {ExportableWidgetFrame} from '../../../components/dashboard/ExportableWidgetFrame';
import {WIDGETS} from '../../../lib/widget-registry';
import type {StrommixYtd} from '../../../lib/strommix-ytd';
export default function AnnualMixWidget({data}:{data:StrommixYtd}) {
 return <ExportableWidgetFrame place="Deutschland" widget={WIDGETS.strommixAnteil} title={`Deutscher Strommix ${data.year}`} kind="donut" stand={String(data.year)} filename={`strommix-${data.year}`} help="Deutsche Stromerzeugung plus rechnerischer Atomstrom-Import im Kalenderjahr. Andere Importe sind nicht enthalten. Für alle Anteile werden dieselben auswertbaren Zeitintervalle verwendet.">
 <ShareDonut overview palette="accent-monochrome" legendColumns={4} totalCenter={{value:(data.totalGwh / 1000).toLocaleString("de-DE",{maximumFractionDigits:1}),unit:"TWh",label:"Erzeugung + Atomstrom-Import"}} label={`Strommix ${data.year}`} values={data.segments.map(s=>({label:s.label,value:s.share,visual:`/illustrations/energy/mix-${s.key==='renewable'?'renewables':s.key==='nuclear'?'nuclear':s.key}.webp`}))} formatValue={value=>({value:value.toLocaleString('de-DE',{maximumFractionDigits:1}),unit:'%'})}/>
 </ExportableWidgetFrame>;
}
