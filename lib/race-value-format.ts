/** Every row uses the unit selected from the same frame maximum. */
export function raceValueUnit(metric:'count'|'kwp'|'per-capita',frameMaximum:number):string {
 return metric==='kwp'?(frameMaximum>=1000?'MWp':'kWp'):metric==='per-capita'?'Wp':'';
}
export function formatRaceValue(value:number, metric:'count'|'kwp'|'per-capita',frameMaximum=Infinity):string {
 if(metric==='count')return Math.round(value).toLocaleString('de-DE');
 const displayed=metric==='kwp'&&raceValueUnit(metric,frameMaximum)==='MWp'?value/1000:value;
 if(displayed>0&&displayed<0.001)return '<0,001';
 const maximumFractionDigits=displayed<1?3:displayed<10?2:1;
 return displayed.toLocaleString('de-DE',{maximumFractionDigits});
}
