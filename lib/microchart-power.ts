import {referenceWindFactor} from './wind-reference-model';

export type PowerPoint = {time:string;value:number};
const capacityValid=(kw:number|null):kw is number=>kw!==null&&Number.isFinite(kw)&&kw>=0;
/** Return kW, preserving unavailable capacity and weather as missing data. */
export function solarPowerProfile(points:PowerPoint[]|null,capacityKw:number|null):PowerPoint[]|null{
 if(!points?.length||!capacityValid(capacityKw)||points.some(p=>!Number.isFinite(p.value)||p.value<0||p.value>100))return null;
 return points.map(p=>({time:p.time,value:p.value/100*capacityKw}));
}
/** The existing reference curve requires 100 m wind, never surface wind. */
export function windPowerProfile(points:PowerPoint[]|null,capacityKw:number|null,heightMetres:number):PowerPoint[]|null{
 if(heightMetres!==100||!points?.length||!capacityValid(capacityKw)||points.some(p=>!Number.isFinite(p.value)||p.value<0))return null;
 return points.map(p=>({time:p.time,value:referenceWindFactor(p.value)*capacityKw}));
}
export function powerDisplay(kw:number|null|undefined){
 return kw==null||!Number.isFinite(kw)?{value:null,unit:'kW'}:kw>=1000?{value:kw/1000,unit:'MW'}:{value:kw,unit:'kW'};
}
