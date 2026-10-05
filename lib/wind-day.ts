import {modelWeatherAt,type IconD2Shard} from "./icon-d2";
/** Preserve gaps as unavailable, while allowing a genuinely calm full day. */
export function windDay(shard:IconD2Shard,postcode:string,[from,until]:[number,number]){
 const points:{time:string;value:number}[]=[];
 for(let at=from;at<until;at+=3600000){
  const value=modelWeatherAt(shard,postcode,new Date(at))?.windSpeed;
  if(value===null||value===undefined||!Number.isFinite(value))return null;
  points.push({time:new Date(at).toISOString(),value});
 }
 return points.length?points:null;
}
