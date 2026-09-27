import {SEGMENT_OWNER, type ChildYearRow} from '../atlas';
import type {KpiDefinition} from './model';
import {reihenMassstab} from '../gemeinde-einheiten';

/** Register snapshots reuse the KPI layout without inventing monthly history. */
export function regionalKpiGroups(cells:ChildYearRow[],stand:string,population:number|null) {
  const included=cells.filter(row=>SEGMENT_OWNER[row.segment]!=null);
  const solar=included.filter(row=>!row.segment.startsWith('batterie'));
  const batteries=included.filter(row=>row.segment.startsWith('batterie'));
  const sum=(rows:ChildYearRow[],field:'count'|'kwp'|'kwh')=>rows.reduce((total,row)=>total+row[field],0);
  const power=sum(solar,'kwp'),capacity=sum(batteries,'kwh');
  const powerScale=reihenMassstab(power,'kWp','MWp');
  const batteryScale=reihenMassstab(capacity,'kWh','MWh');
  const metric=(id:string,label:string,value:number,unit:string,digits=0):KpiDefinition=>({
    id,label,unit,digits,kind:'stock',current:{end:stand,value,basis:`register:${stand}`},history:[],
  });
  return [
    {title:'Solaranlagen',items:[
      metric('solar-count','Anlagen',sum(solar,'count'),'Stk.'),
      metric('solar-power','Installierte Leistung',power/powerScale.teiler,powerScale.unit,powerScale.digits),
      ...(population&&population>0?[metric('solar-per-resident','Leistung je Einwohner',power*1000/population,'Wp')]:[]),
      metric('solar-additions',`Neue Anlagen ${stand.slice(0,4)} bisher`,sum(solar.filter(row=>row.year===Number(stand.slice(0,4))),'count'),'Stk.'),
    ]},
    {title:'Batteriespeicher',items:[
      metric('battery-count','Speicher',sum(batteries,'count'),'Stk.'),
      metric('battery-capacity','Kapazität',capacity/batteryScale.teiler,batteryScale.unit,batteryScale.digits),
    ]},
  ];
}
