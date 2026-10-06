
export type HeightWindPoint={time:string;u:number;v:number};
export function heightWindPoints(data:{hourly_units?:Record<string,string>;hourly?:Record<string,unknown[]>}):HeightWindPoint[]|null{
 const fields=['wind_speed_80m','wind_direction_80m','wind_speed_120m','wind_direction_120m'];
 if(fields.some(field=>data.hourly_units?.[field]!== (field.includes('speed')?'m/s':'°')))return null;
 const hours=data.hourly;if(!hours||!Array.isArray(hours.time)||fields.some(field=>hours[field]?.length!==hours.time.length))return null;
 const result:HeightWindPoint[]=[];
 for(let i=0;i<hours.time.length;i++){
  const values=fields.map(field=>hours[field][i]);
  if(values.some(value=>typeof value!=='number'||!Number.isFinite(value)))continue;
  const [lowSpeed,lowDirection,highSpeed,highDirection]=values as number[];
  if(lowSpeed<0||highSpeed<0||lowSpeed>100||highSpeed>100||lowDirection<0||highDirection<0||lowDirection>360||highDirection>360)continue;
  const time=String(hours.time[i])+'Z';if(!Number.isFinite(Date.parse(time)))return null;
  // Meteorological directions describe where the air comes FROM.
  const vector=(speed:number,direction:number)=>[-speed*Math.sin(direction*Math.PI/180),-speed*Math.cos(direction*Math.PI/180)];
  const low=vector(lowSpeed,lowDirection),high=vector(highSpeed,highDirection);
  result.push({time,u:(low[0]+high[0])/2,v:(low[1]+high[1])/2});
 }
 return result.length?result:null;
}
export function heightWindAt(points:HeightWindPoint[],at:number){
 const before=points.filter(p=>Date.parse(p.time)<=at).at(-1),after=points.find(p=>Date.parse(p.time)>=at);
 if(!before||!after)return null;
 const span=Date.parse(after.time)-Date.parse(before.time);
 if(span>3600000)return null;
 const f=span?(at-Date.parse(before.time))/span:0,u=before.u+(after.u-before.u)*f,v=before.v+(after.v-before.v)*f;
 return {speedMs:Math.hypot(u,v),directionDeg:(Math.atan2(-u,-v)*180/Math.PI+360)%360,validAt:new Date(at).toISOString()};
}
/** Retired preview fallback. Production and local releases use the stored model. */
export async function loadPreviewHeightWind(_postcode:string,_now=new Date(),_position?:{latitude:number;longitude:number}){return null;}
