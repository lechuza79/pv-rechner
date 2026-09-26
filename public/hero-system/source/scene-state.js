import SunCalc from './suncalc.cjs';
export const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
export function sceneState(date,location,weather){
 const sun=SunCalc.getPosition(date,location.lat,location.lon),alt=sun.altitude*180/Math.PI;
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'numeric',hourCycle:'h23'}).formatToParts(date);
 const hour=Number(parts.find(p=>p.type==='hour').value);
 const phase=alt<-12?'night':alt<12?(hour<12?'dawn':'dusk'):'day';
 const code=weather.code||0,snow=[71,73,75,77,85,86].includes(code),rainCodes=[51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99];
 const rain=snow?0:clamp(Math.max(weather.rain||0,rainCodes.includes(code)?.15:0)/2.5,0,1);
 return {phase,solarElevation:alt,fog:[45,48].includes(code)?1:0,cloudLow:weather.cloudLow??null,cloudMid:weather.cloudMid??null,cloudHigh:weather.cloudHigh??null,cloud:clamp(weather.cloud/100),rain,snow,wind:clamp(weather.wind/15,0,2.4),direction:Math.sin((weather.direction??270)*Math.PI/180)*-1,
  sunX:clamp(.5+sun.azimuth/Math.PI*.45,.07,.93)*100,sunY:clamp(.75-alt/90*.65,.15,.8)*100,
  daylight:clamp((alt+6)/35),season:[11,0,1].includes(date.getMonth())?'winter':[8,9,10].includes(date.getMonth())?'autumn':'summer'};
}
export function validateWeather(json){
 const c=json?.current,keys=['temperature_2m','cloud_cover','wind_speed_10m','wind_direction_10m','weather_code','rain','showers'];
 if(!c||!keys.every(k=>Number.isFinite(c[k]))||!Number.isFinite(c.time))throw new Error('Unvollständige Wetterdaten');
 return {cloudLow:Number.isFinite(c.cloud_cover_low)?clamp(c.cloud_cover_low/100):null,cloudMid:Number.isFinite(c.cloud_cover_mid)?clamp(c.cloud_cover_mid/100):null,cloudHigh:Number.isFinite(c.cloud_cover_high)?clamp(c.cloud_cover_high/100):null,temp:c.temperature_2m,cloud:c.cloud_cover,wind:c.wind_speed_10m,direction:c.wind_direction_10m,code:c.weather_code,rain:c.rain+c.showers,asOf:c.time*1000};
}
export function validatePower(json,plz){
 if(json?.scope!=='plz'||json.plz!==plz||!Number.isFinite(json.powerPct)||json.powerPct<0||json.powerPct>100||!Number.isFinite(Date.parse(json.asOf)))throw new Error('Leistungsdaten nicht passend zum Standort');
 return json;
}
