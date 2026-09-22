import type {KpiDefinition} from '../../lib/dashboard/model';
import data from './monitor-history.json';

type Row = typeof data.observations[number];
const current=data.observations[0];
const metric=(id:string,label:string,value:(row:Row)=>number,unit?:string,digits=0,kind:KpiDefinition['kind']='stock'):KpiDefinition=>{
 const basis=`${data.method}:${data.sourceDate}:${id}:population-${data.populationDate}`;
 const observation=(row:Row)=>({end:row.end,value:value(row),basis,...(kind==='period-total'?{start:row.end.slice(0,4)+'-01-01'}:{})});
 return {id,label,unit,digits,kind,cadence:'month-end',current:observation(current),history:data.observations.slice(1).map(observation)};
};
export const monitorKpiDate=current.end;
export const monitorKpiGroups=[
 {title:'Solaranlagen',items:[metric('solar-count','Anlagen',r=>r.solarCount,'Stk.',0),metric('solar-power','Installierte Leistung',r=>r.solarKwp/1000,'MWp',1),metric('solar-per-resident','Leistung je Einwohner',r=>r.solarKwp*1000/data.population,'Wp'),metric('solar-additions','Neue Anlagen dieses Jahr',r=>r.solarAdditions,'Stk.',0,'period-total')]},
 {title:'Batteriespeicher',items:[metric('battery-count','Speicher',r=>r.batteryCount,'Stk.',0),metric('battery-capacity','Kapazität',r=>r.batteryKwh/1000,'MWh',1)]},
];
