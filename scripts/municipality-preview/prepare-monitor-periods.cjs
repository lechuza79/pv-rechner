/* Offline only: read the existing archive, write this preview's own prepared periods. */
const {createRequire}=require('node:module');
const {readFileSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const paths=require('./paths.cjs');
const main=paths.siteSourceRoot;
const source=paths.storySourceRoot;
const req=createRequire(path.join(main,'entry.cjs'));
const {era5StoryWeather}=req('./lib/story-weather-provider.ts');
const {solarMonth}=require(path.join(source,'lib/story-monthly-solar.ts'));
const {energyYear}=require(path.join(source,'lib/story-energy-year.ts'));
const {unitMonthValue}=require(path.join(source,'lib/story-unit-value.ts'));
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const baseline=read(path.join(paths.cacheRoot,'story-prepared/2026-09-10/09679147.json'));
const detail=read(path.join(paths.cacheRoot,'bnetza/story-history-2026-09-10/cities/09679147.json'));
const inventory=read(path.join(paths.cacheRoot,'story-radial/09679147-value-units.json'));
if(inventory.sourceDate!==baseline.sourceDate)throw Error('Mismatched register editions');
const original=baseline.values['2026-08'];
const result={sourceDate:baseline.sourceDate,preparedAt:new Date().toISOString(),method:'active-register-cohort-and-archived-era5',valuationAssumptionDate:original.valuationDate,privateSelfConsumption:original.privateSelfConsumption,monthly:[],annual:[],missing:[]};
const saved=new URL(baseline.monthly.sourceUrl);
const position={latitude:Number(saved.searchParams.get('latitude')),longitude:Number(saved.searchParams.get('longitude'))};
process.chdir(paths.repoRoot); // Archive inputs must exist in this checkout's local cache.
for(let offset=0;offset<20;offset++){
 const year=2026,monthIndex=7-offset;
 const month=new Date(Date.UTC(year,monthIndex,15)).toISOString().slice(0,7);
 const startDate=new Date(Date.UTC(year,monthIndex,0)).toISOString().slice(0,10);
 const endDate=new Date(Date.UTC(year,monthIndex+1,0)).toISOString().slice(0,10);
 try{
  const weather=era5StoryWeather({...position,startDate,endDate,wind:false});
  const solar={...solarMonth(weather.weather,detail.daily,month,baseline.sourceDate,weather.retrievedAt,weather.sourceUrl),town:'Höchberg'};
  const row={month,solar};
  try{
   const {rows,...value}=unitMonthValue(inventory.units,weather.weather,month,original.privateSelfConsumption);
   if(Math.abs(value.totalMwh-solar.totalMwh)>Math.max(.001,solar.totalMwh*.00001))throw Error('Monthly chart and unit valuation disagree');
   if(month==='2026-08'&&Math.abs(value.euro-original.euro)>Math.max(1,original.euro*.0001))throw Error('Existing August baseline changed');
   row.value=value;
  }catch(error){result.missing.push({period:month,topic:'valuation',reason:error.message});}
  result.monthly.push(row);
 }catch(error){result.missing.push({period:month,reason:error.message});}
}
for(const year of [2025,2024,2023]){
 try{
  if(baseline.annual.windKw!==0)throw Error('Historical wind stock required');
  const weather=era5StoryWeather({...position,startDate:`${year}-01-01`,endDate:`${year}-12-31`,wind:true});
  const solarKwp=detail.daily.filter(row=>row.day<`${year+1}-01-01`).reduce((sum,row)=>sum+row.kwp,0);
  const annual=energyYear(weather.weather,{town:'Höchberg',year,solarKwp,windKw:0,sourceDate:baseline.sourceDate,retrievedAt:weather.retrievedAt,sourceUrl:weather.sourceUrl});
  result.annual.push(annual);
 }catch(error){result.missing.push({period:String(year),reason:error.message});}
}
if(!result.monthly.find(row=>row.month==='2026-08')?.value||!result.annual.length)throw Error('No complete prepared periods');
writeFileSync(path.join(__dirname,'monitor-periods.json'),JSON.stringify(result)+'\n');
console.log(JSON.stringify({months:result.monthly.map(row=>row.month),years:result.annual.map(row=>row.year),missing:result.missing}));
