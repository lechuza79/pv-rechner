import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {signedTradeLine,tradeBalanceDirection} from '../trade-chart-style';
import ElectricityTradeRadial from '../../components/charts/ElectricityTradeRadial';
import type {TradeDay} from '../electricity-trade';
const days=[{date:'2026-10-01',importMwh:10,exportMwh:5,importEuro:10,exportEuro:5,expected:96,covered:96},{date:'2026-10-02',importMwh:5,exportMwh:10,importEuro:5,exportEuro:10,expected:96,covered:96}] as TradeDay[];
describe('shared trade balance presentation',()=>{
 it('splits a line at the actual zero crossing',()=>{
  expect(signedTradeLine([-10,30])).toEqual([{direction:'import',points:[[0,-10],[.25,0]]},{direction:'export',points:[[.25,0],[1,30]]}]);
 });
 it('breaks at missing observations and does not close the year',()=>{
  expect(signedTradeLine([1,2,null,3,4])).toEqual([{direction:'export',points:[[0,1],[1,2]]},{direction:'export',points:[[3,3],[4,4]]}]);
  expect(signedTradeLine([null,1,null])).toEqual([]);
 });
 it('uses accent for net purchases in the summary as in the plot',()=>{
  const render=(imports:number,exports:number)=>renderToStaticMarkup(<ElectricityTradeRadial preview summaryPlacement="auto" variant="bars" days={days} money={false} importValue={imports} exportValue={exports}/>);
  expect(tradeBalanceDirection(-1)).toBe('import');
  expect(render(20,10)).toContain('data-tone="accent"');
  expect(render(10,20)).toContain('data-tone="neutral"');
 });
 it('draws a signed line only in the compact radial variant',()=>{
  const render=(preview:boolean)=>renderToStaticMarkup(<ElectricityTradeRadial preview={preview} days={days} money={false} importValue={15} exportValue={15}/>);
  expect(render(true)).toContain('data-trade-line="import"');
  expect(render(true)).toContain('data-trade-line="export"');
  expect(render(false)).not.toContain('data-trade-line');
 });
});
