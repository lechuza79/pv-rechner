const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const periods=read('monitor-periods.json');
const charts=read('charts.json');
test('annual periods contain every UTC day including leap day, with finite energy',()=>{
 for(const data of periods.annual){
  const days=(Date.UTC(data.year+1,0,1)-Date.UTC(data.year,0,1))/86400000;
  assert.equal(data.days.length,days);
  data.days.forEach((day,index)=>{assert.equal(day.date,new Date(Date.UTC(data.year,0,1+index)).toISOString().slice(0,10));assert.ok(Number.isFinite(day.solarMwh)&&day.solarMwh>=0);assert.ok(Number.isFinite(day.windMwh)&&day.windMwh>=0);});
  assert.match(data.sourceUrl,/^era5-archive:/);
 }
});
test('monthly profiles contain complete local days and reconcile daily totals',()=>{
 for(const {month,solar,value} of periods.monthly){
  const [year,m]=month.split('-').map(Number);
  assert.equal(solar.days.length,new Date(Date.UTC(year,m,0)).getUTCDate());
  solar.days.forEach((day,index)=>{assert.equal(day.date,month+'-'+String(index+1).padStart(2,'0'));assert.equal(day.mw.length,24);assert.ok(day.mw.every(v=>Number.isFinite(v)&&v>=0));});
  assert.ok(Math.abs(solar.days.reduce((sum,day)=>sum+day.mwh,0)-solar.totalMwh)<.001);
  if(value)assert.ok(Math.abs(value.totalMwh-solar.totalMwh)<.001);
 }
});
test('new preparation preserves the already reviewed August euro values',()=>{
 const value=periods.monthly.find(row=>row.month==='2026-08').value;
 for(const [template,key] of [['electricity-value','euro'],['feed-in-value','feedInEuro']]){
  const baseline=charts.charts.find(row=>row.template===template).story.values[0].value;
  assert.ok(Math.abs(value[key]-baseline)<1);
 }
});
test('stock segment counts never exceed the complete stock',()=>{
 for(const row of read('monitor-history.json').observations){
  assert.ok(row.solarCounts.gebaeude>=0&&row.solarCounts.steckersolar>=0);
  assert.ok(row.solarCounts.gebaeude+row.solarCounts.steckersolar<=row.solarCount);
 }
});
