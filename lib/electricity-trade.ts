/** Commercial energy quantities are already MWh per interval, not MW. */
export const TRADE_STEP = 15 * 60 * 1000;
export type TradeInterval = {start:number;importMwh:number|null;exportMwh:number|null;price:number|null};
export type TradeDay = {date:string;importMwh:number|null;exportMwh:number|null;importEuro:number|null;exportEuro:number|null;expected:number;covered:number;priced:number};
export type TradeResult = {days:TradeDay[];start:string;end:string;asOf:string|null;retrievedAt:string;partial:boolean;totals:{importMwh:number|null;exportMwh:number|null;importEuro:number|null;exportEuro:number|null};mode:TradePeriod};
export type TradePeriod='year'|'month'|'ytd'|'seven';
const berlinDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'});
export const tradeDate=(ts:number)=>berlinDay.format(ts);
export function shiftTradeDate(date:string,days:number){return new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);}
export function tradeMidnight(date:string){let t=Date.parse(date+'T12:00:00Z')-36*3600000;while(tradeDate(t)!==date)t+=3600000;return t;}
export function tradeDates(start:string,end:string){const dates:string[]=[];for(let d=start;d<=end;d=shiftTradeDate(d,1))dates.push(d);return dates;}
/** Missing directions/prices stay missing; the price sign is retained. */
export function aggregateTrade(intervals:TradeInterval[],start:string,end:string,cutoff:number):TradeDay[]{
 const byTime=new Map(intervals.map(p=>[p.start,p]));
 return tradeDates(start,end).map(date=>{
  const from=tradeMidnight(date),to=Math.min(tradeMidnight(shiftTradeDate(date,1)),cutoff);
  let expected=0,covered=0,priced=0,imports=0,exports=0,importEuro=0,exportEuro=0;
  for(let t=from;t<to;t+=TRADE_STEP){
   expected++;const p=byTime.get(t);
   if(!p||p.importMwh===null||p.exportMwh===null)continue;
   covered++;imports+=p.importMwh;exports+=p.exportMwh;
   if(p.price!==null){priced++;importEuro+=p.importMwh*p.price;exportEuro+=p.exportMwh*p.price;}
  }
  const complete=expected>0&&covered===expected,valued=complete&&priced===expected;
  return {date,importMwh:complete?imports:null,exportMwh:complete?exports:null,importEuro:valued?importEuro:null,exportEuro:valued?exportEuro:null,expected,covered,priced};
 });
}
export function summarizeTrade(intervals:TradeInterval[],start:string,end:string,mode:TradePeriod,now:number,retrievedAt:string):TradeResult{
 const last=intervals.filter(p=>p.start+TRADE_STEP<=now&&p.importMwh!==null&&p.exportMwh!==null).at(-1);
 const asOf=last?last.start+TRADE_STEP:null;
 if(mode==='seven'){
  end=shiftTradeDate(tradeDate(asOf??now),-1);start=shiftTradeDate(end,-6);
 }
 if(mode==='ytd'&&asOf!==null)end=tradeDate(asOf-1);
 const periodEnd=tradeMidnight(shiftTradeDate(end,1));
 const cutoff=Math.min(periodEnd,asOf??now,now);
 const days=aggregateTrade(intervals,start,end,cutoff);
 const observedDays=days.filter(d=>d.expected>0);
 const keys=['importMwh','exportMwh','importEuro','exportEuro'] as const;
 const totals=Object.fromEntries(keys.map(k=>[k,observedDays.length&&observedDays.every(d=>d[k]!==null)?observedDays.reduce((sum,d)=>sum+d[k]!,0):null])) as TradeResult['totals'];
 return {days,start,end,asOf:asOf===null?null:new Date(Math.min(asOf,periodEnd)).toISOString(),retrievedAt,mode,totals,partial:cutoff<periodEnd||days.some(d=>d.covered<d.expected||d.expected===0)};
}
export function tradeDisplay(value:number|null,money=false,reference:number=Math.abs(value??0)){const scale=money?(reference>=1e9?1e9:1e6):reference>=1e6?1e6:1000;return {value:value===null?null:value/scale,unit:money?(scale===1e9?'Mrd. €':'Mio. €'):scale===1e6?'TWh':'GWh'};}
