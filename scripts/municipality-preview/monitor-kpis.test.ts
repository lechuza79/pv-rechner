import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monitorKpiGroups,monitorKpiDate} from './monitor-kpis';
import {compareKpi,kpiTrend,kpiMonthlyAdditions} from '../../lib/dashboard/model';
test('prepared municipal cohorts support all yearly and stock monthly comparisons',()=>{
 const items=monitorKpiGroups.flatMap(group=>group.items);
 assert.equal(items.length,6);
 assert.match(monitorKpiDate,/^\d{4}-\d{2}-\d{2}$/);
 for(const item of items){
  assert.equal(compareKpi(item,'year').status,'available',item.id);
  if(item.kind==='stock'){
   assert.equal(compareKpi(item,'month').status,'available',item.id);
   assert.equal(kpiTrend(item).length,12,item.id);
  }else assert.equal(compareKpi(item,'month').status,'not-applicable');
 }
});

test('monthly additions sum to the year-to-date total and reject gaps',()=>{
 const item=monitorKpiGroups.flatMap(group=>group.items).find(item=>item.kind==='period-total')!;
 const bars=kpiMonthlyAdditions(item);
 assert.equal(bars.length,Number(item.current.end.slice(5,7)));
 assert.equal(bars.reduce((sum,row)=>sum+row.value,0),item.current.value);
 assert.deepEqual(kpiMonthlyAdditions({...item,history:item.history.slice(1)}),[]);
});

test('selected KPI windows keep monthly bars and deltas aligned',async()=>{
 const {kpiWindow}=await import('../../lib/dashboard/model');
 const items=monitorKpiGroups.flatMap(group=>group.items);
 for(const months of [1,6,12])for(const item of items){
  const view=kpiWindow(item,months);
  assert.equal(view.bars.length,item.kind==='period-total' ? Number(item.current.end.slice(5,7)) : months,item.id);
  assert.equal(view.comparison.status,'available',item.id);
  if(item.kind==='period-total'){
   assert.equal(view.value,view.bars.reduce((sum,row)=>sum+row.value,0));
   assert.equal(view.bars[0].end.slice(0,7),'2026-01');
   assert.equal(view.bars.at(-1)?.end.slice(0,7),'2026-08');
  }
 }
 const count=kpiWindow(items[0],12);assert.equal(count.value,944);assert.equal(count.comparison.status==='available'&&count.comparison.delta,120);
 const growth=items.find(item=>item.kind==='period-total')!;
 assert.equal(kpiWindow(growth,12).value,85);
 assert.equal(kpiWindow(growth,1).value,85);
});

test('monthly stock additions reconcile with delta; YTD never substitutes a full prior year',async()=>{
 const {kpiWindow}=await import('../../lib/dashboard/model');
 const items=monitorKpiGroups.flatMap(group=>group.items);
 const stock=kpiWindow(items[0],12);
 assert.equal(stock.bars.reduce((sum,row)=>sum+row.value,0),120);
 const growth=items.find(item=>item.kind==='period-total')!;
 for(const months of [1,6,12]){
  const result=kpiWindow(growth,months);
  assert.equal(result.value,85);
  assert.equal(result.comparison.status==='available'&&result.comparison.delta,8);
 }
 const missing=kpiWindow({...growth,history:growth.history.filter(row=>row.end!=='2025-08-31')},12);
 assert.equal(missing.comparison.status,'missing');
 assert.equal(missing.value,85);
});
