import {unstable_cache} from 'next/cache';
import {NextRequest,NextResponse} from 'next/server';
import {rateLimit} from '../../../../lib/rate-limit';
import {fetchSmardTrade} from '../../../../lib/smard-trade';
import {tradeDate,shiftTradeDate,summarizeTrade,type TradePeriod} from '../../../../lib/electricity-trade';
export const maxDuration=60;
export async function GET(req:NextRequest){
 const limited=rateLimit(req,'electricity-trade');if(limited)return limited;
 const q=req.nextUrl.searchParams,now=Date.now(),today=tradeDate(now),currentYear=Number(today.slice(0,4));
 const mode=(q.get('period')??'seven') as TradePeriod,year=Number(q.get('year')??currentYear),month=Number(q.get('month')??today.slice(5,7));
 if(!['seven','ytd','year','month'].includes(mode)||!Number.isInteger(year)||year<2021||year>currentYear||!Number.isInteger(month)||month<1||month>12)return NextResponse.json({error:'Ungültiger Zeitraum.'},{status:400});
 let start=mode==='seven'?shiftTradeDate(today,-35):`${mode==='ytd'?currentYear:year}-01-01`;
 let end=mode==='year'?`${year}-12-31`:today;
 if(mode==='month'){start=`${year}-${String(month).padStart(2,'0')}-01`;end=new Date(Date.UTC(year,month,0,12)).toISOString().slice(0,10);}
 if(start>today)return NextResponse.json({error:'Für diesen Zeitraum liegen noch keine Daten vor.'},{status:400});
 try{
  if(mode==='ytd')end=today;
  const result=await unstable_cache(async()=>{
   const data=await fetchSmardTrade(start,shiftTradeDate(end>today?today:end,1));
   return summarizeTrade(data.intervals,start,end,mode,now,data.retrievedAt);
  },['electricity-trade-v1',mode,start,end,today],{revalidate:3600})();
  return NextResponse.json(result,{headers:{'Cache-Control':'public, max-age=300, s-maxage=3600'}});
 }catch{ return NextResponse.json({error:'SMARD-Daten sind gerade nicht verfügbar. Fehlende Daten werden nicht als null gewertet.'},{status:503}); }
}
