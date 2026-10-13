import 'server-only';
import {unstable_cache} from 'next/cache';
import {fetchSmardTrade} from './smard-trade';
import {tradeDate,shiftTradeDate,summarizeTrade} from './electricity-trade';

/** The page and HTTP endpoint share one cached trade snapshot. */
export function getYearTrade(year:number) {
 const now=Date.now(),today=tradeDate(now),start=`${year}-01-01`,end=`${year}-12-31`;
 return unstable_cache(async()=>{
  const data=await fetchSmardTrade(start,shiftTradeDate(end>today?today:end,1));
  return summarizeTrade(data.intervals,start,end,'year',now,data.retrievedAt);
 },['electricity-trade-v1','year',start,end,today],{revalidate:3600})();
}
