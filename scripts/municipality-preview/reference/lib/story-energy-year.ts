import {calcCurrentPower} from './simulation';
export type EnergyYear={town:string;year:number;solarKwp:number;windKw:number;sourceDate:string;retrievedAt:string;days:{date:string;solarMwh:number;windMwh:number}[];sourceUrl:string};
export type YearWeather={hourly:{time:string[];temperature_2m:(number|null)[];shortwave_radiation:(number|null)[];wind_speed_100m:(number|null)[]}};
/** Illustrative reference curve, not a calibrated municipal turbine model. */
export function referenceWindFactor(speed:number){
 if(!Number.isFinite(speed)||speed<0)throw Error('Invalid wind speed');
 if(speed<3||speed>=25)return 0;
 if(speed>=12)return 1;
 return (speed**3-3**3)/(12**3-3**3);
}
/** UTC days keep all hourly energy intervals across both DST transitions. */
export function energyYear(weather:YearWeather,config:Omit<EnergyYear,'days'>):EnergyYear{
 if(![config.solarKwp,config.windKw].every(v=>Number.isFinite(v)&&v>=0))throw Error('Invalid capacity');
 const start=Date.UTC(config.year,0,1),end=Date.UTC(config.year+1,0,1),hours=(end-start)/3600000;
 const h=weather.hourly;
 if([h.time,h.temperature_2m,h.shortwave_radiation,h.wind_speed_100m].some(a=>a.length!==hours))throw Error('Incomplete year');
 const days:EnergyYear['days']=[];
 for(let i=0;i<hours;i++){
  if(Date.parse(h.time[i]+'Z')!==start+i*3600000)throw Error('Missing or duplicate hour');
  const t=h.temperature_2m[i],g=h.shortwave_radiation[i],w=h.wind_speed_100m[i];
  if(t===null||g===null||w===null||![t,g,w].every(Number.isFinite)||g<0)throw Error('Invalid weather value');
  const day=Math.floor(i/24);
  if(!days[day])days[day]={date:h.time[i].slice(0,10),solarMwh:0,windMwh:0};
  days[day].solarMwh+=calcCurrentPower(config.solarKwp,g,t)/1e6;
  days[day].windMwh+=config.windKw*referenceWindFactor(w)/1000;
 }
 return {...config,days};
}
