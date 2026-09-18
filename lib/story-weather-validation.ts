/** Validate an entire provider response before caching it for future preparation runs. */
export function validateStoryWeather(weather:{hourly?:Record<string,unknown[]>;hourly_units?:Record<string,string>},start:string,end:string,wind:boolean){
 const h=weather.hourly,begin=Date.parse(start+'T00:00:00Z'),hours=(Date.parse(end+'T00:00:00Z')-begin)/3600000+24;
 const variables=['temperature_2m','shortwave_radiation',...(wind?['wind_speed_100m']:[])];
 if(!h||h.time?.length!==hours||variables.some(key=>h[key]?.length!==hours))throw Error('Unvollständige Wetterantwort; wird nicht gespeichert.');
 for(let i=0;i<hours;i++){
  if(Date.parse(String(h.time[i])+'Z')!==begin+i*3600000)throw Error('Lücke in der Wetterzeitreihe; wird nicht gespeichert.');
  for(const key of variables){const value=h[key][i];if(typeof value!=='number'||!Number.isFinite(value)||(key!=='temperature_2m'&&value<0))throw Error('Fehlender Wetterwert; wird nicht gespeichert.');}
 }
 if(wind&&weather.hourly_units?.wind_speed_100m!=='m/s')throw Error('Unerwartete Wind-Einheit');
}
