import {describe,it,expect} from 'vitest';
import {zipSync,strToU8} from 'fflate';
import {aggregateTrade,summarizeTrade,tradeMidnight,shiftTradeDate,TRADE_STEP,type TradeInterval} from '../electricity-trade';
import {decodeTradeArchive,smardNumber} from '../smard-trade';
const day=(date:string):TradeInterval[]=>Array.from({length:(tradeMidnight(shiftTradeDate(date,1))-tradeMidnight(date))/TRADE_STEP},(_,i)=>({start:tradeMidnight(date)+i*TRADE_STEP,importMwh:2,exportMwh:1,price:-10}));
describe('commercial electricity trade',()=>{
 it('sums MWh directly and retains negative interval prices',()=>{
  const result=aggregateTrade(day('2026-01-01'),'2026-01-01','2026-01-01',tradeMidnight('2026-01-02'))[0];
  expect(result).toMatchObject({importMwh:192,exportMwh:96,importEuro:-1920,exportEuro:-960,expected:96});
 });
 it('does not replace missing quantities or prices with zero',()=>{
  const data=day('2026-01-01');data[12].price=null;
  expect(aggregateTrade(data,'2026-01-01','2026-01-01',tradeMidnight('2026-01-02'))[0]).toMatchObject({importMwh:192,importEuro:null});
  data[12].importMwh=null;
  expect(aggregateTrade(data,'2026-01-01','2026-01-01',tradeMidnight('2026-01-02'))[0].importMwh).toBeNull();
  expect(aggregateTrade(data.map(p=>({...p,importMwh:0,exportMwh:0,price:0})),'2026-01-01','2026-01-01',tradeMidnight('2026-01-02'))[0].importMwh).toBe(0);
 });
 it('counts the actual 23 and 25 hours at clock changes',()=>{
  for(const [date,count] of [['2026-03-29',92],['2026-10-25',100]] as const){
   expect(aggregateTrade(day(date),date,date,tradeMidnight(shiftTradeDate(date,1)))[0]).toMatchObject({expected:count,covered:count,importMwh:count*2});
  }
 });
 it('selects seven complete calendar days before the latest partial day',()=>{
  const dates=Array.from({length:9},(_,i)=>shiftTradeDate('2026-09-25',i));
  const data=dates.flatMap(day).slice(0,-80);
  const result=summarizeTrade(data,'2026-09-01','2026-10-04','seven',tradeMidnight('2026-10-05'),'2026-10-05T10:00Z');
  expect(result.start).toBe('2026-09-26');expect(result.end).toBe('2026-10-02');expect(result.days).toHaveLength(7);expect(result.totals.importMwh).toBe(7*192);expect(result.partial).toBe(false);
 });
 it('retains internal gaps and marks incomplete totals',()=>{
  const data=day('2026-01-01');data.splice(1,1);
  const result=summarizeTrade(data,'2026-01-01','2026-01-01','month',tradeMidnight('2026-01-02'),'2026-01-02T00:00Z');
  expect(result.totals.importMwh).toBeNull();expect(result.partial).toBe(true);
 });
 it('keeps an empty seven-day response bounded and unavailable',()=>{
  const result=summarizeTrade([],'2026-09-01','2026-10-04','seven',tradeMidnight('2026-10-05'),'2026-10-05T00:00Z');
  expect(result.days).toHaveLength(7);expect(result.totals.importMwh).toBeNull();expect(result.asOf).toBeNull();
 });
});
describe('SMARD CSV decoding',()=>{
 it('parses German decimal numbers, including true zero and negative prices',()=>{
  expect(smardNumber('1.234,56')).toBe(1234.56);expect(smardNumber('-10,50')).toBe(-10.5);expect(smardNumber('0')).toBe(0);expect(smardNumber('-')).toBeNull();expect(smardNumber('')).toBeNull();
 });
 it('matches the two repeated autumn hours and requires every border',()=>{
  const headers=['Datum von',...Array.from({length:11},(_,i)=>`Land${i} (Import) [MWh] Originalauflösungen`),...Array.from({length:11},(_,i)=>`Land${i} (Export) [MWh] Originalauflösungen`)];
  const row=(value:string)=>['25.10.2026 02:00',...Array(11).fill(value),...Array(11).fill('1')].join(';');
  const zip=zipSync({'trade.csv':strToU8(headers.join(';')+'\n'+row('-2')+'\n'+row('-')),'price.csv':strToU8('Datum von;Deutschland/Luxemburg [€/MWh] Originalauflösungen\n25.10.2026 02:00;-10\n25.10.2026 02:00;20')});
  const points=decodeTradeArchive(zip,tradeMidnight('2026-10-25'),tradeMidnight('2026-10-26'));
  expect(points).toHaveLength(2);expect(points[1].start-points[0].start).toBe(3600000);expect(points[0]).toMatchObject({importMwh:22,exportMwh:11,price:-10});expect(points[1]).toMatchObject({importMwh:null,price:20});
 });
});
