import {test} from 'vitest';
import assert from 'node:assert/strict';
import {compareKpi,referenceDate,kpiTrend,WIDGET_COLUMNS,type KpiDefinition} from './model';
const stock:KpiDefinition={id:'count',label:'Anzahl',kind:'stock',current:{end:'2026-09-10',value:946,basis:'all'},history:[{end:'2025-09-10',value:800,basis:'all'},{end:'2026-08-10',value:940,basis:'all'}]};
test('year and month use exact reference dates',()=>{assert.equal(compareKpi(stock,'year').status,'available');assert.deepEqual(compareKpi(stock,'month'),{status:'available',delta:6,percent:6/940*100,reference:stock.history[1]});});
test('missing, changed basis and zero references are distinct',()=>{
 assert.equal(compareKpi({...stock,history:[]},'year').status,'missing');
 assert.equal(compareKpi({...stock,history:[{...stock.history[0],basis:'private'}]},'year').status,'incompatible');
 const result=compareKpi({...stock,history:[{...stock.history[0],value:0}]},'year');assert.equal(result.status,'available');if(result.status==='available')assert.equal(result.percent,null);
});
test('year-to-date must match start and end, never the full prior year',()=>{
 const kpi:KpiDefinition={...stock,kind:'period-total',current:{...stock.current,start:'2026-01-01'},history:[{...stock.history[0],start:'2025-01-01',end:'2025-12-31'}]};
 assert.equal(compareKpi(kpi,'year').status,'missing');assert.equal(compareKpi(kpi,'month').status,'not-applicable');
 assert.equal(compareKpi({...kpi,history:[{...kpi.history[0],end:'2025-09-10'}]},'year').status,'available');
});
test('calendar comparisons clamp leap days and month ends',()=>{assert.equal(referenceDate('2024-02-29','year'),'2023-02-28');assert.equal(referenceDate('2026-03-31','month'),'2026-02-28');assert.equal(referenceDate('2026-01-10','month'),'2025-12-10');});
test('content roles determine layout',()=>{assert.equal(WIDGET_COLUMNS.radial,1);assert.equal(WIDGET_COLUMNS.composition,2);assert.equal(WIDGET_COLUMNS['time-series'],2);assert.equal(WIDGET_COLUMNS.map,3);});

test('sparklines require complete monthly observations and preserve month-end anchors',()=>{
 const current={end:'2026-03-31',value:12,basis:'all'};
 const history=Array.from({length:11},(_,index)=>({end:referenceDate(current.end,'month',index+1),value:11-index,basis:'all'}));
 const kpi={...stock,current,history};
 const trend=kpiTrend(kpi);assert.equal(trend.length,12);assert.equal(trend[9].end,'2026-01-31');
 assert.deepEqual(kpiTrend({...kpi,history:history.slice(1)}),[]);
 assert.deepEqual(kpiTrend({...kpi,kind:'period-total'}),[]);
});
test('monthly cadence compares complete calendar months across different lengths',()=>{
 const kpi:KpiDefinition={...stock,cadence:'month-end',current:{...stock.current,end:'2026-04-30'},history:[{...stock.history[0],end:'2026-03-31'}]};
 assert.equal(compareKpi(kpi,'month').status,'available');
});
