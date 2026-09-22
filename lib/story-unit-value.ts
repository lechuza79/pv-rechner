import {altFeedInRatesFor,blendRoofRate} from './feedin-archiv-alt';
import {feedInEndIso,feedInRatesForCommissioning} from './feedin-config';
import {einspeiseSatz,marktErloesCt,balkonEigenverbrauchAnteil,jahrgangStichtag} from './atlas-impact';
import {DEFAULT_PRICES} from './prices-config';
import {calcCurrentPower} from './simulation';
export type ValuationUnit={id:string;day:string;kwp:number;status:string;art:string;usage:string;feedInMode:string;storage:string};
export function unitTariff(unit:ValuationUnit,asOf:string){
 const day=unit.day.slice(0,10),kwp=unit.kwp;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(kwp)||kwp<=0)throw Error('Invalid unit');
 if(unit.art==='2961')return {ct:0,eligible:false,approximate:false};
 if(feedInEndIso(day)<asOf)return {ct:marktErloesCt(),eligible:false,approximate:false};
 // Ground-mounted: the payment period was checked above against the VALUED
 // month. einspeiseSatz() checks it against today instead, so for a past month
 // it priced a still-paid 2005 system at market value (about a ninth of its
 // 43.42 ct). Up to 03/2012 take the ground rate of the vintage's mid-year
 // reference day — the rule einspeiseSatz() applies to unexpired vintages, so
 // every value that was already right stays identical; later vintages are not
 // expired today and go through einspeiseSatz() unchanged.
 if(unit.art==='852'){
  const year=Number(day.slice(0,4)),vintage=altFeedInRatesFor(jahrgangStichtag(year));
  return vintage?{ct:vintage.groundMounted,eligible:true,approximate:true}:{...einspeiseSatz('freiflaeche',year,kwp),eligible:true,approximate:true};
 }
 const alt=altFeedInRatesFor(day);
 if(alt){const exact=blendRoofRate(alt,kwp);return {ct:exact??alt.roofUpTo100,eligible:true,approximate:exact===null};}
 const rates=feedInRatesForCommissioning(day);
 if(!rates)throw Error('No documented tariff for unit');
 const full=unit.feedInMode==='688',low=full?rates.vollUnder10:rates.teilUnder10,high=full?rates.vollOver10:rates.teilOver10;
 return {ct:(Math.min(10,kwp)*low+Math.max(0,kwp-10)*high)/kwp,eligible:true,approximate:kwp>(day<'2022-07-30'?40:full?100:40)};
}
type Weather={hourly:{time:string[];shortwave_radiation:(number|null)[];temperature_2m:(number|null)[]}};
/** Value each active register unit independently, starting the day after commissioning.
 * Daily specific yield is shared weather physics, never allocated from a later stock mix. */
export function unitMonthValue(units:ValuationUnit[],weather:Weather,month:string,privateSelfUse:number){
 if(!Number.isFinite(privateSelfUse)||privateSelfUse<0||privateSelfUse>1)throw Error('Invalid self-consumption assumption');
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'});
 const yieldByDay=new Map<string,number>(),timestamps=new Set<string>();
 let includedHours=0;
 weather.hourly.time.forEach((time,i)=>{
  if(timestamps.has(time))throw Error('Duplicate UTC hour');timestamps.add(time);
  const date=formatter.format(new Date(Date.parse(time+'Z')-1800000));if(!date.startsWith(month))return;includedHours++;
  const radiation=weather.hourly.shortwave_radiation[i],temperature=weather.hourly.temperature_2m[i];
  if(radiation==null||temperature==null||!Number.isFinite(radiation)||!Number.isFinite(temperature)||radiation<0)throw Error('Missing weather');
  yieldByDay.set(date,(yieldByDay.get(date)??0)+calcCurrentPower(1000,radiation,temperature)/1e6);
 });
 const dayCount=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 const startUtc=Date.parse(month+'-01T00:00:00Z')-86400000;
 const endUtc=Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),1)+86400000;
 let expectedHours=0;for(let t=startUtc;t<endUtc;t+=3600000)if(formatter.format(new Date(t-1800000)).startsWith(month))expectedHours++;
 if(yieldByDay.size!==dayCount||includedHours!==expectedHours)throw Error('Incomplete month');
 const end=month+'-'+String(dayCount).padStart(2,'0'),seen=new Set<string>();
 const rows=units.filter(u=>u.status==='35'&&u.day.slice(0,10)<end&&u.kwp>0).map(unit=>{
  if(seen.has(unit.id))throw Error('Duplicate unit');seen.add(unit.id);
  const day=unit.day.slice(0,10),tariff=unitTariff(unit,end);
  const balcony=unit.art==='2961',ground=unit.art==='852',household=!ground&&unit.usage==='713';
  const full=unit.feedInMode==='688';
  const selfUse=full?0:balcony?balkonEigenverbrauchAnteil():household?privateSelfUse:0;
  const kwh=[...yieldByDay].filter(([date])=>date>day).reduce((sum,[,specific])=>sum+specific*unit.kwp,0);
  const feedInKwh=kwh*(1-selfUse),exportValue=feedInKwh*tariff.ct/100;
  return {id:unit.id,day,kwp:unit.kwp,usage:unit.usage,feedInMode:unit.feedInMode,kwh,feedInKwh,selfUse,tariffCt:tariff.ct,approximateTariff:tariff.approximate,unknownMode:!['688','689'].includes(unit.feedInMode)&&!balcony,commercialSelfUseUnknown:!household&&!ground&&!balcony&&!full,euro:kwh*selfUse*DEFAULT_PRICES.electricityPrice+exportValue,feedInEuro:tariff.eligible?exportValue:0};
 });
 if(!rows.length)throw Error('No contributing units');
 return {euro:rows.reduce((s,r)=>s+r.euro,0),feedInEuro:rows.reduce((s,r)=>s+r.feedInEuro,0),totalMwh:rows.reduce((s,r)=>s+r.kwh,0)/1000,unitCount:rows.length,approximateTariffCount:rows.filter(r=>r.approximateTariff).length,unknownModeCount:rows.filter(r=>r.unknownMode).length,commercialSelfUseUnknownCount:rows.filter(r=>r.commercialSelfUseUnknown).length,rows};
}
