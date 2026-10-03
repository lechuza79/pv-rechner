import {referenceWindFactor} from './wind-reference-model';
/** Weather drives an illustrative animation, never an observed operating state. */
export type WindConditions = { heightMetres?:10|100; speedMs:number; directionDeg:number; validAt:string; modelRun:string|null; postcode:string; source?:"open-meteo" };
export const WIND_MAX_AGE_MS=15*60*1000;
export function usableWind(wind:WindConditions|null,now=Date.now()):wind is WindConditions {
  if(!wind)return false;
  const age=now-Date.parse(wind.validAt),runAge=wind.modelRun===null?null:now-Date.parse(wind.modelRun);
  return Number.isFinite(wind.speedMs)&&wind.speedMs>=0&&wind.speedMs<=100&&Number.isFinite(wind.directionDeg)&&wind.directionDeg>=0&&wind.directionDeg<=360&&age>=-60000&&age<=WIND_MAX_AGE_MS&&(runAge===null?wind.source==="open-meteo":runAge>=-60000&&runAge<=12*3600000);
}
/** North is -Z, east +X; the rotor faces the direction the wind comes FROM. */
export function windYaw(directionDeg:number){return Math.PI-directionDeg*Math.PI/180;}
/** Schematic tip-speed mapping from available wind, not a manufacturer's RPM curve. */
export function rotorSpeed(speedMs:number,diameterM:number){
  if(!Number.isFinite(speedMs)||speedMs<0||!Number.isFinite(diameterM)||diameterM<=0)return 0;
  // The same reference operating envelope drives modeled power and animation.
  // Rotation is still schematic; no manufacturer RPM is claimed.
  if(referenceWindFactor(speedMs)===0)return 0;
  return Math.min(1.8,6*speedMs/(diameterM/2));
}
