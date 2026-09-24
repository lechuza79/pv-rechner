import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {monthlyElectricityValue} from '../lib/story-month-value';
import {radialDataForCity} from '../lib/story-radial-data';
const path='lib/story-month-value-data.json';
const output:Record<string,Record<string,unknown>>=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{};
for(const id of process.argv.slice(2)){
 const data=radialDataForCity(id)?.monthly;if(!data)throw Error('No local monthly generation');
 const input=JSON.parse(readFileSync(`scripts/.cache/story-radial/${id}-value-cells.json`,'utf8'));
 const value=monthlyElectricityValue(id,data.totalMwh,input.rows);
 output[id]??={};
 if(output[id][data.month])throw Error('Snapshot already exists; do not overwrite historical valuation');
 output[id][data.month]={...value,month:data.month,totalMwh:data.totalMwh,sourceDate:data.sourceDate,valuationDate:input.retrievedAt.slice(0,10),weatherUrl:data.sourceUrl};
 console.log(id,data.month,value.euro,value.ctPerKwh);
}
writeFileSync(path,JSON.stringify(output,null,2)+'\n');
