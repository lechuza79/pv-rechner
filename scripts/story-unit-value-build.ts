import {heuteInBerlin} from '../lib/zeit';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {unitMonthValue} from '../lib/story-unit-value';
import old from '../lib/story-month-value-data.json';
const path='lib/story-unit-value-data.json';
const output:Record<string,Record<string,unknown>>=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{};
for(const id of process.argv.slice(2)){
 const input=JSON.parse(readFileSync(`scripts/.cache/story-radial/${id}-value-units.json`,'utf8'));

 const oldSnapshot=(old as Record<string,Record<string,{roofSelfConsumption:number;month:string}>>)[id];
 if(!oldSnapshot)throw Error('Explicit private self-consumption assumption required');
 for(const [month,reference] of Object.entries(oldSnapshot)){
  if(output[id]?.[month])throw Error('Existing unit snapshot; create an explicit revision');
  const weatherPath=`scripts/.cache/story-radial/${id}-month.json`;
  const raw=JSON.parse(readFileSync(existsSync(weatherPath)?weatherPath:`scripts/.cache/story-monthly-solar/${id}-${month}.json`,'utf8'));
  const weather=raw.weather??raw;
  const result=unitMonthValue(input.units,weather,month,reference.roofSelfConsumption);
  const {rows,...summary}=result;
  const assumptions={privateSelfConsumption:reference.roofSelfConsumption,sourceDate:input.sourceDate,valuationDate:heuteInBerlin(),month,model:'individual-register-unit-v2'};
  mkdirSync('scripts/.cache/story-valuation',{recursive:true});
  writeFileSync(`scripts/.cache/story-valuation/${id}-${month}-v2.json`,JSON.stringify({...assumptions,...result},null,2));
  output[id]??={};output[id][month]={...summary,...assumptions};
  console.log(id,month,summary);
 }
}
writeFileSync(path,JSON.stringify(output,null,2)+'\n');
